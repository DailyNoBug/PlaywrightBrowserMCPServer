/**
 * Extract table or table-like layout data. Unified output; empty result is explicit.
 */

import type { TableExtractionResult } from '../../types/extraction.js';

export interface RawTableData {
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
}

export function buildTableExtractionResult(
  sessionId: string,
  sourceUrl: string,
  extractedAt: string,
  raw: RawTableData,
  extractionId: string
): TableExtractionResult {
  const { columns, rows } = raw;
  return {
    extractionId,
    sessionId,
    sourceUrl,
    extractedAt,
    columns: columns.length > 0 ? columns : [],
    rows,
    rowCount: rows.length,
  };
}

export function isEmptyTableResult(result: TableExtractionResult): boolean {
  return result.rowCount === 0 && result.columns.length === 0;
}
