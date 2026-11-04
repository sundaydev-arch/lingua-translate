import { getJson } from '../core/http';
import type { Provider, TranslationOutcome } from '../core/types';

interface YoudaoResponse {
  fanyi?: { tran?: string };
  ec?: { word?: Array<{ trs?: Array<{ tr?: Array<{ l?: { i?: string[] } }> }> }> };
}

/** Youdao web dictionary endpoint: no key required; sentence requests return fanyi.tran, word requests return dictionary senses. */
export const youdaoProvider: Provider = {
  id: 'youdao',
  name: 'Youdao Translate',
  isConfigured: () => true,
  async translate(request, config): Promise<TranslationOutcome> {
    const data = await getJson<YoudaoResponse>(
      `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(request.text)}`,
      { proxy: config.proxy, timeout: 8000 }
    );

    let translated = data?.fanyi?.tran ? String(data.fanyi.tran).trim() : '';

    if (!translated && request.text.length <= 40) {
      const senses = data?.ec?.word?.[0]?.trs || [];
      const items: string[] = [];
      for (const item of senses) {
        for (const tr of item.tr || []) {
          for (const line of tr.l?.i || []) {
            if (line) items.push(String(line).trim());
          }
        }
      }
      translated = items.slice(0, 4).join('; ');
    }

    if (!translated) throw new Error('Youdao returned no translation');

    return {
      text: translated,
      providerId: 'youdao',
      provider: 'Youdao Translate',
      target: request.target,
      detectedSource: request.source
    };
  }
};
