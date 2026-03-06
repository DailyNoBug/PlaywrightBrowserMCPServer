import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import type { SessionStatus } from '../../types/common.js';

export const createSessionInputSchema = z.object({
  browserType: z.enum(['chromium']).optional().default('chromium'),
  headless: z.boolean().optional().default(false),
  authContextId: z.string().optional(),
  startUrl: z.string().url().optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

export const createSessionOutputSchema = z.object({
  sessionId: z.string(),
  status: z.string() as z.ZodType<SessionStatus>,
  currentUrl: z.string().optional(),
});

export type CreateSessionOutput = z.infer<typeof createSessionOutputSchema>;

export async function createSession(
  sessionManager: SessionManager,
  storageStatePath: string | undefined,
  input: CreateSessionInput
): Promise<CreateSessionOutput> {
  const { sessionId, meta } = await sessionManager.createSession({
    browserType: input.browserType,
    headless: input.headless,
    authContextId: input.authContextId,
    startUrl: input.startUrl,
    storageStatePath,
  });
  return {
    sessionId,
    status: meta.status,
    currentUrl: meta.currentUrl,
  };
}
