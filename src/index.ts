/**
 * Entry point: load config, init logger & storage, create and start MCP server.
 * Failures on startup must log structured errors.
 */

import { loadConfig } from './config/config.js';
import { createLogger, getLogger } from './logging/logger.js';
import { FileStorage } from './storage/fileStorage.js';
import { PlaywrightAdapter } from './browser/playwrightAdapter.js';
import { SessionManager } from './browser/sessionManager.js';
import { HumanCoordinator } from './human/humanCoordinator.js';
import { AuthContextService } from './auth/authContextService.js';
import { createLatestExtractionsStore } from './tools/devassist/latestExtractions.js';
import { runServer } from './server/createServer.js';

async function main(): Promise<void> {
  const configPath = process.env.CONFIG_PATH;

  let config;
  try {
    config = loadConfig(configPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: 'config_load_failed', error: message }));
    process.exit(1);
  }

  const logger = createLogger(config.logging);
  logger.info({ event: 'server_started', configPath: configPath ?? 'config/default.json' });

  const storage = new FileStorage({ baseDir: config.storage.baseDir });
  const adapter = new PlaywrightAdapter({
    actionTimeoutMs: config.browser.actionTimeoutMs,
  });
  const sessionManager = new SessionManager(adapter, logger, {
    maxSessions: config.browser.maxSessions,
  });
  const humanCoordinator = new HumanCoordinator(sessionManager);
  const authContextService = new AuthContextService(storage, config.storage.baseDir);
  const latestExtractions = createLatestExtractionsStore();

  const shutdown = async (): Promise<void> => {
    const log = getLogger();
    log.info({ event: 'shutdown_started' });
    try {
      await sessionManager.closeAllSessions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log.warn({ event: 'shutdown_close_sessions_error', error: msg });
    }
    log.info({ event: 'shutdown_finished' });
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });

  try {
    await runServer({
      config,
      storage,
      logger,
      sessionManager,
      humanCoordinator,
      authContextService,
      latestExtractions,
    });
  } catch (err) {
    const log = getLogger();
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    log.error({ event: 'server_start_failed', error: message, stack });
    console.error(JSON.stringify({ event: 'server_start_failed', error: message }));
    process.exit(1);
  }
}

main();
