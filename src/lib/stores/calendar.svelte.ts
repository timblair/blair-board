import type { CalendarEvent } from '$lib/types/events';
import type { ClientConfig } from '$lib/types/config';
import {
	startOfDay,
	addDays,
	endOfDay,
	parseISO,
	getViewRange,
	formatWeekLabel,
	formatWeekNextLabel,
	format4WeekLabel,
	formatMonthLabel,
	type WeekStartsOn,
	type CalendarView
} from '$lib/utils/date-helpers';

const VIEW_STORAGE_KEY = 'blair-board-current-view';
const HIDDEN_CALENDARS_KEY = 'blair-board-hidden-calendars';
const AGENDA_VISIBLE_KEY = 'blair-board-agenda-visible';
const AGENDA_WIDTH_KEY = 'blair-board-agenda-width';

const DEFAULT_AGENDA_WIDTH = 288; // 18rem = 288px
const MIN_AGENDA_WIDTH = 200;
const MAX_AGENDA_WIDTH = 600;

export class CalendarState {
	events = $state<CalendarEvent[]>([]);
	currentView = $state<CalendarView>(this.loadPersistedView());
	referenceDate = $state<Date>(new Date());
	loading = $state(false);
	error = $state<string | null>(null);
	config = $state<ClientConfig | null>(null);
	hiddenCalendarIds = $state<Set<string>>(this.loadHiddenCalendars());
	agendaVisible = $state<boolean>(this.loadAgendaVisible());
	agendaWidth = $state<number>(this.loadAgendaWidth());

	private loadPersistedView(): CalendarView {
		if (typeof window === 'undefined') return 'week';
		try {
			const stored = localStorage.getItem(VIEW_STORAGE_KEY);
			if (stored && ['week', 'weeknext', '4week', 'month'].includes(stored)) {
				return stored as CalendarView;
			}
		} catch (e) {
			console.warn('Failed to load persisted view:', e);
		}
		return 'week';
	}

	ensureViewEnabled(): void {
		const enabledViews = this.config?.display.enabledViews;
		if (!enabledViews) return;
		if (!enabledViews.includes(this.currentView)) {
			const defaultView = this.config?.display.defaultView;
			const fallback =
				defaultView && enabledViews.includes(defaultView) ? defaultView : enabledViews[0];
			this.currentView = fallback;
			this.persistView(fallback);
		}
	}

	private persistView(view: CalendarView): void {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(VIEW_STORAGE_KEY, view);
		} catch (e) {
			console.warn('Failed to persist view:', e);
		}
	}

	private loadHiddenCalendars(): Set<string> {
		if (typeof window === 'undefined') return new Set();
		try {
			const stored = localStorage.getItem(HIDDEN_CALENDARS_KEY);
			if (stored) {
				return new Set(JSON.parse(stored));
			}
		} catch (e) {
			console.warn('Failed to load hidden calendars:', e);
		}
		return new Set();
	}

	private persistHiddenCalendars(): void {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(HIDDEN_CALENDARS_KEY, JSON.stringify([...this.hiddenCalendarIds]));
		} catch (e) {
			console.warn('Failed to persist hidden calendars:', e);
		}
	}

	private loadAgendaVisible(): boolean {
		if (typeof window === 'undefined') return true;
		try {
			const stored = localStorage.getItem(AGENDA_VISIBLE_KEY);
			if (stored !== null) {
				return stored === 'true';
			}
		} catch (e) {
			console.warn('Failed to load agenda visibility:', e);
		}
		return true;
	}

	private persistAgendaVisible(): void {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(AGENDA_VISIBLE_KEY, String(this.agendaVisible));
		} catch (e) {
			console.warn('Failed to persist agenda visibility:', e);
		}
	}

	private loadAgendaWidth(): number {
		if (typeof window === 'undefined') return DEFAULT_AGENDA_WIDTH;
		try {
			const stored = localStorage.getItem(AGENDA_WIDTH_KEY);
			if (stored) {
				const width = parseInt(stored, 10);
				if (!isNaN(width) && width >= MIN_AGENDA_WIDTH && width <= MAX_AGENDA_WIDTH) {
					return width;
				}
			}
		} catch (e) {
			console.warn('Failed to load agenda width:', e);
		}
		return DEFAULT_AGENDA_WIDTH;
	}

	private persistAgendaWidth(): void {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(AGENDA_WIDTH_KEY, String(this.agendaWidth));
		} catch (e) {
			console.warn('Failed to persist agenda width:', e);
		}
	}

	get weekStartsOn(): WeekStartsOn {
		return (this.config?.display.weekStartsOn ?? 1) as WeekStartsOn;
	}

	get visibleEvents(): CalendarEvent[] {
		const calendarMap = new Map(this.config?.calendars.map((c) => [c.id, c]) ?? []);
		return this.events.filter((e) => {
			if (this.hiddenCalendarIds.has(e.calendarId)) return false;
			const cal = calendarMap.get(e.calendarId);
			if (cal && !e.allDay && cal.hideTimedEvents) return false;
			return true;
		});
	}

	get agendaEvents(): CalendarEvent[] {
		const days = this.config?.display.agendaDays ?? 2;
		const today = startOfDay(new Date());
		const cutoff = endOfDay(addDays(today, days - 1));

		return this.visibleEvents.filter((e) => {
			const start = parseISO(e.start);
			const end = parseISO(e.end);
			return end >= today && start <= cutoff;
		});
	}

	get calendarViewEvents(): CalendarEvent[] {
		const range = getViewRange(this.currentView, this.referenceDate, this.weekStartsOn);

		return this.visibleEvents.filter((e) => {
			const start = parseISO(e.start);
			const end = parseISO(e.end);
			return end >= range.start && start <= range.end;
		});
	}

	get periodLabel(): string {
		if (this.currentView === 'week') {
			return formatWeekLabel(this.referenceDate, this.weekStartsOn);
		}
		if (this.currentView === 'weeknext') {
			return formatWeekNextLabel(this.referenceDate, this.weekStartsOn);
		}
		if (this.currentView === '4week') {
			return format4WeekLabel(this.referenceDate, this.weekStartsOn);
		}
		return formatMonthLabel(this.referenceDate);
	}

	async fetchEvents(): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			const params = new URLSearchParams({
				view: this.currentView,
				date: this.referenceDate.toISOString()
			});
			const res = await fetch(`/api/events?${params}`);
			if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);

			const data = await res.json();
			this.events = data.events;
			this.config = data.config;
			this.ensureViewEnabled();
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to fetch events';
			console.error('Failed to fetch calendar events:', err);
		} finally {
			this.loading = false;
		}
	}

	navigatePrevious(): void {
		if (this.currentView === 'week' || this.currentView === 'weeknext') {
			this.referenceDate = addDays(this.referenceDate, -7);
		} else if (this.currentView === '4week') {
			this.referenceDate = addDays(this.referenceDate, -28);
		} else {
			const d = new Date(this.referenceDate);
			d.setMonth(d.getMonth() - 1);
			this.referenceDate = d;
		}
	}

	navigateNext(): void {
		if (this.currentView === 'week' || this.currentView === 'weeknext') {
			this.referenceDate = addDays(this.referenceDate, 7);
		} else if (this.currentView === '4week') {
			this.referenceDate = addDays(this.referenceDate, 28);
		} else {
			const d = new Date(this.referenceDate);
			d.setMonth(d.getMonth() + 1);
			this.referenceDate = d;
		}
	}

	navigateToday(): void {
		this.referenceDate = new Date();
	}

	setView(view: CalendarView): void {
		this.currentView = view;
		this.persistView(view);
	}

	toggleCalendarVisibility(calendarId: string): void {
		const newSet = new Set(this.hiddenCalendarIds);
		if (newSet.has(calendarId)) {
			newSet.delete(calendarId);
		} else {
			newSet.add(calendarId);
		}
		this.hiddenCalendarIds = newSet;
		this.persistHiddenCalendars();
	}

	isCalendarVisible(calendarId: string): boolean {
		return !this.hiddenCalendarIds.has(calendarId);
	}

	toggleAgenda(): void {
		this.agendaVisible = !this.agendaVisible;
		this.persistAgendaVisible();
	}

	setAgendaWidth(width: number): void {
		// Clamp width to min/max bounds
		this.agendaWidth = Math.max(MIN_AGENDA_WIDTH, Math.min(MAX_AGENDA_WIDTH, width));
		this.persistAgendaWidth();
	}
}
