import { z } from 'zod';
import type { AuthContextService } from '../../auth/authContextService.js';

export const loadAuthContextInputSchema = z.object({
  sessionId: z.string(),
  authContextId: z.string(),
});

export type LoadAuthContextInput = z.infer<typeof loadAuthContextInputSchema>;

export async function loadAuthContext(
  authContextService: AuthContextService,
  sessionManager: import('../../browser/sessionManager.js').SessionManager,
  input: LoadAuthContextInput
): Promise<{ sessionId: string; authContextId: string; success: true }> {
  await authContextService.loadAuthContext(sessionManager, input.sessionId, input.authContextId);
  return {
    sessionId: input.sessionId,
    authContextId: input.authContextId,
    success: true,
  };
}
