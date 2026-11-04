import { decodeEntities, getJson, splitChunks } from '../core/http';
import { detectLanguage } from '../core/language';
import type { Provider, TranslationOutcome } from '../core/types';

const ENDPOINT = 'https://api.mymemory.translated.net/get';

interface MyMemoryResponse {
  responseStatus?: number | string;
  responseDetails?: string;
  responseData?: { translatedText?: string };
}

export const myMemoryProvider: Provider = {
  id: 'mymemory',
  name: 'MyMemory',
  isConfigured: () => true,
  async translate(request, config): Promise<TranslationOutcome> {
    // MyMemory does not accept `auto` as the langpair source, so detect the script first.
    const detected = request.source === 'auto' || request.source === 'unknown' ? detectLanguage(request.text) : request.source;
    const source = detected === 'unknown' ? 'en' : detected;
    const chunks = splitChunks(request.text, 450);
    const results: string[] = [];

    for (const chunk of chunks) {
      const url =
        `${ENDPOINT}?q=${encodeURIComponent(chunk)}` +
        `&langpair=${encodeURIComponent(source)}|${encodeURIComponent(request.target)}`;
      const data = await getJson<MyMemoryResponse>(url, { proxy: config.proxy, timeout: 8000 });
      const translated = data?.responseData?.translatedText;
      if (!translated) {
        throw new Error(`MyMemory 未返回内容${data?.responseDetails ? `：${data.responseDetails}` : ''}`);
      }
      results.push(decodeEntities(translated));
    }

    return {
      text: results.join('\n'),
      providerId: 'mymemory',
      provider: 'MyMemory',
      target: request.target,
      detectedSource: source
    };
  }
};
