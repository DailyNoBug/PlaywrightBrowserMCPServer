import { z } from 'zod';
import type { HumanCoordinator } from '../../human/humanCoordinator.js';
import type { PendingHumanAction } from '../../types/session.js';

const reasonSchema = z.enum([
  'LOGIN_REQUIRED',
  'MFA_REQUIRED',
  'CAPTCHA_REQUIRED',
  'SCAN_REQUIRED',
  'MANUAL_CONFIRMATION_REQUIRED',
  'USER_REQUESTED_PAUSE',
]);

export const pauseForHumanInputSchema = z.object({
  sessionId: z.string(),
  reason: reasonSchema,
  instructions: z.string(),
});

export type PauseForHumanInput = z.infer<typeof pauseForHumanInputSchema>;

export async function pauseForHuman(
  humanCoordinator: HumanCoordinator,
  input: PauseForHumanInput
): Promise<{
  sessionId: string;
  status: 'waiting_for_human';
  pendingHumanAction: PendingHumanAction;
}> {
  return humanCoordinator.pauseForHuman(
    input.sessionId,
    input.reason as PendingHumanAction['reason'],
    input.instructions
  );
}
