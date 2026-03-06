/**
 * Resource: browser://sessions - current sessions summary.
 */

import type { SessionManager } from '../browser/sessionManager.js';
import { redactObject } from '../security/redact.js';

export async function getSessionsResource(
  sessionManager: SessionManager
): Promise<{ sessions: Array<{ sessionId: string; status: string; currentUrl?: string; createdAt: string }> }> {
  const sessions = sessionManager.listSessions();
  const summary = sessions.map((s) => ({
    sessionId: s.sessionId,
    status: s.status,
    currentUrl: s.currentUrl,
    createdAt: s.createdAt,
  }));
  return { sessions: redactObject(summary) as typeof summary };
}
