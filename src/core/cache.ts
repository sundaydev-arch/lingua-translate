import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import type { LookupResult } from './types';

interface CacheEntry {
  value: LookupResult;
  savedAt: number;
  hits: number;
}

interface CacheFile {
  version: 1;
  entries: Record<string, CacheEntry>;
}

/**
 * Disk cache: a JSON file under globalStorage with TTL and LRU eviction.
 * Writes are debounced by 1.5s so not every translation hits the disk; flushed forcibly on deactivate.
 */
export class DiskCache {
  private entries = new Map<string, CacheEntry>();
  private loaded = false;
  private dirty = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly file: string;

  constructor(
    storageDir: string,
    private readonly getOptions: () => { enabled: boolean; ttlHours: number; maxEntries: number }
  ) {
    this.file = path.join(storageDir, 'cache.json');
  }

  async init(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw) as CacheFile;
      if (parsed && parsed.version === 1 && parsed.entries) {
        this.entries = new Map(Object.entries(parsed.entries));
      }
    } catch {
      // First run or corrupted file: start from an empty cache
    }
    this.prune();
  }

  private key(prefix: string, text: string): string {
    const hash = createHash('sha1').update(`${prefix}\u0000${text}`).digest('hex');
    return hash.slice(0, 32);
  }

  get(prefix: string, text: string): LookupResult | undefined {
    const options = this.getOptions();
    if (!options.enabled) return undefined;
    const key = this.key(prefix, text);
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry, options.ttlHours)) {
      this.entries.delete(key);
      this.dirty = true;
      this.scheduleFlush();
      return undefined;
    }

    entry.hits += 1;
    // Map iteration order is insertion order: reinserting moves the entry to the most recently used position
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.dirty = true;
    this.scheduleFlush();
    return entry.value;
  }

  set(prefix: string, text: string, value: LookupResult): void {
    const options = this.getOptions();
    if (!options.enabled) return;
    const key = this.key(prefix, text);
    this.entries.delete(key);
    this.entries.set(key, { value, savedAt: Date.now(), hits: 0 });
    this.prune();
    this.dirty = true;
    this.scheduleFlush();
  }

  async clear(): Promise<void> {
    this.entries.clear();
    this.dirty = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    try {
      await fs.unlink(this.file);
    } catch {
      // File does not exist
    }
  }

  async flush(): Promise<void> {
    if (!this.dirty) return;
    this.dirty = false;
    const data: CacheFile = {
      version: 1,
      entries: Object.fromEntries(this.entries)
    };
    try {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(data), 'utf8');
      await fs.rename(tmp, this.file);
    } catch {
      // A failed cache write must not affect the main translation flow
    }
  }

  private prune(): void {
    const options = this.getOptions();
    const max = Math.max(100, options.maxEntries);
    while (this.entries.size > max) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (!oldest) break;
      this.entries.delete(oldest);
      this.dirty = true;
    }
  }

  private isExpired(entry: CacheEntry, ttlHours: number): boolean {
    return Date.now() - entry.savedAt > Math.max(1, ttlHours) * 60 * 60 * 1000;
  }

  private scheduleFlush(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, 1500);
    this.timer.unref?.();
  }
}

/** In-process L1 cache for high-frequency paths such as hover and inline, avoiding repeated disk reads. */
export class MemoryCache<T> {
  private readonly store = new Map<string, { value: T; savedAt: number }>();

  constructor(
    private readonly maxEntries = 500,
    private readonly ttlMs = 10 * 60 * 1000
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.savedAt > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.delete(key);
    this.store.set(key, { value, savedAt: Date.now() });
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value as string | undefined;
      if (!oldest) break;
      this.store.delete(oldest);
    }
  }

  clear(): void {
    this.store.clear();
  }
}
