<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import {
		getWeekDays,
		isSameDay,
		parseISO,
		GRID_START_HOUR,
		GRID_END_HOUR,
		type WeekStartsOn
	} from '$lib/utils/date-helpers';
	import DayColumn from './DayColumn.svelte';
	import EventChip from './EventChip.svelte';

	interface Props {
		events: CalendarEvent[];
		referenceDate: Date;
		weekStartsOn?: WeekStartsOn;
		timeFormat?: '12h' | '24h';
	}

	let { events, referenceDate, weekStartsOn = 1, timeFormat = '24h' }: Props = $props();

	let days = $derived(getWeekDays(referenceDate, weekStartsOn));

	// Separate all-day and timed events
	let allDayEvents = $derived(events.filter((e) => e.allDay));
	let timedEvents = $derived(events.filter((e) => !e.allDay));

	// Get timed events for a specific day
	function eventsForDay(day: Date): CalendarEvent[] {
		return timedEvents.filter((e) => isSameDay(parseISO(e.start), day));
	}

	// Get all-day events for a specific day
	function allDayForDay(day: Date): CalendarEvent[] {
		return allDayEvents.filter((e) => {
			const start = parseISO(e.start);
			const end = parseISO(e.end);
			return day >= start && day < end;
		});
	}

	// Time axis labels
	let timeLabels = $derived(
		Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => {
			const hour = GRID_START_HOUR + i;
			if (timeFormat === '24h') {
				return `${hour.toString().padStart(2, '0')}:00`;
			}
			const h = hour % 12 || 12;
			const ampm = hour < 12 ? 'AM' : 'PM';
			return `${h} ${ampm}`;
		})
	);
</script>

<div class="flex flex-col h-full bg-surface rounded-lg border border-border overflow-hidden">
	<!-- All-day events row -->
	{#if allDayEvents.length > 0}
		<div class="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-border">
			<div class="text-xs text-text-tertiary px-1 py-1 text-right">All day</div>
			{#each days as day (day.toISOString())}
				<div class="border-l border-border px-1 py-1 space-y-0.5 min-w-0 overflow-hidden">
					{#each allDayForDay(day) as event (event.id)}
						<div
							class="text-xs px-1.5 py-0.5 rounded truncate text-white font-medium"
							style="background-color: {event.colour}"
						>
							{event.title}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Time grid -->
	<div class="flex-1 overflow-y-auto">
		<div class="grid grid-cols-[3.5rem_repeat(7,1fr)] relative min-h-full">
			<!-- Time axis -->
			<div class="relative">
				{#each timeLabels as label, i}
					<div
						class="absolute right-2 text-xs text-text-tertiary tabular-nums -translate-y-1/2"
						style="top: {(i / timeLabels.length) * 100}%"
					>
						{label}
					</div>
				{/each}
			</div>

			<!-- Day columns -->
			{#each days as day (day.toISOString())}
				<div class="border-l border-border relative">
					<!-- Hour grid lines -->
					{#each timeLabels as _, i}
						<div
							class="absolute left-0 right-0 border-t border-border-light"
							style="top: {(i / timeLabels.length) * 100}%"
						></div>
					{/each}

					<DayColumn date={day} events={eventsForDay(day)} {timeFormat} />
				</div>
			{/each}
		</div>
	</div>
</div>
