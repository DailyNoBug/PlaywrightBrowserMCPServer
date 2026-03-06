import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';

export const closeSessionInputSchema = z.object({
  sessionId: z.string(),
});

export type CloseSessionInput = z.infer<typeof closeSessionInputSchema>;

export async function closeSession(
  sessionManager: SessionManager,
  input: CloseSessionInput
): Promise<{ success: true }> {
  await sessionManager.closeSession(input.sessionId);
  return { success: true };
}
