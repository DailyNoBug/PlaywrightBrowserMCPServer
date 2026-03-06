/**
 * Manages human-in-the-loop state: pause, resume, query waiting state.
 */

import type { SessionManager } from '../browser/sessionManager.js';
import type { PendingHumanAction } from '../types/session.js';
import { createPendingAction } from './humanState.js';
import { detectAuthState } from '../browser/authDetector.js';
import { createToolError } from '../server/error.js';

export class HumanCoordinator {
  constructor(private readonly sessionManager: SessionManager) {}

  async pauseForHuman(
    sessionId: string,
    reason: PendingHumanAction['reason'],
    instructions: string,
    options?: { url?: string; screenshotRef?: string }
  ): Promise<{ sessionId: string; status: 'waiting_for_human'; pendingHumanAction: PendingHumanAction }> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${sessionId} not found`)));
    }
    const pendingHumanAction = createPendingAction(reason, instructions, options);
    this.sessionManager.setStatus(sessionId, 'waiting_for_human');
    this.sessionManager.updateMeta(sessionId, { pendingHumanAction });
    return {
      sessionId,
      status: 'waiting_for_human',
      pendingHumanAction,
    };
  }

  getHumanWaitState(sessionId: string): {
    waiting: boolean;
    pendingHumanAction?: PendingHumanAction | null;
  } {
    const meta = this.sessionManager.getSessionMeta(sessionId);
    if (!meta) {
      return { waiting: false, pendingHumanAction: null };
    }
    const waiting = meta.status === 'waiting_for_human';
    return {
      waiting,
      pendingHumanAction: meta.pendingHumanAction ?? null,
    };
  }

  async resumeSession(sessionId: string): Promise<{
    sessionId: string;
    status: string;
    currentUrl?: string;
    authState: 'logged_in' | 'login_required' | 'unknown';
  }> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${sessionId} not found`)));
    }
    if (session.meta.status !== 'waiting_for_human') {
      throw new Error(
        JSON.stringify(
          createToolError(
            'INVALID_INPUT',
            `Session ${sessionId} is not waiting for human (status: ${session.meta.status})`
          )
        )
      );
    }
    this.sessionManager.setStatus(sessionId, 'running');
    this.sessionManager.updateMeta(sessionId, { pendingHumanAction: null });
    const adapter = this.sessionManager.getAdapter();
    let authState: 'logged_in' | 'login_required' | 'unknown' = 'unknown';
    try {
      const snapshot = await adapter.snapshot(session.handle, 'minimal');
      const detected = detectAuthState({
        url: snapshot.url,
        visibleTextSummary: snapshot.visibleTextSummary,
        title: snapshot.title,
      });
      authState =
        detected === 'mfa_required' || detected === 'login_required'
          ? 'login_required'
          : detected === 'logged_in'
            ? 'logged_in'
            : 'unknown';
    } catch {
      // keep unknown
    }
    return {
      sessionId,
      status: 'running',
      currentUrl: session.meta.currentUrl,
      authState,
    };
  }
}
