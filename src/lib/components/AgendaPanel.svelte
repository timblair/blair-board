<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import { formatAgendaDayHeader, parseISO, startOfDay, isSameDay } from '$lib/utils/date-helpers';
	import EventChip from './EventChip.svelte';

	interface Props {
		events: CalendarEvent[];
		timeFormat?: '12h' | '24h';
		agendaDays?: number;
		onclose?: () => void;
		wakeLockEnabled?: boolean;
		wakeLockSupported?: boolean;
		ontoggleWakeLock?: () => void;
	}

	let {
		events,
		timeFormat = '24h',
		agendaDays = 2,
		onclose,
		wakeLockEnabled = false,
		wakeLockSupported = false,
		ontoggleWakeLock
	}: Props = $props();

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
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 5l7 7-7 7M6 5l7 7-7 7" />
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

	{#if wakeLockSupported && ontoggleWakeLock}
		<div class="shrink-0 px-4 py-3 border-t-2 border-border">
			<button
				class="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-border-light transition-colors"
				onclick={ontoggleWakeLock}
				title={wakeLockEnabled ? 'Allow screen to sleep' : 'Keep screen awake'}
			>
				<div class="flex items-center gap-2">
					<svg class="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						{#if wakeLockEnabled}
							<!-- Eye open icon -->
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
							/>
						{:else}
							<!-- Eye closed icon -->
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
							/>
						{/if}
					</svg>
					<span class="text-sm font-medium text-text">Keep Awake</span>
				</div>
				<div
					class="relative inline-block w-11 h-6 rounded-full transition-colors {wakeLockEnabled
						? 'bg-blue-600'
						: 'bg-border'}"
				>
					<div
						class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform {wakeLockEnabled
							? 'translate-x-5'
							: 'translate-x-0'}"
					></div>
				</div>
			</button>
		</div>
	{/if}
</aside>
