/**
 * Register all MCP tools with Zod schemas and handlers.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerDeps } from './createServer.js';
import { createToolError } from './error.js';
import * as sessionCreate from '../tools/session/createSession.js';
import * as sessionGet from '../tools/session/getSession.js';
import * as sessionList from '../tools/session/listSessions.js';
import * as sessionClose from '../tools/session/closeSession.js';
import * as pageNavigate from '../tools/page/navigate.js';
import * as humanPause from '../tools/human/pauseForHuman.js';
import * as humanResume from '../tools/human/resumeSession.js';
import * as humanWaitState from '../tools/human/getHumanWaitState.js';
import * as authSave from '../tools/auth/saveAuthContext.js';
import * as authLoad from '../tools/auth/loadAuthContext.js';
import * as authList from '../tools/auth/listAuthContexts.js';
import * as authDelete from '../tools/auth/deleteAuthContext.js';
import * as pageClick from '../tools/page/click.js';
import * as pageFill from '../tools/page/fill.js';
import * as pageSelectOption from '../tools/page/selectOption.js';
import * as pageWait from '../tools/page/wait.js';
import * as pageScroll from '../tools/page/scroll.js';
import * as pageScreenshot from '../tools/page/screenshot.js';
import * as extractSnapshot from '../tools/extract/snapshot.js';
import * as extractText from '../tools/extract/extractText.js';
import * as extractTable from '../tools/extract/extractTable.js';
import * as extractForm from '../tools/extract/extractForm.js';
import * as extractInteractive from '../tools/extract/getInteractiveElements.js';
import * as devPlaywright from '../tools/devassist/generatePlaywrightScript.js';
import * as devPageObject from '../tools/devassist/generatePageObject.js';
import * as devDataSchema from '../tools/devassist/generateDataSchema.js';
import * as devExport from '../tools/devassist/exportExtractionResult.js';
import { logEvent } from '../logging/logger.js';
import { appendSessionLog } from '../resources/latestLogsResource.js';

export function registerTools(server: McpServer, deps: ServerDeps): void {
  const sessionManager = deps.sessionManager as import('../browser/sessionManager.js').SessionManager;
  const humanCoordinator = deps.humanCoordinator as import('../human/humanCoordinator.js').HumanCoordinator;
  const authContextService = deps.authContextService as import('../auth/authContextService.js').AuthContextService;
  if (!sessionManager) return;

  server.registerTool(
    'browser.create_session',
    {
      title: 'Create Browser Session',
      description: 'Create a new browser session. Optionally provide startUrl or authContextId to load saved login state.',
      inputSchema: sessionCreate.createSessionInputSchema,
      outputSchema: sessionCreate.createSessionOutputSchema,
    },
    async (input) => {
      const parsed = sessionCreate.createSessionInputSchema.parse(input);
      const storageStatePath =
        parsed.authContextId && authContextService
          ? authContextService.getStorageStatePathForSession(parsed.authContextId)
          : undefined;
      const out = await sessionCreate.createSession(sessionManager, storageStatePath, parsed);
      logEvent(deps.logger, 'info', 'session_created', {
        sessionId: out.sessionId,
        toolName: 'browser.create_session',
      });
      appendSessionLog(out.sessionId, { event: 'session_created', sessionId: out.sessionId, toolName: 'browser.create_session' });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(out) }],
        structuredContent: out as unknown as Record<string, unknown>,
      };
    }
  );

  server.registerTool(
    'browser.get_session',
    {
      title: 'Get Session',
      description: 'Get metadata for a browser session by sessionId.',
      inputSchema: sessionGet.getSessionInputSchema,
      outputSchema: z.any(),
    },
    async (input) => {
      const parsed = sessionGet.getSessionInputSchema.parse(input);
      const meta = await sessionGet.getSession(sessionManager, parsed);
      if (!meta) {
        throw new Error(
          JSON.stringify(createToolError('SESSION_NOT_FOUND', `Session ${parsed.sessionId} not found`))
        );
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(meta) }],
        structuredContent: meta as unknown as Record<string, unknown>,
      };
    }
  );

  server.registerTool(
    'browser.list_sessions',
    {
      title: 'List Sessions',
      description: 'List all active browser sessions.',
      outputSchema: z.object({ sessions: z.array(z.any()) }),
    },
    async () => {
      const out = await sessionList.listSessions(sessionManager);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(out) }],
        structuredContent: out as unknown as Record<string, unknown>,
      };
    }
  );

  server.registerTool(
    'browser.close_session',
    {
      title: 'Close Session',
      description: 'Close a browser session by sessionId.',
      inputSchema: sessionClose.closeSessionInputSchema,
      outputSchema: z.object({ success: z.literal(true) }),
    },
    async (input) => {
      const parsed = sessionClose.closeSessionInputSchema.parse(input);
      await sessionClose.closeSession(sessionManager, parsed);
      logEvent(deps.logger, 'info', 'session_closed', {
        sessionId: parsed.sessionId,
        toolName: 'browser.close_session',
      });
      appendSessionLog(parsed.sessionId, { event: 'session_closed', sessionId: parsed.sessionId, toolName: 'browser.close_session' });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }],
        structuredContent: { success: true as const },
      };
    }
  );

  server.registerTool(
    'browser.navigate',
    {
      title: 'Navigate',
      description: 'Navigate the browser session to a URL.',
      inputSchema: pageNavigate.navigateInputSchema,
      outputSchema: z.object({
        sessionId: z.string(),
        currentUrl: z.string(),
        title: z.string().optional(),
      }),
    },
    async (input) => {
      const parsed = pageNavigate.navigateInputSchema.parse(input);
      logEvent(deps.logger, 'info', 'navigation_started', { sessionId: parsed.sessionId, url: parsed.url, toolName: 'browser.navigate' });
      appendSessionLog(parsed.sessionId, { event: 'navigation_started', sessionId: parsed.sessionId, toolName: 'browser.navigate' });
      const sec = (deps.config as { security?: { allowDomains?: string[]; denyDomains?: string[] } }).security;
      const securityConfig = sec ? { allowDomains: sec.allowDomains ?? [], denyDomains: sec.denyDomains ?? [] } : undefined;
      const out = await pageNavigate.navigate(sessionManager, parsed, securityConfig);
      logEvent(deps.logger, 'info', 'navigation_finished', {
        sessionId: parsed.sessionId,
        url: out.currentUrl,
        toolName: 'browser.navigate',
      });
      appendSessionLog(parsed.sessionId, { event: 'navigation_finished', sessionId: parsed.sessionId, url: out.currentUrl, toolName: 'browser.navigate' });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(out) }],
        structuredContent: out as unknown as Record<string, unknown>,
      };
    }
  );

  const defaultDetailLevel = (deps.config as { snapshot?: { defaultDetailLevel?: 'minimal' | 'normal' | 'rich' } }).snapshot?.defaultDetailLevel ?? 'normal';
  const latestExtractions = deps.latestExtractions as import('../tools/devassist/latestExtractions.js').LatestExtractionsStore | undefined;

  server.registerTool('browser.click', { title: 'Click', description: 'Click an element by selector.', inputSchema: pageClick.clickInputSchema }, async (input) => {
    await pageClick.click(sessionManager, pageClick.clickInputSchema.parse(input));
    return { content: [{ type: 'text' as const, text: 'OK' }] };
  });
  server.registerTool('browser.fill', { title: 'Fill', description: 'Fill an input by selector. Value is not logged.', inputSchema: pageFill.fillInputSchema }, async (input) => {
    const parsed = pageFill.fillInputSchema.parse(input);
    await pageFill.fill(sessionManager, parsed);
    appendSessionLog(parsed.sessionId, { event: 'fill', sessionId: parsed.sessionId, toolName: 'browser.fill' });
    return { content: [{ type: 'text' as const, text: 'OK' }] };
  });
  server.registerTool('browser.select_option', { title: 'Select Option', description: 'Select option(s) in a select element.', inputSchema: pageSelectOption.selectOptionInputSchema }, async (input) => {
    await pageSelectOption.selectOption(sessionManager, pageSelectOption.selectOptionInputSchema.parse(input));
    return { content: [{ type: 'text' as const, text: 'OK' }] };
  });
  server.registerTool('browser.wait', { title: 'Wait', description: 'Wait for a number of milliseconds.', inputSchema: pageWait.waitInputSchema }, async (input) => {
    await pageWait.wait(sessionManager, pageWait.waitInputSchema.parse(input));
    return { content: [{ type: 'text' as const, text: 'OK' }] };
  });
  server.registerTool('browser.scroll', { title: 'Scroll', description: 'Scroll the page or an element into view.', inputSchema: pageScroll.scrollInputSchema }, async (input) => {
    await pageScroll.scroll(sessionManager, pageScroll.scrollInputSchema.parse(input));
    return { content: [{ type: 'text' as const, text: 'OK' }] };
  });
  server.registerTool('browser.take_screenshot', { title: 'Take Screenshot', description: 'Take a screenshot of the current page.', inputSchema: pageScreenshot.screenshotInputSchema, outputSchema: z.object({ path: z.string() }) }, async (input) => {
    const baseDir = (deps.config as { storage?: { baseDir?: string } }).storage?.baseDir ?? './data';
    const out = await pageScreenshot.takeScreenshot(sessionManager, baseDir, pageScreenshot.screenshotInputSchema.parse(input));
    return { content: [{ type: 'text' as const, text: JSON.stringify(out) }], structuredContent: out as unknown as Record<string, unknown> };
  });
  server.registerTool('browser.snapshot', { title: 'Page Snapshot', description: 'Get a structured snapshot of the current page for LLM consumption.', inputSchema: extractSnapshot.snapshotInputSchema, outputSchema: z.any() }, async (input) => {
    const parsed = extractSnapshot.snapshotInputSchema.parse(input);
    const out = await extractSnapshot.snapshot(sessionManager, defaultDetailLevel, parsed);
    logEvent(deps.logger, 'info', 'snapshot_generated', { sessionId: parsed.sessionId, toolName: 'browser.snapshot' });
    appendSessionLog(parsed.sessionId, { event: 'snapshot_generated', sessionId: parsed.sessionId, toolName: 'browser.snapshot' });
    return { content: [{ type: 'text' as const, text: JSON.stringify(out) }], structuredContent: out as unknown as Record<string, unknown> };
  });
  server.registerTool('browser.extract_text', { title: 'Extract Text', description: 'Extract visible text from the page or a selector.', inputSchema: extractText.extractTextInputSchema, outputSchema: z.object({ sessionId: z.string(), sourceUrl: z.string(), extractedAt: z.string(), textBlocks: z.array(z.string()) }) }, async (input) => {
    const parsed = extractText.extractTextInputSchema.parse(input);
    const out = await extractText.extractText(sessionManager, parsed);
    logEvent(deps.logger, 'info', 'extraction_completed', { sessionId: parsed.sessionId, toolName: 'browser.extract_text' });
    appendSessionLog(parsed.sessionId, { event: 'extraction_completed', sessionId: parsed.sessionId, toolName: 'browser.extract_text' });
    if (latestExtractions) {
      latestExtractions.text = { ...out, sessionId: parsed.sessionId };
      latestExtractions.sessionId = parsed.sessionId;
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(out) }], structuredContent: out as unknown as Record<string, unknown> };
  });
  server.registerTool('browser.extract_table', { title: 'Extract Table', description: 'Extract table data from the page.', inputSchema: extractTable.extractTableInputSchema, outputSchema: z.any() }, async (input) => {
    const parsed = extractTable.extractTableInputSchema.parse(input);
    const out = await extractTable.extractTable(sessionManager, parsed);
    logEvent(deps.logger, 'info', 'extraction_completed', { sessionId: parsed.sessionId, toolName: 'browser.extract_table' });
    appendSessionLog(parsed.sessionId, { event: 'extraction_completed', sessionId: parsed.sessionId, toolName: 'browser.extract_table' });
    if (latestExtractions) {
      latestExtractions.table = out;
      latestExtractions.sessionId = parsed.sessionId;
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(out) }], structuredContent: out as unknown as Record<string, unknown> };
  });
  server.registerTool('browser.extract_form', { title: 'Extract Form', description: 'Extract form field schema from the page.', inputSchema: extractForm.extractFormInputSchema, outputSchema: z.any() }, async (input) => {
    const parsed = extractForm.extractFormInputSchema.parse(input);
    const out = await extractForm.extractForm(sessionManager, parsed);
    logEvent(deps.logger, 'info', 'extraction_completed', { sessionId: parsed.sessionId, toolName: 'browser.extract_form' });
    appendSessionLog(parsed.sessionId, { event: 'extraction_completed', sessionId: parsed.sessionId, toolName: 'browser.extract_form' });
    if (latestExtractions) {
      latestExtractions.form = out;
      latestExtractions.sessionId = parsed.sessionId;
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(out) }], structuredContent: out as unknown as Record<string, unknown> };
  });
  server.registerTool('browser.get_interactive_elements', { title: 'Get Interactive Elements', description: 'Get summary of interactive elements (buttons, links, inputs) on the page.', inputSchema: extractInteractive.getInteractiveElementsInputSchema, outputSchema: z.object({ sessionId: z.string(), sourceUrl: z.string(), elements: z.array(z.any()) }) }, async (input) => {
    const out = await extractInteractive.getInteractiveElements(sessionManager, extractInteractive.getInteractiveElementsInputSchema.parse(input));
    return { content: [{ type: 'text' as const, text: JSON.stringify(out) }], structuredContent: out as unknown as Record<string, unknown> };
  });

  if (latestExtractions) {
    server.registerTool('browser.generate_playwright_script', { title: 'Generate Playwright Script', description: 'Generate a Playwright test script from current session.', inputSchema: devPlaywright.generatePlaywrightScriptInputSchema, outputSchema: z.object({ language: z.literal('typescript'), code: z.string(), notes: z.array(z.string()) }) }, async (input) => {
      const out = await devPlaywright.generatePlaywrightScript(sessionManager, devPlaywright.generatePlaywrightScriptInputSchema.parse(input));
      return { content: [{ type: 'text' as const, text: out.code }], structuredContent: out as unknown as Record<string, unknown> };
    });
    server.registerTool('browser.generate_page_object', { title: 'Generate Page Object', description: 'Generate a page object class from current page.', inputSchema: devPageObject.generatePageObjectInputSchema, outputSchema: z.object({ language: z.literal('typescript'), code: z.string() }) }, async (input) => {
      const out = await devPageObject.generatePageObject(sessionManager, devPageObject.generatePageObjectInputSchema.parse(input));
      return { content: [{ type: 'text' as const, text: out.code }], structuredContent: out as unknown as Record<string, unknown> };
    });
    server.registerTool('browser.generate_data_schema', { title: 'Generate Data Schema', description: 'Generate TypeScript/Zod/JSON schema from latest table or form extraction.', inputSchema: devDataSchema.generateDataSchemaInputSchema, outputSchema: z.object({ format: z.string(), code: z.string() }) }, async (input) => {
      const parsed = devDataSchema.generateDataSchemaInputSchema.parse(input);
      const out = devDataSchema.generateDataSchema(latestExtractions, parsed);
      return { content: [{ type: 'text' as const, text: out.code }], structuredContent: out as unknown as Record<string, unknown> };
    });
    server.registerTool('browser.export_extraction_result', { title: 'Export Extraction Result', description: 'Export latest table/form/text extraction to a file.', inputSchema: devExport.exportExtractionResultInputSchema, outputSchema: z.object({ exportPath: z.string() }) }, async (input) => {
      const parsed = devExport.exportExtractionResultInputSchema.parse(input);
      const baseDir = (deps.config as { storage?: { baseDir?: string } }).storage?.baseDir ?? './data';
      const security = (deps.config as { security?: { maxExportRows?: number } }).security ?? {};
      const out = await devExport.exportExtractionResult(latestExtractions, deps.storage, baseDir, { maxExportRows: security.maxExportRows ?? 1000 }, parsed);
      return { content: [{ type: 'text' as const, text: JSON.stringify(out) }], structuredContent: out as unknown as Record<string, unknown> };
    });
  }

  if (humanCoordinator) {
    server.registerTool(
      'browser.pause_for_human',
      {
        title: 'Pause for Human',
        description: 'Pause the session and wait for human (e.g. login, MFA, captcha).',
        inputSchema: humanPause.pauseForHumanInputSchema,
        outputSchema: z.object({
          sessionId: z.string(),
          status: z.literal('waiting_for_human'),
          pendingHumanAction: z.any(),
        }),
      },
      async (input) => {
        const parsed = humanPause.pauseForHumanInputSchema.parse(input);
        const out = await humanPause.pauseForHuman(humanCoordinator, parsed);
        logEvent(deps.logger, 'info', 'human_pause_requested', {
          sessionId: parsed.sessionId,
          reason: parsed.reason,
          toolName: 'browser.pause_for_human',
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(out) }],
          structuredContent: out as unknown as Record<string, unknown>,
        };
      }
    );

    server.registerTool(
      'browser.resume_session',
      {
        title: 'Resume Session',
        description: 'Resume a session after human has completed the required action.',
        inputSchema: humanResume.resumeSessionInputSchema,
        outputSchema: z.object({
          sessionId: z.string(),
          status: z.string(),
          currentUrl: z.string().optional(),
          authState: z.enum(['logged_in', 'login_required', 'unknown']),
        }),
      },
      async (input) => {
        const parsed = humanResume.resumeSessionInputSchema.parse(input);
        const out = await humanResume.resumeSession(humanCoordinator, parsed);
        logEvent(deps.logger, 'info', 'human_resumed', {
          sessionId: parsed.sessionId,
          toolName: 'browser.resume_session',
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(out) }],
          structuredContent: out as unknown as Record<string, unknown>,
        };
      }
    );

    server.registerTool(
      'browser.get_human_wait_state',
      {
        title: 'Get Human Wait State',
        description: 'Check if a session is waiting for human action.',
        inputSchema: humanWaitState.getHumanWaitStateInputSchema,
        outputSchema: z.object({
          waiting: z.boolean(),
          pendingHumanAction: z.any().nullable().optional(),
        }),
      },
      async (input) => {
        const parsed = humanWaitState.getHumanWaitStateInputSchema.parse(input);
        const out = await humanWaitState.getHumanWaitState(humanCoordinator, parsed);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(out) }],
          structuredContent: out as unknown as Record<string, unknown>,
        };
      }
    );
  }

  if (authContextService) {
    server.registerTool(
      'browser.save_auth_context',
      {
        title: 'Save Auth Context',
        description: 'Save current session storage state (cookies etc.) as a named auth context for reuse.',
        inputSchema: authSave.saveAuthContextInputSchema,
        outputSchema: z.any(),
      },
      async (input) => {
        const parsed = authSave.saveAuthContextInputSchema.parse(input);
        const out = await authSave.saveAuthContext(authContextService, sessionManager, parsed);
        logEvent(deps.logger, 'info', 'auth_context_saved', {
          authContextId: out.authContextId,
          toolName: 'browser.save_auth_context',
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(out) }],
          structuredContent: out as unknown as Record<string, unknown>,
        };
      }
    );

    server.registerTool(
      'browser.load_auth_context',
      {
        title: 'Load Auth Context',
        description: 'Load a saved auth context into the current session.',
        inputSchema: authLoad.loadAuthContextInputSchema,
        outputSchema: z.object({
          sessionId: z.string(),
          authContextId: z.string(),
          success: z.literal(true),
        }),
      },
      async (input) => {
        const parsed = authLoad.loadAuthContextInputSchema.parse(input);
        const out = await authLoad.loadAuthContext(authContextService, sessionManager, parsed);
        logEvent(deps.logger, 'info', 'auth_context_loaded', {
          sessionId: parsed.sessionId,
          authContextId: parsed.authContextId,
          toolName: 'browser.load_auth_context',
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(out) }],
          structuredContent: out as unknown as Record<string, unknown>,
        };
      }
    );

    server.registerTool(
      'browser.list_auth_contexts',
      {
        title: 'List Auth Contexts',
        description: 'List all saved auth contexts.',
        outputSchema: z.object({ authContexts: z.array(z.any()) }),
      },
      async () => {
        const out = await authList.listAuthContexts(authContextService);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(out) }],
          structuredContent: out as unknown as Record<string, unknown>,
        };
      }
    );

    server.registerTool(
      'browser.delete_auth_context',
      {
        title: 'Delete Auth Context',
        description: 'Delete a saved auth context and its storage state file.',
        inputSchema: authDelete.deleteAuthContextInputSchema,
        outputSchema: z.object({ success: z.literal(true) }),
      },
      async (input) => {
        const parsed = authDelete.deleteAuthContextInputSchema.parse(input);
        await authDelete.deleteAuthContext(authContextService, parsed);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }],
          structuredContent: { success: true as const },
        };
      }
    );
  }
}
