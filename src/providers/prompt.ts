const LANGUAGE_NAMES: Record<string, string> = {
  'zh-CN': 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  ru: 'Russian',
  pt: 'Portuguese'
};

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

/** Shared LLM translation prompt: output the translation only, preserving code, identifiers, and line breaks. */
export function buildSystemPrompt(target: string): string {
  return [
    `You are a professional translator. Translate the user's text into ${languageName(target)}.`,
    'Output only the translation, with no explanations, quotes, or extra formatting.',
    'Preserve code identifiers, variable names, URLs, numbers, and the original line breaks.'
  ].join(' ');
}
