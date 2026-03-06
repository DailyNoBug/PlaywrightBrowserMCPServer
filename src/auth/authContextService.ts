/**
 * Save/load auth context (Playwright storage state), metadata, and validation.
 */

import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { StorageProvider } from '../storage/storage.js';
import type { AuthContextMeta } from '../types/auth.js';
import type { SessionManager } from '../browser/sessionManager.js';
import {
  readAuthContextMeta,
  writeAuthContextMeta,
  deleteAuthContextFiles,
  listAuthContextIds,
  getStorageStatePath,
} from './authContextStore.js';
import { nowIso } from '../utils/time.js';
import { createToolError } from '../server/error.js';

const ID_PREFIX = 'auth-';

function generateAuthContextId(): string {
  return `${ID_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export class AuthContextService {
  constructor(
    private readonly storage: StorageProvider,
    private readonly baseDir: string
  ) {}

  private getAbsoluteStorageStatePath(authContextId: string): string {
    return resolve(process.cwd(), this.baseDir, getStorageStatePath(authContextId));
  }

  async saveAuthContext(
    sessionManager: SessionManager,
    sessionId: string,
    options: { name: string; domain: string; environment?: string }
  ): Promise<AuthContextMeta> {
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      throw createToolError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }
    const authContextId = generateAuthContextId();
    const fullPath = this.getAbsoluteStorageStatePath(authContextId);
    await mkdir(dirname(fullPath), { recursive: true });
    await sessionManager.getAdapter().saveStorageState(session.handle, fullPath);
    const relativePath = `${this.baseDir}/${getStorageStatePath(authContextId)}`;
    const meta: AuthContextMeta = {
      authContextId,
      name: options.name,
      domain: options.domain,
      environment: options.environment,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      storageStatePath: relativePath,
      isValid: true,
      lastVerifiedAt: nowIso(),
    };
    await writeAuthContextMeta(this.storage, meta);
    return meta;
  }

  /** Absolute path for loading storage state in a new session. */
  getStorageStatePathForSession(authContextId: string): string {
    return this.getAbsoluteStorageStatePath(authContextId);
  }

  async loadAuthContext(
    sessionManager: SessionManager,
    sessionId: string,
    authContextId: string
  ): Promise<{ success: true }> {
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      throw createToolError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }
    const meta = await readAuthContextMeta(this.storage, authContextId);
    if (!meta) {
      throw createToolError('AUTH_CONTEXT_INVALID', `Auth context ${authContextId} not found`);
    }
    const fullPath = this.getAbsoluteStorageStatePath(authContextId);
    await sessionManager.getAdapter().loadStorageState(session.handle, fullPath);
    sessionManager.updateMeta(sessionId, { authContextId });
    return { success: true };
  }

  async listAuthContexts(): Promise<AuthContextMeta[]> {
    const ids = await listAuthContextIds(this.storage);
    const list: AuthContextMeta[] = [];
    for (const id of ids) {
      const meta = await readAuthContextMeta(this.storage, id);
      if (meta) list.push(meta);
    }
    return list;
  }

  async deleteAuthContext(authContextId: string): Promise<void> {
    await deleteAuthContextFiles(this.storage, authContextId);
  }

  async getAuthContextMeta(authContextId: string): Promise<AuthContextMeta | null> {
    return readAuthContextMeta(this.storage, authContextId);
  }
}
