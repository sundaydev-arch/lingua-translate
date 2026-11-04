export type LanguageCode = 'zh-CN' | 'zh-TW' | 'ja' | 'ko' | 'ru' | 'ar' | 'th' | 'en' | 'de' | 'fr' | 'es' | 'pt' | 'unknown';

const RANGES: Array<[LanguageCode, RegExp]> = [
  ['ja', /[\u3040-\u30ff]/],
  ['ko', /[\uac00-\ud7af]/],
  ['ru', /[\u0400-\u04ff]/],
  ['ar', /[\u0600-\u06ff]/],
  ['th', /[\u0e00-\u0e7f]/],
  ['zh-CN', /[\u3400-\u9fff]/]
];

/** Detect the dominant language of the text. Comments and strings in code mostly mix Chinese and English, so only script-level detection is done here. */
export function detectLanguage(text: string): LanguageCode {
  for (const [code, pattern] of RANGES) {
    if (pattern.test(text)) return code;
  }
  if (/[ÄäÖöÜüß]/.test(text)) return 'de';
  if (/[ÀÂÇÉÈÊËÎÏÔÙÛÜŸŒÆ]/i.test(text)) return 'fr';
  if (/[Ññ¿¡]/.test(text)) return 'es';
  if (/[ÃÕÇ]/i.test(text)) return 'pt';
  return /[A-Za-z]/.test(text) ? 'en' : 'unknown';
}

export function isChinese(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text);
}

export function isCjk(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(text);
}

/** Whether the target language is the text's own language (a reverse translation is then needed to avoid "Chinese to Chinese"). */
export function needsReverse(source: LanguageCode, target: string): boolean {
  if (target.startsWith('zh')) return source === 'zh-CN' || source === 'zh-TW';
  return source === target;
}

/** Unified BCP-47 to provider code mapping. */
export function providerLanguage(code: string, provider: 'google' | 'bing' | 'azure' | 'baidu' | 'deepl' | 'libre' | 'generic'): string {
  const normalized = code === 'auto' ? 'auto' : code;
  if (provider === 'azure') {
    const map: Record<string, string> = { 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant', 'en': 'en', 'ja': 'ja', 'ko': 'ko' };
    return map[normalized] || normalized;
  }
  if (provider === 'baidu') {
    const map: Record<string, string> = {
      'zh-CN': 'zh',
      'zh-TW': 'cht',
      en: 'en',
      ja: 'jp',
      ko: 'kor',
      de: 'de',
      fr: 'fra',
      es: 'spa',
      ru: 'ru',
      pt: 'pt',
      auto: 'auto'
    };
    return map[normalized] || normalized;
  }
  if (provider === 'deepl') {
    const map: Record<string, string> = {
      'zh-CN': 'ZH',
      'zh-TW': 'ZH',
      en: 'EN',
      ja: 'JA',
      ko: 'KO',
      de: 'DE',
      fr: 'FR',
      es: 'ES',
      ru: 'RU',
      pt: 'PT'
    };
    return map[normalized] || normalized.toUpperCase();
  }
  if (provider === 'google' || provider === 'bing' || provider === 'libre' || provider === 'generic') {
    const map: Record<string, string> = { 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', en: 'en', ja: 'ja', ko: 'ko' };
    return map[normalized] || normalized;
  }
  return normalized;
}
