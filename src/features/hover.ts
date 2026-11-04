import * as vscode from 'vscode';
import { MemoryCache } from '../core/cache';
import type { DictionaryContext } from '../dictionary';
import { lookupHover } from '../dictionary';
import type { LinguaConfig, LookupResult } from '../core/types';

export interface HoverDeps {
  getConfig: () => LinguaConfig;
  getContext: () => DictionaryContext;
  language: () => 'zh-CN' | 'en';
  log: (message: string) => void;
}

const WORD_PATTERN = /[\p{L}\p{N}_$'’\-]+/u;

export class LinguaHoverProvider implements vscode.HoverProvider {
  private readonly cache = new MemoryCache<LookupResult>(500, 15 * 60 * 1000);

  constructor(private readonly deps: HoverDeps) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    const config = this.deps.getConfig();
    if (!config.hoverEnabled) return undefined;

    const range = document.getWordRangeAtPosition(position, WORD_PATTERN);
    if (!range) return undefined;
    const word = document.getText(range).trim();
    if (!word || word.length > config.hoverMaxLength) return undefined;

    const key = `${config.targetLanguage}\u0000${word}`;
    const cached = this.cache.get(key);
    if (cached) return buildHover(cached, word, config, this.deps.language());

    await wait(config.hoverDelay, token);
    if (token.isCancellationRequested) return undefined;

    try {
      const result = await lookupHover(word, this.deps.getContext());
      this.cache.set(key, result);
      if (token.isCancellationRequested) return undefined;
      return buildHover(result, word, config, this.deps.language());
    } catch (error) {
      this.deps.log(`Hover lookup failed: ${(error as Error).message}`);
      return undefined;
    }
  }
}

function wait(ms: number, token: vscode.CancellationToken): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    token.onCancellationRequested(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function buildHover(
  result: LookupResult,
  word: string,
  config: LinguaConfig,
  language: 'zh-CN' | 'en'
): vscode.Hover | undefined {
  const markdown = new vscode.MarkdownString();
  markdown.isTrusted = true;
  markdown.supportHtml = false;

  if (result.kind === 'word') {
    const phonetic = result.phonetics.length ? ` /${result.phonetics[0].text}/` : '';
    markdown.appendMarkdown(`**${escapeMarkdown(result.text)}**${phonetic}\n\n`);
    const translation = result.translation || result.senses.map((sense) => sense.items.join('；')).join('；');
    if (translation) markdown.appendMarkdown(`${escapeMarkdown(translation)}\n\n`);
    const senses = result.senses.slice(0, 3);
    if (senses.length && translation) {
      for (const sense of senses) {
        markdown.appendMarkdown(`- ${sense.pos ? `*${escapeMarkdown(sense.pos)}* ` : ''}${escapeMarkdown(sense.items.join('；'))}\n`);
      }
      markdown.appendMarkdown('\n');
    }
  } else if (result.kind === 'identifier') {
    markdown.appendMarkdown(`**${escapeMarkdown(result.text)}**\n\n`);
    for (const item of result.items.slice(0, 6)) {
      markdown.appendMarkdown(
        `- \`${escapeMarkdown(item.word)}\`${item.phonetic ? ` /${escapeMarkdown(item.phonetic)}/` : ''}：${escapeMarkdown(item.translation || '—')}\n`
      );
    }
    markdown.appendMarkdown('\n');
  } else if (result.kind === 'text') {
    markdown.appendMarkdown(`${escapeMarkdown(result.translation)}\n\n`);
    if (result.englishPhonetic) markdown.appendMarkdown(`/${escapeMarkdown(result.englishPhonetic)}/\n\n`);
  } else {
    return undefined;
  }

  if (config.targetLanguage) {
    markdown.appendMarkdown(
      `[${language === 'en' ? 'Open full definition' : '查看完整释义'}](command:linguaTranslate.translateText?${encodeURIComponent(
        JSON.stringify([word])
      )})`
    );
  }

  return new vscode.Hover(markdown);
}

function escapeMarkdown(value: string): string {
  return String(value).replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
}
