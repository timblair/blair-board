<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import { isToday, formatTimeRange, isEventPast } from '$lib/utils/date-helpers';

	interface Props {
		day: Date;
		events: CalendarEvent[];
		spanRows: number;
		spanningRowHeight: number;
		timeFormat?: '12h' | '24h';
	}

	let { day, events, spanRows, spanningRowHeight, timeFormat = '24h' }: Props = $props();

	let today = $derived(isToday(day));

	// Dynamic visibility based on container height
	let containerEl: HTMLDivElement | undefined = $state(undefined);
	let eventsContainerEl: HTMLDivElement | undefined = $state(undefined);
	let maxVisible = $state(0);

	// Calculate how many events can fit
	$effect(() => {
		if (!containerEl || !eventsContainerEl) return;

		const updateVisibility = () => {
			const containerHeight = containerEl!.clientHeight;
			const spanPadding = spanRows * spanningRowHeight * 16 + 4; // Convert rem to px (assuming 16px base)
			const moreIndicatorHeight = 20;
			const available = containerHeight - spanPadding;

			// Measure actual event chip height from first event or estimate
			const eventChips = eventsContainerEl!.querySelectorAll('[data-event-chip]');
			const eventHeight = eventChips.length > 0 ? eventChips[0].getBoundingClientRect().height + 4 : 24; // +4 for gap

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
	class="border-l first:border-l-0 border-border flex flex-col min-h-0 overflow-hidden {today
		? 'bg-today-bg'
		: ''}"
>
	<div
		bind:this={eventsContainerEl}
		class="flex-1 min-h-0 p-1"
		style="padding-top: calc({spanRows * spanningRowHeight}rem + 0.25rem)"
	>
		<div class="flex flex-col gap-1">
			{#each visibleEvents as event (event.id)}
				<div
					data-event-chip
					class="text-xs rounded cursor-default"
					style="background-color: {event.colour}20; border-left: 2px solid {event.colour}; padding: 4px 4px; opacity: {isEventPast(event.end) ? 0.4 : 1}"
					title="{event.allDay
						? 'All day'
						: formatTimeRange(event.start, event.end, timeFormat)}: {event.title}"
				>
					<div class="font-medium truncate leading-tight">{event.title}</div>
					{#if !event.allDay}
						<div class="text-text-secondary tabular-nums leading-tight mt-0.5">
							{formatTimeRange(event.start, event.end, timeFormat)}
						</div>
					{/if}
				</div>
			{/each}

			{#if overflowCount > 0}
				<div class="text-xs text-text-secondary px-1 font-medium">+{overflowCount} more</div>
			{/if}
		</div>
	</div>
</div>
