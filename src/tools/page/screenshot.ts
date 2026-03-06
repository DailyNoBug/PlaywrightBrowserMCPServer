import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import { createToolError } from '../../server/error.js';
import { resolve } from 'node:path';

export const screenshotInputSchema = z.object({
  sessionId: z.string(),
  path: z.string().optional(),
});

export async function takeScreenshot(
  sessionManager: SessionManager,
  baseDir: string,
  input: z.infer<typeof screenshotInputSchema>
): Promise<{ path: string }> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  const path = input.path ?? resolve(baseDir, 'exports', `screenshot-${Date.now()}.png`);
  const result = await sessionManager.getAdapter().screenshot(session.handle, path);
  return result;
}
