/**
 * Integration test: create session -> navigate -> snapshot -> close.
 * Verifies the browser stack works against a real site (example.com).
 * Run: npm run test:integration (or npm test, with 30s timeout).
 * Requires: npx playwright install chromium (if not already).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadConfig } from '../../src/config/config.js';
import { FileStorage } from '../../src/storage/fileStorage.js';
import { PlaywrightAdapter } from '../../src/browser/playwrightAdapter.js';
import { SessionManager } from '../../src/browser/sessionManager.js';

const TEST_URL = 'https://example.com/';

describe('Browser flow integration', () => {
  let config: Awaited<ReturnType<typeof loadConfig>>;
  let adapter: PlaywrightAdapter;
  let sessionManager: SessionManager;
  let sessionId: string;

  beforeAll(() => {
    config = loadConfig();
    const storage = new FileStorage({ baseDir: config.storage.baseDir });
    adapter = new PlaywrightAdapter({ actionTimeoutMs: config.browser.actionTimeoutMs });
    sessionManager = new SessionManager(adapter, undefined, { maxSessions: config.browser.maxSessions });
  });

  afterAll(async () => {
    await sessionManager.closeAllSessions();
  });

  it(
    'create_session -> navigate -> snapshot -> close_session',
    async () => {
      const { sessionId: id, meta } = await sessionManager.createSession({
        headless: true,
        startUrl: undefined,
      });
      sessionId = id;
      expect(meta.status).toBe('running');
      expect(sessionId).toBeDefined();

      const session = sessionManager.getSession(sessionId);
      expect(session).not.toBeNull();

      const navResult = await adapter.navigate(session!.handle, TEST_URL);
      expect(navResult.url).toContain('example.com');

      const snapshot = await adapter.snapshot(session!.handle, 'minimal');
      expect(snapshot.url).toContain('example.com');
      expect(snapshot.title).toBeDefined();
      expect(snapshot.generatedAt).toBeDefined();
      expect(snapshot.visibleTextSummary).toBeDefined();
      expect(snapshot.visibleTextSummary.length).toBeGreaterThan(0);
      expect(snapshot.visibleTextSummary.toLowerCase()).toMatch(/example/);

      await sessionManager.closeSession(sessionId);
      expect(sessionManager.getSession(sessionId)).toBeNull();
    },
    { timeout: 30000 }
  );
});
