import { postForm } from '../core/http';
import { providerLanguage } from '../core/language';
import type { Provider, TranslationOutcome } from '../core/types';

interface DeepLResponse {
  translations?: Array<{ text?: string; detected_source_language?: string }>;
  message?: string;
}

export const deeplProvider: Provider = {
  id: 'deepl',
  name: 'DeepL',
  isConfigured: (config) => Boolean(config.deeplApiKey),
  async translate(request, config): Promise<TranslationOutcome> {
    const endpoint = config.deeplApiKey.trim().endsWith(':fx')
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    const fields: Record<string, string> = {
      auth_key: config.deeplApiKey,
      text: request.text,
      target_lang: providerLanguage(request.target, 'deepl')
    };
    if (request.source && request.source !== 'auto' && request.source !== 'unknown') {
      fields.source_lang = providerLanguage(request.source, 'deepl');
    }

    const data = await postForm<DeepLResponse>(endpoint, fields, { proxy: config.proxy, timeout: 12000 });
    const translated = data?.translations?.[0]?.text;
    if (!translated) throw new Error(`DeepL 未返回译文${data?.message ? `：${data.message}` : ''}`);

    return {
      text: translated,
      providerId: 'deepl',
      provider: 'DeepL',
      target: request.target,
      detectedSource: data.translations?.[0]?.detected_source_language || request.source
    };
  }
};
