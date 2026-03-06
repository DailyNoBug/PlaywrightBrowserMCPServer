/**
 * Resource: browser://auth-contexts - saved auth contexts list.
 */

import type { AuthContextService } from '../auth/authContextService.js';

export async function getAuthContextsResource(
  authContextService: AuthContextService
): Promise<{ authContexts: Array<{ authContextId: string; name: string; domain: string; environment?: string }> }> {
  const list = await authContextService.listAuthContexts();
  const summary = list.map((a) => ({
    authContextId: a.authContextId,
    name: a.name,
    domain: a.domain,
    environment: a.environment,
  }));
  return { authContexts: summary };
}
