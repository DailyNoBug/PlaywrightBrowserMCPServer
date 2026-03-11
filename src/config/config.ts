import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { configSchema, type AppConfig } from './schema.js';

const DEFAULT_CONFIG_PATH = 'config/default.json';

/** Resolve application root, compatible with pkg-packed binary and normal Node. */
function getAppRoot(): string {
  const isPkged = (process as unknown as { pkg?: unknown }).pkg !== undefined;
  return isPkged ? dirname(process.execPath) : process.cwd();
}

/** Ensure storage baseDir exists; create if missing. */
function ensureStorageDir(baseDir: string): void {
  const absolute = resolve(getAppRoot(), baseDir);
  if (!existsSync(absolute)) {
    mkdirSync(absolute, { recursive: true });
  }
}

export function loadConfig(configPath?: string): AppConfig {
  const path = resolve(
    getAppRoot(),
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
  const config = result.data;
  ensureStorageDir(config.storage.baseDir);
  return config;
}

export type { AppConfig } from './schema.js';
