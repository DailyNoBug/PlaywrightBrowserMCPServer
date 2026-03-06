import { z } from 'zod';
import type { SessionManager } from '../../browser/sessionManager.js';
import { createToolError } from '../../server/error.js';

export const generatePlaywrightScriptInputSchema = z.object({
  sessionId: z.string(),
  target: z.enum(['login_flow', 'current_page', 'extraction_flow']).optional(),
});

export async function generatePlaywrightScript(
  sessionManager: SessionManager,
  input: z.infer<typeof generatePlaywrightScriptInputSchema>
): Promise<{ language: 'typescript'; code: string; notes: string[] }> {
  const session = sessionManager.getSession(input.sessionId);
  if (!session) {
    throw new Error(JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${input.sessionId} not found`)));
  }
  const meta = session.meta;
  const target = input.target ?? 'current_page';
  const notes: string[] = [];
  let code = `// Playwright script - ${target}\n`;
  code += `// Session: ${meta.sessionId}, URL: ${meta.currentUrl ?? 'unknown'}\n\n`;
  code += `import { test } from '@playwright/test';\n\n`;
  code += `test('${target.replace(/_/g, ' ')}', async ({ page }) => {\n`;
  if (meta.currentUrl) {
    code += `  await page.goto('${meta.currentUrl}');\n`;
    notes.push('Navigate to current URL.');
  }
  code += `  // TODO: add selectors and actions from page snapshot\n`;
  code += `});\n`;
  notes.push('Fill in selectors and actions based on get_interactive_elements or snapshot.');
  return { language: 'typescript', code, notes };
}
