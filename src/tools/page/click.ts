import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import { createToolError } from '../../server/error.js';

export const clickInputSchema = z.object({
  sessionId: z.string(),
  selector: z.string(),
  timeoutMs: z.number().int().positive().optional(),
});

export async function click(
  sessionManager: SessionManager,
  input: z.infer<typeof clickInputSchema>
): Promise<void> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  await sessionManager.getAdapter().click(session.handle, input.selector, input.timeoutMs);
}
