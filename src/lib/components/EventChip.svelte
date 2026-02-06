<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import { formatTime, formatTimeRange, isEventPast } from '$lib/utils/date-helpers';

	interface Props {
		event: CalendarEvent;
		timeFormat?: '12h' | '24h';
		compact?: boolean;
	}

	let { event, timeFormat = '24h', compact = false }: Props = $props();
</script>

<div
	class="flex items-center gap-2 min-w-0 {compact ? 'text-sm' : 'text-base'}"
	style="opacity: {isEventPast(event.end) ? 0.5 : 1}"
>
	<span
		class="shrink-0 rounded-full {compact ? 'w-2.5 h-2.5' : 'w-3 h-3'}"
		style="background-color: {event.colour}"
	></span>
	{#if !event.allDay}
		<span class="shrink-0 text-text font-semibold tabular-nums">
			{formatTimeRange(event.start, event.end, timeFormat)}
		</span>
	{/if}
	<span class="truncate font-medium">{event.title}</span>
</div>
