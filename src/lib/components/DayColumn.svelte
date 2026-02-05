<script lang="ts">
	import type { CalendarEvent } from '$lib/types/events';
	import {
		formatTime,
		formatTimeRange,
		parseISO,
		minutesFromMidnight,
		isEventPast,
		GRID_START_HOUR,
		GRID_END_HOUR
	} from '$lib/utils/date-helpers';

	interface Props {
		events: CalendarEvent[]; // only timed events for this day
		timeFormat?: '12h' | '24h';
		gridStartHour?: number;
		gridEndHour?: number;
	}

	let {
		events,
		timeFormat = '24h',
		gridStartHour = GRID_START_HOUR,
		gridEndHour = GRID_END_HOUR
	}: Props = $props();

	let gridTotalMinutes = $derived((gridEndHour - gridStartHour) * 60);

	// Detect if two events overlap in time
	function eventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
		const aStart = parseISO(a.start);
		const aEnd = parseISO(a.end);
		const bStart = parseISO(b.start);
		const bEnd = parseISO(b.end);
		return aStart < bEnd && bStart < aEnd;
	}

	interface EventLayout {
		event: CalendarEvent;
		column: number;
		totalColumns: number;
	}

	// Calculate column layout for overlapping events
	function layoutEvents(events: CalendarEvent[]): EventLayout[] {
		if (events.length === 0) return [];

		// Sort by start time, then by duration (longer first)
		const sorted = [...events].sort((a, b) => {
			const aStart = parseISO(a.start).getTime();
			const bStart = parseISO(b.start).getTime();
			if (aStart !== bStart) return aStart - bStart;

			const aDuration = parseISO(a.end).getTime() - aStart;
			const bDuration = parseISO(b.end).getTime() - bStart;
			return bDuration - aDuration; // longer first
		});

		const layout: EventLayout[] = [];
		const columns: CalendarEvent[][] = [];

		for (const event of sorted) {
			// Find the first column where this event doesn't overlap with any existing event
			let columnIndex = 0;
			while (columnIndex < columns.length) {
				const column = columns[columnIndex];
				const hasOverlap = column.some((e) => eventsOverlap(e, event));
				if (!hasOverlap) break;
				columnIndex++;
			}

			// Add to this column (create if needed)
			if (columnIndex >= columns.length) {
				columns.push([]);
			}
			columns[columnIndex].push(event);

			layout.push({
				event,
				column: columnIndex,
				totalColumns: 0 // will be set later
			});
		}

		// Update totalColumns for each group of overlapping events
		for (let i = 0; i < layout.length; i++) {
			const item = layout[i];
			// Find all events that overlap with this one
			const overlapping = layout.filter(
				(other) => eventsOverlap(item.event, other.event) || item.event.id === other.event.id
			);
			const maxColumn = Math.max(...overlapping.map((o) => o.column));
			item.totalColumns = maxColumn + 1;
		}

		return layout;
	}

	let eventLayouts = $derived(layoutEvents(events));

	function eventStyle(layout: EventLayout): string {
		const { event, column, totalColumns } = layout;
		const startMin = Math.max(minutesFromMidnight(event.start) - gridStartHour * 60, 0);
		const endMin = Math.min(minutesFromMidnight(event.end) - gridStartHour * 60, gridTotalMinutes);
		const duration = Math.max(endMin - startMin, 15); // minimum 15min height

		const top = (startMin / gridTotalMinutes) * 100;
		const height = (duration / gridTotalMinutes) * 100;

		// Calculate horizontal positioning for overlapping events
		const widthPercent = (100 / totalColumns) - 0.5; // small gap between events
		const leftPercent = (column / totalColumns) * 100 + 0.25; // offset for gap

		const opacity = isEventPast(event.end) ? 0.4 : 1;
		// Box shadow to cover hour grid lines behind the event
		const boxShadow = `0 0 0 2px var(--color-surface, #ffffff)`;
		return `top: ${top}%; height: ${height}%; left: ${leftPercent}%; width: ${widthPercent}%; background-color: ${event.colour}20; border-left: 2px solid ${event.colour}; opacity: ${opacity}; box-shadow: ${boxShadow};`;
	}
</script>

<div class="relative h-full">
	{#each eventLayouts as layout (layout.event.id)}
		<div
			class="absolute px-1.5 py-0.5 rounded text-xs overflow-hidden cursor-default hover:shadow-sm transition-shadow"
			style={eventStyle(layout)}
			title="{formatTimeRange(layout.event.start, layout.event.end, timeFormat)}: {layout.event.title}"
		>
			<div class="font-medium truncate">{layout.event.title}</div>
			<div class="text-text-secondary truncate tabular-nums">
				{formatTimeRange(layout.event.start, layout.event.end, timeFormat)}
			</div>
		</div>
	{/each}
</div>
