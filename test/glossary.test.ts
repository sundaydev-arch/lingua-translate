import { describe, expect, it } from 'vitest';
import { Glossary } from '../src/core/glossary';
import type { LinguaConfig } from '../src/core/types';

function config(glossary: Record<string, string>): LinguaConfig {
  return {
    targetLanguage: 'zh-CN',
    engine: 'auto',
    fallback: true,
    hoverEnabled: true,
    hoverDelay: 300,
    hoverMaxLength: 40,
    inlineEnabled: false,
    inlineMode: 'comment',
    inlineMaxLines: 200,
    offlineDictionary: true,
    onlineDictionary: true,
    cacheEnabled: true,
    cacheTtlHours: 168,
    cacheMaxEntries: 5000,
    proxy: '',
    panelColumn: 'beside',
    autoPlay: false,
    uiLanguage: 'zh-CN',
    glossary,
    glossaryPath: '',
    vocabularyPath: '',
    libretranslateUrl: 'https://libretranslate.com',
    libretranslateApiKey: '',
    deeplApiKey: '',
    azureApiKey: '',
    azureRegion: '',
    baiduAppId: '',
    baiduAppKey: '',
    openaiApiKey: '',
    openaiBaseUrl: 'https://api.openai.com/v1',
    openaiModel: 'gpt-4o-mini',
    claudeApiKey: '',
    claudeBaseUrl: 'https://api.anthropic.com',
    claudeModel: 'claude-3-5-haiku-latest',
    geminiApiKey: '',
    geminiModel: 'gemini-1.5-flash',
    ocrApiKey: 'helloworld',
    ocrLanguage: 'eng'
  };
}

describe('Glossary', () => {
  it('matches case-insensitively', async () => {
    const glossary = new Glossary();
    await glossary.reload(config({ API: '接口', Token: '令牌' }));
    expect(glossary.lookup('api')).toBe('接口');
    expect(glossary.lookup('TOKEN')).toBe('令牌');
  });

  it('translates a phrase only when all words are known', async () => {
    const glossary = new Glossary();
    await glossary.reload(config({ send: '发送', code: '验证码' }));
    expect(glossary.lookupPhrase('send code')).toBe('发送验证码');
    expect(glossary.lookupPhrase('send message')).toBeUndefined();
  });

  it('reports its size', async () => {
    const glossary = new Glossary();
    await glossary.reload(config({ a: '1', b: '2' }));
    expect(glossary.size).toBe(2);
  });
});
