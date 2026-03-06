/**
 * File path and FS helpers. Prefer StorageProvider for business logic.
 */

import { dirname, join } from 'node:path';

export function ensureExtension(path: string, ext: string): string {
  if (path.endsWith(ext)) return path;
  return path + ext;
}

export function joinPath(...segments: string[]): string {
  return join(...segments);
}

export function getDir(path: string): string {
  return dirname(path);
}
