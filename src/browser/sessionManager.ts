/**
 * In-memory session registry. Manages session lifecycle and state transitions.
 * Only controlled methods may change state; no arbitrary string assignment.
 */

import type { Logger } from 'pino';
import type { BrowserAdapter, BrowserSessionHandle } from './adapter.js';
import type { BrowserSessionMeta, SessionStatus } from '../types/session.js';
import { createToolError } from '../server/error.js';
import { nowIso } from '../utils/time.js';
import { generateSessionId } from '../utils/ids.js';
import { logEvent } from '../logging/logger.js';

const VALID_TRANSITIONS: Partial<Record<SessionStatus, SessionStatus[]>> = {
  created: ['running', 'failed', 'closed'],
  running: ['waiting_for_human', 'completed', 'failed', 'closed'],
  waiting_for_human: ['running', 'failed', 'closed'],
  completed: ['closed'],
  failed: ['closed'],
};

function assertTransition(from: SessionStatus, to: SessionStatus): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new Error(`Invalid session state transition: ${from} -> ${to}`);
  }
}

interface SessionEntry {
  meta: BrowserSessionMeta;
  handle: BrowserSessionHandle;
}

export interface SessionManagerOptions {
  maxSessions?: number;
}

export class SessionManager {
  private readonly sessions = new Map<string, SessionEntry>();
  private readonly adapter: BrowserAdapter;
  private readonly logger?: Logger;
  private readonly maxSessions: number;

  constructor(adapter: BrowserAdapter, logger?: Logger, options?: SessionManagerOptions) {
    this.adapter = adapter;
    this.logger = logger;
    this.maxSessions = options?.maxSessions ?? 10;
  }

  async createSession(options: {
    browserType?: 'chromium';
    headless?: boolean;
    authContextId?: string;
    startUrl?: string;
    storageStatePath?: string;
    launchTimeoutMs?: number;
    actionTimeoutMs?: number;
  }): Promise<{ sessionId: string; meta: BrowserSessionMeta }> {
    if (this.sessions.size >= this.maxSessions) {
      throw new Error(
        JSON.stringify(createToolError('INVALID_INPUT', `Max sessions limit reached (${this.maxSessions}). Close a session first.`))
      );
    }
    const sessionId = generateSessionId();
    const headless = options.headless ?? false;
    const meta: BrowserSessionMeta = {
      sessionId,
      status: 'created',
      browserType: 'chromium',
      headless,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const handle = await this.adapter.createSession({
      sessionId,
      browserType: 'chromium',
      headless,
      storageStatePath: options.storageStatePath,
      launchTimeoutMs: options.launchTimeoutMs,
      actionTimeoutMs: options.actionTimeoutMs,
    });
    this.sessions.set(sessionId, { meta, handle });
    this.setStatus(sessionId, 'running');
    if (options.authContextId) meta.authContextId = options.authContextId;
    if (options.startUrl) {
      try {
        const result = await this.adapter.navigate(handle, options.startUrl);
        meta.currentUrl = result.url;
      } catch {
        // keep session running; navigation error can be handled by caller
      }
    }
    meta.updatedAt = nowIso();
    return { sessionId, meta: this.getSessionMeta(sessionId)! };
  }

  getSession(sessionId: string): { meta: BrowserSessionMeta; handle: BrowserSessionHandle } | null {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;
    return { meta: entry.meta, handle: entry.handle };
  }

  getSessionMeta(sessionId: string): BrowserSessionMeta | null {
    return this.sessions.get(sessionId)?.meta ?? null;
  }

  listSessions(): BrowserSessionMeta[] {
    return Array.from(this.sessions.values()).map((e) => e.meta);
  }

  setStatus(sessionId: string, status: SessionStatus): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error(`Session ${sessionId} not found`);
    const from = entry.meta.status;
    assertTransition(from, status);
    entry.meta.status = status;
    entry.meta.updatedAt = nowIso();
    if (this.logger) {
      logEvent(this.logger, 'info', 'session_status_changed', { sessionId, from, to: status });
    }
  }

  updateMeta(
    sessionId: string,
    updates: Partial<Pick<BrowserSessionMeta, 'currentUrl' | 'pendingHumanAction' | 'lastSnapshotRef' | 'lastError' | 'authContextId'>>
  ): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error(`Session ${sessionId} not found`);
    Object.assign(entry.meta, updates);
    entry.meta.updatedAt = nowIso();
  }

  async closeSession(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (!entry) throw new Error(`Session ${sessionId} not found`);
    try {
      await this.adapter.closeSession(entry.handle);
    } finally {
      this.sessions.delete(sessionId);
    }
  }

  /** Close all sessions (e.g. on process shutdown). Ignores per-session errors. */
  async closeAllSessions(): Promise<void> {
    const ids = Array.from(this.sessions.keys());
    for (const sessionId of ids) {
      try {
        await this.closeSession(sessionId);
        if (this.logger) {
          logEvent(this.logger, 'info', 'session_closed', { sessionId, reason: 'shutdown' });
        }
      } catch (err) {
        if (this.logger) {
          const message = err instanceof Error ? err.message : String(err);
          logEvent(this.logger, 'warn', 'session_close_failed', { sessionId, error: message });
        }
      }
    }
  }

  getAdapter(): BrowserAdapter {
    return this.adapter;
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}
