import {
	startOfWeek,
	endOfWeek,
	startOfMonth,
	endOfMonth,
	addDays,
	format,
	isToday,
	isTomorrow,
	isSameDay,
	startOfDay,
	endOfDay,
	parseISO
} from 'date-fns';

export { isToday, isTomorrow, isSameDay, startOfDay, endOfDay, addDays, parseISO };

export type WeekStartsOn = 0 | 1;
export type CalendarView = 'week' | 'weeknext' | '4week' | 'month';

export function getWeekRange(
	date: Date,
	weekStartsOn: WeekStartsOn
): { start: Date; end: Date } {
	return {
		start: startOfWeek(date, { weekStartsOn }),
		end: endOfWeek(date, { weekStartsOn })
	};
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
	return {
		start: startOfMonth(date),
		end: endOfMonth(date)
	};
}

export function get4WeekRange(
	date: Date,
	weekStartsOn: WeekStartsOn
): { start: Date; end: Date } {
	const start = startOfWeek(date, { weekStartsOn });
	return {
		start,
		end: endOfWeek(addDays(start, 21), { weekStartsOn })
	};
}

export function getViewRange(
	view: CalendarView,
	date: Date,
	weekStartsOn: WeekStartsOn
): { start: Date; end: Date } {
	if (view === 'week') return getWeekRange(date, weekStartsOn);
	if (view === 'weeknext') {
		// Return range covering current week + next week
		const currentWeek = getWeekRange(date, weekStartsOn);
		const nextWeekStart = addDays(currentWeek.start, 7);
		return {
			start: currentWeek.start,
			end: endOfWeek(nextWeekStart, { weekStartsOn })
		};
	}
	if (view === '4week') return get4WeekRange(date, weekStartsOn);
	return getMonthRange(date);
}

export function formatTime(date: Date | string, timeFormat: '12h' | '24h'): string {
	const d = typeof date === 'string' ? parseISO(date) : date;
	return format(d, timeFormat === '24h' ? 'HH:mm' : 'h:mm a');
}

export function formatTimeRange(
	start: Date | string,
	end: Date | string,
	timeFormat: '12h' | '24h'
): string {
	const startDate = typeof start === 'string' ? parseISO(start) : start;
	const endDate = typeof end === 'string' ? parseISO(end) : end;

	if (timeFormat === '12h') {
		// Format times, omitting :00 minutes for on-the-hour times
		const startMinutes = startDate.getMinutes();
		const endMinutes = endDate.getMinutes();
		const startFormatted = format(startDate, startMinutes === 0 ? 'h' : 'h:mm');
		const endFormatted = format(endDate, endMinutes === 0 ? 'h' : 'h:mm');
		const startPeriod = format(startDate, 'a').toLowerCase();
		const endPeriod = format(endDate, 'a').toLowerCase();

		// If same period (both am or both pm), only show period once at the end
		if (startPeriod === endPeriod) {
			return `${startFormatted} – ${endFormatted}${endPeriod}`;
		}
		// Different periods, show both
		return `${startFormatted}${startPeriod} – ${endFormatted}${endPeriod}`;
	} else {
		// For 24h format, also omit :00 for on-the-hour times
		const startMinutes = startDate.getMinutes();
		const endMinutes = endDate.getMinutes();
		const startFormatted = format(startDate, startMinutes === 0 ? 'HH' : 'HH:mm');
		const endFormatted = format(endDate, endMinutes === 0 ? 'HH' : 'HH:mm');
		return `${startFormatted} – ${endFormatted}`;
	}
}

export function formatWeekLabel(date: Date, weekStartsOn: WeekStartsOn): string {
	const { start, end } = getWeekRange(date, weekStartsOn);
	const startStr = format(start, 'd MMM');
	const endStr =
		start.getMonth() === end.getMonth()
			? format(end, 'd MMM yyyy')
			: format(end, 'd MMM yyyy');
	return `${startStr} – ${endStr}`;
}

export function formatWeekNextLabel(date: Date, weekStartsOn: WeekStartsOn): string {
	const { start } = getWeekRange(date, weekStartsOn);
	const nextWeekStart = addDays(start, 7);
	const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn });

	const startStr = format(start, 'd MMM');
	const nextEndStr =
		nextWeekStart.getMonth() === nextWeekEnd.getMonth()
			? format(nextWeekEnd, 'd MMM yyyy')
			: format(nextWeekEnd, 'd MMM yyyy');
	return `${startStr} – ${nextEndStr}`;
}

export function format4WeekLabel(date: Date, weekStartsOn: WeekStartsOn): string {
	const { start, end } = get4WeekRange(date, weekStartsOn);
	const startStr = format(start, 'd MMM');
	const endStr = format(end, 'd MMM yyyy');
	return `${startStr} – ${endStr}`;
}

export function formatMonthLabel(date: Date): string {
	return format(date, 'MMMM yyyy');
}

export function formatDayHeader(date: Date): string {
	return format(date, 'EEE d');
}

export function formatAgendaDayHeader(date: Date): string {
	if (isToday(date)) return `Today, ${format(date, 'EEE d MMM')}`;
	if (isTomorrow(date)) return `Tomorrow, ${format(date, 'EEE d MMM')}`;
	return format(date, 'EEEE, d MMM');
}

/** Returns an array of dates for the days of the week containing `date` */
export function getWeekDays(date: Date, weekStartsOn: WeekStartsOn): Date[] {
	const start = startOfWeek(date, { weekStartsOn });
	return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Returns an array of 28 dates for the 4-week grid (this week + 3 more) */
export function get4WeekGridDays(date: Date, weekStartsOn: WeekStartsOn): Date[] {
	const start = startOfWeek(date, { weekStartsOn });
	return Array.from({ length: 28 }, (_, i) => addDays(start, i));
}

/** Returns an array of dates for all day cells in the month grid (includes padding days) */
export function getMonthGridDays(date: Date, weekStartsOn: WeekStartsOn): Date[] {
	const monthStart = startOfMonth(date);
	const gridStart = startOfWeek(monthStart, { weekStartsOn });
	const monthEnd = endOfMonth(date);
	const gridEnd = endOfWeek(monthEnd, { weekStartsOn });

	const days: Date[] = [];
	let current = gridStart;
	while (current <= gridEnd) {
		days.push(current);
		current = addDays(current, 1);
	}
	return days;
}

/** Check if an event has ended (is in the past) */
export function isEventPast(eventEnd: Date | string): boolean {
	const end = typeof eventEnd === 'string' ? parseISO(eventEnd) : eventEnd;
	return end < new Date();
}

/** Minutes from midnight for positioning events on the time grid */
export function minutesFromMidnight(date: Date | string): number {
	const d = typeof date === 'string' ? parseISO(date) : date;
	return d.getHours() * 60 + d.getMinutes();
}

/** Time grid constants */
export const GRID_START_HOUR = 6; // 06:00
export const GRID_END_HOUR = 22; // 22:00
export const GRID_TOTAL_MINUTES = (GRID_END_HOUR - GRID_START_HOUR) * 60;
