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
		formatTime,
		formatTimeRange,
		isEventPast,
		type WeekStartsOn
	} from '$lib/utils/date-helpers';
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
	let nextWeekEvents = $derived(
		events.filter((e) => {
			const start = parseISO(e.start);
			const end = parseISO(e.end);
			return nextWeekDays.some((day) => {
				const dayStart = startOfDay(day);
				const dayEnd = endOfDay(day);
				return start <= dayEnd && end > dayStart;
			});
		})
	);

	// Multi-day or all-day events → rendered as spanning bars
	let nextWeekMultiDayEvents = $derived(
		nextWeekEvents.filter((e) => {
			const start = startOfDay(parseISO(e.start));
			const end = startOfDay(parseISO(e.end));
			return end > start || e.allDay;
		})
	);

	// Timed single-day events → rendered in day cells
	let nextWeekSingleDayEvents = $derived(
		nextWeekEvents.filter((e) => {
			const start = startOfDay(parseISO(e.start));
			const end = startOfDay(parseISO(e.end));
			return end <= start && !e.allDay;
		})
	);

	function singleDayEventsForDay(day: Date): CalendarEvent[] {
		return nextWeekSingleDayEvents.filter((e) => {
			const start = parseISO(e.start);
			const end = parseISO(e.end);
			const dayStart = startOfDay(day);
			const dayEnd = endOfDay(day);
			return start <= dayEnd && end > dayStart;
		});
	}

	// Calculate column span for each multi-day/all-day event
	interface SpanningEvent {
		event: CalendarEvent;
		startCol: number;
		span: number;
	}

	let spanningEvents = $derived.by(() => {
		return nextWeekMultiDayEvents.map((event) => {
			const eventStart = startOfDay(parseISO(event.start));
			const eventEnd = startOfDay(parseISO(event.end));

			let startCol = nextWeekDays.findIndex(
				(day) => startOfDay(day).getTime() === eventStart.getTime()
			);
			if (startCol === -1) startCol = 0;

			let endCol = nextWeekDays.findIndex(
				(day) => startOfDay(day).getTime() === eventEnd.getTime()
			);
			if (endCol === -1) endCol = nextWeekDays.length;

			const span = endCol - startCol;
			return { event, startCol, span: Math.max(1, span) } as SpanningEvent;
		});
	});

	// Pack spanning events into rows: events that don't overlap in columns share a row
	interface PackedSpanningEvent extends SpanningEvent {
		row: number;
	}

	let packedSpanningEvents = $derived.by(() => {
		const rows: PackedSpanningEvent[][] = [];

		for (const se of spanningEvents) {
			let rowIndex = 0;
			while (rowIndex < rows.length) {
				const hasOverlap = rows[rowIndex].some(
					(existing) =>
						se.startCol < existing.startCol + existing.span &&
						existing.startCol < se.startCol + se.span
				);
				if (!hasOverlap) break;
				rowIndex++;
			}

			if (rowIndex >= rows.length) rows.push([]);

			const packed: PackedSpanningEvent = { ...se, row: rowIndex };
			rows[rowIndex].push(packed);
		}

		return rows.flat();
	});

	// Number of spanning event rows covering a specific day column
	function spanningRowsForDay(dayIndex: number): number {
		let maxRow = -1;
		for (const se of packedSpanningEvents) {
			if (dayIndex >= se.startCol && dayIndex < se.startCol + se.span) {
				maxRow = Math.max(maxRow, se.row);
			}
		}
		return maxRow + 1;
	}

	const SPANNING_ROW_HEIGHT = 1.75; // rem per spanning event row
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
						{@const spanRows = spanningRowsForDay(dayIndex)}
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
