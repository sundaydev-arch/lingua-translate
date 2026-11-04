import { describe, expect, it } from 'vitest';
import { FREE_CHAIN, pickEngineIds, resolveDirection } from '../src/providers';
import { parseSense } from '../src/dictionary/youdao';

describe('pickEngineIds', () => {
  it('uses the free chain for auto', () => {
    expect(pickEngineIds('auto', true, () => true)).toEqual(FREE_CHAIN);
  });

  it('puts the selected engine first and falls back to free engines', () => {
    const result = pickEngineIds('deepl', true, () => true);
    expect(result[0]).toBe('deepl');
    expect(result).toEqual(['deepl', ...FREE_CHAIN]);
  });

  it('does not fall back when fallback is disabled', () => {
    expect(pickEngineIds('deepl', false, () => true)).toEqual(['deepl']);
  });

  it('skips engines that are not configured', () => {
    expect(pickEngineIds('deepl', true, (id) => id === 'deepl' || id === 'google')).toEqual(['deepl', 'google']);
    expect(pickEngineIds('deepl', false, () => false)).toEqual([]);
  });
});

describe('resolveDirection', () => {
  it('reverses Chinese to English', () => {
    expect(resolveDirection('发送验证码', 'zh-CN')).toEqual({ source: 'zh-CN', target: 'en' });
  });

  it('keeps English to Chinese', () => {
    expect(resolveDirection('send verification code', 'zh-CN')).toEqual({
      source: 'en',
      target: 'zh-CN'
    });
  });

  it('routes other language pairs through the configured target', () => {
    expect(resolveDirection('こんにちは', 'en')).toEqual({ source: 'ja', target: 'en' });
  });
});

describe('parseSense', () => {
  it('splits part of speech and de-duplicates similar items', () => {
    expect(parseSense('n. 代码；密码；法典')).toEqual({ pos: 'n.', items: ['代码', '密码', '法典'] });
    expect(parseSense('int. 喂，你好（用于问候）；喂，你好（打电话）')).toEqual({
      pos: 'int.',
      items: ['喂，你好（用于问候）']
    });
    expect(parseSense('')).toBeNull();
  });
});
