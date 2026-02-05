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

export function getViewRange(
	view: 'week' | 'month',
	date: Date,
	weekStartsOn: WeekStartsOn
): { start: Date; end: Date } {
	return view === 'week' ? getWeekRange(date, weekStartsOn) : getMonthRange(date);
}

export function formatTime(date: Date | string, timeFormat: '12h' | '24h'): string {
	const d = typeof date === 'string' ? parseISO(date) : date;
	return format(d, timeFormat === '24h' ? 'HH:mm' : 'h:mm a');
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

/** Minutes from midnight for positioning events on the time grid */
export function minutesFromMidnight(date: Date | string): number {
	const d = typeof date === 'string' ? parseISO(date) : date;
	return d.getHours() * 60 + d.getMinutes();
}

/** Time grid constants */
export const GRID_START_HOUR = 6; // 06:00
export const GRID_END_HOUR = 22; // 22:00
export const GRID_TOTAL_MINUTES = (GRID_END_HOUR - GRID_START_HOUR) * 60;
