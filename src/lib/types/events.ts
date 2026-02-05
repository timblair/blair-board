export interface CalendarEvent {
	id: string;
	title: string;
	start: string; // ISO 8601
	end: string; // ISO 8601
	allDay: boolean;
	colour: string;
	calendarId: string;
	calendarName: string;
}
