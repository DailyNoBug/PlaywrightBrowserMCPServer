import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import type { PageSnapshot } from '../../types/snapshot.js';
import { createToolError } from '../../server/error.js';

export const snapshotInputSchema = z.object({
  sessionId: z.string(),
  detailLevel: z.enum(['minimal', 'normal', 'rich']).optional(),
});

export async function snapshot(
  sessionManager: SessionManager,
  defaultDetailLevel: 'minimal' | 'normal' | 'rich',
  input: z.infer<typeof snapshotInputSchema>
): Promise<PageSnapshot> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  const level = input.detailLevel ?? defaultDetailLevel;
  return sessionManager.getAdapter().snapshot(session.handle, level);
}
