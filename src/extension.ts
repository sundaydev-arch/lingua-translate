import * as vscode from 'vscode';
import { DiskCache } from './core/cache';
import { readConfig, uiLanguage } from './core/config';
import { Glossary } from './core/glossary';
import type { DictionaryContext } from './dictionary';
import { EcdictDictionary } from './dictionary/ecdict';
import { TranslationPanel } from './features/panel';
import { LinguaCodeActionProvider } from './features/codeAction';
import { TranslationHistory } from './features/history';
import { LinguaHoverProvider } from './features/hover';
import { LinguaInlayHintsProvider } from './features/inlay';
import { registerCommands } from './features/commands';
import { SettingsPanel } from './features/settingsPanel';
import { VocabularyPanel, VocabularyStore } from './features/vocabulary';
import { stringsFor } from './i18n';
import { SpeechService } from './speech/tts';

let cache: DiskCache | null = null;

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Lingua Translate');
  const log = (message: string): void => {
    output.appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
  };

  const getConfig = () => readConfig();

  cache = new DiskCache(context.globalStorageUri.fsPath, () => {
    const config = readConfig();
    return {
      enabled: config.cacheEnabled,
      ttlHours: config.cacheTtlHours,
      maxEntries: config.cacheMaxEntries
    };
  });
  void cache.init();

  const glossary = new Glossary();
  void glossary.reload(getConfig());

  const ecdict = new EcdictDictionary(context.asAbsolutePath('data/ecdict.json.gz'));

  const speech = new SpeechService(() => getConfig().proxy);
  const vocabulary = new VocabularyStore(context);
  void vocabulary.init();
  const history = new TranslationHistory(context);

  const panel = new TranslationPanel(speech, (entry) => vocabulary.add(entry));
  const vocabularyPanel = new VocabularyPanel(vocabulary, (text, voice) => speech.loadBase64(text, voice));
  const settings = new SettingsPanel();

  const getDictionaryContext = (): DictionaryContext => ({
    config: getConfig(),
    glossary,
    ecdict
  });

  const language = (): 'zh-CN' | 'en' => uiLanguage(getConfig());

  const hoverProvider = new LinguaHoverProvider({
    getConfig,
    getContext: getDictionaryContext,
    language,
    log
  });

  const inlayProvider = new LinguaInlayHintsProvider(getConfig, log);

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.text = '$(book) Lingua';
  statusBar.tooltip = stringsFor(language()).menuTitle;
  statusBar.command = 'linguaTranslate.showMenu';
  statusBar.show();

  context.subscriptions.push(
    output,
    statusBar,
    inlayProvider,
    hoverProviderRegistration(hoverProvider),
    vscode.languages.registerInlayHintsProvider('*', inlayProvider),
    vscode.languages.registerCodeActionsProvider('*', new LinguaCodeActionProvider(language), {
      providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite]
    }),
    ...registerCommands({
      context,
      getConfig,
      getDictionaryContext,
      glossary,
      cache,
      panel,
      vocabulary,
      vocabularyPanel,
      settings,
      speech,
      history,
      log,
      statusBar
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('linguaTranslate')) return;
      void glossary.reload(getConfig()).then(() => inlayProvider.refreshNow());
    })
  );

  log('Lingua Translate activated');
}

function hoverProviderRegistration(provider: LinguaHoverProvider): vscode.Disposable {
  return vscode.languages.registerHoverProvider('*', provider);
}

export async function deactivate(): Promise<void> {
  if (cache) {
    await cache.flush();
    cache = null;
  }
}
