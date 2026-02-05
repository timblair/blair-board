import ical, { type CalendarResponse, type VEvent } from 'node-ical';
import { toZonedTime } from 'date-fns-tz';
import type { CalendarSourceConfig } from '$lib/types/config';
import type { CalendarEvent } from '$lib/types/events';
import { TTLCache } from './cache';

// Cache raw parsed iCal data per source (not expanded events)
const rawCache = new TTLCache<CalendarResponse>();

function getParameterValue(val: unknown): string {
	if (typeof val === 'string') return val;
	if (val && typeof val === 'object' && 'val' in val) return String((val as { val: unknown }).val);
	return '';
}

function toCalendarEvent(
	uid: string,
	start: Date,
	end: Date,
	allDay: boolean,
	summary: unknown,
	source: CalendarSourceConfig,
	instanceKey?: string
): CalendarEvent {
	return {
		id: instanceKey ? `${uid}_${instanceKey}` : uid,
		title: getParameterValue(summary) || '(No title)',
		start: start.toISOString(),
		end: end.toISOString(),
		allDay,
		colour: source.colour,
		calendarId: source.id,
		calendarName: source.name
	};
}

function expandEvents(
	data: CalendarResponse,
	rangeStart: Date,
	rangeEnd: Date,
	source: CalendarSourceConfig,
	timezone: string
): CalendarEvent[] {
	const events: CalendarEvent[] = [];

	for (const [key, component] of Object.entries(data)) {
		if (!component || component.type !== 'VEVENT') continue;

		const event = component as VEvent;
		const uid = event.uid ?? key;

		if (event.rrule) {
			// Recurring event — expand instances within range
			try {
				const instances = ical.expandRecurringEvent(event, {
					from: rangeStart,
					to: rangeEnd,
					includeOverrides: true,
					excludeExdates: true
				});

				for (const instance of instances) {
					const start = convertToTimezone(instance.start, timezone);
					const end = convertToTimezone(instance.end, timezone);
					events.push(
						toCalendarEvent(
							uid,
							start,
							end,
							instance.isFullDay,
							instance.summary ?? event.summary,
							source,
							instance.start.toISOString()
						)
					);
				}
			} catch {
				// If RRULE expansion fails, skip this event silently
				console.warn(`Failed to expand recurring event: ${uid} from ${source.name}`);
			}
		} else {
			// Single event — check if it falls within range
			if (!event.start) continue;

			const eventStart = event.start instanceof Date ? event.start : new Date(event.start);
			const eventEnd = event.end
				? event.end instanceof Date
					? event.end
					: new Date(event.end)
				: eventStart;

			// Check overlap with range
			if (eventEnd < rangeStart || eventStart > rangeEnd) continue;

			const allDay = (event.datetype === 'date') || !!(event.start as { dateOnly?: boolean }).dateOnly;
			const start = convertToTimezone(eventStart, timezone);
			const end = convertToTimezone(eventEnd, timezone);

			events.push(toCalendarEvent(uid, start, end, allDay, event.summary, source));
		}
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
				// Check cache for raw parsed data
				let rawData = rawCache.get(source.id);

				if (!rawData) {
					rawData = await ical.async.fromURL(source.url);
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
