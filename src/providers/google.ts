import { getJson, splitChunks, type HttpRequestOptions } from '../core/http';
import { providerLanguage } from '../core/language';
import type { Provider, TranslationOutcome } from '../core/types';

const PRIMARY = 'https://translate.googleapis.com/translate_a/single';
const FALLBACK = 'https://clients5.google.com/translate_a/t';
const TIMEOUT = 4000;
const RETRY_INTERVAL = 5 * 60 * 1000;

let available: boolean | null = null;
let checkedAt = 0;

function usable(): boolean {
  if (available === true) return true;
  if (available === false && Date.now() - checkedAt < RETRY_INTERVAL) return false;
  return true;
}

function mark(ok: boolean): void {
  available = ok;
  checkedAt = Date.now();
}

/** translate.googleapis.com's at client returns [[["translation","source",…],…],null,"en",…]; clients5 returns a flat string array. */
function parsePayload(data: unknown): string {
  if (!Array.isArray(data)) throw new Error('Google returned an unexpected payload');
  if (typeof data[0] === 'string') {
    const flat = data.filter((item): item is string => typeof item === 'string').join('').trim();
    if (flat) return flat;
  }
  if (Array.isArray(data[0])) {
    const nested = data[0]
      .map((item: unknown) => (Array.isArray(item) && typeof item[0] === 'string' ? item[0] : ''))
      .join('')
      .trim();
    if (nested) return nested;
  }
  throw new Error('Google returned no text');
}

export const googleProvider: Provider = {
  id: 'google',
  name: 'Google Translate',
  isConfigured: () => true,
  async translate(request, config): Promise<TranslationOutcome> {
    if (!usable()) throw new Error('Google Translate is cooling down');

    const source = providerLanguage(request.source, 'google');
    const target = providerLanguage(request.target, 'google');
    const chunks = splitChunks(request.text, 450);
    const results: string[] = [];
    const options: HttpRequestOptions = { proxy: config.proxy, timeout: TIMEOUT };

    try {
      for (const chunk of chunks) {
        const query = `sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(chunk)}`;
        try {
          results.push(parsePayload(await getJson(`${PRIMARY}?client=at&dt=t&${query}`, options)));
        } catch {
          const flat = await getJson(`${FALLBACK}?client=dict-chrome-ex&${query}`, options);
          results.push(parsePayload(flat));
        }
      }
      mark(true);
      return {
        text: results.join('\n'),
        providerId: 'google',
        provider: 'Google Translate',
        target: request.target,
        detectedSource: request.source
      };
    } catch (error) {
      mark(false);
      throw error;
    }
  }
};

