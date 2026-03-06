/**
 * Page snapshot and extraction summary types.
 */

import type { DetailLevel } from './common.js';

export interface InteractiveElementSummary {
  type:
    | 'button'
    | 'link'
    | 'input'
    | 'select'
    | 'checkbox'
    | 'radio'
    | 'tab'
    | 'dialog'
    | 'pagination';
  text?: string;
  label?: string;
  selectorHint?: string;
  disabled?: boolean;
}

export interface KeySection {
  heading?: string;
  textSummary: string;
}

export interface TableSummary {
  columnCount: number;
  rowCount: number;
  columnNames?: string[];
}

export interface FormSummary {
  fieldCount: number;
  fieldNames?: string[];
}

export interface PageSnapshot {
  snapshotId: string;
  sessionId: string;
  title: string;
  url: string;
  detailLevel: DetailLevel;
  visibleTextSummary: string;
  keySections: KeySection[];
  interactiveElementsSummary: InteractiveElementSummary[];
  tablesSummary: TableSummary[];
  formsSummary: FormSummary[];
  generatedAt: string;
}
