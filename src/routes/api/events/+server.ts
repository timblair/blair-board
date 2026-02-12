import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getConfig } from '$lib/server/config';
import { fetchCalendarEvents } from '$lib/server/calendar-fetcher';
import { getViewRange, addDays, startOfDay, endOfDay, type CalendarView } from '$lib/utils/date-helpers';
import type { ClientConfig } from '$lib/types/config';

export const GET: RequestHandler = async ({ url }) => {
	const config = getConfig();

	const view = (url.searchParams.get('view') as CalendarView) ?? config.display.defaultView;
	const refDate = url.searchParams.get('date') ? new Date(url.searchParams.get('date')!) : new Date();

	// Calculate date range for the calendar view
	const viewRange = getViewRange(view, refDate, config.display.weekStartsOn);

	// Extend range to cover agenda panel (today + agendaDays)
	const today = startOfDay(new Date());
	const agendaEnd = endOfDay(addDays(today, config.display.agendaDays - 1));

	const rangeStart = today < viewRange.start ? today : viewRange.start;
	const rangeEnd = agendaEnd > viewRange.end ? agendaEnd : viewRange.end;

	const events = await fetchCalendarEvents(
		config.calendars,
		rangeStart,
		rangeEnd,
		config.refresh.serverCacheTTLMinutes,
		config.timezone
	);

	// Strip iCal URLs from the config sent to the client
	const clientConfig: ClientConfig = {
		display: config.display,
		calendars: config.calendars.map((c) => ({
			id: c.id,
			name: c.name,
			colour: c.colour,
			enabled: c.enabled,
			hideTimedEvents: c.hideTimedEvents
		})),
		refresh: config.refresh,
		timezone: config.timezone
	};

	return json({ events, config: clientConfig });
};
