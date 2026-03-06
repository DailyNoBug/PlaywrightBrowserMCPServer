/**
 * Simple JSON store for in-memory or file-backed key-value data.
 * Used by devassist to cache latest extraction for export/schema generation.
 */

import type { StorageProvider } from './storage.js';

const STORE_PREFIX = 'store';

export async function getStored<T>(storage: StorageProvider, key: string): Promise<T | null> {
  return storage.readJson<T>(`${STORE_PREFIX}/${key}.json`);
}

export async function setStored<T>(storage: StorageProvider, key: string, value: T): Promise<void> {
  await storage.writeJson(`${STORE_PREFIX}/${key}.json`, value);
}
