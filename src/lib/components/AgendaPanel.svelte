<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import { formatAgendaDayHeader, parseISO, startOfDay, isSameDay } from '$lib/utils/date-helpers';
	import EventChip from './EventChip.svelte';

	interface Props {
		events: CalendarEvent[];
		timeFormat?: '12h' | '24h';
		agendaDays?: number;
		onclose?: () => void;
	}

	let { events, timeFormat = '24h', agendaDays = 2, onclose }: Props = $props();

	interface DayGroup {
		date: Date;
		label: string;
		events: CalendarEvent[];
	}

	let groupedEvents = $derived.by((): DayGroup[] => {
		const today = startOfDay(new Date());
		const groups: DayGroup[] = [];

		for (let i = 0; i < agendaDays; i++) {
			const day = new Date(today);
			day.setDate(day.getDate() + i);

			const dayEvents = events.filter((e) => {
				const start = parseISO(e.start);
				const end = parseISO(e.end);
				// Event overlaps this day
				return (
					isSameDay(start, day) ||
					(e.allDay && start <= day && end > day) ||
					(!e.allDay && start < day && end > day)
				);
			});

			// Sort: all-day first, then by start time
			dayEvents.sort((a, b) => {
				if (a.allDay && !b.allDay) return -1;
				if (!a.allDay && b.allDay) return 1;
				return a.start.localeCompare(b.start);
			});

			groups.push({
				date: day,
				label: formatAgendaDayHeader(day),
				events: dayEvents
			});
		}

		return groups;
	});
</script>

<aside class="flex flex-col h-full bg-surface border-l-2 border-border">
	<div class="px-4 py-3 border-b-2 border-border flex items-center justify-between">
		<h2 class="text-base font-bold text-text uppercase tracking-wider">Schedule</h2>
		{#if onclose}
			<button
				class="p-1 rounded hover:bg-border-light transition-colors"
				onclick={onclose}
				title="Hide schedule"
			>
				<svg class="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		{/if}
	</div>

	<div class="flex-1 overflow-y-auto">
		{#each groupedEvents as group (group.date.toISOString())}
			<div class="px-4 py-3 border-b border-border-light">
				<h3 class="text-sm font-bold text-text uppercase tracking-wider mb-2">
					{group.label}
				</h3>

				{#if group.events.length === 0}
					<p class="text-base text-text-secondary italic">No events</p>
				{:else}
					<div class="space-y-2">
						{#each group.events as event (event.id)}
							<div class="py-1">
								<EventChip {event} {timeFormat} />
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</aside>
