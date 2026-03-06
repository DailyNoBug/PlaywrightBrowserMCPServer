import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import { createToolError } from '../../server/error.js';

export const extractTextInputSchema = z.object({
  sessionId: z.string(),
  selector: z.string().optional(),
  mode: z.enum(['page', 'selector']).optional(),
});

export async function extractText(
  sessionManager: SessionManager,
  input: z.infer<typeof extractTextInputSchema>
): Promise<{
  sessionId: string;
  sourceUrl: string;
  extractedAt: string;
  textBlocks: string[];
}> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  const result = await sessionManager.getAdapter().extractText(
    session.handle,
    input.selector,
    input.mode ?? 'page'
  );
  return {
    sessionId: input.sessionId,
    sourceUrl: result.sourceUrl,
    extractedAt: result.extractedAt,
    textBlocks: result.textBlocks,
  };
}
