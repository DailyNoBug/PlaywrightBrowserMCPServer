import { z } from 'zod';
import type { HumanCoordinator } from '../../human/humanCoordinator.js';
import type { PendingHumanAction } from '../../types/session.js';

export const getHumanWaitStateInputSchema = z.object({
  sessionId: z.string(),
});

export type GetHumanWaitStateInput = z.infer<typeof getHumanWaitStateInputSchema>;

export async function getHumanWaitState(
  humanCoordinator: HumanCoordinator,
  input: GetHumanWaitStateInput
): Promise<{
  waiting: boolean;
  pendingHumanAction?: PendingHumanAction | null;
}> {
  return humanCoordinator.getHumanWaitState(input.sessionId);
}
