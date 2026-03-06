import { z } from 'zod';
import type { AuthContextService } from '../../auth/authContextService.js';

export const deleteAuthContextInputSchema = z.object({
  authContextId: z.string(),
});

export type DeleteAuthContextInput = z.infer<typeof deleteAuthContextInputSchema>;

export async function deleteAuthContext(
  authContextService: AuthContextService,
  input: DeleteAuthContextInput
): Promise<{ success: true }> {
  await authContextService.deleteAuthContext(input.authContextId);
  return { success: true };
}
