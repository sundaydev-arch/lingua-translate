import { describe, expect, it } from 'vitest';
import {
  extractComment,
  extractString,
  isIdentifier,
  isWordLike,
  splitIdentifier,
  worthTranslating
} from '../src/core/identifier';

describe('splitIdentifier', () => {
  it('splits camelCase / snake_case / kebab-case', () => {
    expect(splitIdentifier('getUserInfo')).toEqual(['get', 'user', 'info']);
    expect(splitIdentifier('captcha_id')).toEqual(['captcha', 'id']);
    expect(splitIdentifier('api-token-value')).toEqual(['api', 'token', 'value']);
    expect(splitIdentifier('HTTPResponse')).toEqual(['http', 'response']);
  });

  it('deduplicates repeated words', () => {
    expect(splitIdentifier('user_user_id')).toEqual(['user', 'id']);
  });
});

describe('isIdentifier', () => {
  it('recognises code identifiers but not plain words', () => {
    expect(isIdentifier('captcha_id')).toBe(true);
    expect(isIdentifier('getUserInfo')).toBe(true);
    expect(isIdentifier('api.token')).toBe(true);
    expect(isIdentifier('hello')).toBe(false);
    expect(isIdentifier('two words')).toBe(false);
  });
});

describe('isWordLike', () => {
  it('accepts words and up to three-word phrases', () => {
    expect(isWordLike('hello')).toBe(true);
    expect(isWordLike("don't")).toBe(true);
    expect(isWordLike('verification code')).toBe(true);
    expect(isWordLike('this is a much longer phrase')).toBe(false);
  });
});

describe('extractComment', () => {
  it('extracts common comment styles', () => {
    expect(extractComment('// 发送验证码')).toBe('发送验证码');
    expect(extractComment('  # 初始化缓存')).toBe('初始化缓存');
    expect(extractComment('-- 数据库连接')).toBe('数据库连接');
    expect(extractComment('/* 请求超时 */')).toBe('请求超时');
    expect(extractComment('const a = 1; // 行尾注释')).toBe('行尾注释');
  });
});

describe('extractString', () => {
  it('extracts quoted strings', () => {
    expect(extractString('const message = "hello world";')).toBe('hello world');
    expect(extractString("throw new Error('not found')")).toBe('not found');
    expect(extractString('const t = `send code`;')).toBe('send code');
  });
});

describe('worthTranslating', () => {
  it('skips URLs and same-language text', () => {
    expect(worthTranslating('https://example.com', 'zh-CN')).toBe(false);
    expect(worthTranslating('发送验证码', 'zh-CN')).toBe(false);
    expect(worthTranslating('send verification code', 'zh-CN')).toBe(true);
    expect(worthTranslating('hello', 'en')).toBe(false);
  });
});
