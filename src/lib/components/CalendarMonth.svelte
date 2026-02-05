<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import {
		getMonthGridDays,
		isSameDay,
		parseISO,
		type WeekStartsOn
	} from '$lib/utils/date-helpers';
	import { format, isSameMonth } from 'date-fns';
	import MonthDay from './MonthDay.svelte';

	interface Props {
		events: CalendarEvent[];
		referenceDate: Date;
		weekStartsOn?: WeekStartsOn;
		timeFormat?: '12h' | '24h';
	}

	let { events, referenceDate, weekStartsOn = 1, timeFormat = '24h' }: Props = $props();

	let gridDays = $derived(getMonthGridDays(referenceDate, weekStartsOn));

	let dayHeaders = $derived(
		(() => {
			const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
			const reordered = [...names.slice(weekStartsOn), ...names.slice(0, weekStartsOn)];
			return reordered;
		})()
	);

	function eventsForDay(day: Date): CalendarEvent[] {
		return events
			.filter((e) => {
				const start = parseISO(e.start);
				const end = parseISO(e.end);
				// Event overlaps this day
				if (e.allDay) {
					const dayEnd = new Date(day);
					dayEnd.setDate(dayEnd.getDate() + 1);
					return start < dayEnd && end > day;
				}
				return isSameDay(start, day);
			})
			.sort((a, b) => {
				if (a.allDay && !b.allDay) return -1;
				if (!a.allDay && b.allDay) return 1;
				return a.start.localeCompare(b.start);
			});
	}
</script>

<div class="flex flex-col h-full bg-surface rounded-lg border border-border overflow-hidden">
	<!-- Day-of-week headers -->
	<div class="grid grid-cols-7 border-b border-border">
		{#each dayHeaders as header}
			<div class="text-xs font-semibold text-text-secondary text-center py-2 border-r border-border last:border-r-0">
				{header}
			</div>
		{/each}
	</div>

	<!-- Day grid -->
	<div class="grid grid-cols-7 flex-1 auto-rows-fr">
		{#each gridDays as day (day.toISOString())}
			<MonthDay
				date={day}
				events={eventsForDay(day)}
				isCurrentMonth={isSameMonth(day, referenceDate)}
				{timeFormat}
			/>
		{/each}
	</div>
</div>
