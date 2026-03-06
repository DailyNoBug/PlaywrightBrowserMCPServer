import { describe, it, expect } from 'vitest';
import { getNextHumanState, isWaiting, createPendingAction } from '../../src/human/humanState.js';

describe('humanState', () => {
  it('transitions idle -> waiting_for_human on pause_requested', () => {
    expect(getNextHumanState('idle', 'pause_requested')).toBe('waiting_for_human');
  });

  it('transitions waiting_for_human -> idle on resume_requested', () => {
    expect(getNextHumanState('waiting_for_human', 'resume_requested')).toBe('idle');
  });

  it('isWaiting returns true only for waiting_for_human', () => {
    expect(isWaiting('waiting_for_human')).toBe(true);
    expect(isWaiting('idle')).toBe(false);
  });

  it('createPendingAction returns object with reason and instructions', () => {
    const action = createPendingAction('LOGIN_REQUIRED', 'Please log in');
    expect(action.reason).toBe('LOGIN_REQUIRED');
    expect(action.instructions).toBe('Please log in');
    expect(action.createdAt).toBeDefined();
  });
});
