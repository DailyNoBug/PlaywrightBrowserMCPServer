/**
 * Resource: browser://latest-logs/{sessionId} - recent tool/action logs for session.
 */

export interface LogEntry {
  event: string;
  timestamp?: string;
  sessionId?: string;
  toolName?: string;
  message?: string;
  url?: string;
  [key: string]: unknown;
}

/** In-memory recent log entries per session. Populated by tool handlers. */
const sessionLogs = new Map<string, LogEntry[]>();
const MAX_LOGS_PER_SESSION = 50;

export function appendSessionLog(sessionId: string, entry: LogEntry): void {
  let list = sessionLogs.get(sessionId);
  if (!list) {
    list = [];
    sessionLogs.set(sessionId, list);
  }
  list.push(entry);
  if (list.length > MAX_LOGS_PER_SESSION) list.shift();
}

export function getLatestLogsResource(sessionId: string, limit = 20): { logs: LogEntry[] } {
  const list = sessionLogs.get(sessionId) ?? [];
  const logs = list.slice(-limit);
  return { logs };
}
