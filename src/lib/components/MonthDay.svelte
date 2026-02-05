<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import { isToday, formatTime, formatTimeRange, isEventPast } from '$lib/utils/date-helpers';
	import { format } from 'date-fns';

	interface Props {
		date: Date;
		events: CalendarEvent[];
		isCurrentMonth: boolean;
		timeFormat?: '12h' | '24h';
	}

	let { date, events, isCurrentMonth, timeFormat = '24h' }: Props = $props();

	let today = $derived(isToday(date));
	let dayNumber = $derived(format(date, 'd'));

	// Dynamic visibility based on container height
	let containerEl: HTMLDivElement | undefined = $state(undefined);
	let eventsContainerEl: HTMLDivElement | undefined = $state(undefined);
	let maxVisible = $state(0);

	// Calculate how many events can fit
	$effect(() => {
		if (!containerEl || !eventsContainerEl) return;

		const updateVisibility = () => {
			const containerHeight = containerEl!.clientHeight;
			const headerHeight = 28; // Day number header approximate height
			const moreIndicatorHeight = 20; // "+X more" indicator height
			const available = containerHeight - headerHeight;

			// Measure actual event chip height from first event or estimate
			const eventChips = eventsContainerEl!.querySelectorAll('[data-event-chip]');
			const eventHeight =
				eventChips.length > 0 ? eventChips[0].getBoundingClientRect().height + 2 : 22; // +2 for spacing

			// Calculate how many events can fit
			if (events.length === 0) {
				maxVisible = 0;
				return;
			}

			// Try to fit all events first
			const allEventsHeight = events.length * eventHeight;
			if (allEventsHeight <= available) {
				maxVisible = events.length;
				return;
			}

			// Calculate max that can fit with "+X more" indicator
			const maxWithIndicator = Math.floor((available - moreIndicatorHeight) / eventHeight);
			maxVisible = Math.max(1, maxWithIndicator);
		};

		updateVisibility();

		// Update on window resize
		const resizeObserver = new ResizeObserver(updateVisibility);
		resizeObserver.observe(containerEl!);

		return () => resizeObserver.disconnect();
	});

	let visibleEvents = $derived(events.slice(0, maxVisible));
	let overflowCount = $derived(Math.max(0, events.length - maxVisible));
</script>

<div
	bind:this={containerEl}
	class="min-h-[5rem] p-1 border-b border-r border-border overflow-hidden {isCurrentMonth
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

	<div bind:this={eventsContainerEl} class="space-y-0.5">
		{#each visibleEvents as event (event.id)}
			<div
				data-event-chip
				class="text-xs px-1 py-0.5 rounded truncate cursor-default"
				style="background-color: {event.colour}20; border-left: 2px solid {event.colour}; opacity: {isEventPast(event.end) ? 0.4 : 1}"
				title={event.title}
			>
				{#if !event.allDay}
					<span class="text-text-secondary tabular-nums">{formatTimeRange(event.start, event.end, timeFormat)}</span
					>
				{/if}
				<span class="font-medium">{event.title}</span>
			</div>
		{/each}

		{#if overflowCount > 0}
			<div class="text-xs text-text-secondary px-1 font-medium">+{overflowCount} more</div>
		{/if}
	</div>
</div>
