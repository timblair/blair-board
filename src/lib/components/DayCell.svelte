<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import { isToday } from '$lib/utils/date-helpers';
	import { format } from 'date-fns';
	import EventBar from './EventBar.svelte';

	interface Props {
		date: Date;
		events: CalendarEvent[];
		spanRows: number;
		spanningRowHeight: number;
		timeFormat?: '12h' | '24h';
		variant?: 'next-week' | 'month';
		isCurrentMonth?: boolean; // Only used for month variant
	}

	let {
		date,
		events,
		spanRows,
		spanningRowHeight,
		timeFormat = '24h',
		variant = 'next-week',
		isCurrentMonth = true
	}: Props = $props();

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
			const headerHeight = variant === 'month' ? 30 : 0; // Day number header: h-7 (28px) + mb-0.5 (2px)
			const moreIndicatorHeight = 20; // "+X more" indicator height
			const spanningHeight = spanRows * spanningRowHeight * 16; // Convert rem to px (assuming 16px base)
			const paddingBottom = 4; // pb-1 = 0.25rem = 4px
			const paddingTop = variant === 'next-week' ? 2 : 0; // 0.125rem for next-week, none for month
			const available = containerHeight - headerHeight - spanningHeight - paddingBottom - paddingTop;

			if (events.length === 0) {
				maxVisible = 0;
				return;
			}

			// Calculate how many events can fit based on their actual heights
			if (variant === 'next-week') {
				// Next week has mixed heights: all-day ~24px, timed ~42px
				// Calculate cumulative height for each event
				let cumulativeHeight = 0;
				let count = 0;

				for (const event of events) {
					const eventHeight = event.allDay ? 24 : 42; // single-line vs two-line
					if (cumulativeHeight + eventHeight <= available) {
						cumulativeHeight += eventHeight;
						count++;
					} else {
						break;
					}
				}

				// If not all fit, check if we can show some with "+X more" indicator
				if (count < events.length) {
					cumulativeHeight = 0;
					count = 0;
					const availableWithIndicator = available - moreIndicatorHeight;

					for (const event of events) {
						const eventHeight = event.allDay ? 24 : 42;
						if (cumulativeHeight + eventHeight <= availableWithIndicator) {
							cumulativeHeight += eventHeight;
							count++;
						} else {
							break;
						}
					}
					maxVisible = Math.max(1, count);
				} else {
					maxVisible = count;
				}
			} else {
				// Month view: consistent inline layout, measure actual height
				const eventChips = eventsContainerEl!.querySelectorAll('[data-event-chip]');
				const eventHeight = eventChips.length > 0 ? eventChips[0].getBoundingClientRect().height + 4 : 24; // +4 for gap-0.5

				// Try to fit all events first
				const allEventsHeight = events.length * eventHeight;
				if (allEventsHeight <= available) {
					maxVisible = events.length;
				} else {
					// Calculate max that can fit with "+X more" indicator
					const maxWithIndicator = Math.floor((available - moreIndicatorHeight) / eventHeight);
					const overflow = events.length - maxWithIndicator;

					// If we're only hiding 1 event, just show all events instead
					if (overflow <= 1) {
						maxVisible = events.length;
					} else {
						maxVisible = Math.max(1, maxWithIndicator);
					}
				}
			}
		};

		updateVisibility();

		// Update on window resize
		const resizeObserver = new ResizeObserver(updateVisibility);
		resizeObserver.observe(containerEl!);

		return () => resizeObserver.disconnect();
	});

	let visibleEvents = $derived(events.slice(0, maxVisible));
	let overflowCount = $derived(Math.max(0, events.length - maxVisible));

	// Variant-specific classes
	let containerClasses = $derived(
		variant === 'next-week'
			? `border-l first:border-l-0 border-border flex flex-col min-h-0 overflow-hidden ${today ? 'bg-today-bg' : ''}`
			: `min-h-[5rem] border-l first:border-l-0 border-b border-border flex flex-col overflow-hidden ${isCurrentMonth ? 'bg-surface' : 'bg-bg'}`
	);

	let paddingTopStyle = $derived(
	variant === 'next-week'
		? `calc(${spanRows * spanningRowHeight}rem + 0.125rem)`
		: `calc(${spanRows * spanningRowHeight}rem)`
);
</script>

<div bind:this={containerEl} class={containerClasses}>
	{#if variant === 'month'}
		<!-- Day number header - only for month variant -->
		<div class="h-7 mb-0.5 px-1">
			<div
				class="text-sm font-bold {today
					? 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center'
					: isCurrentMonth
						? 'text-text leading-7'
						: 'text-text-secondary leading-7'}"
			>
				{dayNumber}
			</div>
		</div>
	{/if}

	<div
		bind:this={eventsContainerEl}
		class="flex-1 min-h-0 pb-1"
		style="padding-top: {paddingTopStyle}"
	>
		<div class="flex flex-col gap-0.5 px-0.5">
			{#each visibleEvents as event (event.id)}
				<div data-event-chip>
					<EventBar
						{event}
						{timeFormat}
						showTime={!event.allDay}
						layout={variant === 'next-week' ? 'stacked' : 'inline'}
					/>
				</div>
			{/each}

			{#if overflowCount > 0}
				<div class="text-sm text-text">+{overflowCount} more</div>
			{/if}
		</div>
	</div>
</div>
