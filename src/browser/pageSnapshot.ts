/**
 * Builds structured page snapshot for LLM consumption.
 * Actual snapshot logic is in PlaywrightAdapter.snapshot(); this module
 * can hold shared helpers or richer formatting if needed.
 */

import type { PageSnapshot } from '../types/snapshot.js';

export function formatSnapshotSummary(snapshot: PageSnapshot): string {
  return [
    `Title: ${snapshot.title}`,
    `URL: ${snapshot.url}`,
    `Text (summary): ${snapshot.visibleTextSummary.slice(0, 500)}...`,
    `Sections: ${snapshot.keySections.length}, Tables: ${snapshot.tablesSummary.length}, Forms: ${snapshot.formsSummary.length}`,
  ].join('\n');
}
