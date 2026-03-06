import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import type { TableExtractionResult } from '../../types/extraction.js';
import { createToolError } from '../../server/error.js';

export const extractTableInputSchema = z.object({
  sessionId: z.string(),
  selector: z.string().optional(),
  outputFormat: z.enum(['json', 'csv']).optional(),
  pageLimit: z.number().int().positive().optional(),
});

export async function extractTable(
  sessionManager: SessionManager,
  input: z.infer<typeof extractTableInputSchema>
): Promise<TableExtractionResult> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  return sessionManager.getAdapter().extractTable(
    session.handle,
    input.selector,
    input.outputFormat,
    input.pageLimit
  );
}
