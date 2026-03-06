/**
 * Human state machine: events and transitions.
 * Pure logic for testing; no I/O.
 */

import type { PendingHumanAction } from '../types/session.js';

export type HumanEvent =
  | 'pause_requested'
  | 'auth_required_detected'
  | 'human_completed'
  | 'resume_requested'
  | 'session_invalid'
  | 'timeout_expired';

export type HumanState = 'idle' | 'waiting_for_human';

const TRANSITIONS: Partial<Record<HumanState, Partial<Record<HumanEvent, HumanState>>>> = {
  idle: {
    pause_requested: 'waiting_for_human',
    auth_required_detected: 'waiting_for_human',
  },
  waiting_for_human: {
    human_completed: 'idle',
    resume_requested: 'idle',
    session_invalid: 'idle',
    timeout_expired: 'idle',
  },
};

export function getNextHumanState(
  current: HumanState,
  event: HumanEvent
): HumanState {
  const next = TRANSITIONS[current]?.[event];
  if (next !== undefined) return next;
  return current;
}

export function isWaiting(state: HumanState): boolean {
  return state === 'waiting_for_human';
}

export function createPendingAction(
  reason: PendingHumanAction['reason'],
  instructions: string,
  options?: { url?: string; screenshotRef?: string }
): PendingHumanAction {
  return {
    reason,
    instructions,
    createdAt: new Date().toISOString(),
    url: options?.url,
    screenshotRef: options?.screenshotRef,
  };
}
