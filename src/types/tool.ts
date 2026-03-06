/**
 * Re-export types used by tool handlers (convenience).
 */

export type { BrowserSessionMeta, PendingHumanAction } from './session.js';
export type { AuthContextMeta } from './auth.js';
export type {
  PageSnapshot,
  InteractiveElementSummary,
  KeySection,
  TableSummary,
  FormSummary,
} from './snapshot.js';
export type {
  TableExtractionResult,
  FormExtractionResult,
  FormFieldSchema,
  TextExtractionResult,
  InteractiveElementsResult,
} from './extraction.js';
export type { ToolError, ToolErrorCode } from './error.js';
export type { SessionStatus, DetailLevel, BrowserType } from './common.js';
