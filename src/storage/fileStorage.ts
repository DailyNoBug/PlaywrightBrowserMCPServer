import {
  readFile,
  writeFile,
  unlink,
  access,
  readdir,
  mkdir,
} from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { StorageProvider } from './storage.js';

export interface FileStorageOptions {
  baseDir: string;
}

export class FileStorage implements StorageProvider {
  private readonly baseDir: string;

  constructor(options: FileStorageOptions) {
    this.baseDir = options.baseDir;
  }

  private resolve(path: string): string {
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    return join(this.baseDir, normalized);
  }

  async ensureDir(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });
  }

  async readJson<T>(path: string): Promise<T | null> {
    const fullPath = this.resolve(path);
    try {
      const content = await readFile(fullPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  async writeJson<T>(path: string, value: T): Promise<void> {
    const fullPath = this.resolve(path);
    await this.ensureDir(fullPath);
    await writeFile(fullPath, JSON.stringify(value, null, 2), 'utf-8');
  }

  async delete(path: string): Promise<void> {
    const fullPath = this.resolve(path);
    try {
      await unlink(fullPath);
    } catch {
      // ignore if not exists
    }
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = this.resolve(path);
    try {
      await access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async readText(path: string): Promise<string | null> {
    const fullPath = this.resolve(path);
    try {
      return await readFile(fullPath, 'utf-8');
    } catch {
      return null;
    }
  }

  async writeText(path: string, value: string): Promise<void> {
    const fullPath = this.resolve(path);
    await this.ensureDir(fullPath);
    await writeFile(fullPath, value, 'utf-8');
  }

  async list(prefix: string): Promise<string[]> {
    const fullPath = this.resolve(prefix);
    try {
      const entries = await readdir(fullPath, { withFileTypes: true });
      return entries.map((e) => join(prefix, e.name));
    } catch {
      return [];
    }
  }
}
