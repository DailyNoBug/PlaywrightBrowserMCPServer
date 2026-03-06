import type { ToolError, ToolErrorCode } from '../types/error.js';

export type { ToolErrorCode };
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
