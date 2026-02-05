import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppConfigSchema, type AppConfig } from '$lib/types/config';

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
	if (cachedConfig) return cachedConfig;

	const configPath = resolve('config.json');
	let raw: string;

	try {
		raw = readFileSync(configPath, 'utf-8');
	} catch {
		throw new Error(
			`Could not read config.json at ${configPath}. Copy config.example.json to config.json and fill in your calendar URLs.`
		);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`config.json is not valid JSON`);
	}

	const result = AppConfigSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error(`Invalid config.json: ${JSON.stringify(result.error.issues, null, 2)}`);
	}

	cachedConfig = result.data;
	return cachedConfig;
}

export function clearConfigCache(): void {
	cachedConfig = null;
}
