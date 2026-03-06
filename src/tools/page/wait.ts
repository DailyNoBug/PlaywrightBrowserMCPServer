import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import { createToolError } from '../../server/error.js';

export const waitInputSchema = z.object({
  sessionId: z.string(),
  timeoutMs: z.number().int().positive(),
});

export async function wait(
  sessionManager: SessionManager,
  input: z.infer<typeof waitInputSchema>
): Promise<void> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  await sessionManager.getAdapter().waitFor(session.handle, input.timeoutMs);
}
