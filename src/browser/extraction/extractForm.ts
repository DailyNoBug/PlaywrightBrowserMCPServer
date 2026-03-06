/**
 * Extract form schema. Unified output; empty result is explicit.
 */

import type { FormExtractionResult, FormFieldSchema } from '../../types/extraction.js';

export interface RawFormField {
  type: string;
  name?: string;
  label?: string;
  required?: boolean;
}

export function buildFormExtractionResult(
  sessionId: string,
  sourceUrl: string,
  extractedAt: string,
  rawFields: RawFormField[],
  extractionId: string
): FormExtractionResult {
  const fields: FormFieldSchema[] = rawFields.map((f) => ({
    type: (f.type === 'text' || f.type === 'textarea' || f.type === 'email' || f.type === 'password' || f.type === 'number' || f.type === 'checkbox' || f.type === 'radio' || f.type === 'date' ? f.type : 'unknown') as FormFieldSchema['type'],
    name: f.name,
    label: f.label,
    required: f.required,
  }));
  return {
    extractionId,
    sessionId,
    sourceUrl,
    extractedAt,
    fields,
  };
}

export function isEmptyFormResult(result: FormExtractionResult): boolean {
  return result.fields.length === 0;
}
