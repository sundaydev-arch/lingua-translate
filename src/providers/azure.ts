import { postJson, splitChunks } from '../core/http';
import { providerLanguage } from '../core/language';
import type { Provider, TranslationOutcome } from '../core/types';

interface AzureResponse {
  translations?: Array<{ text?: string; to?: string }>;
  error?: { message?: string };
}

export const azureProvider: Provider = {
  id: 'azure',
  name: 'Azure 翻译',
  isConfigured: (config) => Boolean(config.azureApiKey),
  async translate(request, config): Promise<TranslationOutcome> {
    const target = providerLanguage(request.target, 'azure');
    const source = request.source === 'unknown' || request.source === 'auto' ? 'auto' : providerLanguage(request.source, 'azure');
    const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(target)}${
      source !== 'auto' ? `&from=${encodeURIComponent(source)}` : ''
    }`;

    const headers: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': config.azureApiKey,
      'Content-Type': 'application/json'
    };
    if (config.azureRegion) headers['Ocp-Apim-Subscription-Region'] = config.azureRegion;

    const chunks = splitChunks(request.text, 4000);
    const results: string[] = [];

    for (const chunk of chunks) {
      const data = await postJson<AzureResponse[]>(url, [{ Text: chunk }], {
        proxy: config.proxy,
        timeout: 12000,
        headers
      });
      const text = data?.[0]?.translations?.[0]?.text;
      if (!text) throw new Error(`Azure 未返回译文${data?.[0]?.error?.message ? `：${data[0].error.message}` : ''}`);
      results.push(text);
    }

    return {
      text: results.join('\n'),
      providerId: 'azure',
      provider: 'Azure 翻译',
      target: request.target,
      detectedSource: request.source
    };
  }
};
