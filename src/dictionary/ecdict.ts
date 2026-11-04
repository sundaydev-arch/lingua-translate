import { promises as fs } from 'fs';
import { gunzipSync } from 'zlib';
import type { Phonetic, Sense } from '../core/types';

export interface EcdictEntry {
  word: string;
  phonetic: string;
  translation: string;
  pos: string;
  collins: number;
  oxford: number;
  bnc: number;
  frq: number;
}

type RawEntry = [string, string, string, number, number, number, number];

interface EcdictFile {
  version: 1;
  meta: { source: string; license: string; generatedAt: string; count?: number };
  words: Record<string, RawEntry>;
}

/**
 * ECDICT offline dictionary (https://github.com/skywind3000/ECDICT, MIT).
 * The data is trimmed: only high-frequency / frequency-tagged words are kept, about 5–8MB after gzip.
 * It is decompressed and loaded on the first lookup so extension startup stays fast.
 */
export class EcdictDictionary {
  private entries: Map<string, EcdictEntry> | null = null;
  private loading: Promise<void> | null = null;

  constructor(private readonly filePath: string) {}

  async load(): Promise<void> {
    if (this.entries) return;
    if (!this.loading) {
      this.loading = (async () => {
        try {
          const compressed = await fs.readFile(this.filePath);
          const parsed = JSON.parse(gunzipSync(compressed).toString('utf8')) as EcdictFile;
          const map = new Map<string, EcdictEntry>();
          for (const [word, tuple] of Object.entries(parsed.words || {})) {
            map.set(word, {
              word,
              phonetic: String(tuple[0] || ''),
              translation: String(tuple[1] || ''),
              pos: String(tuple[2] || ''),
              collins: Number(tuple[3] || 0),
              oxford: Number(tuple[4] || 0),
              bnc: Number(tuple[5] || 0),
              frq: Number(tuple[6] || 0)
            });
          }
          this.entries = map;
        } catch {
          // Missing or corrupted data: silently fall back to the online dictionary
          this.entries = new Map();
        }
      })();
    }
    await this.loading;
  }

  async lookup(word: string): Promise<EcdictEntry | undefined> {
    await this.load();
    if (!this.entries) return undefined;
    const key = word.trim().toLowerCase();
    const direct = this.entries.get(key);
    if (direct) return direct;
    if (key.endsWith("'s")) return this.entries.get(key.slice(0, -2));
    if (key.endsWith('s')) return this.entries.get(key.slice(0, -1));
    return undefined;
  }

  async phonetics(word: string): Promise<Phonetic[]> {
    const entry = await this.lookup(word);
    const value = normalizePhonetic(entry?.phonetic || '');
    return value ? [{ text: value, label: 'UK', audio: '' }] : [];
  }

  async senses(word: string): Promise<Sense[]> {
    const entry = await this.lookup(word);
    if (!entry?.translation) return [];
    const pos = entry.pos || '';
    const items = entry.translation
      .split(/\\n|\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3);
    return items.map((item) => ({ pos, items: [item] }));
  }

  get loadedCount(): number {
    return this.entries?.size ?? 0;
  }
}

export function normalizePhonetic(value: string): string {
  return String(value).replace(/^[/[]+|[/\]]+$/g, '').trim();
}
