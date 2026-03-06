import { z } from 'zod';
import type { LatestExtractionsStore } from './latestExtractions.js';

export const generateDataSchemaInputSchema = z.object({
  source: z.enum(['latest_table', 'latest_form']),
  format: z.enum(['typescript', 'zod', 'json-schema']),
});

export function generateDataSchema(
  store: LatestExtractionsStore,
  input: z.infer<typeof generateDataSchemaInputSchema>
): { format: 'typescript' | 'zod' | 'json-schema'; code: string } {
  if (input.source === 'latest_table' && store.table) {
    const { columns, rows } = store.table;
    const sample = rows[0] ?? {};
    if (input.format === 'typescript') {
      const fields = columns.map((c) => `  ${c}: ${typeof sample[c]};`).join('\n');
      return { format: input.format, code: `export interface Row {\n${fields}\n}\n` };
    }
    if (input.format === 'zod') {
      const fields = columns.map((c) => `  ${c}: z.${typeof sample[c] === 'number' ? 'number' : 'string'}();`).join('\n');
      return { format: input.format, code: `const RowSchema = z.object({\n${fields}\n});\n` };
    }
    const props = columns.reduce((acc, c) => ({ ...acc, [c]: { type: typeof sample[c] } }), {});
    return { format: input.format, code: JSON.stringify({ type: 'object', properties: props }, null, 2) };
  }
  if (input.source === 'latest_form' && store.form) {
    const fields = store.form.fields;
    if (input.format === 'typescript') {
      const lines = fields.map((f) => `  ${f.name ?? 'field'}: string;`).join('\n');
      return { format: input.format, code: `export interface FormData {\n${lines}\n}\n` };
    }
    if (input.format === 'zod') {
      const lines = fields.map((f) => `  ${f.name ?? 'field'}: z.string(),`).join('\n');
      return { format: input.format, code: `const FormSchema = z.object({\n${lines}\n});\n` };
    }
    const props = fields.reduce((acc, f) => ({ ...acc, [f.name ?? 'field']: { type: 'string' } }), {});
    return { format: input.format, code: JSON.stringify({ type: 'object', properties: props }, null, 2) };
  }
  throw new Error(
    JSON.stringify({
      errorCode: 'INVALID_INPUT',
      message: `No ${input.source} data available. Run extract_table or extract_form first.`,
    })
  );
}
