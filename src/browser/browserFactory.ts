/**
 * Factory for creating browser adapter instance.
 * Keeps adapter creation in one place for future remote provider swap.
 */

import type { BrowserAdapter } from './adapter.js';
import { PlaywrightAdapter } from './playwrightAdapter.js';

export interface BrowserFactoryOptions {
  actionTimeoutMs?: number;
}

export function createBrowserAdapter(options?: BrowserFactoryOptions): BrowserAdapter {
  return new PlaywrightAdapter({
    actionTimeoutMs: options?.actionTimeoutMs,
  });
}
