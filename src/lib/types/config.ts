import { z } from 'zod/v4';

export const CalendarSourceSchema = z.object({
	id: z.string(),
	name: z.string(),
	url: z.url(),
	colour: z.string(),
	enabled: z.boolean(),
	hideTimedEvents: z.boolean().default(false)
});

export const DisplayConfigSchema = z.object({
	defaultView: z.enum(['week', 'weeknext', '4week', 'month']),
	enabledViews: z
		.array(z.enum(['week', 'weeknext', '4week', 'month']))
		.min(1)
		.default(['week', 'weeknext', '4week', 'month']),
	agendaDays: z.number().int().min(1).max(14).default(2),
	weekStartsOn: z.literal(0).or(z.literal(1)).default(1),
	timeFormat: z.enum(['12h', '24h']).default('12h'),
	gridStartHour: z.number().int().min(0).max(23).default(6),
	gridEndHour: z.number().int().min(1).max(24).default(22)
});

export const RefreshConfigSchema = z.object({
	clientPollIntervalMinutes: z.number().min(1).default(5),
	serverCacheTTLMinutes: z.number().min(1).default(15)
});

export const AppConfigSchema = z.object({
	calendars: z.array(CalendarSourceSchema).min(1),
	display: DisplayConfigSchema,
	refresh: RefreshConfigSchema,
	timezone: z.string().default('Europe/London')
});

export type CalendarSourceConfig = z.infer<typeof CalendarSourceSchema>;
export type DisplayConfig = z.infer<typeof DisplayConfigSchema>;
export type RefreshConfig = z.infer<typeof RefreshConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;

export interface ClientConfig {
	display: DisplayConfig;
	calendars: Array<{
		id: string;
		name: string;
		colour: string;
		enabled: boolean;
		hideTimedEvents: boolean;
	}>;
	refresh: RefreshConfig;
	timezone: string;
}
