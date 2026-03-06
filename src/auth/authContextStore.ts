/**
 * Persistence for auth context metadata and storage state files.
 */

import type { StorageProvider } from '../storage/storage.js';
import type { AuthContextMeta } from '../types/auth.js';

const AUTH_CONTEXTS_PREFIX = 'auth-contexts';

export function getAuthContextMetaPath(authContextId: string): string {
  return `${AUTH_CONTEXTS_PREFIX}/${authContextId}.json`;
}

export function getStorageStatePath(authContextId: string): string {
  return `${AUTH_CONTEXTS_PREFIX}/${authContextId}.storage-state.json`;
}

export async function readAuthContextMeta(
  storage: StorageProvider,
  authContextId: string
): Promise<AuthContextMeta | null> {
  return storage.readJson<AuthContextMeta>(getAuthContextMetaPath(authContextId));
}

export async function writeAuthContextMeta(
  storage: StorageProvider,
  meta: AuthContextMeta
): Promise<void> {
  await storage.writeJson(getAuthContextMetaPath(meta.authContextId), meta);
}

export async function deleteAuthContextFiles(
  storage: StorageProvider,
  authContextId: string
): Promise<void> {
  await storage.delete(getAuthContextMetaPath(authContextId));
  await storage.delete(getStorageStatePath(authContextId));
}

export async function listAuthContextIds(storage: StorageProvider): Promise<string[]> {
  const files = await storage.list(AUTH_CONTEXTS_PREFIX);
  return files
    .filter((f) => f.endsWith('.json') && !f.includes('.storage-state.'))
    .map((f) => f.replace(/\.json$/, '').replace(`${AUTH_CONTEXTS_PREFIX}/`, ''));
}
