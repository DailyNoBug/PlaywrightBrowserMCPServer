import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import { createToolError } from '../../server/error.js';
import { isDomainAllowed } from '../../security/domainGuard.js';

export const navigateInputSchema = z.object({
  sessionId: z.string(),
  url: z.string().url(),
  timeoutMs: z.number().int().positive().optional(),
});

export type NavigateInput = z.infer<typeof navigateInputSchema>;

export async function navigate(
  sessionManager: SessionManager,
  input: NavigateInput,
  securityConfig?: { domainWhitelistEnabled?: boolean; allowDomains: string[]; denyDomains: string[] }
): Promise<{ sessionId: string; currentUrl: string; title?: string }> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) {
    throw new Error(
      JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`))
    );
  }
  const whitelistOn = securityConfig?.domainWhitelistEnabled !== false;
  if (whitelistOn && securityConfig && !isDomainAllowed(input.url, securityConfig)) {
    throw new Error(
      JSON.stringify(createToolError('DOMAIN_NOT_ALLOWED', `URL domain not allowed: ${input.url}`))
    );
  }
  const result = await sessionManager.getAdapter().navigate(
    session.handle,
    input.url,
    input.timeoutMs
  );
  sessionManager.updateMeta(input.sessionId, { currentUrl: result.url });
  return {
    sessionId: input.sessionId,
    currentUrl: result.url,
    title: result.title,
  };
}
