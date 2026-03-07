import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import { createToolError } from '../../server/error.js';

export const handleDialogInputSchema = z.object({
  sessionId: z.string(),
  /** true = accept (confirm/alert), false = dismiss (cancel). */
  accept: z.boolean(),
  /** For prompt() only: text to submit when accept is true. Ignored for alert/confirm. */
  promptText: z.string().optional(),
});

export type HandleDialogInput = z.infer<typeof handleDialogInputSchema>;

export async function handleDialog(
  sessionManager: SessionManager,
  input: HandleDialogInput
): Promise<{ success: true }> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) {
    throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  }
  await sessionManager.getAdapter().setDialogResponse(session.handle, {
    accept: input.accept,
    promptText: input.promptText,
  });
  return { success: true };
}
