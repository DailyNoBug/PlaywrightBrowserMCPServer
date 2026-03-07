import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrowserAdapter, BrowserSessionHandle, CreateSessionOptions } from '../../src/browser/adapter.js';
import { SessionManager } from '../../src/browser/sessionManager.js';

function createMockAdapter(): BrowserAdapter {
  const handles = new Map<string, BrowserSessionHandle>();
  return {
    createSession: vi.fn(async (options: CreateSessionOptions) => {
      const handle = { sessionId: options.sessionId };
      handles.set(options.sessionId, handle);
      return handle;
    }),
    getSession: vi.fn((sessionId: string) => handles.get(sessionId) ?? null),
    closeSession: vi.fn(async (handle: BrowserSessionHandle) => {
      handles.delete(handle.sessionId);
    }),
    navigate: vi.fn(),
    click: vi.fn(),
    fill: vi.fn(),
    selectOption: vi.fn(),
    waitFor: vi.fn(),
    scroll: vi.fn(),
    screenshot: vi.fn(),
    snapshot: vi.fn(),
    extractText: vi.fn(),
    extractTable: vi.fn(),
    extractForm: vi.fn(),
    getInteractiveElements: vi.fn(),
    saveStorageState: vi.fn(),
    loadStorageState: vi.fn(),
    setDialogResponse: vi.fn(),
  };
}

describe('SessionManager', () => {
  it('enforces maxSessions limit on createSession', async () => {
    const adapter = createMockAdapter();
    const manager = new SessionManager(adapter, undefined, { maxSessions: 2 });
    await manager.createSession({ headless: true });
    await manager.createSession({ headless: true });
    await expect(manager.createSession({ headless: true })).rejects.toThrow(/Max sessions limit reached/);
    expect(manager.getSessionCount()).toBe(2);
  });

  it('closeAllSessions removes all sessions', async () => {
    const adapter = createMockAdapter();
    const manager = new SessionManager(adapter, undefined, { maxSessions: 5 });
    const a = await manager.createSession({ headless: true });
    const b = await manager.createSession({ headless: true });
    expect(manager.getSessionCount()).toBe(2);
    await manager.closeAllSessions();
    expect(manager.getSessionCount()).toBe(0);
    expect(manager.getSession(a.sessionId)).toBeNull();
    expect(manager.getSession(b.sessionId)).toBeNull();
  });

  it('state transition running -> closed via closeSession', async () => {
    const adapter = createMockAdapter();
    const manager = new SessionManager(adapter, undefined);
    const { sessionId } = await manager.createSession({ headless: true });
    const meta = manager.getSessionMeta(sessionId);
    expect(meta?.status).toBe('running');
    await manager.closeSession(sessionId);
    expect(manager.getSession(sessionId)).toBeNull();
  });

  it('invalid state transition throws', async () => {
    const adapter = createMockAdapter();
    const manager = new SessionManager(adapter, undefined);
    const { sessionId } = await manager.createSession({ headless: true });
    expect(() => manager.setStatus(sessionId, 'created')).toThrow(/Invalid session state transition/);
  });
});
