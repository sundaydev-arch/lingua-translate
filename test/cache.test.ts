import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DiskCache, MemoryCache } from '../src/core/cache';
import type { LookupResult } from '../src/core/types';

const dirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = join(tmpdir(), `lingua-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(dir, { recursive: true });
  dirs.push(dir);
  return dir;
}

const sample: LookupResult = {
  kind: 'text',
  text: 'hello',
  translation: '你好',
  targetLang: 'zh-CN',
  sourceLang: 'en',
  badge: '词语',
  autoPlay: false,
  sources: 'test'
};

afterEach(async () => {
  for (const dir of dirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe('DiskCache', () => {
  it('persists entries and restores them', async () => {
    const dir = await tempDir();
    const options = { enabled: true, ttlHours: 168, maxEntries: 100 };
    const cache = new DiskCache(dir, () => options);

    await cache.init();
    cache.set('translate', 'hello', sample);
    expect(cache.get('translate', 'hello')).toEqual(sample);
    await cache.flush();

    const restored = new DiskCache(dir, () => options);
    await restored.init();
    expect(restored.get('translate', 'hello')).toEqual(sample);
  });

  it('returns undefined when caching is disabled', async () => {
    const dir = await tempDir();
    const cache = new DiskCache(dir, () => ({ enabled: false, ttlHours: 1, maxEntries: 100 }));
    await cache.init();
    cache.set('translate', 'hello', sample);
    expect(cache.get('translate', 'hello')).toBeUndefined();
  });

  it('clears all entries', async () => {
    const dir = await tempDir();
    const cache = new DiskCache(dir, () => ({ enabled: true, ttlHours: 1, maxEntries: 100 }));
    await cache.init();
    cache.set('translate', 'hello', sample);
    await cache.clear();
    expect(cache.get('translate', 'hello')).toBeUndefined();
  });
});

describe('MemoryCache', () => {
  it('evicts oldest entries beyond capacity', () => {
    const cache = new MemoryCache<number>(2, 60_000);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });
});
