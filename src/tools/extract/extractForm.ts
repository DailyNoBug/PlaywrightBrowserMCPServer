import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import type { FormExtractionResult } from '../../types/extraction.js';
import { createToolError } from '../../server/error.js';

export const extractFormInputSchema = z.object({
  sessionId: z.string(),
  selector: z.string().optional(),
});

export async function extractForm(
  sessionManager: SessionManager,
  input: z.infer<typeof extractFormInputSchema>
): Promise<FormExtractionResult> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  return sessionManager.getAdapter().extractForm(session.handle, input.selector);
}
