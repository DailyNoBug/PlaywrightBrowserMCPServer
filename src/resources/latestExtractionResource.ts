/**
 * Resource: browser://latest-extraction/{sessionId} - latest extraction summary for session.
 */

import type { LatestExtractionsStore } from '../tools/devassist/latestExtractions.js';

export function getLatestExtractionResource(
  store: LatestExtractionsStore,
  sessionId: string
): { table?: { rowCount: number; columns: string[] }; form?: { fieldCount: number }; text?: { blockCount: number } } | null {
  if (store.sessionId !== sessionId) return null;
  const out: { table?: { rowCount: number; columns: string[] }; form?: { fieldCount: number }; text?: { blockCount: number } } = {};
  if (store.table) out.table = { rowCount: store.table.rowCount, columns: store.table.columns };
  if (store.form) out.form = { fieldCount: store.form.fields.length };
  if (store.text) out.text = { blockCount: store.text.textBlocks?.length ?? 0 };
  return Object.keys(out).length ? out : null;
}
