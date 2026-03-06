import { z } from 'zod';
import type { AuthContextService } from '../../auth/authContextService.js';
import type { AuthContextMeta } from '../../types/auth.js';

export const saveAuthContextInputSchema = z.object({
  sessionId: z.string(),
  name: z.string(),
  domain: z.string(),
  environment: z.string().optional(),
});

export type SaveAuthContextInput = z.infer<typeof saveAuthContextInputSchema>;

export async function saveAuthContext(
  authContextService: AuthContextService,
  sessionManager: import('../../browser/sessionManager.js').SessionManager,
  input: SaveAuthContextInput
): Promise<AuthContextMeta> {
  return authContextService.saveAuthContext(sessionManager, input.sessionId, {
    name: input.name,
    domain: input.domain,
    environment: input.environment,
  });
}
