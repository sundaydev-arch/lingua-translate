import { postJson, splitChunks } from '../core/http';
import { providerLanguage } from '../core/language';
import type { Provider, TranslationOutcome } from '../core/types';

interface LibreResponse {
  translatedText?: string;
  error?: string;
}

export const libreTranslateProvider: Provider = {
  id: 'libretranslate',
  name: 'LibreTranslate',
  isConfigured: (config) => Boolean(config.libretranslateUrl),
  async translate(request, config): Promise<TranslationOutcome> {
    const base = config.libretranslateUrl.replace(/\/+$/, '');
    const chunks = splitChunks(request.text, 2000);
    const results: string[] = [];

    for (const chunk of chunks) {
      const payload: Record<string, string> = {
        q: chunk,
        source: request.source === 'unknown' ? 'auto' : providerLanguage(request.source, 'libre'),
        target: providerLanguage(request.target, 'libre'),
        format: 'text'
      };
      if (config.libretranslateApiKey) payload.api_key = config.libretranslateApiKey;

      const data = await postJson<LibreResponse>(`${base}/translate`, payload, {
        proxy: config.proxy,
        timeout: 10000
      });
      if (data?.error) throw new Error(`LibreTranslate: ${data.error}`);
      if (!data?.translatedText) throw new Error('LibreTranslate returned no translation');
      results.push(data.translatedText);
    }

    return {
      text: results.join('\n'),
      providerId: 'libretranslate',
      provider: 'LibreTranslate',
      target: request.target,
      detectedSource: request.source
    };
  }
};
