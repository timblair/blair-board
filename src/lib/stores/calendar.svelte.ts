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

export class CalendarState {
	events = $state<CalendarEvent[]>([]);
	currentView = $state<CalendarView>(this.loadPersistedView());
	referenceDate = $state<Date>(new Date());
	loading = $state(false);
	error = $state<string | null>(null);
	config = $state<ClientConfig | null>(null);

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

	private persistView(view: CalendarView): void {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(VIEW_STORAGE_KEY, view);
		} catch (e) {
			console.warn('Failed to persist view:', e);
		}
	}

	get weekStartsOn(): WeekStartsOn {
		return (this.config?.display.weekStartsOn ?? 1) as WeekStartsOn;
	}

	get agendaEvents(): CalendarEvent[] {
		const days = this.config?.display.agendaDays ?? 2;
		const today = startOfDay(new Date());
		const cutoff = endOfDay(addDays(today, days - 1));

		return this.events.filter((e) => {
			const start = parseISO(e.start);
			const end = parseISO(e.end);
			return end >= today && start <= cutoff;
		});
	}

	get calendarViewEvents(): CalendarEvent[] {
		const range = getViewRange(this.currentView, this.referenceDate, this.weekStartsOn);

		return this.events.filter((e) => {
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
}
