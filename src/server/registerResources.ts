/**
 * Register MCP resources: browser://sessions, auth-contexts, latest-snapshot, latest-extraction, latest-logs.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerDeps } from './createServer.js';
import { redactObject } from '../security/redact.js';
import { getSessionsResource } from '../resources/sessionsResource.js';
import { getAuthContextsResource } from '../resources/authContextsResource.js';
import { getLatestSnapshotResource } from '../resources/latestSnapshotResource.js';
import { getLatestExtractionResource } from '../resources/latestExtractionResource.js';
import { getLatestLogsResource } from '../resources/latestLogsResource.js';

function content(uri: string, text: string) {
  return { contents: [{ uri, type: 'text' as const, text }] };
}

export function registerResources(server: McpServer, deps: ServerDeps): void {
  const sessionManager = deps.sessionManager as import('../browser/sessionManager.js').SessionManager | undefined;
  const authContextService = deps.authContextService as import('../auth/authContextService.js').AuthContextService | undefined;
  const latestExtractions = deps.latestExtractions as import('../tools/devassist/latestExtractions.js').LatestExtractionsStore | undefined;

  if (sessionManager) {
    server.resource(
      'sessions',
      'browser://sessions',
      async () => {
        const data = await getSessionsResource(sessionManager);
        return content('browser://sessions', JSON.stringify(data, null, 2));
      }
    );
  }

  if (authContextService) {
    server.resource(
      'auth-contexts',
      'browser://auth-contexts',
      async () => {
        const data = await getAuthContextsResource(authContextService);
        return content('browser://auth-contexts', JSON.stringify(data, null, 2));
      }
    );
  }

  const uriPath = (u: URL) => u.pathname.replace(/^.*\/latest-snapshot\/?/, '').replace(/\?.*$/, '');
  const uriPathExt = (u: URL) => u.pathname.replace(/^.*\/latest-extraction\/?/, '').replace(/\?.*$/, '');
  const uriPathLogs = (u: URL) => u.pathname.replace(/^.*\/latest-logs\/?/, '').replace(/\?.*$/, '');

  if (sessionManager) {
    server.resource(
      'latest-snapshot',
      'browser://latest-snapshot',
      async (uri: URL) => {
        const sessionId = uriPath(uri);
        const sid = sessionId.length > 0 ? sessionId : sessionManager.listSessions()[0]?.sessionId;
        if (!sid) return content('browser://latest-snapshot', JSON.stringify({ error: 'No session' }));
        const snapshot = await getLatestSnapshotResource(sessionManager, sid);
        const body = snapshot ? redactObject(snapshot) : { message: 'No snapshot' };
        return content(uri.href, JSON.stringify(body, null, 2));
      }
    );
  }

  if (latestExtractions) {
    server.resource(
      'latest-extraction',
      'browser://latest-extraction',
      async (uri: URL) => {
        const sessionId = uriPathExt(uri);
        const sid = sessionId.length > 0 ? sessionId : latestExtractions.sessionId ?? undefined;
        if (!sid) return content('browser://latest-extraction', JSON.stringify({ error: 'No session or extraction' }));
        const data = getLatestExtractionResource(latestExtractions, sid);
        return content(uri.href, JSON.stringify(data ?? { message: 'No extraction' }, null, 2));
      }
    );
  }

  server.resource(
    'latest-logs',
    'browser://latest-logs',
    async (uri: URL) => {
      const sessionId = uriPathLogs(uri);
      const sid = sessionId.length > 0 ? sessionId : (deps.sessionManager as import('../browser/sessionManager.js').SessionManager)?.listSessions()[0]?.sessionId;
      const data = getLatestLogsResource(sid ?? '', 20);
      return content(uri.href, JSON.stringify(redactObject(data), null, 2));
    }
  );
}
