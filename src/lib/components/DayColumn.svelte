<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import {
		formatDayHeader,
		formatTime,
		isToday,
		parseISO,
		minutesFromMidnight,
		GRID_START_HOUR,
		GRID_END_HOUR
	} from '$lib/utils/date-helpers';

	interface Props {
		date: Date;
		events: CalendarEvent[]; // only timed events for this day
		timeFormat?: '12h' | '24h';
		gridStartHour?: number;
		gridEndHour?: number;
	}

	let {
		date,
		events,
		timeFormat = '24h',
		gridStartHour = GRID_START_HOUR,
		gridEndHour = GRID_END_HOUR
	}: Props = $props();

	let today = $derived(isToday(date));
	let headerLabel = $derived(formatDayHeader(date));
	let gridTotalMinutes = $derived((gridEndHour - gridStartHour) * 60);

	function eventStyle(event: CalendarEvent): string {
		const startMin = Math.max(minutesFromMidnight(event.start) - gridStartHour * 60, 0);
		const endMin = Math.min(minutesFromMidnight(event.end) - gridStartHour * 60, gridTotalMinutes);
		const duration = Math.max(endMin - startMin, 15); // minimum 15min height

		const top = (startMin / gridTotalMinutes) * 100;
		const height = (duration / gridTotalMinutes) * 100;

		return `top: ${top}%; height: ${height}%; border-left-color: ${event.colour};`;
	}
</script>

<div class="absolute inset-0 flex flex-col">
	<!-- Day header -->
	<div
		class="text-center py-2 text-sm font-medium border-b border-border shrink-0 {today
			? 'text-blue-600 bg-today-bg'
			: 'text-text-secondary'}"
	>
		{headerLabel}
	</div>

	<!-- Time grid - events positioned absolutely within this -->
	<div class="relative flex-1">
		{#each events as event (event.id)}
			<div
				class="absolute left-0.5 right-0.5 px-1.5 py-0.5 rounded text-xs bg-surface border-l-3 overflow-hidden cursor-default hover:shadow-sm transition-shadow"
				style={eventStyle(event)}
				title="{formatTime(event.start, timeFormat)} – {formatTime(event.end, timeFormat)}: {event.title}"
			>
				<div class="font-medium truncate">{event.title}</div>
				<div class="text-text-secondary truncate tabular-nums">
					{formatTime(event.start, timeFormat)}
				</div>
			</div>
		{/each}
	</div>
</div>
