/**
 * Browser adapter interface. All tools must use this layer, not Playwright directly.
 * Enables swapping to a remote provider later.
 */

import type { BrowserSessionMeta } from '../types/session.js';
import type { PageSnapshot } from '../types/snapshot.js';
import type { TableExtractionResult, FormExtractionResult } from '../types/extraction.js';
import type { InteractiveElementSummary } from '../types/snapshot.js';

/** Opaque handle for a browser session. Only the adapter implementation knows its shape. */
export interface BrowserSessionHandle {
  readonly sessionId: string;
}

export interface CreateSessionOptions {
  sessionId: string;
  browserType: 'chromium';
  headless: boolean;
  storageStatePath?: string;
  launchTimeoutMs?: number;
  actionTimeoutMs?: number;
}

export interface NavigateResult {
  url: string;
  title?: string;
}

export interface ScreenshotResult {
  path: string;
}

export interface ExtractTextResult {
  textBlocks: string[];
}

export interface BrowserAdapter {
  createSession(options: CreateSessionOptions): Promise<BrowserSessionHandle>;

  /** Return handle for session if it exists, null otherwise. */
  getSession(sessionId: string): BrowserSessionHandle | null;

  closeSession(handle: BrowserSessionHandle): Promise<void>;

  navigate(
    handle: BrowserSessionHandle,
    url: string,
    timeoutMs?: number
  ): Promise<NavigateResult>;

  click(
    handle: BrowserSessionHandle,
    selector: string,
    timeoutMs?: number
  ): Promise<void>;

  fill(
    handle: BrowserSessionHandle,
    selector: string,
    value: string,
    timeoutMs?: number
  ): Promise<void>;

  selectOption(
    handle: BrowserSessionHandle,
    selector: string,
    values: string | string[],
    timeoutMs?: number
  ): Promise<void>;

  waitFor(
    handle: BrowserSessionHandle,
    timeoutMs: number
  ): Promise<void>;

  scroll(
    handle: BrowserSessionHandle,
    options: { x?: number; y?: number; selector?: string; scrollIntoView?: boolean }
  ): Promise<void>;

  screenshot(
    handle: BrowserSessionHandle,
    path: string
  ): Promise<ScreenshotResult>;

  snapshot(
    handle: BrowserSessionHandle,
    detailLevel: 'minimal' | 'normal' | 'rich'
  ): Promise<PageSnapshot>;

  extractText(
    handle: BrowserSessionHandle,
    selector?: string,
    mode?: 'page' | 'selector'
  ): Promise<ExtractTextResult & { sourceUrl: string; extractedAt: string }>;

  extractTable(
    handle: BrowserSessionHandle,
    selector?: string,
    outputFormat?: 'json' | 'csv',
    pageLimit?: number
  ): Promise<TableExtractionResult>;

  extractForm(
    handle: BrowserSessionHandle,
    selector?: string
  ): Promise<FormExtractionResult>;

  getInteractiveElements(
    handle: BrowserSessionHandle
  ): Promise<{ sourceUrl: string; elements: InteractiveElementSummary[] }>;

  saveStorageState(handle: BrowserSessionHandle, path: string): Promise<void>;

  loadStorageState(handle: BrowserSessionHandle, path: string): Promise<void>;

  /**
   * Set how the next native dialog (alert/confirm/prompt) will be handled.
   * Call this before the action that triggers the dialog (e.g. before click that triggers confirm()).
   */
  setDialogResponse(
    handle: BrowserSessionHandle,
    options: { accept: boolean; promptText?: string }
  ): Promise<void>;
}
