<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import { formatTimeCompact, formatTimeRange, isEventPast } from '$lib/utils/date-helpers';

	interface Props {
		event: CalendarEvent;
		timeFormat?: '12h' | '24h';
		showTime?: boolean; // false for all-day or spanning bars
		timeStyle?: 'compact' | 'range'; // compact = "14:00", range = "14:00 – 15:00"
		variant?: 'default' | 'spanning'; // spanning adds mx-0.5
	}

	let {
		event,
		timeFormat = '24h',
		showTime = true,
		timeStyle = 'compact',
		variant = 'default'
	}: Props = $props();

	let isPast = $derived(isEventPast(event.end));
</script>

<div
	class="text-sm px-1.5 py-0.5 rounded truncate cursor-default text-white"
	class:mx-0.5={variant === 'spanning'}
	style="background-color: {event.colour}; opacity: {isPast ? 0.5 : 1}"
	title="{showTime && !event.allDay
		? formatTimeRange(event.start, event.end, timeFormat) + ': '
		: ''}{event.title}"
>
	{#if showTime && !event.allDay}
		<span class="tabular-nums opacity-90">
			{timeStyle === 'range'
				? formatTimeRange(event.start, event.end, timeFormat)
				: formatTimeCompact(event.start, timeFormat)}
		</span>
	{/if}
	<span class="font-semibold">{event.title}</span>
</div>
