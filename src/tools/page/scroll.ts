import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import { createToolError } from '../../server/error.js';

export const scrollInputSchema = z.object({
  sessionId: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  selector: z.string().optional(),
  scrollIntoView: z.boolean().optional(),
});

export async function scroll(
  sessionManager: SessionManager,
  input: z.infer<typeof scrollInputSchema>
): Promise<void> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  await sessionManager.getAdapter().scroll(session.handle, {
    x: input.x,
    y: input.y,
    selector: input.selector,
    scrollIntoView: input.scrollIntoView,
  });
}
