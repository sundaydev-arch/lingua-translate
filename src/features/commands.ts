import * as vscode from 'vscode';
import type { DiskCache } from '../core/cache';
import { uiLanguage, updateSetting } from '../core/config';
import type { Glossary } from '../core/glossary';
import type { LinguaConfig, LookupResult } from '../core/types';
import type { DictionaryContext } from '../dictionary';
import { lookupHover, lookupSelection } from '../dictionary';
import { format, stringsFor, type UIStrings } from '../i18n';
import type { HistoryEntry, TranslationHistory } from './history';
import type { TranslationPanel } from './panel';
import type { SettingsPanel } from './settingsPanel';
import type { VocabularyPanel, VocabularyStore } from './vocabulary';
import { entryFromResult } from './vocabulary';
import type { SpeechService } from '../speech/tts';

const MAX_TEXT_LENGTH = 5000;
const WORD_PATTERN = /[\p{L}\p{N}_$'’\-]+/u;

export interface CommandDeps {
  context: vscode.ExtensionContext;
  getConfig: () => LinguaConfig;
  getDictionaryContext: () => DictionaryContext;
  glossary: Glossary;
  cache: DiskCache;
  panel: TranslationPanel;
  vocabulary: VocabularyStore;
  vocabularyPanel: VocabularyPanel;
  settings: SettingsPanel;
  speech: SpeechService;
  history: TranslationHistory;
  log: (message: string) => void;
  statusBar: vscode.StatusBarItem;
}

export function registerCommands(deps: CommandDeps): vscode.Disposable[] {
  let requestSeq = 0;

  const language = (): 'zh-CN' | 'en' => uiLanguage(deps.getConfig());
  const strings = (): UIStrings => stringsFor(language());

  async function openResult(text: string, options: { autoPlay?: boolean } = {}): Promise<void> {
    const s = strings();
    const editor = vscode.window.activeTextEditor;
    const value = text.trim();
    if (!value) {
      void vscode.window.showInformationMessage(s.noSelection);
      return;
    }

    let input = value;
    if (input.length > MAX_TEXT_LENGTH) {
      input = input.slice(0, MAX_TEXT_LENGTH);
      void vscode.window.showWarningMessage(format(s.textTooLong, { max: MAX_TEXT_LENGTH }));
    }

    const config = deps.getConfig();
    const panelConfig = options.autoPlay ? { ...config, autoPlay: true } : config;
    const id = ++requestSeq;
    const cacheKey = `${panelConfig.targetLanguage}\u0000${input}`;
    const cached = deps.cache.get('translate', cacheKey) || null;

    deps.panel.show(input, panelConfig, cached, id, language());

    if (config.panelColumn === 'beside' && editor?.viewColumn) {
      void vscode.window.showTextDocument(editor.document, {
        viewColumn: editor.viewColumn,
        preserveFocus: false,
        preview: false
      });
    }

    if (cached) {
      const preview = previewOf(cached);
      if (cached.kind !== 'error' && preview) deps.history.add(input, cached.translation);
      deps.log(`Cache hit: ${input.slice(0, 40)}`);
      return;
    }

    deps.statusBar.text = '$(sync~spin) Lingua';
    deps.statusBar.tooltip = s.badgeLoading;

    try {
      const result = await lookupSelection(input, deps.getDictionaryContext(), { online: true, translate: true });
      if (!result.kind) return;
      (result as LookupResult & { id: number }).id = id;
      deps.cache.set('translate', cacheKey, result);
      deps.panel.post(result);

      const preview = previewOf(result);
      if (result.kind !== 'error') deps.history.add(input, result.translation);

      deps.statusBar.text = `$(book) ${preview || 'Lingua'}`;
      deps.statusBar.tooltip = result.kind === 'error' ? result.message : `${preview}\n${s.clickToOpen}`;
      void vscode.window.setStatusBarMessage(`Lingua: ${preview}`, 5000);
      deps.log(`Done #${id}: ${result.kind}, sources ${'sources' in result ? result.sources : ''}`);
    } catch (error) {
      const message = friendlyError(error, language());
      deps.panel.post({ id, kind: 'error', message });
      deps.statusBar.text = '$(book) Lingua';
      deps.statusBar.tooltip = s.clickToOpen;
      deps.log(`Failed #${id}: ${(error as Error).stack || message}`);
    }
  }

  async function selectionText(): Promise<string> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return '';
    return editor.document.getText(editor.selection).trim();
  }

  function wordAtCursor(): string {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return '';
    const range = editor.document.getWordRangeAtPosition(editor.selection.active, WORD_PATTERN);
    return range ? editor.document.getText(range).trim() : '';
  }

  async function addToVocabulary(text?: string): Promise<void> {
    const s = strings();
    const value = (text || (await selectionText()) || wordAtCursor()).trim();
    if (!value) {
      void vscode.window.showInformationMessage(s.noSelection);
      return;
    }
    try {
      const result = await lookupHover(value.slice(0, 200), deps.getDictionaryContext());
      const entry = entryFromResult(result, value);
      if (!entry) throw new Error(s.noMeaningToAdd);
      const added = await deps.vocabulary.add(entry);
      void vscode.window.showInformationMessage(
        added ? format(s.addedVocabulary, { word: entry.word }) : format(s.existingVocabulary, { word: entry.word })
      );
    } catch (error) {
      void vscode.window.showWarningMessage(format(s.addFailed, { reason: friendlyError(error, language()) }));
    }
  }

  return [
    vscode.commands.registerCommand('linguaTranslate.translateSelection', async () => {
      const text = await selectionText();
      await openResult(text);
    }),
    vscode.commands.registerCommand('linguaTranslate.translateText', async (text?: string) => {
      await openResult(text || (await selectionText()));
    }),
    vscode.commands.registerCommand('linguaTranslate.translateHover', async () => {
      await openResult(wordAtCursor() || (await selectionText()));
    }),
    vscode.commands.registerCommand('linguaTranslate.translateClipboard', async () => {
      const text = await vscode.env.clipboard.readText();
      if (!text.trim()) {
        void vscode.window.showInformationMessage(strings().clipboardEmpty);
        return;
      }
      await openResult(text);
    }),
    vscode.commands.registerCommand('linguaTranslate.speakText', async (text?: string) => {
      await openResult(text || (await selectionText()), { autoPlay: true });
    }),
    vscode.commands.registerCommand('linguaTranslate.speakSelection', async () => {
      await openResult((await selectionText()) || wordAtCursor(), { autoPlay: true });
    }),
    vscode.commands.registerCommand('linguaTranslate.addToVocabulary', async (text?: string) => {
      await addToVocabulary(text);
    }),
    vscode.commands.registerCommand('linguaTranslate.openVocabulary', async () => {
      await deps.vocabularyPanel.show(language());
    }),
    vscode.commands.registerCommand('linguaTranslate.openSettings', () => {
      deps.settings.show(language());
    }),
    vscode.commands.registerCommand('linguaTranslate.toggleHover', async () => {
      const value = !deps.getConfig().hoverEnabled;
      await updateSetting('hover.enabled', value);
      void vscode.window.showInformationMessage(value ? strings().hoverOn : strings().hoverOff);
    }),
    vscode.commands.registerCommand('linguaTranslate.toggleInline', async () => {
      const value = !deps.getConfig().inlineEnabled;
      await updateSetting('inline.enabled', value);
      void vscode.window.showInformationMessage(value ? strings().inlineOn : strings().inlineOff);
    }),
    vscode.commands.registerCommand('linguaTranslate.clearCache', async () => {
      await deps.cache.clear();
      deps.speech.clear();
      void vscode.window.showInformationMessage(strings().cacheCleared);
    }),
    vscode.commands.registerCommand('linguaTranslate.showHistory', async () => {
      await showHistory();
    }),
    vscode.commands.registerCommand('linguaTranslate.showMenu', async () => {
      await showMenu();
    })
  ];

  async function showHistory(): Promise<void> {
    const s = strings();
    const entries = deps.history.all();
    if (!entries.length) {
      void vscode.window.showInformationMessage(s.historyEmpty);
      return;
    }

    const items = entries.map((entry) => ({
      label: truncate(entry.text, 64),
      description: truncate(entry.translation.replace(/\s+/g, ' '), 90),
      detail: new Date(entry.at).toLocaleString(language() === 'en' ? 'en-US' : 'zh-CN'),
      entry
    }));

    const clearItem = { label: `$(trash) ${s.historyClear}`, description: '', detail: '', entry: null };
    const picked = await vscode.window.showQuickPick([...items, clearItem], {
      title: s.historyTitle,
      placeHolder: s.historyTitle,
      matchOnDescription: true
    });

    if (!picked) return;
    if (!picked.entry) {
      const confirm = await vscode.window.showWarningMessage(s.historyClear, { modal: true }, s.historyClear);
      if (!confirm) return;
      await deps.history.clear();
      void vscode.window.showInformationMessage(s.historyCleared);
      return;
    }
    await openResult((picked.entry as HistoryEntry).text);
  }

  async function showMenu(): Promise<void> {
    const s = strings();
    const items: Array<vscode.QuickPickItem & { run: string }> = [
      { label: `$(replace) ${s.menuTranslateSelection}`, run: 'linguaTranslate.translateSelection' },
      { label: `$(clipboard) ${s.menuTranslateClipboard}`, run: 'linguaTranslate.translateClipboard' },
      { label: `$(book) ${s.menuVocabulary}`, run: 'linguaTranslate.openVocabulary' },
      { label: `$(history) ${s.menuHistory}`, run: 'linguaTranslate.showHistory' },
      { label: `$(gear) ${s.menuSettings}`, run: 'linguaTranslate.openSettings' },
      { label: `$(eye) ${s.menuToggleHover}`, run: 'linguaTranslate.toggleHover' },
      { label: `$(code) ${s.menuToggleInline}`, run: 'linguaTranslate.toggleInline' },
      { label: `$(trash) ${s.menuClearCache}`, run: 'linguaTranslate.clearCache' }
    ];
    const picked = await vscode.window.showQuickPick(items, { title: s.menuTitle, placeHolder: s.menuTitle });
    if (picked) await vscode.commands.executeCommand(picked.run);
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function previewOf(result: LookupResult): string {
  if (result.kind === 'error') return '';
  if (result.kind === 'word') {
    const phonetic = result.phonetics.length ? `/${result.phonetics[0].text}/  ` : '';
    return `${phonetic}${result.translation}`.replace(/\s+/g, ' ').slice(0, 80);
  }
  return result.translation.replace(/\s+/g, ' ').slice(0, 80);
}

export function friendlyError(error: unknown, language: 'zh-CN' | 'en' = 'zh-CN'): string {
  const s = stringsFor(language);
  const message = (error as Error)?.message || String(error);
  if (/Timed out|超时|timeout|ECONNRESET|ENOTFOUND|EAI_AGAIN|socket hang up|HTTP 5\d\d/i.test(message)) {
    return s.networkError;
  }
  return format(s.translateFailed, { message });
}
