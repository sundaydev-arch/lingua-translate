import { detectLanguage, needsReverse } from '../core/language';
import type { EngineId, LinguaConfig, Provider, TranslationOutcome } from '../core/types';
import { azureProvider } from './azure';
import { baiduProvider } from './baidu';
import { bingProvider } from './bing';
import { claudeProvider } from './claude';
import { deeplProvider } from './deepl';
import { geminiProvider } from './gemini';
import { googleProvider } from './google';
import { libreTranslateProvider } from './libretranslate';
import { myMemoryProvider } from './mymemory';
import { openAiProvider } from './openai';
import { youdaoProvider } from './youdao';

// Bing's public endpoint depends on web-page tokens and is flagged as a bot (HTTP 401)
// in some networks, so it goes last in the fallback chain: try it only when the first
// four are unstable, to keep regular translations fast.
export const FREE_CHAIN: EngineId[] = ['google', 'mymemory', 'libretranslate', 'youdao', 'bing'];

const PROVIDERS: Record<EngineId, Provider> = {
  google: googleProvider,
  bing: bingProvider,
  mymemory: myMemoryProvider,
  libretranslate: libreTranslateProvider,
  deepl: deeplProvider,
  azure: azureProvider,
  baidu: baiduProvider,
  youdao: youdaoProvider,
  openai: openAiProvider,
  claude: claudeProvider,
  gemini: geminiProvider
};

/** Pure-function engine selection logic, easy to unit test. */
export function pickEngineIds(
  engine: EngineId | 'auto',
  fallback: boolean,
  configured: (id: EngineId) => boolean
): EngineId[] {
  const preferred: EngineId[] = engine === 'auto' ? FREE_CHAIN : [engine, ...(fallback ? FREE_CHAIN : [])];
  const seen = new Set<EngineId>();
  const result: EngineId[] = [];
  for (const id of preferred) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (configured(id)) result.push(id);
  }
  return result;
}

export function pickProviders(config: LinguaConfig): Provider[] {
  return pickEngineIds(config.engine, config.fallback, (id) => PROVIDERS[id].isConfigured(config)).map(
    (id) => PROVIDERS[id]
  );
}

/** Translate Chinese selections into English; otherwise use the configured target language. */
export function resolveDirection(text: string, target: string): { source: string; target: string } {
  const source = detectLanguage(text);
  if (needsReverse(source, target)) {
    return { source, target: target.startsWith('zh') ? 'en' : 'zh-CN' };
  }
  return { source, target };
}

export interface TranslateOptions {
  /** Known source language; auto-detected when omitted. */
  source?: string;
  /** Overrides the target language from the configuration. */
  target?: string;
}

/**
 * Translate in engine order: fall back to the free chain when the selected engine fails.
 * Passing `config.fallback = false` tries the selected engine only.
 */
export async function translateText(
  text: string,
  config: LinguaConfig,
  options: TranslateOptions = {}
): Promise<TranslationOutcome> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Nothing to translate');

  const direction = resolveDirection(trimmed, options.target || config.targetLanguage);
  const source = options.source || (direction.source === 'unknown' ? 'auto' : direction.source);
  const target = direction.target;

  const providers = pickProviders(config);
  if (!providers.length) {
    throw new Error('No translation engine is available; configure an API key or choose auto in Lingua settings');
  }

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await provider.translate({ text: trimmed, source, target }, config);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${provider.name}: ${message}`);
    }
  }

  throw new Error(errors.join('; ') || 'All translation engines are unavailable');
}

export function providerById(id: EngineId): Provider {
  return PROVIDERS[id];
}
