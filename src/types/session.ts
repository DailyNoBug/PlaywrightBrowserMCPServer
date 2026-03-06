/**
 * Browser session and pending human action types.
 */

import type { SessionStatus, BrowserType } from './common.js';
export type { SessionStatus };
import type { ToolError } from './error.js';

export interface PendingHumanAction {
  reason:
    | 'LOGIN_REQUIRED'
    | 'MFA_REQUIRED'
    | 'CAPTCHA_REQUIRED'
    | 'SCAN_REQUIRED'
    | 'MANUAL_CONFIRMATION_REQUIRED'
    | 'USER_REQUESTED_PAUSE';
  instructions: string;
  createdAt: string;
  url?: string;
  screenshotRef?: string;
}

export interface BrowserSessionMeta {
  sessionId: string;
  status: SessionStatus;
  browserType: BrowserType;
  headless: boolean;
  currentUrl?: string;
  createdAt: string;
  updatedAt: string;
  authContextId?: string;
  pendingHumanAction?: PendingHumanAction | null;
  lastSnapshotRef?: string | null;
  lastError?: ToolError | null;
}
