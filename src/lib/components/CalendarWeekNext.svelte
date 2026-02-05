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
		type WeekStartsOn
	} from '$lib/utils/date-helpers';
	import CalendarWeek from './CalendarWeek.svelte';

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

	// Get events for next week (including multi-day events)
	function eventsForDay(day: Date): CalendarEvent[] {
		return events.filter((e) => {
			const start = parseISO(e.start);
			const end = parseISO(e.end);
			const dayStart = startOfDay(day);
			const dayEnd = endOfDay(day);
			// Event spans this day if: event start <= day end AND event end > day start
			return start <= dayEnd && end > dayStart;
		});
	}
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

			<!-- Day cells -->
			<div class="flex-1 grid grid-cols-7 min-h-0">
				{#each nextWeekDays as day (day.toISOString())}
					{@const dayEvents = eventsForDay(day)}
					{@const today = isToday(day)}
					<div
						class="border-l first:border-l-0 border-border flex flex-col min-h-0 {today
							? 'bg-today-bg'
							: ''}"
					>
						<!-- Day header -->
						<div
							class="shrink-0 text-center py-1.5 text-xs font-medium border-b border-border {today
								? 'text-blue-600'
								: 'text-text-secondary'}"
						>
							{formatDayHeader(day)}
						</div>

						<!-- Events -->
						<div class="flex-1 p-1 space-y-0.5 overflow-y-auto min-h-0">
							{#each dayEvents as event (event.id)}
								<div
									class="text-xs px-1 py-0.5 rounded truncate cursor-default"
									style="background-color: {event.colour}20; border-left: 2px solid {event.colour}"
									title="{event.allDay ? 'All day' : formatTime(event.start, timeFormat)}: {event
										.title}"
								>
									{#if !event.allDay}
										<span class="text-text-secondary tabular-nums"
											>{formatTime(event.start, timeFormat)}</span
										>
									{/if}
									<span class="font-medium">{event.title}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
