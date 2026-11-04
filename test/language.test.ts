import { describe, expect, it } from 'vitest';
import { detectLanguage, needsReverse, providerLanguage } from '../src/core/language';

describe('detectLanguage', () => {
  it('detects scripts', () => {
    expect(detectLanguage('你好，世界')).toBe('zh-CN');
    expect(detectLanguage('こんにちは')).toBe('ja');
    expect(detectLanguage('안녕하세요')).toBe('ko');
    expect(detectLanguage('Привет')).toBe('ru');
    expect(detectLanguage('hello world')).toBe('en');
    expect(detectLanguage('12345')).toBe('unknown');
  });
});

describe('needsReverse', () => {
  it('translates Chinese back to English when target is Chinese', () => {
    expect(needsReverse('zh-CN', 'zh-CN')).toBe(true);
    expect(needsReverse('zh-TW', 'zh-CN')).toBe(true);
    expect(needsReverse('en', 'zh-CN')).toBe(false);
    expect(needsReverse('en', 'en')).toBe(true);
  });
});

describe('providerLanguage', () => {
  it('maps BCP-47 codes per provider', () => {
    expect(providerLanguage('zh-CN', 'azure')).toBe('zh-Hans');
    expect(providerLanguage('zh-TW', 'azure')).toBe('zh-Hant');
    expect(providerLanguage('zh-CN', 'baidu')).toBe('zh');
    expect(providerLanguage('ja', 'baidu')).toBe('jp');
    expect(providerLanguage('zh-CN', 'deepl')).toBe('ZH');
    expect(providerLanguage('en', 'deepl')).toBe('EN');
    expect(providerLanguage('zh-CN', 'google')).toBe('zh-CN');
  });
});
