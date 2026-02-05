import ICAL from 'ical.js';
import { toZonedTime } from 'date-fns-tz';
import type { CalendarSourceConfig } from '$lib/types/config';
import type { CalendarEvent } from '$lib/types/events';
import { TTLCache } from './cache';

// Cache raw iCal text per source
const rawCache = new TTLCache<string>();

function toCalendarEvent(
	uid: string,
	start: Date,
	end: Date,
	allDay: boolean,
	summary: string,
	source: CalendarSourceConfig,
	instanceKey?: string
): CalendarEvent {
	return {
		id: instanceKey ? `${uid}_${instanceKey}` : uid,
		title: summary || '(No title)',
		start: start.toISOString(),
		end: end.toISOString(),
		allDay,
		colour: source.colour,
		calendarId: source.id,
		calendarName: source.name
	};
}

function expandEvents(
	icalData: string,
	rangeStart: Date,
	rangeEnd: Date,
	source: CalendarSourceConfig,
	timezone: string
): CalendarEvent[] {
	const events: CalendarEvent[] = [];

	try {
		const jcalData = ICAL.parse(icalData);
		const comp = new ICAL.Component(jcalData);
		const vevents = comp.getAllSubcomponents('vevent');

		for (const vevent of vevents) {
			try {
				const event = new ICAL.Event(vevent);

				// Skip RECURRENCE-ID overrides — they're handled by ical.js automatically
				if (vevent.hasProperty('recurrence-id')) {
					continue;
				}

				const uid = event.uid;
				const summary = event.summary || '(No title)';

				if (event.isRecurring()) {
					// Recurring event — expand instances within range
					const iterator = event.iterator();
					let next;
					let count = 0;
					const maxIterations = 5000; // Safety limit

					while ((next = iterator.next()) && count < maxIterations) {
						count++;
						const startTime = next.toJSDate();

						// Stop if we're past the range
						if (startTime > rangeEnd) break;

						// Get the occurrence details
						const occurrence = event.getOccurrenceDetails(next);
						const startDate = occurrence.startDate.toJSDate();
						const endDate = occurrence.endDate.toJSDate();

						// Skip if before range
						if (endDate < rangeStart) continue;

						const allDay = !occurrence.startDate.isDate ? false : true;
						const start = convertToTimezone(startDate, timezone);
						const end = convertToTimezone(endDate, timezone);

						events.push(
							toCalendarEvent(uid, start, end, allDay, summary, source, startDate.toISOString())
						);
					}
				} else {
					// Single event — check if it falls within range
					const startDate = event.startDate.toJSDate();
					const endDate = event.endDate.toJSDate();

					// Check overlap with range
					if (endDate < rangeStart || startDate > rangeEnd) continue;

					const allDay = event.startDate.isDate;
					const start = convertToTimezone(startDate, timezone);
					const end = convertToTimezone(endDate, timezone);

					events.push(toCalendarEvent(uid, start, end, allDay, summary, source));
				}
			} catch (err) {
				// Skip individual events that fail to parse
				console.warn(
					`Failed to process event in ${source.name}:`,
					err instanceof Error ? err.message : err
				);
			}
		}
	} catch (err) {
		console.error(
			`Failed to parse calendar ${source.name}:`,
			err instanceof Error ? err.message : err
		);
	}

	return events;
}

function convertToTimezone(date: Date, timezone: string): Date {
	return toZonedTime(date, timezone);
}

export async function fetchCalendarEvents(
	sources: CalendarSourceConfig[],
	rangeStart: Date,
	rangeEnd: Date,
	cacheTTLMinutes: number,
	timezone: string
): Promise<CalendarEvent[]> {
	const allEvents: CalendarEvent[] = [];
	const ttlMs = cacheTTLMinutes * 60 * 1000;

	const results = await Promise.allSettled(
		sources
			.filter((s) => s.enabled)
			.map(async (source) => {
				// Check cache for raw iCal data
				let rawData = rawCache.get(source.id);

				if (!rawData) {
					const response = await fetch(source.url);
					if (!response.ok) {
						throw new Error(`HTTP ${response.status}: ${response.statusText}`);
					}
					rawData = await response.text();
					rawCache.set(source.id, rawData, ttlMs);
				}

				return expandEvents(rawData, rangeStart, rangeEnd, source, timezone);
			})
	);

	for (const result of results) {
		if (result.status === 'fulfilled') {
			allEvents.push(...result.value);
		} else {
			console.error('Failed to fetch calendar:', result.reason);
		}
	}

	// Sort by start time
	return allEvents.sort((a, b) => a.start.localeCompare(b.start));
}
