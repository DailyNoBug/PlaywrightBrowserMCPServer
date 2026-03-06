import type { SessionManager } from '../../browser/sessionManager.js';
import type { BrowserSessionMeta } from '../../types/session.js';

export async function listSessions(
  sessionManager: SessionManager
): Promise<{ sessions: BrowserSessionMeta[] }> {
  const sessions = sessionManager.listSessions();
  return { sessions };
}
