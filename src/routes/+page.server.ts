import type { PageServerLoad } from './$types';
import { getConfig } from '$lib/server/config';
import { fetchCalendarEvents } from '$lib/server/calendar-fetcher';
import { addDays, startOfDay, endOfDay } from '$lib/utils/date-helpers';
import type { ClientConfig } from '$lib/types/config';

export const load: PageServerLoad = async () => {
	const config = getConfig();
	const now = new Date();
	const today = startOfDay(now);

	// Fetch a wide range to cover any persisted view (since we can't access localStorage during SSR)
	// Month views can show up to 6 weeks of data, so fetch 4 weeks backward and 4 weeks forward
	const rangeStart = startOfDay(addDays(today, -28));
	const rangeEnd = endOfDay(addDays(today, 28 + config.display.agendaDays - 1));

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
			enabled: c.enabled,
			hideTimedEvents: c.hideTimedEvents
		})),
		refresh: config.refresh,
		timezone: config.timezone
	};

	return { events, config: clientConfig };
};
