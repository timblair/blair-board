import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppConfigSchema, type AppConfig } from '$lib/types/config';

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
	if (cachedConfig) return cachedConfig;

	let raw: string;

	if (process.env.CONFIG) {
		raw = process.env.CONFIG;
	} else {
		const configPath = resolve('config.json');
		try {
			raw = readFileSync(configPath, 'utf-8');
		} catch {
			throw new Error(
				`Could not read config.json at ${configPath}. Either set a CONFIG environment variable or copy config.example.json to config.json.`
			);
		}
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`Config is not valid JSON`);
	}

	const result = AppConfigSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error(`Invalid config: ${JSON.stringify(result.error.issues, null, 2)}`);
	}

	cachedConfig = result.data;
	return cachedConfig;
}

export function clearConfigCache(): void {
	cachedConfig = null;
}
