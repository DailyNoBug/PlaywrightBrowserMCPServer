import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import { createToolError } from '../../server/error.js';

export const generatePageObjectInputSchema = z.object({
  sessionId: z.string(),
});

export async function generatePageObject(
  sessionManager: SessionManager,
  input: z.infer<typeof generatePageObjectInputSchema>
): Promise<{ language: 'typescript'; code: string }> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) {
    throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  }
  const adapter = sessionManager.getAdapter();
  const snapshot = await adapter.snapshot(session.handle, 'normal');
  const elements = snapshot.interactiveElementsSummary;
  let code = `// Page Object - ${snapshot.title}\n`;
  code += `// URL: ${snapshot.url}\n\n`;
  code += `export class Page {\n`;
  code += `  constructor(private page: import('playwright').Page) {}\n\n`;
  code += `  async goto() {\n    await this.page.goto('${snapshot.url}');\n  }\n\n`;
  elements.slice(0, 10).forEach((el, i) => {
    const name = (el.label || el.text || el.type + i).replace(/\W/g, '_');
    const selector = el.selectorHint ?? `[data-testid="${name}"]`;
    code += `  get ${name}() { return this.page.locator('${selector}'); }\n`;
  });
  code += `}\n`;
  return { language: 'typescript', code };
}
