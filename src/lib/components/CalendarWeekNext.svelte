<script lang="ts">
	import { browser } from '$app/environment';
	import type { CalendarEvent } from '$lib/types/events';
	import {
		getWeekDays,
		addDays,
		isSameDay,
		startOfDay,
		endOfDay,
		parseISO,
		isToday,
		formatDayHeader,
		formatTimeRange,
		isEventPast,
		type WeekStartsOn
	} from '$lib/utils/date-helpers';
	import {
		getEventsForWeek,
		classifyWeekEvents,
		calculateSpans,
		packSpanningEvents,
		getSpanningRowCount
	} from '$lib/utils/spanning-events';
	import CalendarWeek from './CalendarWeek.svelte';
	import NextWeekDay from './NextWeekDay.svelte';

	interface Props {
		events: CalendarEvent[];
		referenceDate: Date;
		weekStartsOn?: WeekStartsOn;
		timeFormat?: '12h' | '24h';
		gridStartHour?: number;
		gridEndHour?: number;
	}

	let {
		events,
		referenceDate,
		weekStartsOn = 1,
		timeFormat = '24h',
		gridStartHour,
		gridEndHour
	}: Props = $props();

	// Resize handle state
	const STORAGE_KEY = 'weekNextSplitRatio';
	const DEFAULT_RATIO = 0.67; // Current week takes ~67% by default
	const MIN_RATIO = 0.3;
	const MAX_RATIO = 0.85;

	let splitRatio = $state(DEFAULT_RATIO);
	let isDragging = $state(false);
	let containerEl: HTMLDivElement | undefined = $state();

	// Load saved ratio from localStorage
	$effect(() => {
		if (browser) {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = parseFloat(saved);
				if (!isNaN(parsed) && parsed >= MIN_RATIO && parsed <= MAX_RATIO) {
					splitRatio = parsed;
				}
			}
		}
	});

	function handlePointerDown(e: PointerEvent) {
		isDragging = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging || !containerEl) return;

		const rect = containerEl.getBoundingClientRect();
		const y = e.clientY - rect.top;
		const ratio = Math.max(MIN_RATIO, Math.min(MAX_RATIO, y / rect.height));
		splitRatio = ratio;
	}

	function handlePointerUp(e: PointerEvent) {
		if (!isDragging) return;
		isDragging = false;
		(e.target as HTMLElement).releasePointerCapture(e.pointerId);

		// Persist to localStorage
		if (browser) {
			localStorage.setItem(STORAGE_KEY, splitRatio.toString());
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		const STEP = 0.05;
		let newRatio = splitRatio;

		if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
			newRatio = Math.max(MIN_RATIO, splitRatio - STEP);
		} else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
			newRatio = Math.min(MAX_RATIO, splitRatio + STEP);
		} else if (e.key === 'Home') {
			newRatio = MIN_RATIO;
		} else if (e.key === 'End') {
			newRatio = MAX_RATIO;
		} else {
			return;
		}

		e.preventDefault();
		splitRatio = newRatio;
		if (browser) {
			localStorage.setItem(STORAGE_KEY, splitRatio.toString());
		}
	}

	let currentWeekDays = $derived(getWeekDays(referenceDate, weekStartsOn));
	let nextWeekDays = $derived(
		getWeekDays(addDays(currentWeekDays[0], 7), weekStartsOn)
	);

	// Get events for current week (for CalendarWeek component)
	let currentWeekEvents = $derived(
		events.filter((e) => {
			const eventDate = parseISO(e.start);
			return currentWeekDays.some((day) => isSameDay(day, eventDate));
		})
	);

	// All events that overlap next week
	let nextWeekEvents = $derived(getEventsForWeek(events, nextWeekDays));

	// Classify into spanning and single-day events
	let classifiedEvents = $derived(classifyWeekEvents(nextWeekEvents));
	let nextWeekSingleDayEvents = $derived(classifiedEvents.singleDay);

	function singleDayEventsForDay(day: Date): CalendarEvent[] {
		return nextWeekSingleDayEvents.filter((e) => {
			const start = parseISO(e.start);
			const end = parseISO(e.end);
			const dayStart = startOfDay(day);
			const dayEnd = endOfDay(day);
			return start <= dayEnd && end > dayStart;
		});
	}

	// Calculate spans and pack into rows
	let spanningEvents = $derived(calculateSpans(classifiedEvents.spanning, nextWeekDays));
	let packedSpanningEvents = $derived(packSpanningEvents(spanningEvents));

	const SPANNING_ROW_HEIGHT = 2.0; // rem per spanning event row (bar ~1.75rem + 0.25rem gap)
</script>

<div class="flex flex-col h-full" bind:this={containerEl}>
	<!-- Current week: time grid -->
	<div class="min-h-0 overflow-hidden" style="height: calc({splitRatio * 100}% - 0.5rem)">
		<CalendarWeek
			events={currentWeekEvents}
			{referenceDate}
			{weekStartsOn}
			{timeFormat}
			{gridStartHour}
			{gridEndHour}
		/>
	</div>

	<!-- Resize handle -->
	<div
		class="h-4 flex items-center justify-center cursor-row-resize group shrink-0 select-none touch-none"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		onkeydown={handleKeyDown}
		role="slider"
		aria-label="Resize current week and next week sections"
		aria-orientation="vertical"
		aria-valuenow={Math.round(splitRatio * 100)}
		aria-valuemin={Math.round(MIN_RATIO * 100)}
		aria-valuemax={Math.round(MAX_RATIO * 100)}
		tabindex="0"
	>
		<div
			class="w-12 h-1 rounded-full bg-border-light transition-colors {isDragging
				? 'bg-blue-400'
				: 'group-hover:bg-border'}"
		></div>
	</div>

	<!-- Next week: simplified day cells -->
	<div
		class="min-h-0 bg-surface rounded-lg border-2 border-border overflow-hidden"
		style="height: calc({(1 - splitRatio) * 100}% - 0.5rem)"
	>
		<div class="h-full flex flex-col">
			<!-- Header: "Next Week" -->
			<div class="shrink-0 px-3 py-2 border-b-2 border-border">
				<h3 class="text-base font-bold text-text">Next Week</h3>
			</div>

			<!-- Day headers -->
			<div class="grid grid-cols-7 shrink-0 border-b border-border">
				{#each nextWeekDays as day (day.toISOString())}
					{@const today = isToday(day)}
					<div
						class="border-l first:border-l-0 border-border text-center py-2 text-sm font-semibold {today
							? 'text-blue-700 bg-today-bg'
							: 'text-text'}"
					>
						{formatDayHeader(day)}
					</div>
				{/each}
			</div>

			<!-- Event area -->
			<div class="flex-1 relative min-h-0">
				<!-- Spanning event bars (absolutely positioned) -->
				{#each packedSpanningEvents as { event, startCol, span, row } (event.id)}
					<div
						class="absolute pointer-events-auto"
						style="
							left: calc({startCol} / 7 * 100% + {startCol === 0 ? 0 : 1}px);
							width: calc({span} / 7 * 100% - {startCol === 0 ? 1 : 2}px);
							top: {row * SPANNING_ROW_HEIGHT + 0.25}rem;
							z-index: 10;
						"
					>
						<div
							class="text-sm px-1.5 py-1 mx-1 rounded truncate cursor-default flex items-center"
							style="background-color: {event.colour}30; border-left: 3px solid {event.colour}; opacity: {isEventPast(event.end) ? 0.5 : 1}"
							title="{event.allDay
								? 'All day'
								: formatTimeRange(event.start, event.end, timeFormat)}: {event.title}"
						>
							<span class="font-semibold">{event.title}</span>
						</div>
					</div>
				{/each}

				<!-- Day columns -->
				<div class="grid grid-cols-7 h-full">
					{#each nextWeekDays as day, dayIndex (day.toISOString())}
						{@const dayEvents = singleDayEventsForDay(day)}
						{@const spanRows = getSpanningRowCount(packedSpanningEvents, dayIndex)}
						<NextWeekDay
							{day}
							events={dayEvents}
							{spanRows}
							spanningRowHeight={SPANNING_ROW_HEIGHT}
							{timeFormat}
						/>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
