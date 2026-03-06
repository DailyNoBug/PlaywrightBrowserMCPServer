import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import { createToolError } from '../../server/error.js';

export const selectOptionInputSchema = z.object({
  sessionId: z.string(),
  selector: z.string(),
  values: z.union([z.string(), z.array(z.string())]),
  timeoutMs: z.number().int().positive().optional(),
});

export async function selectOption(
  sessionManager: SessionManager,
  input: z.infer<typeof selectOptionInputSchema>
): Promise<void> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  const values = Array.isArray(input.values) ? input.values : [input.values];
  await sessionManager.getAdapter().selectOption(session.handle, input.selector, values, input.timeoutMs);
}
