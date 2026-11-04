import { describe, expect, it } from 'vitest';
import { chunkText, isTranslatableFile, isTranslatedOutput, translatedPath } from '../src/features/batch';

describe('batch translation helpers', () => {
  it('keeps paragraphs together while respecting the limit', () => {
    const first = 'a'.repeat(700);
    const second = 'b'.repeat(700);
    expect(chunkText(`${first}\n\n${second}`, 1200)).toEqual([first, second]);

    const short = `${'c'.repeat(100)}\n\n${'d'.repeat(10)}`;
    expect(chunkText(short, 1200)).toEqual([short]);
  });

  it('drops empty paragraphs', () => {
    expect(chunkText('one\n\n\n\ntwo')).toEqual(['one\n\ntwo']);
  });

  it('builds a sibling output path without touching the source', () => {
    expect(translatedPath('/docs/guide.md', 'zh-CN')).toBe('/docs/guide.zh-CN.md');
    expect(translatedPath('/docs/notes.txt', 'en')).toBe('/docs/notes.en.txt');
  });

  it('recognizes previous outputs and supported extensions', () => {
    expect(isTranslatedOutput('/docs/guide.zh-CN.md', 'zh-CN')).toBe(true);
    expect(isTranslatedOutput('/docs/guide.md', 'zh-CN')).toBe(false);
    expect(isTranslatableFile('/docs/guide.md')).toBe(true);
    expect(isTranslatableFile('/docs/guide.txt')).toBe(true);
    expect(isTranslatableFile('/docs/guide.ts')).toBe(false);
  });
});
