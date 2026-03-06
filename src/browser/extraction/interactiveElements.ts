/**
 * Output key interactive elements summary. Unified structure.
 */

import type { InteractiveElementSummary } from '../../types/snapshot.js';

export interface RawInteractiveElement {
  type: InteractiveElementSummary['type'];
  text?: string;
  label?: string;
  selectorHint?: string;
  disabled?: boolean;
}

export function buildInteractiveElementsSummary(raw: RawInteractiveElement[]): InteractiveElementSummary[] {
  return raw.map((e) => ({
    type: e.type,
    text: e.text,
    label: e.label,
    selectorHint: e.selectorHint,
    disabled: e.disabled,
  }));
}

export function emptyInteractiveElementsSummary(): InteractiveElementSummary[] {
  return [];
}
