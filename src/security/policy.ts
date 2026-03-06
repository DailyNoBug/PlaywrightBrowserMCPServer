/**
 * Policy limits: max export rows, max pagination pages, etc.
 */

export interface ExportPolicy {
  maxExportRows: number;
  maxPaginationPages: number;
}

export function checkExportRows(count: number, policy: ExportPolicy): void {
  if (count > policy.maxExportRows) {
    throw new Error(
      JSON.stringify({
        errorCode: 'EXPORT_FAILED',
        message: `Export exceeds max rows (${policy.maxExportRows}). Got ${count}.`,
      })
    );
  }
}

export function checkPaginationPage(page: number, policy: ExportPolicy): void {
  if (page > policy.maxPaginationPages) {
    throw new Error(
      JSON.stringify({
        errorCode: 'EXPORT_FAILED',
        message: `Page ${page} exceeds max pagination pages (${policy.maxPaginationPages}).`,
      })
    );
  }
}
