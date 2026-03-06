/**
 * Extract visible text or selector text. Unified output; empty result is explicit.
 */

export interface ExtractTextOutput {
  textBlocks: string[];
  isEmpty: boolean;
}

export function normalizeTextBlocks(raw: string[]): ExtractTextOutput {
  const textBlocks = raw.filter((s) => s != null && String(s).trim().length > 0).map((s) => String(s).trim());
  return {
    textBlocks,
    isEmpty: textBlocks.length === 0,
  };
}
