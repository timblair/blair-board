import type { CalendarEvent } from '$lib/types/events';
import { startOfDay, endOfDay, parseISO } from './date-helpers';

export interface SpanningEvent {
	event: CalendarEvent;
	startCol: number; // 0-6 (column index within the week)
	span: number; // number of columns to span (1-7)
}

export interface PackedSpanningEvent extends SpanningEvent {
	row: number; // row index for vertical stacking (0-indexed)
}

/**
 * Check if an event is a multi-day or all-day event that should be rendered as a spanning bar.
 */
export function isSpanningEvent(event: CalendarEvent): boolean {
	const start = startOfDay(parseISO(event.start));
	const end = startOfDay(parseISO(event.end));
	// Multi-day (end is on a different day than start) or all-day
	return end > start || event.allDay;
}

/**
 * Get events that overlap with a given week (array of 7 days).
 */
export function getEventsForWeek(events: CalendarEvent[], weekDays: Date[]): CalendarEvent[] {
	return events.filter((e) => {
		const start = parseISO(e.start);
		const end = parseISO(e.end);
		return weekDays.some((day) => {
			const dayStart = startOfDay(day);
			const dayEnd = endOfDay(day);
			return start <= dayEnd && end > dayStart;
		});
	});
}

/**
 * Classify events for a week into spanning (multi-day/all-day) and single-day timed events.
 */
export function classifyWeekEvents(events: CalendarEvent[]): {
	spanning: CalendarEvent[];
	singleDay: CalendarEvent[];
} {
	const spanning: CalendarEvent[] = [];
	const singleDay: CalendarEvent[] = [];

	for (const event of events) {
		if (isSpanningEvent(event)) {
			spanning.push(event);
		} else {
			singleDay.push(event);
		}
	}

	return { spanning, singleDay };
}

/**
 * Calculate column spans for multi-day/all-day events within a week.
 * Events starting before the week start at column 0.
 * Events ending after the week extend to column 7 (full span).
 */
export function calculateSpans(
	multiDayEvents: CalendarEvent[],
	weekDays: Date[]
): SpanningEvent[] {
	return multiDayEvents.map((event) => {
		const eventStart = startOfDay(parseISO(event.start));
		const eventEnd = startOfDay(parseISO(event.end));

		// Find which column the event starts in
		let startCol = weekDays.findIndex(
			(day) => startOfDay(day).getTime() === eventStart.getTime()
		);
		if (startCol === -1) startCol = 0; // starts before this week

		// Find which column the event ends in
		let endCol = weekDays.findIndex(
			(day) => startOfDay(day).getTime() === eventEnd.getTime()
		);
		if (endCol === -1) endCol = weekDays.length; // ends after this week

		const span = endCol - startCol;
		return { event, startCol, span: Math.max(1, span) };
	});
}

/**
 * Pack spanning events into rows to minimize vertical space.
 * Events that don't overlap horizontally share the same row.
 */
export function packSpanningEvents(spanningEvents: SpanningEvent[]): PackedSpanningEvent[] {
	const rows: PackedSpanningEvent[][] = [];

	for (const se of spanningEvents) {
		let rowIndex = 0;

		// Find first row where this event doesn't overlap with existing events
		while (rowIndex < rows.length) {
			const hasOverlap = rows[rowIndex].some(
				(existing) =>
					se.startCol < existing.startCol + existing.span &&
					existing.startCol < se.startCol + se.span
			);
			if (!hasOverlap) break;
			rowIndex++;
		}

		// Create new row if needed
		if (rowIndex >= rows.length) rows.push([]);

		const packed: PackedSpanningEvent = { ...se, row: rowIndex };
		rows[rowIndex].push(packed);
	}

	return rows.flat();
}

/**
 * Get the number of spanning event rows that cover a specific day column.
 * Used to calculate padding-top for day cells.
 */
export function getSpanningRowCount(packedEvents: PackedSpanningEvent[], dayIndex: number): number {
	let maxRow = -1;
	for (const se of packedEvents) {
		if (dayIndex >= se.startCol && dayIndex < se.startCol + se.span) {
			maxRow = Math.max(maxRow, se.row);
		}
	}
	return maxRow + 1; // convert 0-indexed row to count
}

/**
 * Height of each spanning event row in rem.
 * Slightly tighter than Week+Next's 1.75rem for denser month/4-week views.
 */
export const SPANNING_ROW_HEIGHT = 1.5;
