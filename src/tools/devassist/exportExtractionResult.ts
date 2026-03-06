import { z } from 'zod';
import type { StorageProvider } from '../../storage/storage.js';
import type { LatestExtractionsStore } from './latestExtractions.js';
import { checkExportRows } from '../../security/policy.js';
import { redactObject } from '../../security/redact.js';
import { resolve } from 'node:path';

export const exportExtractionResultInputSchema = z.object({
  source: z.enum(['latest_table', 'latest_form', 'latest_text']),
  format: z.enum(['json', 'csv', 'md']),
});

export async function exportExtractionResult(
  store: LatestExtractionsStore,
  storage: StorageProvider,
  baseDir: string,
  policy: { maxExportRows: number },
  input: z.infer<typeof exportExtractionResultInputSchema>
): Promise<{ exportPath: string }> {
  const exportId = `export-${Date.now()}`;
  const dir = resolve(baseDir, 'exports');
  const path = `${dir}/${exportId}.${input.format}`;
  let content: string;
  if (input.source === 'latest_table' && store.table) {
    checkExportRows(store.table.rowCount, { maxExportRows: policy.maxExportRows, maxPaginationPages: 10 });
    const data = redactObject(store.table);
    if (input.format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else if (input.format === 'csv') {
      const headers = store.table.columns.join(',');
      const rows = store.table.rows.map((r) => store.table!.columns.map((c) => JSON.stringify((r as Record<string, unknown>)[c])).join(','));
      content = [headers, ...rows].join('\n');
    } else {
      content = `# Table\n\n| ${store.table.columns.join(' | ')} |\n| ${store.table.columns.map(() => '---').join(' | ')} |\n`;
      store.table.rows.forEach((r) => {
        content += `| ${store.table!.columns.map((c) => String((r as Record<string, unknown>)[c] ?? '')).join(' | ')} |\n`;
      });
    }
  } else if (input.source === 'latest_form' && store.form) {
    const data = redactObject(store.form);
    content = input.format === 'json' ? JSON.stringify(data, null, 2) : `# Form\n\n${JSON.stringify(data, null, 2)}`;
  } else if (input.source === 'latest_text' && store.text) {
    const data = redactObject(store.text);
    content = input.format === 'json' ? JSON.stringify(data, null, 2) : (store.text.textBlocks?.join('\n\n') ?? '');
  } else {
    throw new Error(
      JSON.stringify({
        errorCode: 'EXPORT_FAILED',
        message: `No ${input.source} data available. Run the corresponding extract tool first.`,
      })
    );
  }
  const relPath = `exports/${exportId}.${input.format}`;
  await storage.writeText(relPath, content);
  return { exportPath: resolve(baseDir, relPath) };
}
