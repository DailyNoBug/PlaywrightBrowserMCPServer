/**
 * Resource: browser://latest-snapshot/{sessionId} - latest PageSnapshot for session.
 */

import type { SessionManager } from '../browser/sessionManager.js';
import type { PageSnapshot } from '../types/snapshot.js';

export async function getLatestSnapshotResource(
  sessionManager: SessionManager,
  sessionId: string
): Promise<PageSnapshot | null> {
  const session = sessionManager.getSession(sessionId);
  if (!session) return null;
  const snapshot = await sessionManager.getAdapter().snapshot(session.handle, 'normal');
  return snapshot;
}
