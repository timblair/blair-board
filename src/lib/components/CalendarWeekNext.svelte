<script lang="ts">
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

	const SPANNING_ROW_HEIGHT = 1.75; // rem per spanning event row (slightly larger for week+next view)
</script>

<div class="flex flex-col h-full gap-4">
	<!-- Current week: time grid -->
	<div class="flex-[2] min-h-0">
		<CalendarWeek
			events={currentWeekEvents}
			{referenceDate}
			{weekStartsOn}
			{timeFormat}
			{gridStartHour}
			{gridEndHour}
		/>
	</div>

	<!-- Next week: simplified day cells -->
	<div class="flex-[1] min-h-0 bg-surface rounded-lg border border-border overflow-hidden">
		<div class="h-full flex flex-col">
			<!-- Header: "Next Week" -->
			<div class="shrink-0 px-3 py-2 border-b border-border">
				<h3 class="text-sm font-medium text-text-secondary">Next Week</h3>
			</div>

			<!-- Day headers -->
			<div class="grid grid-cols-7 shrink-0 border-b border-border">
				{#each nextWeekDays as day (day.toISOString())}
					{@const today = isToday(day)}
					<div
						class="border-l first:border-l-0 border-border text-center py-1.5 text-xs font-medium {today
							? 'text-blue-600 bg-today-bg'
							: 'text-text-secondary'}"
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
							class="text-xs px-1 py-1 mx-1 rounded truncate cursor-default flex items-center"
							style="background-color: {event.colour}20; border-left: 2px solid {event.colour}; opacity: {isEventPast(event.end) ? 0.4 : 1}"
							title="{event.allDay
								? 'All day'
								: formatTimeRange(event.start, event.end, timeFormat)}: {event.title}"
						>
							<span class="font-medium">{event.title}</span>
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
