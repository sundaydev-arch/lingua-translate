import { createHash } from 'crypto';
import { getJson, splitChunks } from '../core/http';
import { providerLanguage } from '../core/language';
import type { Provider, TranslationOutcome } from '../core/types';

interface BaiduResponse {
  error_code?: string;
  error_msg?: string;
  trans_result?: Array<{ src?: string; dst?: string }>;
}

export const baiduProvider: Provider = {
  id: 'baidu',
  name: 'Baidu Translate',
  isConfigured: (config) => Boolean(config.baiduAppId && config.baiduAppKey),
  async translate(request, config): Promise<TranslationOutcome> {
    const chunks = splitChunks(request.text, 1000);
    const results: string[] = [];

    for (const chunk of chunks) {
      const salt = String(Date.now());
      const sign = createHash('md5')
        .update(`${config.baiduAppId}${chunk}${salt}${config.baiduAppKey}`)
        .digest('hex');
      const url =
        'https://fanyi-api.baidu.com/api/trans/vip/translate' +
        `?q=${encodeURIComponent(chunk)}` +
        `&from=${encodeURIComponent(providerLanguage(request.source, 'baidu'))}` +
        `&to=${encodeURIComponent(providerLanguage(request.target, 'baidu'))}` +
        `&appid=${encodeURIComponent(config.baiduAppId)}` +
        `&salt=${salt}&sign=${sign}`;

      const data = await getJson<BaiduResponse>(url, { proxy: config.proxy, timeout: 10000 });
      if (data?.error_code) throw new Error(`Baidu Translate error ${data.error_code}: ${data.error_msg || ''}`);
      if (!data?.trans_result?.length) throw new Error('Baidu Translate returned no translation');
      results.push(data.trans_result.map((item) => item.dst || '').join('\n'));
    }

    return {
      text: results.join('\n'),
      providerId: 'baidu',
      provider: 'Baidu Translate',
      target: request.target,
      detectedSource: request.source
    };
  }
};
