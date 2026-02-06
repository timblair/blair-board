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
	class="flex gap-2 min-w-0 {compact ? 'text-sm' : 'text-base'}"
	style="opacity: {isEventPast(event.end) ? 0.5 : 1}"
>
	<span
		class="shrink-0 rounded-full mt-1.5 {compact ? 'w-2.5 h-2.5' : 'w-3 h-3'}"
		style="background-color: {event.colour}"
	></span>
	<div class="min-w-0">
		<div class="truncate font-medium">{event.title}</div>
		{#if !event.allDay}
			<div class="text-text-secondary tabular-nums leading-tight">
				{formatTimeRange(event.start, event.end, timeFormat)}
			</div>
		{/if}
	</div>
</div>
