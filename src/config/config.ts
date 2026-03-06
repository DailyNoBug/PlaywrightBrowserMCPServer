import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { configSchema, type AppConfig } from './schema.js';

const DEFAULT_CONFIG_PATH = 'config/default.json';

export function loadConfig(configPath?: string): AppConfig {
  const path = resolve(
    process.cwd(),
    configPath ?? process.env.CONFIG_PATH ?? DEFAULT_CONFIG_PATH
  );
  let raw: unknown;
  try {
    const content = readFileSync(path, 'utf-8');
    raw = JSON.parse(content) as unknown;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load config from ${path}: ${message}`);
  }
  const result = configSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid config: ${issues}`);
  }
  return result.data;
}

export type { AppConfig } from './schema.js';
