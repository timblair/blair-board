<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import { formatTime } from '$lib/utils/date-helpers';

	interface Props {
		event: CalendarEvent;
		timeFormat?: '12h' | '24h';
		compact?: boolean;
	}

	let { event, timeFormat = '24h', compact = false }: Props = $props();
</script>

<div
	class="flex items-center gap-1.5 min-w-0 {compact ? 'text-xs' : 'text-sm'}"
>
	<span
		class="shrink-0 rounded-full {compact ? 'w-2 h-2' : 'w-2.5 h-2.5'}"
		style="background-color: {event.colour}"
	></span>
	{#if !event.allDay}
		<span class="shrink-0 text-text-secondary font-medium tabular-nums">
			{formatTime(event.start, timeFormat)}
		</span>
	{/if}
	<span class="truncate">{event.title}</span>
</div>
