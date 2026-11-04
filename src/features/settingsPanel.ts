import * as vscode from 'vscode';
import { readConfig, uiLanguage, updateSetting } from '../core/config';
import { stringsFor } from '../i18n';
import { translateText } from '../providers';

interface Field {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string }>;
}

const FIELDS: Field[] = [
  { key: 'engine', type: 'select' },
  { key: 'targetLanguage', type: 'select' },
  { key: 'fallback', type: 'boolean' },
  { key: 'hover.enabled', type: 'boolean' },
  { key: 'hover.delay', type: 'number', min: 100, max: 2000 },
  { key: 'hover.maxLength', type: 'number', min: 8, max: 200 },
  { key: 'inline.enabled', type: 'boolean' },
  { key: 'inline.mode', type: 'select' },
  { key: 'inline.maxLines', type: 'number', min: 20, max: 2000 },
  { key: 'panelColumn', type: 'select' },
  { key: 'autoPlay', type: 'boolean' },
  { key: 'uiLanguage', type: 'select' },
  { key: 'dictionary.offline', type: 'boolean' },
  { key: 'dictionary.online', type: 'boolean' },
  { key: 'glossaryPath', type: 'string' },
  { key: 'vocabularyPath', type: 'string' },
  { key: 'cache.enabled', type: 'boolean' },
  { key: 'cache.ttlHours', type: 'number', min: 1, max: 8760 },
  { key: 'cache.maxEntries', type: 'number', min: 100, max: 100000 },
  { key: 'proxy', type: 'string' },
  { key: 'libretranslate.url', type: 'string' },
  { key: 'libretranslate.apiKey', type: 'string' },
  { key: 'deepl.apiKey', type: 'string' },
  { key: 'azure.apiKey', type: 'string' },
  { key: 'azure.region', type: 'string' },
  { key: 'baidu.appId', type: 'string' },
  { key: 'baidu.appKey', type: 'string' },
  { key: 'openai.apiKey', type: 'string' },
  { key: 'openai.baseUrl', type: 'string' },
  { key: 'openai.model', type: 'string' },
  { key: 'claude.apiKey', type: 'string' },
  { key: 'claude.baseUrl', type: 'string' },
  { key: 'claude.model', type: 'string' },
  { key: 'gemini.apiKey', type: 'string' },
  { key: 'gemini.model', type: 'string' }
];

const ENGINE_LABELS: Record<'zh-CN' | 'en', Record<string, string>> = {
  'zh-CN': {
    auto: '自动（推荐）',
    google: 'Google 翻译',
    bing: 'Bing 翻译',
    mymemory: 'MyMemory',
    libretranslate: 'LibreTranslate',
    deepl: 'DeepL',
    azure: 'Azure 翻译',
    baidu: '百度翻译',
    youdao: '有道翻译',
    openai: 'OpenAI',
    claude: 'Claude',
    gemini: 'Gemini'
  },
  en: {
    auto: 'Automatic (recommended)',
    google: 'Google Translate',
    bing: 'Bing Translate',
    mymemory: 'MyMemory',
    libretranslate: 'LibreTranslate',
    deepl: 'DeepL',
    azure: 'Azure Translator',
    baidu: 'Baidu Translate',
    youdao: 'Youdao Translate',
    openai: 'OpenAI',
    claude: 'Claude',
    gemini: 'Gemini'
  }
};

const LANGUAGES = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'ru', label: 'Русский' },
  { value: 'pt', label: 'Português' }
];

export class SettingsPanel {
  private panel: vscode.WebviewPanel | null = null;

  show(language?: 'zh-CN' | 'en'): void {
    const resolved = language || uiLanguage(readConfig());
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'linguaSettings',
        stringsFor(resolved).settingsPanelTitle,
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );
      this.panel.onDidDispose(() => {
        this.panel = null;
      });
      this.panel.webview.onDidReceiveMessage((message: unknown) => void this.handleMessage(message));
    }
    this.panel.title = stringsFor(resolved).settingsPanelTitle;
    this.panel.reveal(undefined, true);
    this.render(resolved);
  }

  private render(language: 'zh-CN' | 'en'): void {
    if (!this.panel) return;
    this.panel.title = stringsFor(language).settingsPanelTitle;
    const config = readConfig();
    const s = stringsFor(language);
    const t = (key: string): string => s.settings[key] || key;
    const nonce = Math.random().toString(36).slice(2);

    const rawProxy = vscode.workspace.getConfiguration('linguaTranslate').get<string>('proxy', '') || '';
    const values: Record<string, unknown> = {
      ...config,
      proxy: rawProxy,
      'hover.enabled': config.hoverEnabled,
      'hover.delay': config.hoverDelay,
      'hover.maxLength': config.hoverMaxLength,
      'inline.enabled': config.inlineEnabled,
      'inline.mode': config.inlineMode,
      'inline.maxLines': config.inlineMaxLines,
      'dictionary.offline': config.offlineDictionary,
      'dictionary.online': config.onlineDictionary,
      'cache.enabled': config.cacheEnabled,
      'cache.ttlHours': config.cacheTtlHours,
      'cache.maxEntries': config.cacheMaxEntries,
      uiLanguage: config.uiLanguage,
      'libretranslate.url': config.libretranslateUrl,
      'libretranslate.apiKey': config.libretranslateApiKey,
      'deepl.apiKey': config.deeplApiKey,
      'azure.apiKey': config.azureApiKey,
      'azure.region': config.azureRegion,
      'baidu.appId': config.baiduAppId,
      'baidu.appKey': config.baiduAppKey,
      'openai.apiKey': config.openaiApiKey,
      'openai.baseUrl': config.openaiBaseUrl,
      'openai.model': config.openaiModel,
      'claude.apiKey': config.claudeApiKey,
      'claude.baseUrl': config.claudeBaseUrl,
      'claude.model': config.claudeModel,
      'gemini.apiKey': config.geminiApiKey,
      'gemini.model': config.geminiModel
    };

    const select = (key: string, options: Array<{ value: string; label: string }>, current: string): string =>
      `<label class="field"><span>${escape(t(key))}</span><select data-key="${key}">${options
        .map(
          (option) =>
            `<option value="${escape(option.value)}" ${current === option.value ? 'selected' : ''}>${escape(
              option.label
            )}</option>`
        )
        .join('')}</select></label>`;

    const toggle = (key: string): string =>
      `<label class="switch"><input type="checkbox" data-key="${key}" ${values[key] ? 'checked' : ''} /> ${escape(
        t(key)
      )}</label>`;

    const input = (key: string, type: 'string' | 'number' = 'string'): string => {
      const field = FIELDS.find((item) => item.key === key);
      const limits = type === 'number' ? ` min="${field?.min ?? 0}" max="${field?.max ?? 999999}"` : '';
      return `<label class="field"><span>${escape(t(key))}</span><input type="${type}"${limits} data-key="${key}" value="${escape(
        String(values[key] ?? '')
      )}" /></label>`;
    };

    const pathField = (key: string, hint: string): string =>
      `<label class="field"><span>${escape(t(key))}</span><span class="inputrow"><input type="text" data-key="${key}" value="${escape(
        String(values[key] ?? '')
      )}" /><button type="button" class="icon" data-browse="${key}" title="${escape(
        t('browse')
      )}" aria-label="${escape(t('browse'))}">…</button></span><small>${escape(hint)}</small></label>`;

    const engineOptions = Object.entries(ENGINE_LABELS[language]).map(([value, label]) => ({ value, label }));
    const targetOptions = LANGUAGES;
    const inlineOptions = [
      { value: 'comment', label: t('modeComment') },
      { value: 'string', label: t('modeString') },
      { value: 'both', label: t('modeBoth') }
    ];
    const columnOptions = [
      { value: 'beside', label: t('columnBeside') },
      { value: 'active', label: t('columnActive') }
    ];
    const uiOptions = [
      { value: 'auto', label: t('uiAuto') },
      { value: 'zh-CN', label: t('zh') },
      { value: 'en', label: t('en') }
    ];

    this.panel.webview.html = `<!DOCTYPE html>
<html lang="${language}">
<head><meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin:0; padding:26px 30px 90px; background:var(--vscode-editor-background); color:var(--vscode-editor-foreground); font-family:var(--vscode-font-family); font-size:13px; }
  .wrap { max-width:780px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:var(--vscode-descriptionForeground); font-size:12px; margin-bottom:22px; }
  section { margin-top:20px; padding:16px 18px; border:1px solid var(--vscode-editorWidget-border, rgba(128,128,128,.25)); border-radius:10px; background:var(--vscode-editorWidget-background, rgba(128,128,128,.05)); }
  h2 { font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--vscode-descriptionForeground); margin:0 0 14px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 18px; align-items:end; }
  .grid.one { grid-template-columns:1fr; }
  .field { display:flex; flex-direction:column; gap:5px; font-size:12px; color:var(--vscode-descriptionForeground); min-width:0; }
  .field input, select { width:100%; font:inherit; color:inherit; background:var(--vscode-input-background); border:1px solid var(--vscode-input-border, rgba(128,128,128,.4)); border-radius:5px; padding:6px 9px; }
  .inputrow { display:flex; gap:6px; }
  .inputrow input { flex:1; }
  .inputrow .icon { padding:0 10px; }
  .field small { color:var(--vscode-descriptionForeground); font-size:11px; line-height:1.5; }
  .switch { display:flex; align-items:center; gap:7px; font-size:12px; margin:4px 0; align-self:center; }
  .switch input { accent-color:var(--vscode-button-background, #0e639c); }
  .actions { position:sticky; bottom:0; margin-top:24px; padding:14px 0 18px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; background:var(--vscode-editor-background); border-top:1px solid var(--vscode-editorWidget-border, rgba(128,128,128,.2)); }
  button { font:inherit; color:var(--vscode-button-foreground, #fff); background:var(--vscode-button-background, #0e639c); border:none; border-radius:5px; padding:7px 16px; cursor:pointer; }
  button.secondary { color:var(--vscode-textLink-foreground); background:transparent; border:1px solid var(--vscode-button-border, rgba(128,128,128,.35)); }
  button:hover { opacity:.92; }
  button:focus-visible, select:focus-visible, input:focus-visible { outline:2px solid var(--vscode-focusBorder); outline-offset:1px; }
  #testResult { margin-left:4px; font-size:12px; color:var(--vscode-descriptionForeground); align-self:center; }
  #status { position:fixed; right:22px; bottom:22px; font-size:12px; color:var(--vscode-descriptionForeground); }
  .hint { font-size:11px; color:var(--vscode-descriptionForeground); margin-top:10px; line-height:1.6; }
  .dirty { margin-left:auto; font-size:11px; color:var(--vscode-descriptionForeground); opacity:0; transition:opacity .15s ease; }
  .dirty.on { opacity:1; }
  @media (max-width: 560px) { body { padding:20px 16px 80px; } .grid { grid-template-columns:1fr; } }
</style></head>
<body><div class="wrap">
  <h1>${escape(s.settingsTitle)}</h1>
  <div class="sub">Lingua Translate · ${escape(VERSION)}</div>

  <section>
    <h2>${escape(s.sectionEngine)}</h2>
    <div class="grid">
      ${select('engine', engineOptions, config.engine)}
      ${select('targetLanguage', targetOptions, config.targetLanguage)}
      ${toggle('fallback')}
    </div>
  </section>

  <section>
    <h2>${escape(s.sectionDisplay)}</h2>
    <div class="grid">
      ${toggle('hover.enabled')}
      ${toggle('inline.enabled')}
      ${input('hover.delay', 'number')}
      ${input('hover.maxLength', 'number')}
      ${select('inline.mode', inlineOptions, config.inlineMode)}
      ${input('inline.maxLines', 'number')}
      ${select('panelColumn', columnOptions, config.panelColumn)}
      ${select('uiLanguage', uiOptions, config.uiLanguage)}
      ${toggle('autoPlay')}
    </div>
  </section>

  <section>
    <h2>${escape(s.sectionDictionary)}</h2>
    <div class="grid">
      ${toggle('dictionary.offline')}
      ${toggle('dictionary.online')}
      ${pathField('glossaryPath', t('glossaryHint'))}
      ${pathField('vocabularyPath', t('vocabularyHint'))}
    </div>
  </section>

  <section>
    <h2>${escape(s.sectionCache)}</h2>
    <div class="grid">
      ${toggle('cache.enabled')}
      ${input('cache.ttlHours', 'number')}
      ${input('cache.maxEntries', 'number')}
    </div>
  </section>

  <section>
    <h2>${escape(s.sectionProxy)}</h2>
    <div class="grid one">
      ${input('proxy')}
    </div>
    <div class="hint">${escape(t('proxyHint'))}</div>
  </section>

  <section>
    <h2>${escape(t('credentials'))}</h2>
    <div class="grid">
      ${input('libretranslate.url')}
      ${input('libretranslate.apiKey')}
      ${input('deepl.apiKey')}
      ${input('azure.apiKey')}
      ${input('azure.region')}
      ${input('baidu.appId')}
      ${input('baidu.appKey')}
      ${input('openai.apiKey')}
      ${input('openai.baseUrl')}
      ${input('openai.model')}
      ${input('claude.apiKey')}
      ${input('claude.baseUrl')}
      ${input('claude.model')}
      ${input('gemini.apiKey')}
      ${input('gemini.model')}
    </div>
    <div class="hint">${escape(t('testHint'))}</div>
  </section>

  <div class="actions">
    <button id="save">${escape(s.save)}</button>
    <button id="test" class="secondary">${escape(s.test)}</button>
    <button id="reset" class="secondary">${escape(s.reset)}</button>
    <button id="openJson" class="secondary">${escape(t('openJson'))}</button>
    <span id="dirty" class="dirty">${escape(t('unsaved'))}</span>
    <span id="testResult"></span>
  </div>
  <div id="status"></div>
</div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const S = ${JSON.stringify(s)};
  const dirtyEl = document.getElementById('dirty');

  function collect() {
    const data = {};
    document.querySelectorAll('[data-key]').forEach(function (element) {
      const key = element.dataset.key;
      if (element.type === 'checkbox') data[key] = element.checked;
      else if (element.type === 'number') data[key] = Number(element.value);
      else data[key] = element.value;
    });
    return data;
  }

  document.addEventListener('input', function () { dirtyEl.classList.add('on'); });
  document.addEventListener('change', function () { dirtyEl.classList.add('on'); });

  document.getElementById('save').addEventListener('click', function () {
    vscode.postMessage({ type: 'save', values: collect() });
    dirtyEl.classList.remove('on');
    document.getElementById('status').textContent = S.settings.saved;
    setTimeout(function () { document.getElementById('status').textContent = ''; }, 1800);
  });

  document.getElementById('test').addEventListener('click', function () {
    const result = document.getElementById('testResult');
    result.textContent = S.testing;
    vscode.postMessage({ type: 'test', values: collect() });
  });

  document.getElementById('reset').addEventListener('click', function () {
    vscode.postMessage({ type: 'reset' });
  });

  document.getElementById('openJson').addEventListener('click', function () {
    vscode.postMessage({ type: 'openJson' });
  });

  document.addEventListener('click', function (event) {
    const target = event.target.closest('[data-browse]');
    if (target) vscode.postMessage({ type: 'browse', key: target.dataset.browse });
  });

  window.addEventListener('message', function (event) {
    const data = event.data;
    if (!data || data.type !== 'testResult') return;
    const result = document.getElementById('testResult');
    result.textContent = data.ok ? S.testOk + ': ' + data.message : S.testFail + ': ' + data.message;
  });
</script>
</body></html>`;
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!message || typeof message !== 'object') return;
    const data = message as Record<string, unknown>;
    const values = data.values as Record<string, unknown> | undefined;
    const language = uiLanguage(readConfig());
    const s = stringsFor(language);

    if (data.type === 'save' && values) {
      await this.apply(values);
      vscode.window.setStatusBarMessage(s.saved, 2000);
      const next = uiLanguage(readConfig());
      if (next !== language) this.render(next);
      else this.render(language);
      return;
    }

    if (data.type === 'reset') {
      const confirmed = await vscode.window.showWarningMessage(
        s.settings.resetConfirm,
        { modal: true },
        s.settings.resetButton
      );
      if (!confirmed) return;
      for (const field of FIELDS) {
        await vscode.workspace.getConfiguration('linguaTranslate').update(field.key, undefined, vscode.ConfigurationTarget.Global);
      }
      this.render(uiLanguage(readConfig()));
      return;
    }

    if (data.type === 'openJson') {
      await vscode.commands.executeCommand('workbench.action.openSettingsJson');
      return;
    }

    if (data.type === 'browse') {
      const key = String(data.key || '');
      if (!key) return;
      const picked = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { JSON: ['json'] },
        title: s.settings[key] || key
      });
      if (!picked?.length) return;
      await updateSetting(key, picked[0].fsPath);
      this.render(language);
      return;
    }

    if (data.type === 'test' && values) {
      await this.apply(values);
      const config = readConfig();
      try {
        const result = await translateText('Hello, world!', config);
        void this.panel?.webview.postMessage({
          type: 'testResult',
          ok: true,
          message: `${result.provider} → ${result.text}`
        });
      } catch (error) {
        void this.panel?.webview.postMessage({
          type: 'testResult',
          ok: false,
          message: (error as Error).message
        });
      }
    }
  }

  private async apply(values: Record<string, unknown>): Promise<void> {
    for (const field of FIELDS) {
      if (!(field.key in values)) continue;
      const raw = values[field.key];
      if (field.type === 'boolean') {
        await updateSetting(field.key, Boolean(raw));
      } else if (field.type === 'number') {
        let value = Number(raw);
        if (Number.isNaN(value)) continue;
        if (field.min !== undefined) value = Math.max(field.min, value);
        if (field.max !== undefined) value = Math.min(field.max, value);
        await updateSetting(field.key, value);
      } else {
        await updateSetting(field.key, String(raw ?? ''));
      }
    }
  }
}

const VERSION = '0.3.0';

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
}
