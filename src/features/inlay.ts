import * as vscode from 'vscode';
import { MemoryCache } from '../core/cache';
import { extractComment, extractString, worthTranslating } from '../core/identifier';
import type { LinguaConfig } from '../core/types';
import { translateText } from '../providers';

/**
 * Inline translation: appends an InlayHint at the end of a comment or string.
 * Network requests never block provideInlayHints; once results arrive a refresh is triggered, avoiding lag while typing.
 */
export class LinguaInlayHintsProvider implements vscode.InlayHintsProvider, vscode.Disposable {
  private readonly cache = new MemoryCache<string>(2000, 30 * 60 * 1000);
  private readonly inflight = new Set<string>();
  private readonly emitter = new vscode.EventEmitter<void>();
  private refreshTimer: NodeJS.Timeout | null = null;

  readonly onDidChangeInlayHints = this.emitter.event;

  constructor(
    private readonly getConfig: () => LinguaConfig,
    private readonly log: (message: string) => void
  ) {}

  provideInlayHints(document: vscode.TextDocument, range: vscode.Range): vscode.InlayHint[] {
    const config = this.getConfig();
    if (!config.inlineEnabled) return [];
    if (document.uri.scheme === 'output' || document.uri.scheme === 'vscode-terminal') return [];

    const hints: vscode.InlayHint[] = [];
    const end = Math.min(range.end.line, range.start.line + config.inlineMaxLines, document.lineCount - 1);

    for (let line = range.start.line; line <= end; line += 1) {
      const lineText = document.lineAt(line).text;
      const content = this.contentOf(lineText, config);
      if (!content || !worthTranslating(content, config.targetLanguage)) continue;

      const key = `${config.targetLanguage}\u0000${content}`;
      const cached = this.cache.get(key);
      if (cached === undefined) {
        this.fetch(content, config, key);
        continue;
      }
      if (!cached) continue;

      const hint = new vscode.InlayHint(
        new vscode.Position(line, lineText.length),
        `  ⟶ ${cached}`,
        vscode.InlayHintKind.Type
      );
      hint.paddingLeft = true;
      hint.tooltip = new vscode.MarkdownString(`*${content}*`);
      hints.push(hint);
    }

    return hints;
  }

  private contentOf(line: string, config: LinguaConfig): string {
    if (config.inlineMode === 'comment') return extractComment(line);
    if (config.inlineMode === 'string') return extractString(line);
    return extractComment(line) || extractString(line);
  }

  private fetch(content: string, config: LinguaConfig, key: string): void {
    if (this.inflight.has(key)) return;
    if (this.inflight.size >= 4) return;
    this.inflight.add(key);

    translateText(content, config)
      .then((result) => {
        this.cache.set(key, result.text.trim());
      })
      .catch((error) => {
        this.cache.set(key, '');
        this.log(`Inline translation failed: ${(error as Error).message}`);
      })
      .finally(() => {
        this.inflight.delete(key);
        this.scheduleRefresh();
      });
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.emitter.fire();
    }, 400);
    this.refreshTimer.unref?.();
  }

  refreshNow(): void {
    this.emitter.fire();
  }

  dispose(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.emitter.dispose();
  }
}
