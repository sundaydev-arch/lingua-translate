import type { Glossary } from '../core/glossary';
import { TECH_GLOSSARY, isIdentifier, isSingleEnglishWord, isWordLike, splitIdentifier } from '../core/identifier';
import { detectLanguage, isChinese, providerLanguage } from '../core/language';
import { translateText } from '../providers';
import type {
  IdentifierPart,
  IdentifierResult,
  LinguaConfig,
  LookupResult,
  Meaning,
  Phonetic,
  Sense,
  TextResult,
  WordResult
} from '../core/types';
import { lookupDictionaryApi } from './dictionaryapi';
import { EcdictDictionary, normalizePhonetic } from './ecdict';
import { lookupYoudao } from './youdao';

export interface DictionaryContext {
  config: LinguaConfig;
  glossary: Glossary;
  ecdict: EcdictDictionary;
}

export interface LookupOptions {
  /** Whether to query online dictionaries; disabled by default for hover to keep responses fast. */
  online?: boolean;
  /** Whether to call the translation service when no offline meaning is available. */
  translate?: boolean;
}

const EMPTY: LookupResult = { kind: 'error', message: '' };

/**
 * Single entry point: identifier → word → text.
 * The panel uses full online lookups; hover uses a fast offline path.
 */
export async function lookupSelection(
  text: string,
  context: DictionaryContext,
  options: LookupOptions = {}
): Promise<LookupResult> {
  const value = text.trim();
  if (!value) return { kind: 'error', message: 'Nothing to translate' };

  const glossaryHit = context.glossary.lookupPhrase(value);
  if (glossaryHit && !isIdentifier(value) && !isWordLike(value)) {
    return {
      kind: 'text',
      text: value,
      translation: glossaryHit,
      targetLang: context.config.targetLanguage,
      sourceLang: detectLanguage(value),
      badge: 'glossary',
      autoPlay: false,
      sources: 'Project glossary'
    };
  }

  if (isIdentifier(value)) return lookupIdentifier(value, context, options);
  if (isWordLike(value)) return lookupWord(value, context, options);
  return lookupText(value, context, options);
}

export async function lookupWord(
  text: string,
  context: DictionaryContext,
  options: LookupOptions = { online: true, translate: true }
): Promise<WordResult> {
  const word = text.trim();
  const { config, glossary, ecdict } = context;
  const online = options.online !== false;

  const glossaryTranslation = glossary.lookup(word);
  const offline = await ecdict.lookup(word);

  const [youdao, dictionaryApi] = online
    ? await Promise.all([
        lookupYoudao(word, config.proxy).catch(() => null),
        lookupDictionaryApi(word, config.proxy)
      ])
    : [null, null];

  const phonetics: Phonetic[] = [];
  const seen = new Set<string>();
  const addPhonetic = (raw: string, label?: string, audio?: Phonetic['audio']) => {
    const value = normalizePhonetic(raw);
    if (!value || seen.has(value)) return;
    seen.add(value);
    phonetics.push({ text: value, label, audio: audio || '' });
  };

  if (youdao?.usphone) addPhonetic(youdao.usphone, 'US');
  if (youdao?.ukphone) addPhonetic(youdao.ukphone, 'UK');
  for (const item of dictionaryApi?.phonetics || []) addPhonetic(item.text, undefined, item.audio);
  if (!phonetics.length && offline?.phonetic) addPhonetic(offline.phonetic, 'UK');

  const senses: Sense[] = [];
  if (youdao?.senses?.length) senses.push(...youdao.senses);
  else if (offline?.translation) {
    for (const line of offline.translation.split(/\\n|\n/).slice(0, 3)) {
      const value = line.trim();
      if (value) senses.push({ pos: offline.pos || '', items: [value] });
    }
  }

  const meanings: Meaning[] = dictionaryApi?.meanings?.slice(0, 4) || [];

  let translation = glossaryTranslation || youdao?.short || '';
  if (!translation) {
    translation = senses.map((sense) => `${sense.pos ? sense.pos + ' ' : ''}${sense.items.join('；')}`).join('\n');
  }
  if (!translation) translation = offline?.translation || '';

  const shouldTranslate = options.translate !== false && !glossaryTranslation && !translation;
  const machine = shouldTranslate ? await translateText(word, config).catch(() => null) : null;
  if (!translation && machine) translation = machine.text;

  const sources: string[] = [];
  if (glossaryTranslation) sources.push('Project glossary');
  if (offline) sources.push('ECDICT');
  if (youdao) sources.push('Youdao Dictionary');
  if (dictionaryApi) sources.push('dictionaryapi.dev');
  if (machine) sources.push(machine.provider);

  return {
    kind: 'word',
    text: word,
    phonetics: phonetics.slice(0, 3),
    senses,
    meanings,
    translation,
    targetLang: machine?.target || config.targetLanguage,
    autoPlay: config.autoPlay,
    sources: sources.join(' · ') || 'Offline dictionary',
    offline: Boolean(offline),
    identifier: false
  };
}

async function lookupIdentifier(
  text: string,
  context: DictionaryContext,
  options: LookupOptions = { online: true, translate: true }
): Promise<IdentifierResult> {
  const { config, glossary, ecdict } = context;
  const online = options.online !== false;
  const parts = splitIdentifier(text).slice(0, 6);

  if (!parts.length) {
    return {
      kind: 'identifier',
      text,
      items: [],
      translation: '',
      autoPlay: false,
      sources: ''
    };
  }

  const items: IdentifierPart[] = await Promise.all(
    parts.map(async (word) => {
      const glossaryHit = glossary.lookup(word);
      if (glossaryHit) return { word, phonetic: '', translation: glossaryHit, fromGlossary: true };

      const tech = TECH_GLOSSARY[word];
      if (tech) return { word, phonetic: '', translation: tech, fromGlossary: true };

      const entry = await ecdict.lookup(word);
      const phonetic = normalizePhonetic(entry?.phonetic || '');
      if (entry?.translation) {
        const translation = entry.translation
          .split(/\\n|\n/)[0]
          .replace(/[（(][^）)]*[）)]/g, '')
          .split(/[；;，,]/)
          .map((part) => part.trim())
          .filter(Boolean)
          .slice(0, 3)
          .join('，');
        return { word, phonetic, translation };
      }

      if (!online) return { word, phonetic, translation: '' };

      try {
        const youdao = await lookupYoudao(word, config.proxy);
        if (!youdao) return { word, phonetic, translation: '' };
        const value = (youdao.short || (youdao.senses[0] ? youdao.senses[0].items.slice(0, 2).join('，') : ''))
          .replace(/[（(][^）)]*[）)]/g, '')
          .replace(/<[^>]*>/g, '')
          .split(/[；;，,]/)
          .map((part) => part.trim())
          .filter(Boolean)
          .slice(0, 3)
          .join('，');
        return { word, phonetic: normalizePhonetic(youdao.usphone || youdao.ukphone), translation: value };
      } catch {
        return { word, phonetic, translation: '' };
      }
    })
  );

  let translation = '';
  if (options.translate !== false) {
    translation = await translateText(parts.join(' '), config)
      .then((result) => result.text)
      .catch(() => '');
  }
  if (!translation) translation = items.filter((item) => item.translation).map((item) => `${item.word}：${item.translation}`).join('；');

  const sources: string[] = [];
  if (items.some((item) => item.fromGlossary)) sources.push('Glossary');
  if (items.some((item) => item.translation && !item.fromGlossary)) sources.push('ECDICT / Youdao');
  if (translation && options.translate !== false) sources.push('Machine translation');

  return {
    kind: 'identifier',
    text,
    items,
    translation,
    autoPlay: false,
    sources: sources.join(' · ')
  };
}

async function lookupText(
  text: string,
  context: DictionaryContext,
  options: LookupOptions = { online: true, translate: true }
): Promise<TextResult> {
  const { config, glossary, ecdict } = context;
  const sourceLang = detectLanguage(text);
  const glossaryHit = glossary.lookupPhrase(text);

  let translation = glossaryHit || '';
  let provider = glossaryHit ? 'Project glossary' : '';

  if (!translation) {
    const outcome = await translateText(text, config);
    translation = outcome.text;
    provider = outcome.provider;
  }

  const result: TextResult = {
    kind: 'text',
    text,
    translation,
    targetLang: config.targetLanguage,
    sourceLang,
    badge: sourceLang === 'zh-CN' && text.length <= 14 && !/[。！？；，,.;!?]/.test(text) ? 'phrase' : 'sentence',
    autoPlay: config.autoPlay,
    sources: provider
  };

  // For Chinese selections, add the English rendering and phonetics; Chinese itself has no phonetic
  if (isChinese(text)) {
    const english = translation.replace(/\s+/g, ' ').trim();
    if (english) {
      result.englishText = english;
      if (isSingleEnglishWord(english)) {
        const entry = await ecdict.lookup(english);
        const phonetic = normalizePhonetic(entry?.phonetic || '');
        if (phonetic) {
          result.englishPhonetic = phonetic;
          result.sources = `${provider} · ECDICT`;
        } else if (options.online !== false) {
          try {
            const youdao = await lookupYoudao(english.toLowerCase(), config.proxy);
            const ipa = normalizePhonetic((youdao && (youdao.usphone || youdao.ukphone)) || '');
            if (ipa) {
              result.englishPhonetic = ipa;
              result.sources = `${provider} · Youdao Dictionary`;
            }
          } catch {
            // Phonetics are just a nice-to-have
          }
        }
      } else {
        const words = english
          .split(/\s+/)
          .filter((word) => /^[A-Za-z][A-Za-z'’\-]*$/.test(word))
          .slice(0, 6);
        if (words.length > 1) {
          const pairs = await Promise.all(
            words.map(async (word) => {
              const entry = await ecdict.lookup(word);
              const ipa = normalizePhonetic(entry?.phonetic || '');
              return ipa ? { word, ipa } : null;
            })
          );
          const usable = pairs.filter((item): item is { word: string; ipa: string } => Boolean(item));
          if (usable.length) {
            result.englishPhonetics = usable;
            result.sources = `${provider} · ECDICT`;
          }
        }
      }
    }
  }

  return result;
}

/** Hover-only: offline first, network translation only when offline data is missing, to keep hover responsive. */
export async function lookupHover(text: string, context: DictionaryContext): Promise<LookupResult> {
  const value = text.trim();
  if (!value) return EMPTY;

  const glossaryHit = context.glossary.lookupPhrase(value);
  if (glossaryHit) {
    return {
      kind: 'text',
      text: value,
      translation: glossaryHit,
      targetLang: context.config.targetLanguage,
      sourceLang: detectLanguage(value),
      badge: 'glossary',
      autoPlay: false,
      sources: 'Project glossary'
    };
  }

  if (isIdentifier(value)) return lookupIdentifier(value, context, { online: false, translate: true });
  if (isWordLike(value)) return lookupWord(value, context, { online: false, translate: true });
  return lookupText(value, context, { online: false, translate: true });
}

/** For hover rendering: compress the result into a single Markdown-friendly line. */
export function summarize(result: LookupResult): string {
  if (result.kind === 'word') {
    const phonetic = result.phonetics.length ? `/${result.phonetics[0].text}/` : '';
    return [phonetic, result.translation || result.senses.map((item) => item.items.join('；')).join('；')]
      .filter(Boolean)
      .join('  ');
  }
  if (result.kind === 'identifier') {
    return result.translation || result.items.map((item) => `${item.word}：${item.translation}`).join('；');
  }
  if (result.kind === 'text') return result.translation;
  return result.message;
}

export function languageTagOf(target: string): string {
  return providerLanguage(target, 'google');
}
