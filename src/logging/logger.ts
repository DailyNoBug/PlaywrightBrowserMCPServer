import pino from 'pino';
import type { LoggingConfig } from '../config/schema.js';

const VALID_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

function resolveLogLevel(envLevel: string | undefined, configLevel: string): string {
  const raw = (envLevel ?? configLevel).toLowerCase();
  return VALID_LEVELS.includes(raw as (typeof VALID_LEVELS)[number]) ? raw : configLevel;
}

export interface LogContext {
  module?: string;
  event?: string;
  sessionId?: string;
  authContextId?: string;
  toolName?: string;
  url?: string;
  message?: string;
  errorCode?: string;
  [key: string]: unknown;
}

let loggerInstance: pino.Logger | null = null;

export function createLogger(config: LoggingConfig): pino.Logger {
  const level = resolveLogLevel(process.env.LOG_LEVEL, config.level);
  loggerInstance = pino({
    level,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    ...(process.env.NODE_ENV !== 'production' && {
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
  });
  return loggerInstance;
}

export function getLogger(): pino.Logger {
  if (!loggerInstance) {
    loggerInstance = pino({ level: 'info' });
  }
  return loggerInstance;
}

export function logEvent(
  log: pino.Logger,
  level: 'debug' | 'info' | 'warn' | 'error',
  event: string,
  context: LogContext = {}
): void {
  log[level]({ ...context, event }, context.message ?? event);
}
