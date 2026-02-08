<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import {
		getWeekDays,
		isSameDay,
		parseISO,
		isToday,
		formatDayHeader,
		isEventPast,
		GRID_START_HOUR,
		GRID_END_HOUR,
		type WeekStartsOn
	} from '$lib/utils/date-helpers';
	import {
		calculateSpans,
		packSpanningEvents,
		type PackedSpanningEvent
	} from '$lib/utils/spanning-events';
	import DayColumn from './DayColumn.svelte';

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
		gridStartHour = GRID_START_HOUR,
		gridEndHour = GRID_END_HOUR
	}: Props = $props();

	let days = $derived(getWeekDays(referenceDate, weekStartsOn));

	// Separate all-day and timed events
	let allDayEvents = $derived(events.filter((e) => e.allDay));
	let timedEvents = $derived(events.filter((e) => !e.allDay));

	// Get timed events for a specific day
	function eventsForDay(day: Date): CalendarEvent[] {
		return timedEvents.filter((e) => isSameDay(parseISO(e.start), day));
	}

	// Calculate spanning layout for all-day events
	const ALL_DAY_ROW_HEIGHT = 1.5; // rem per row
	let packedAllDayEvents = $derived.by(() => {
		const spans = calculateSpans(allDayEvents, days);
		return packSpanningEvents(spans);
	});
	let allDayRowCount = $derived(
		packedAllDayEvents.reduce((max, e) => Math.max(max, e.row + 1), 0)
	);

	// Time axis labels
	let timeLabels = $derived(
		Array.from({ length: gridEndHour - gridStartHour }, (_, i) => {
			const hour = gridStartHour + i;
			if (timeFormat === '24h') {
				return `${hour.toString().padStart(2, '0')}:00`;
			}
			const h = hour % 12 || 12;
			const ampm = hour < 12 ? 'AM' : 'PM';
			return `${h} ${ampm}`;
		})
	);

</script>

<div class="flex flex-col h-full bg-surface rounded-lg border-2 border-border overflow-hidden">
	<!-- All-day events row -->
	{#if allDayEvents.length > 0}
		<div class="grid grid-cols-[4rem_repeat(7,1fr)] border-b-2 border-border shrink-0">
			<div
				class="text-sm font-medium text-text-secondary px-1 py-1 text-right"
				style="height: {allDayRowCount * ALL_DAY_ROW_HEIGHT + 0.5}rem"
			>
				All day
			</div>
			<div class="col-span-7 relative" style="height: {allDayRowCount * ALL_DAY_ROW_HEIGHT + 0.5}rem">
				<!-- Day column borders -->
				<div class="absolute inset-0 grid grid-cols-7">
					{#each days as day (day.toISOString())}
						<div class="border-l border-border"></div>
					{/each}
				</div>
				<!-- Spanning event bars -->
				{#each packedAllDayEvents as { event, startCol, span, row } (event.id)}
					<div
						class="absolute pointer-events-auto"
						style="
							left: calc({startCol} / 7 * 100% + {startCol === 0 ? 0 : 1}px);
							width: calc({span} / 7 * 100% - {startCol === 0 ? 1 : 2}px);
							top: {row * ALL_DAY_ROW_HEIGHT + 0.25}rem;
						"
					>
						<div
							class="text-sm px-1.5 py-0.5 mx-0.5 rounded truncate cursor-default font-semibold text-white"
							style="background-color: {event.colour}; opacity: {isEventPast(event.end) ? 0.5 : 1}"
							title="All day: {event.title}"
						>
							{event.title}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Day headers -->
	<div class="grid grid-cols-[4rem_repeat(7,1fr)] border-b-2 border-border shrink-0">
		<div class=""></div>
		{#each days as day (day.toISOString())}
			<div
				class="text-center py-1.5 text-base font-semibold border-l border-border {isToday(day)
					? 'text-blue-700 bg-today-bg'
					: 'text-text'}"
			>
				{formatDayHeader(day)}
			</div>
		{/each}
	</div>

	<!-- Time grid -->
	<div class="flex-1 min-h-0">
		<div class="grid grid-cols-[4rem_repeat(7,1fr)] relative h-full">
			<!-- Time axis -->
			<div class="relative">
				{#each timeLabels as label, i}
					<div
						class="absolute right-2 text-sm font-medium text-text-secondary tabular-nums"
						style="top: {(i / timeLabels.length) * 100}%"
					>
						{label}
					</div>
				{/each}
			</div>

			<!-- Day columns -->
			{#each days as day (day.toISOString())}
				<div class="border-l border-border relative h-full">
					<!-- Hour grid lines -->
					{#each timeLabels as _, i}
						<div
							class="absolute left-0 right-0 border-t border-border-light"
							style="top: {(i / timeLabels.length) * 100}%"
						></div>
					{/each}

					<DayColumn
						date={day}
					events={eventsForDay(day)}
						{timeFormat}
						{gridStartHour}
						{gridEndHour}
					/>
				</div>
			{/each}
		</div>
	</div>
</div>
