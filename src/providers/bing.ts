import { getText, postForm } from '../core/http';
import { providerLanguage } from '../core/language';
import type { Provider, TranslationOutcome } from '../core/types';

const PAGE = 'https://www.bing.com/translator';
const TRANSLATE = 'https://www.bing.com/ttranslatev3';
const SESSION_TTL = 10 * 60 * 1000;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

interface BingSession {
  proxy: string;
  ig: string;
  iid: string;
  key: string;
  token: string;
  counter: number;
  createdAt: number;
}

interface BingResponse {
  translations?: Array<{ text?: string; to?: string }>;
  detectedLanguage?: { language?: string };
  ShowCaptcha?: boolean;
  statusCode?: number;
}

let session: BingSession | null = null;

/**
 * Bing's public endpoint requires the IG / IID and AbusePrevention token from the translator page first.
 * The token stays valid for about an hour; it is cached here for 10 minutes. Page structure and
 * language mappings may differ by region.
 */
async function getSession(proxy: string): Promise<BingSession> {
  if (session && session.proxy === proxy && Date.now() - session.createdAt < SESSION_TTL) {
    return session;
  }

  const html = await getText(PAGE, {
    proxy,
    timeout: 10000,
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8'
    }
  });

  const ig = html.match(/IG:"([^"]+)"/)?.[1];
  const iid = html.match(/data-iid="([^"]+)"/)?.[1];
  const abuse = html.match(/params_AbusePreventionHelper\s*=\s*\[([^\]]+)\]/)?.[1];
  if (!ig || !iid || !abuse) throw new Error('Bing 翻译页面结构已变化，无法获取令牌');

  const [key, token] = abuse.split(',').map((value) => value.trim().replace(/^"|"$/g, ''));
  if (!key || !token) throw new Error('Bing 翻译令牌解析失败');

  session = { proxy, ig, iid, key, token, counter: 0, createdAt: Date.now() };
  return session;
}

export const bingProvider: Provider = {
  id: 'bing',
  name: 'Bing 翻译',
  isConfigured: () => true,
  async translate(request, config): Promise<TranslationOutcome> {
    const current = await getSession(config.proxy);
    const target = providerLanguage(request.target, 'azure');
    const source = request.source === 'auto' || request.source === 'unknown' ? 'auto-detect' : providerLanguage(request.source, 'azure');
    current.counter += 1;
    const url = `${TRANSLATE}?isVertical=1&&IG=${encodeURIComponent(current.ig)}&IID=${encodeURIComponent(
      current.iid
    )}.${current.counter}`;

    const data = await postForm<BingResponse[] | BingResponse>(
      url,
      {
        fromLang: source,
        to: target,
        text: request.text,
        token: current.token,
        key: current.key,
        tryFetchingGenderDebiasedTranslations: 'true'
      },
      {
        proxy: config.proxy,
        timeout: 12000,
        headers: {
          'User-Agent': UA,
          Referer: PAGE,
          Origin: 'https://www.bing.com',
          Accept: 'application/json'
        }
      }
    );

    const payload = Array.isArray(data) ? data[0] : data;
    if (payload?.ShowCaptcha) throw new Error('Bing 触发了人机验证');
    const text = payload?.translations?.[0]?.text;
    if (!text) throw new Error('Bing 未返回译文');

    return {
      text,
      providerId: 'bing',
      provider: 'Bing 翻译',
      target: request.target,
      detectedSource: payload.detectedLanguage?.language || request.source
    };
  }
};
