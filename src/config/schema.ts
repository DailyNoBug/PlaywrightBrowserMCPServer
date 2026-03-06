import { z } from 'zod';

export const browserConfigSchema = z.object({
  defaultType: z.enum(['chromium']).default('chromium'),
  headless: z.boolean().default(false),
  launchTimeoutMs: z.number().int().positive().default(8000),
  actionTimeoutMs: z.number().int().positive().default(10000),
});

export const securityConfigSchema = z.object({
  allowDomains: z.array(z.string()).default([]),
  denyDomains: z.array(z.string()).default([]),
  allowPersistAuthContext: z.boolean().default(true),
  maxExportRows: z.number().int().positive().default(1000),
  maxPaginationPages: z.number().int().positive().default(10),
});

export const storageConfigSchema = z.object({
  baseDir: z.string().default('./data'),
});

export const loggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const snapshotConfigSchema = z.object({
  defaultDetailLevel: z.enum(['minimal', 'normal', 'rich']).default('normal'),
});

export const configSchema = z.object({
  browser: browserConfigSchema,
  security: securityConfigSchema,
  storage: storageConfigSchema,
  logging: loggingConfigSchema,
  snapshot: snapshotConfigSchema,
});

export type BrowserConfig = z.infer<typeof browserConfigSchema>;
export type SecurityConfig = z.infer<typeof securityConfigSchema>;
export type StorageConfig = z.infer<typeof storageConfigSchema>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
export type SnapshotConfig = z.infer<typeof snapshotConfigSchema>;
export type AppConfig = z.infer<typeof configSchema>;
