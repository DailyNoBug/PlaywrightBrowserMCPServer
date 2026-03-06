/**
 * In-memory cache of the latest extraction per type (table, form, text).
 * Used by export_extraction_result and generate_data_schema.
 */

import type { TableExtractionResult, FormExtractionResult, TextExtractionResult } from '../../types/extraction.js';

export interface LatestExtractionsStore {
  table: TableExtractionResult | null;
  form: FormExtractionResult | null;
  text: (TextExtractionResult & { sessionId: string }) | null;
  sessionId: string | null;
}

export function createLatestExtractionsStore(): LatestExtractionsStore {
  return { table: null, form: null, text: null, sessionId: null };
}
