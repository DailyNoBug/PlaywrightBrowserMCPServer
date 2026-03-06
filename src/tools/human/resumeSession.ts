import { z } from 'zod';
import type { HumanCoordinator } from '../../human/humanCoordinator.js';

export const resumeSessionInputSchema = z.object({
  sessionId: z.string(),
});

export type ResumeSessionInput = z.infer<typeof resumeSessionInputSchema>;

export async function resumeSession(
  humanCoordinator: HumanCoordinator,
  input: ResumeSessionInput
): Promise<{
  sessionId: string;
  status: string;
  currentUrl?: string;
  authState: 'logged_in' | 'login_required' | 'unknown';
}> {
  return humanCoordinator.resumeSession(input.sessionId);
}
