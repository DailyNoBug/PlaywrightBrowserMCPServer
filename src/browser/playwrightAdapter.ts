/**
 * Playwright implementation of BrowserAdapter.
 * One browser context per session; supports headless/headed and storageState.
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { BrowserAdapter, BrowserSessionHandle, CreateSessionOptions } from './adapter.js';
import type { PageSnapshot } from '../types/snapshot.js';
import type { TableExtractionResult, FormExtractionResult, FormFieldSchema } from '../types/extraction.js';
import type { InteractiveElementSummary } from '../types/snapshot.js';
import { createToolError, type ToolErrorCode } from '../server/error.js';
import { nowIso } from '../utils/time.js';
import { generateSnapshotId } from '../utils/ids.js';

function mapPlaywrightError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  let code: ToolErrorCode = 'UNKNOWN_ERROR';
  if (msg.includes('Timeout') || msg.includes('timeout')) code = 'TIMEOUT';
  else if (msg.includes('net::') || msg.includes('Navigation')) code = 'NAVIGATION_FAILED';
  else if (msg.includes('Selector') || msg.includes('not found') || msg.includes('locator')) code = 'ELEMENT_NOT_FOUND';
  else if (msg.includes('intercept') || msg.includes('visible') || msg.includes('enabled')) code = 'ELEMENT_NOT_INTERACTABLE';
  throw new Error(JSON.stringify(createToolError(code, msg, { retryable: code === 'TIMEOUT' })));
}

interface SessionState {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

interface PendingDialogResponse {
  accept: boolean;
  promptText?: string;
}

export class PlaywrightAdapter implements BrowserAdapter {
  private readonly sessions = new Map<string, SessionState>();
  private readonly pendingDialogResponses = new Map<string, PendingDialogResponse>();
  private readonly actionTimeoutMs: number;

  constructor(options: { actionTimeoutMs?: number } = {}) {
    this.actionTimeoutMs = options.actionTimeoutMs ?? 10000;
  }

  private getState(handle: BrowserSessionHandle): SessionState {
    const state = this.sessions.get(handle.sessionId);
    if (!state) {
      throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${handle.sessionId} not found`)));
    }
    return state;
  }

  async createSession(options: CreateSessionOptions): Promise<BrowserSessionHandle> {
    try {
      const timeout = options.launchTimeoutMs ?? 8000;
      const browser = await chromium.launch({
        headless: options.headless,
        timeout,
      });
      const contextOptions: { storageState?: string } = {};
      if (options.storageStatePath) {
        contextOptions.storageState = options.storageStatePath;
      }
      const context = await browser.newContext(contextOptions);
      const actionTimeout = options.actionTimeoutMs ?? this.actionTimeoutMs;
      context.setDefaultTimeout(actionTimeout);
      const page = await context.newPage();
      const sessionId = options.sessionId;
      context.on('dialog', (dialog) => {
        const pending = this.pendingDialogResponses.get(sessionId);
        this.pendingDialogResponses.delete(sessionId);
        if (pending) {
          if (pending.accept) dialog.accept(pending.promptText).catch(() => {});
          else dialog.dismiss().catch(() => {});
        } else {
          dialog.dismiss().catch(() => {});
        }
      });
      this.sessions.set(sessionId, { browser, context, page });
      return { sessionId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = msg.includes('Timeout') || msg.includes('timeout') ? 'TIMEOUT' : 'BROWSER_START_FAILED';
      throw new Error(JSON.stringify(createToolError(code, msg, { retryable: true })));
    }
  }

  getSession(sessionId: string): BrowserSessionHandle | null {
    return this.sessions.has(sessionId) ? { sessionId } : null;
  }

  async closeSession(handle: BrowserSessionHandle): Promise<void> {
    const state = this.sessions.get(handle.sessionId);
    this.pendingDialogResponses.delete(handle.sessionId);
    if (state) {
      this.sessions.delete(handle.sessionId);
      await state.context.close().catch(() => {});
      await state.browser.close().catch(() => {});
    }
  }

  async setDialogResponse(
    handle: BrowserSessionHandle,
    options: { accept: boolean; promptText?: string }
  ): Promise<void> {
    this.getState(handle);
    this.pendingDialogResponses.set(handle.sessionId, {
      accept: options.accept,
      promptText: options.promptText,
    });
  }

  async navigate(
    handle: BrowserSessionHandle,
    url: string,
    timeoutMs?: number
  ): Promise<{ url: string; title?: string }> {
    try {
      const { page } = this.getState(handle);
      const timeout = timeoutMs ?? this.actionTimeoutMs;
      await page.goto(url, { timeout });
      return {
        url: page.url(),
        title: await page.title().catch(() => undefined),
      };
    } catch (e) {
      mapPlaywrightError(e);
    }
  }

  async click(
    handle: BrowserSessionHandle,
    selector: string,
    timeoutMs?: number
  ): Promise<void> {
    try {
      const { page } = this.getState(handle);
      const timeout = timeoutMs ?? this.actionTimeoutMs;
      await page.click(selector, { timeout });
    } catch (e) {
      mapPlaywrightError(e);
    }
  }

  async fill(
    handle: BrowserSessionHandle,
    selector: string,
    value: string,
    timeoutMs?: number
  ): Promise<void> {
    try {
      const { page } = this.getState(handle);
      const timeout = timeoutMs ?? this.actionTimeoutMs;
      await page.fill(selector, value, { timeout });
    } catch (e) {
      mapPlaywrightError(e);
    }
  }

  async selectOption(
    handle: BrowserSessionHandle,
    selector: string,
    values: string | string[],
    timeoutMs?: number
  ): Promise<void> {
    const { page } = this.getState(handle);
    const timeout = timeoutMs ?? this.actionTimeoutMs;
    await page.selectOption(selector, values, { timeout });
  }

  async waitFor(handle: BrowserSessionHandle, timeoutMs: number): Promise<void> {
    const { page } = this.getState(handle);
    await page.waitForTimeout(timeoutMs);
  }

  async scroll(
    handle: BrowserSessionHandle,
    options: { x?: number; y?: number; selector?: string; scrollIntoView?: boolean }
  ): Promise<void> {
    const { page } = this.getState(handle);
    if (options.selector && options.scrollIntoView) {
      await page.locator(options.selector).first().scrollIntoViewIfNeeded();
    } else if (options.x !== undefined || options.y !== undefined) {
      await page.evaluate(({ x = 0, y = 0 }) => window.scrollBy(x, y), {
        x: options.x ?? 0,
        y: options.y ?? 0,
      });
    }
  }

  async screenshot(
    handle: BrowserSessionHandle,
    path: string
  ): Promise<{ path: string }> {
    const { page } = this.getState(handle);
    await page.screenshot({ path });
    return { path };
  }

  async snapshot(
    handle: BrowserSessionHandle,
    _detailLevel: 'minimal' | 'normal' | 'rich'
  ): Promise<PageSnapshot> {
    const { page } = this.getState(handle);
    const title = await page.title().catch(() => '');
    const url = page.url();
    const visibleText = await page.evaluate(() => document.body?.innerText?.slice(0, 2000) ?? '').catch(() => '');
    return {
      snapshotId: generateSnapshotId(),
      sessionId: handle.sessionId,
      title,
      url,
      detailLevel: _detailLevel,
      visibleTextSummary: visibleText,
      keySections: [],
      interactiveElementsSummary: [],
      tablesSummary: [],
      formsSummary: [],
      generatedAt: nowIso(),
    };
  }

  async extractText(
    handle: BrowserSessionHandle,
    selector?: string,
    mode?: 'page' | 'selector'
  ): Promise<{ sourceUrl: string; extractedAt: string; textBlocks: string[] }> {
    const { page } = this.getState(handle);
    const sourceUrl = page.url();
    let textBlocks: string[];
    if (mode === 'selector' && selector) {
      const el = await page.locator(selector).first().elementHandle();
      textBlocks = el ? [await el.evaluate((e) => (e as HTMLElement).innerText)] : [];
    } else {
      const text = await page.evaluate(() => document.body?.innerText ?? '');
      textBlocks = text ? [text] : [];
    }
    return {
      sourceUrl,
      extractedAt: nowIso(),
      textBlocks,
    };
  }

  async extractTable(
    handle: BrowserSessionHandle,
    _selector?: string,
    _outputFormat?: 'json' | 'csv',
    _pageLimit?: number
  ): Promise<TableExtractionResult> {
    const { page } = this.getState(handle);
    const extractionId = `ext-${Date.now()}`;
    const rows: Array<Record<string, string | number | boolean | null>> = [];
    const columns: string[] = [];
    const table = await page.locator('table').first().elementHandle();
    if (table) {
      const data = await table.evaluate((t) => {
        const thead = t.querySelector('thead');
        const ths = thead?.querySelectorAll('th') ?? t.querySelectorAll('tr')[0]?.querySelectorAll('th, td');
        const colNames = ths ? Array.from(ths).map((c) => c.textContent?.trim() ?? '') : [];
        const trs = t.querySelectorAll('tbody tr');
        const rows: Record<string, string>[] = [];
        trs.forEach((tr) => {
          const cells = tr.querySelectorAll('td');
          const row: Record<string, string> = {};
          cells.forEach((cell, i) => {
            const key = colNames[i] ?? `col${i}`;
            row[key] = cell.textContent?.trim() ?? '';
          });
          if (Object.keys(row).length) rows.push(row);
        });
        return { colNames: colNames.length ? colNames : (rows[0] ? Object.keys(rows[0]) : []), rows };
      });
      columns.push(...data.colNames);
      rows.push(...(data.rows as Array<Record<string, string | number | boolean | null>>));
    }
    return {
      extractionId,
      sessionId: handle.sessionId,
      sourceUrl: page.url(),
      extractedAt: nowIso(),
      columns,
      rows,
      rowCount: rows.length,
    };
  }

  async extractForm(
    handle: BrowserSessionHandle,
    _selector?: string
  ): Promise<FormExtractionResult> {
    const { page } = this.getState(handle);
    const extractionId = `ext-${Date.now()}`;
    const fields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs.map((el) => {
        const name = (el as HTMLInputElement).name ?? (el as HTMLInputElement).id ?? '';
        const type = ((el as HTMLInputElement).type ?? el.tagName.toLowerCase()) as string;
        const label = document.querySelector(`label[for="${(el as HTMLInputElement).id}"]`)?.textContent?.trim();
        return {
          type: type === 'textarea' ? 'textarea' : (type as string),
          name,
          label: label ?? undefined,
          required: (el as HTMLInputElement).required ?? false,
        };
      });
    });
    return {
      extractionId,
      sessionId: handle.sessionId,
      sourceUrl: page.url(),
      extractedAt: nowIso(),
      fields: fields.map((f): FormFieldSchema => {
        const t = f.type === 'text' || f.type === 'email' || f.type === 'password' || f.type === 'textarea'
          ? f.type
          : 'text';
        return { type: t, name: f.name, label: f.label, required: f.required };
      }),
    };
  }

  async getInteractiveElements(
    handle: BrowserSessionHandle
  ): Promise<{ sourceUrl: string; elements: InteractiveElementSummary[] }> {
    const { page } = this.getState(handle);
    const elements = await page.evaluate(() => {
      const result: InteractiveElementSummary[] = [];
      const buttons = document.querySelectorAll('button, [role="button"]');
      buttons.forEach((el) => {
        result.push({
          type: 'button',
          text: (el as HTMLElement).innerText?.slice(0, 50),
          selectorHint: el.id ? `#${el.id}` : undefined,
        });
      });
      const links = document.querySelectorAll('a[href]');
      links.forEach((el) => {
        result.push({
          type: 'link',
          text: (el as HTMLElement).innerText?.slice(0, 50),
          selectorHint: el.id ? `#${el.id}` : undefined,
        });
      });
      const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
      inputs.forEach((el) => {
        result.push({
          type: 'input',
          label: (document.querySelector(`label[for="${(el as HTMLInputElement).id}"]`) as HTMLElement)?.innerText?.slice(0, 50),
          selectorHint: (el as HTMLInputElement).name ? `[name="${(el as HTMLInputElement).name}"]` : undefined,
        });
      });
      return result;
    });
    return { sourceUrl: page.url(), elements };
  }

  async saveStorageState(handle: BrowserSessionHandle, path: string): Promise<void> {
    const { context } = this.getState(handle);
    await context.storageState({ path });
  }

  async loadStorageState(handle: BrowserSessionHandle, path: string): Promise<void> {
    const { readFile } = await import('node:fs/promises');
    const { context } = this.getState(handle);
    const content = await readFile(path, 'utf-8');
    const state = JSON.parse(content) as { cookies?: Array<{ name: string; value: string; domain: string; path: string }> };
    if (state.cookies?.length) {
      await context.addCookies(state.cookies);
    }
  }
}
