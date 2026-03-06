/**
 * Extraction result types for text, table, form.
 */

import type { InteractiveElementSummary } from './snapshot.js';

export interface TableExtractionResult {
  extractionId: string;
  sessionId: string;
  sourceUrl: string;
  extractedAt: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  rowCount: number;
  paginationInfo?: {
    page?: number;
    pageSize?: number;
    hasNextPage?: boolean;
  };
}

export interface FormFieldSchema {
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'email'
    | 'password'
    | 'select'
    | 'checkbox'
    | 'radio'
    | 'date'
    | 'unknown';
  name?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  defaultValue?: string | boolean | number | null;
}

export interface FormExtractionResult {
  extractionId: string;
  sessionId: string;
  sourceUrl: string;
  extractedAt: string;
  fields: FormFieldSchema[];
}

export interface TextExtractionResult {
  sessionId: string;
  sourceUrl: string;
  extractedAt: string;
  textBlocks: string[];
}

export type InteractiveElementsResult = {
  sessionId: string;
  sourceUrl: string;
  elements: InteractiveElementSummary[];
};
