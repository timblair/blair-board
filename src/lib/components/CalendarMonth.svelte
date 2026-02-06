<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import {
		getMonthGridDays,
		startOfDay,
		endOfDay,
		parseISO,
		formatTimeRange,
		isEventPast,
		type WeekStartsOn
	} from '$lib/utils/date-helpers';
	import {
		getEventsForWeek,
		classifyWeekEvents,
		calculateSpans,
		packSpanningEvents,
		getSpanningRowCount,
		SPANNING_ROW_HEIGHT,
		type PackedSpanningEvent
	} from '$lib/utils/spanning-events';
	import { isSameMonth } from 'date-fns';
	import MonthDay from './MonthDay.svelte';

	interface Props {
		events: CalendarEvent[];
		referenceDate: Date;
		weekStartsOn?: WeekStartsOn;
		timeFormat?: '12h' | '24h';
		days?: Date[];
	}

	let { events, referenceDate, weekStartsOn = 1, timeFormat = '24h', days }: Props = $props();

	let gridDays = $derived(days ?? getMonthGridDays(referenceDate, weekStartsOn));

	// Split days into weeks (chunks of 7)
	let weekRows = $derived.by(() => {
		const rows: Date[][] = [];
		for (let i = 0; i < gridDays.length; i += 7) {
			rows.push(gridDays.slice(i, i + 7));
		}
		return rows;
	});

	let dayHeaders = $derived(
		(() => {
			const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
			const reordered = [...names.slice(weekStartsOn), ...names.slice(0, weekStartsOn)];
			return reordered;
		})()
	);

	// For each week, calculate packed spanning events
	interface WeekData {
		days: Date[];
		packedEvents: PackedSpanningEvent[];
		singleDayEvents: CalendarEvent[];
	}

	let weekData = $derived.by(() => {
		return weekRows.map((weekDays) => {
			const weekEvents = getEventsForWeek(events, weekDays);
			const { spanning, singleDay } = classifyWeekEvents(weekEvents);
			const spans = calculateSpans(spanning, weekDays);
			const packed = packSpanningEvents(spans);

			return {
				days: weekDays,
				packedEvents: packed,
				singleDayEvents: singleDay
			} as WeekData;
		});
	});

	// Get single-day events for a specific day within a week
	function singleDayEventsForDay(singleDayEvents: CalendarEvent[], day: Date): CalendarEvent[] {
		return singleDayEvents
			.filter((e) => {
				const start = parseISO(e.start);
				const end = parseISO(e.end);
				const dayStart = startOfDay(day);
				const dayEnd = endOfDay(day);
				return start <= dayEnd && end > dayStart;
			})
			.sort((a, b) => a.start.localeCompare(b.start));
	}
</script>

<div class="flex flex-col h-full bg-surface rounded-lg border-2 border-border overflow-hidden">
	<!-- Day-of-week headers -->
	<div class="grid grid-cols-7 border-b-2 border-border shrink-0">
		{#each dayHeaders as header}
			<div
				class="text-sm font-bold text-text text-center py-2.5 border-r border-border last:border-r-0"
			>
				{header}
			</div>
		{/each}
	</div>

	<!-- Week rows -->
	<div class="flex-1 flex flex-col min-h-0">
		{#each weekData as week, weekIndex (weekIndex)}
			<div class="flex-1 relative min-h-0 border-b border-border last:border-b-0">
				<!-- Spanning event bars (absolutely positioned) -->
				{#each week.packedEvents as { event, startCol, span, row } (event.id)}
					<div
						class="absolute pointer-events-auto z-10"
						style="
							left: calc({startCol} / 7 * 100% + {startCol === 0 ? 0 : 1}px);
							width: calc({span} / 7 * 100% - {startCol === 0 ? 1 : 2}px);
							top: calc(2rem + {row * SPANNING_ROW_HEIGHT}rem + 0.125rem);
						"
					>
						<div
							class="text-sm px-1.5 py-0.5 mx-0.5 rounded truncate cursor-default"
							style="background-color: {event.colour}30; border-left: 3px solid {event.colour}; opacity: {isEventPast(
								event.end
							)
								? 0.5
								: 1}"
							title="{event.allDay
								? 'All day'
								: formatTimeRange(event.start, event.end, timeFormat)}: {event.title}"
						>
							<span class="font-semibold">{event.title}</span>
						</div>
					</div>
				{/each}

				<!-- Day cells -->
				<div class="grid grid-cols-7 h-full">
					{#each week.days as day, dayIndex (day.toISOString())}
						{@const spanRows = getSpanningRowCount(week.packedEvents, dayIndex)}
						{@const dayEvents = singleDayEventsForDay(week.singleDayEvents, day)}
						<MonthDay
							date={day}
							events={dayEvents}
							isCurrentMonth={isSameMonth(day, referenceDate)}
							{timeFormat}
							{spanRows}
							spanningRowHeight={SPANNING_ROW_HEIGHT}
						/>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
