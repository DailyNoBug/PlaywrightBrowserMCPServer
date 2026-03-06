/**
 * MCP Server composition. Creates server instance and registers tools/resources.
 * No business logic here — only composition.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { AppConfig } from '../config/config.js';
import type { StorageProvider } from '../storage/storage.js';
import type { Logger } from 'pino';
import { registerTools } from './registerTools.js';
import { registerResources } from './registerResources.js';

export interface ServerDeps {
  config: AppConfig;
  storage: StorageProvider;
  logger: Logger;
  /** Will be set in phase 2+: sessionManager, adapter, etc. */
  [key: string]: unknown;
}

export async function createServer(deps: ServerDeps): Promise<McpServer> {
  const { config } = deps;
  const server = new McpServer({
    name: 'playwright-browser-mcp',
    version: '0.1.0',
  });

  registerTools(server, deps);
  registerResources(server, deps);

  return server;
}

export async function runServer(deps: ServerDeps): Promise<void> {
  const server = await createServer(deps);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
