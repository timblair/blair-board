import type { PageServerLoad } from './$types';
import { getConfig } from '$lib/server/config';
import { fetchCalendarEvents } from '$lib/server/calendar-fetcher';
import { getViewRange, addDays, startOfDay, endOfDay } from '$lib/utils/date-helpers';
import type { ClientConfig } from '$lib/types/config';

export const load: PageServerLoad = async () => {
	const config = getConfig();
	const now = new Date();

	const viewRange = getViewRange(config.display.defaultView, now, config.display.weekStartsOn);
	const today = startOfDay(now);
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

	const clientConfig: ClientConfig = {
		display: config.display,
		calendars: config.calendars.map((c) => ({
			id: c.id,
			name: c.name,
			colour: c.colour,
			enabled: c.enabled
		})),
		refresh: config.refresh,
		timezone: config.timezone
	};

	return { events, config: clientConfig };
};
