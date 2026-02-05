<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import { isToday, formatTime } from '$lib/utils/date-helpers';
	import { format } from 'date-fns';

	interface Props {
		date: Date;
		events: CalendarEvent[];
		isCurrentMonth: boolean;
		timeFormat?: '12h' | '24h';
		maxVisible?: number;
	}

	let { date, events, isCurrentMonth, timeFormat = '24h', maxVisible = 3 }: Props = $props();

	let today = $derived(isToday(date));
	let dayNumber = $derived(format(date, 'd'));
	let visibleEvents = $derived(events.slice(0, maxVisible));
	let overflowCount = $derived(Math.max(0, events.length - maxVisible));
</script>

<div
	class="min-h-[5rem] p-1 border-b border-r border-border {isCurrentMonth
		? 'bg-surface'
		: 'bg-bg'}"
>
	<div
		class="text-xs font-medium mb-1 {today
			? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center'
			: isCurrentMonth
				? 'text-text px-1'
				: 'text-text-tertiary px-1'}"
	>
		{dayNumber}
	</div>

	<div class="space-y-0.5">
		{#each visibleEvents as event (event.id)}
			<div
				class="text-xs px-1 py-0.5 rounded truncate cursor-default"
				style="background-color: {event.colour}20; border-left: 2px solid {event.colour}"
				title={event.title}
			>
				{#if !event.allDay}
					<span class="text-text-secondary tabular-nums">{formatTime(event.start, timeFormat)}</span>
				{/if}
				<span class="font-medium">{event.title}</span>
			</div>
		{/each}

		{#if overflowCount > 0}
			<div class="text-xs text-text-secondary px-1 font-medium">
				+{overflowCount} more
			</div>
		{/if}
	</div>
</div>
