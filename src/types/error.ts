/**
 * Unified tool error type and factory.
 */

export type ToolErrorCode =
  | 'INVALID_INPUT'
  | 'SESSION_NOT_FOUND'
  | 'BROWSER_START_FAILED'
  | 'NAVIGATION_FAILED'
  | 'ELEMENT_NOT_FOUND'
  | 'ELEMENT_NOT_INTERACTABLE'
  | 'TIMEOUT'
  | 'AUTH_CONTEXT_INVALID'
  | 'HUMAN_ACTION_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'DOMAIN_NOT_ALLOWED'
  | 'EXPORT_FAILED'
  | 'STORAGE_FAILED'
  | 'UNKNOWN_ERROR';

export interface ToolError {
  errorCode: ToolErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

export function createToolError(
  errorCode: ToolErrorCode,
  message: string,
  options?: { details?: Record<string, unknown>; retryable?: boolean }
): ToolError {
  return {
    errorCode,
    message,
    details: options?.details,
    retryable: options?.retryable,
  };
}
