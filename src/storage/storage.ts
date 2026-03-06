/**
 * Storage provider interface. Business code must not depend on fs directly.
 */

export interface StorageProvider {
  readJson<T>(path: string): Promise<T | null>;
  writeJson<T>(path: string, value: T): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  readText(path: string): Promise<string | null>;
  writeText(path: string, value: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}
