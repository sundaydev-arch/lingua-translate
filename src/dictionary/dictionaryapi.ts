import { getJson } from '../core/http';
import type { Meaning } from '../core/types';

interface DictionaryApiEntry {
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{
    partOfSpeech?: string;
    synonyms?: string[];
    definitions?: Array<{ definition?: string; example?: string }>;
  }>;
}

export interface DictionaryApiResult {
  phonetics: Array<{ text: string; audio: string }>;
  meanings: Meaning[];
}

export async function lookupDictionaryApi(word: string, proxy: string): Promise<DictionaryApiResult | null> {
  try {
    const data = await getJson<DictionaryApiEntry[]>(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { proxy, timeout: 7000 }
    );
    if (!Array.isArray(data) || !data.length) return null;

    const phonetics: Array<{ text: string; audio: string }> = [];
    const meanings: Meaning[] = [];
    const seen = new Set<string>();

    for (const entry of data) {
      const main = String(entry.phonetic || '').trim();
      if (main && !seen.has(main)) {
        seen.add(main);
        phonetics.push({ text: main, audio: '' });
      }
      for (const item of entry.phonetics || []) {
        const text = String(item.text || '').trim();
        if (!text || seen.has(text)) continue;
        seen.add(text);
        phonetics.push({ text, audio: item.audio || '' });
      }
      for (const meaning of entry.meanings || []) {
        meanings.push({
          partOfSpeech: meaning.partOfSpeech || '',
          synonyms: (meaning.synonyms || []).slice(0, 6),
          definitions: (meaning.definitions || []).slice(0, 3).map((definition) => ({
            definition: definition.definition || '',
            example: definition.example || ''
          }))
        });
      }
    }

    return { phonetics, meanings };
  } catch {
    return null;
  }
}
