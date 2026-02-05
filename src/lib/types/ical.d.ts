declare module 'ical.js' {
	export function parse(input: string): any;

	export class Component {
		constructor(jCal: any[] | Component, parent?: Component);
		name: string;
		getAllSubcomponents(name?: string): Component[];
		hasProperty(name: string): boolean;
	}

	export class Event {
		constructor(component?: Component, options?: { strictExceptions?: boolean });
		uid: string;
		summary: string;
		startDate: Time;
		endDate: Time;
		isRecurring(): boolean;
		iterator(startTime?: Time): RecurIterator;
		getOccurrenceDetails(occurrence: Time): {
			startDate: Time;
			endDate: Time;
			item: Event;
			recurrenceId: Time;
		};
	}

	export class Time {
		isDate: boolean;
		toJSDate(): Date;
		toString(): string;
	}

	export class RecurIterator {
		next(): Time | null;
	}

	export default {
		parse,
		Component,
		Event,
		Time
	};
}
