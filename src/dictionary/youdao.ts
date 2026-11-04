import { getJson } from '../core/http';
import type { Sense } from '../core/types';

interface YoudaoResponse {
  ec?: {
    word?: Array<{
      usphone?: string;
      ukphone?: string;
      trs?: Array<{ tr?: Array<{ l?: { i?: string[] } }> }>;
    }>;
  };
  fanyi?: { tran?: string };
}

export interface YoudaoEntry {
  usphone: string;
  ukphone: string;
  short: string;
  senses: Sense[];
  translation: string;
}

export async function lookupYoudao(word: string, proxy: string): Promise<YoudaoEntry | null> {
  const data = await getJson<YoudaoResponse>(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`, {
    proxy,
    timeout: 7000
  });
  const entry = data?.ec?.word?.[0];
  if (!entry) return null;

  const senses: Sense[] = [];
  const seen = new Set<string>();
  for (const item of entry.trs || []) {
    for (const tr of item.tr || []) {
      for (const line of tr.l?.i || []) {
        const sense = parseSense(line);
        if (!sense) continue;
        const key = `${sense.pos}|${sense.items.join('|')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        senses.push(sense);
      }
    }
  }

  const short = data.fanyi?.tran ? String(data.fanyi.tran).trim() : '';
  const translation = senses.map((sense) => `${sense.pos ? sense.pos + ' ' : ''}${sense.items.join('；')}`).join('\n');

  return {
    usphone: entry.usphone || '',
    ukphone: entry.ukphone || '',
    short,
    senses,
    translation: translation || short
  };
}

/** "int. hello, hi (used in greetings…); hello (on the phone…)" → { pos: 'int.', items: [...] } */
export function parseSense(line: string): Sense | null {
  const text = String(line ?? '').trim();
  if (!text) return null;
  const match = text.match(/^([a-z]{1,6}\.)\s*/i);
  const pos = match ? match[1].toLowerCase() : '';
  const rest = (match ? text.slice(match[0].length) : text).trim();
  if (!rest) return null;

  const items: string[] = [];
  for (const raw of rest.split(/[；;]/)) {
    const item = raw.trim();
    if (!item) continue;
    const stem = item.split(/[（(]/)[0].trim();
    const duplicated = items.some((existing) => existing.split(/[（(]/)[0].trim() === stem);
    if (!duplicated) items.push(item);
    if (items.length >= 3) break;
  }
  if (!items.length) return null;
  return { pos, items };
}
