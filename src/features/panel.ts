import * as vscode from 'vscode';
import { readConfig, uiLanguage } from '../core/config';
import type { LinguaConfig, LookupResult, VocabularyEntry } from '../core/types';
import { format, stringsFor } from '../i18n';
import { renderPanelHtml } from '../webview/panel';
import { SpeechService, type Voice } from '../speech/tts';

export type VocabularyAdder = (entry: VocabularyEntry) => Promise<boolean>;

export class TranslationPanel {
  private panel: vscode.WebviewPanel | null = null;

  constructor(
    private readonly speech: SpeechService,
    private readonly addVocabulary: VocabularyAdder
  ) {}

  show(
    text: string,
    config: LinguaConfig,
    initial: LookupResult | null,
    id: number,
    language: 'zh-CN' | 'en'
  ): void {
    if (!this.panel) {
      const column = config.panelColumn === 'active' ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside;
      this.panel = vscode.window.createWebviewPanel(
        'linguaTranslate',
        stringsFor(language).panelTitle,
        column,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );
      this.panel.onDidDispose(() => {
        this.panel = null;
      });
      this.panel.webview.onDidReceiveMessage((message: unknown) => void this.handleMessage(message));
      this.panel.reveal(column, true);
    } else {
      this.panel.title = stringsFor(language).panelTitle;
      this.panel.reveal(undefined, true);
    }

    this.panel.title = `Lingua · ${text.length > 24 ? text.slice(0, 24) + '…' : text}`;
    this.panel.webview.html = renderPanelHtml(text, initial, config, id, language);
  }

  post(message: unknown): void {
    void this.panel?.webview.postMessage(message);
  }

  dispose(): void {
    this.panel?.dispose();
    this.panel = null;
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!message || typeof message !== 'object') return;
    const data = message as Record<string, unknown>;

    if (data.type === 'command') {
      const command = String(data.command || '');
      if (!/^linguaTranslate\.\w+$/.test(command)) return;
      const argument = typeof data.argument === 'string' ? data.argument : undefined;
      await vscode.commands.executeCommand(command, argument);
      return;
    }

    if (data.type === 'copy') {
      await vscode.env.clipboard.writeText(String(data.text || ''));
      vscode.window.setStatusBarMessage(stringsFor(uiLanguage(readConfig())).copied, 2000);
      return;
    }

    if (data.type === 'speak') {
      const id = String(data.id || '');
      const text = String(data.text || '');
      const voice = String(data.voice || 'us') as Voice;
      try {
        const audio = await this.speech.loadBase64(text, voice);
        this.post({ type: 'speakResult', id, ok: Boolean(audio), audio: audio || '' });
      } catch {
        this.post({ type: 'speakResult', id, ok: false, audio: '' });
      }
      return;
    }

    if (data.type === 'vocabulary') {
      const word = String(data.word || '').trim();
      if (!word) return;
      const added = await this.addVocabulary({
        word,
        phonetic: String(data.phonetic || ''),
        translation: String(data.translation || ''),
        addedAt: Date.now()
      });
      const s = stringsFor(uiLanguage(readConfig()));
      vscode.window.setStatusBarMessage(
        added ? format(s.addedVocabulary, { word }) : format(s.existingVocabulary, { word }),
        2500
      );
    }
  }
}
