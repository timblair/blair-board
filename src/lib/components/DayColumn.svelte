<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import {
		formatDayHeader,
		formatTime,
		isToday,
		parseISO,
		minutesFromMidnight,
		GRID_START_HOUR,
		GRID_END_HOUR,
		GRID_TOTAL_MINUTES
	} from '$lib/utils/date-helpers';

	interface Props {
		date: Date;
		events: CalendarEvent[]; // only timed events for this day
		timeFormat?: '12h' | '24h';
	}

	let { date, events, timeFormat = '24h' }: Props = $props();

	let today = $derived(isToday(date));
	let headerLabel = $derived(formatDayHeader(date));

	function eventStyle(event: CalendarEvent): string {
		const startMin = Math.max(minutesFromMidnight(event.start) - GRID_START_HOUR * 60, 0);
		const endMin = Math.min(
			minutesFromMidnight(event.end) - GRID_START_HOUR * 60,
			GRID_TOTAL_MINUTES
		);
		const duration = Math.max(endMin - startMin, 15); // minimum 15min height

		const top = (startMin / GRID_TOTAL_MINUTES) * 100;
		const height = (duration / GRID_TOTAL_MINUTES) * 100;

		return `top: ${top}%; height: ${height}%; border-left-color: ${event.colour};`;
	}
</script>

<div class="flex flex-col min-w-0">
	<!-- Day header -->
	<div
		class="text-center py-2 text-sm font-medium border-b border-border {today
			? 'text-blue-600 bg-today-bg'
			: 'text-text-secondary'}"
	>
		{headerLabel}
	</div>

	<!-- Time grid -->
	<div class="relative flex-1">
		<!-- Events -->
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
