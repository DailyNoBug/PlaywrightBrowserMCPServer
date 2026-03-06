/**
 * Common types used across the Browser MCP Server.
 */

export type SessionStatus =
  | 'created'
  | 'running'
  | 'waiting_for_human'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'closed';

export type BrowserType = 'chromium';

export type DetailLevel = 'minimal' | 'normal' | 'rich';
