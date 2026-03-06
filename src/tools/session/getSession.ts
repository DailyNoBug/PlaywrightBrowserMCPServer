import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import type { BrowserSessionMeta } from '../../types/session.js';

export const getSessionInputSchema = z.object({
  sessionId: z.string(),
});

export type GetSessionInput = z.infer<typeof getSessionInputSchema>;

export async function getSession(
  sessionManager: SessionManager,
  input: GetSessionInput
): Promise<BrowserSessionMeta | null> {
  return sessionManager.getSessionMeta(input.sessionId);
}
