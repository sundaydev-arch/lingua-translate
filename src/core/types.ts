/** Stable identifiers for all translation engines. */
export type EngineId =
  | 'google'
  | 'bing'
  | 'mymemory'
  | 'libretranslate'
  | 'deepl'
  | 'azure'
  | 'baidu'
  | 'youdao'
  | 'openai'
  | 'claude'
  | 'gemini';

export const ENGINE_NAMES: Record<EngineId, string> = {
  google: 'Google Translate',
  bing: 'Bing Translate',
  mymemory: 'MyMemory',
  libretranslate: 'LibreTranslate',
  deepl: 'DeepL',
  azure: 'Azure Translator',
  baidu: 'Baidu Translate',
  youdao: 'Youdao Translate',
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini'
};

export interface TranslationRequest {
  text: string;
  /** BCP-47 or provider-recognized language code; auto means automatic detection. */
  source: string;
  target: string;
}

export interface TranslationOutcome {
  text: string;
  providerId: EngineId;
  provider: string;
  target: string;
  detectedSource?: string;
}

export interface Provider {
  id: EngineId;
  name: string;
  /** Skip this engine when its required credentials are not configured. */
  isConfigured(config: LinguaConfig): boolean;
  translate(request: TranslationRequest, config: LinguaConfig): Promise<TranslationOutcome>;
}

export interface LinguaConfig {
  targetLanguage: string;
  engine: EngineId | 'auto';
  fallback: boolean;
  hoverEnabled: boolean;
  hoverDelay: number;
  hoverMaxLength: number;
  inlineEnabled: boolean;
  inlineMode: 'comment' | 'string' | 'both';
  inlineMaxLines: number;
  offlineDictionary: boolean;
  onlineDictionary: boolean;
  cacheEnabled: boolean;
  cacheTtlHours: number;
  cacheMaxEntries: number;
  proxy: string;
  panelColumn: 'beside' | 'active';
  autoPlay: boolean;
  uiLanguage: 'auto' | 'zh-CN' | 'en';
  glossary: Record<string, string>;
  glossaryPath: string;
  vocabularyPath: string;
  libretranslateUrl: string;
  libretranslateApiKey: string;
  deeplApiKey: string;
  azureApiKey: string;
  azureRegion: string;
  baiduAppId: string;
  baiduAppKey: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  claudeApiKey: string;
  claudeBaseUrl: string;
  claudeModel: string;
  geminiApiKey: string;
  geminiModel: string;
  ocrApiKey: string;
  ocrLanguage: string;
}

/* ------------------------------ Lookup results ------------------------------ */

export interface Phonetic {
  text: string;
  label?: string;
  audio?: string | { url: string; fallback?: string };
}

export interface Sense {
  pos: string;
  items: string[];
}

export interface Definition {
  definition: string;
  example: string;
}

export interface Meaning {
  partOfSpeech: string;
  synonyms: string[];
  definitions: Definition[];
}

export interface IdentifierPart {
  word: string;
  phonetic: string;
  translation: string;
  /** Whether the word came from the glossary (offline hit). */
  fromGlossary?: boolean;
}

export interface WordResult {
  kind: 'word';
  text: string;
  phonetics: Phonetic[];
  senses: Sense[];
  meanings: Meaning[];
  translation: string;
  targetLang: string;
  autoPlay: boolean;
  sources: string;
  offline?: boolean;
  identifier?: boolean;
}

export interface IdentifierResult {
  kind: 'identifier';
  text: string;
  items: IdentifierPart[];
  translation: string;
  autoPlay: boolean;
  sources: string;
}

export interface TextResult {
  kind: 'text';
  text: string;
  translation: string;
  targetLang: string;
  sourceLang: string;
  /** Stable badge key rendered by the panel in the current UI language. */
  badge: 'phrase' | 'sentence' | 'glossary';
  autoPlay: boolean;
  sources: string;
  englishText?: string;
  englishPhonetic?: string;
  englishPhonetics?: Array<{ word: string; ipa: string }>;
}

export interface ErrorResult {
  kind: 'error';
  message: string;
}

export type LookupResult = WordResult | IdentifierResult | TextResult | ErrorResult;

export interface VocabularyEntry {
  word: string;
  phonetic: string;
  translation: string;
  addedAt: number;
}
