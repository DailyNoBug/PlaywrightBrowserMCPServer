import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import { createToolError } from '../../server/error.js';

export const getInteractiveElementsInputSchema = z.object({
  sessionId: z.string(),
});

export async function getInteractiveElements(
  sessionManager: SessionManager,
  input: z.infer<typeof getInteractiveElementsInputSchema>
): Promise<{
  sessionId: string;
  sourceUrl: string;
  elements: import('../../types/snapshot.js').InteractiveElementSummary[];
}> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  const result = await sessionManager.getAdapter().getInteractiveElements(session.handle);
  return {
    sessionId: input.sessionId,
    sourceUrl: result.sourceUrl,
    elements: result.elements,
  };
}
