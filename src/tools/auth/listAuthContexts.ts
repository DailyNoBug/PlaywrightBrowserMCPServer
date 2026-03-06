import type { AuthContextService } from '../../auth/authContextService.js';
import type { AuthContextMeta } from '../../types/auth.js';

export async function listAuthContexts(
  authContextService: AuthContextService
): Promise<{ authContexts: AuthContextMeta[] }> {
  const authContexts = await authContextService.listAuthContexts();
  return { authContexts };
}
