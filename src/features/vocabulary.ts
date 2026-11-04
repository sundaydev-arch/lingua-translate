import { promises as fs } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { LookupResult, VocabularyEntry } from '../core/types';
import { summarize } from '../dictionary';
import { format, stringsFor } from '../i18n';

interface VocabularyFile {
  version: 1;
  entries: VocabularyEntry[];
}

/** Vocabulary store: kept in the extension globalStorage by default, or pointed at a workspace file via `linguaTranslate.vocabularyPath`. */
export class VocabularyStore {
  private entries: VocabularyEntry[] = [];
  private loaded = false;

  constructor(private readonly context: vscode.ExtensionContext) {}

  async init(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    await this.reload();
  }

  async reload(): Promise<void> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const data = JSON.parse(raw) as VocabularyFile;
      if (Array.isArray(data.entries)) this.entries = data.entries;
    } catch {
      this.entries = [];
    }
  }

  async add(entry: VocabularyEntry): Promise<boolean> {
    await this.init();
    const word = entry.word.trim();
    if (!word) return false;
    const index = this.entries.findIndex((item) => item.word.toLowerCase() === word.toLowerCase());
    if (index >= 0) {
      this.entries[index] = { ...this.entries[index], ...entry, addedAt: this.entries[index].addedAt };
      return false;
    }
    this.entries.unshift({ ...entry, word });
    await this.persist();
    return true;
  }

  async remove(word: string): Promise<void> {
    await this.init();
    this.entries = this.entries.filter((item) => item.word.toLowerCase() !== word.toLowerCase());
    await this.persist();
  }

  async all(): Promise<VocabularyEntry[]> {
    await this.init();
    return [...this.entries];
  }

  get count(): number {
    return this.entries.length;
  }

  private get file(): string {
    const configured = vscode.workspace.getConfiguration('linguaTranslate').get<string>('vocabularyPath', '');
    if (configured) {
      if (path.isAbsolute(configured)) return configured;
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (folder) return path.join(folder.uri.fsPath, configured);
    }
    return path.join(this.context.globalStorageUri.fsPath, 'vocabulary.json');
  }

  private async persist(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const data: VocabularyFile = { version: 1, entries: this.entries };
      await fs.writeFile(this.file, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      void vscode.window.showWarningMessage(`Lingua: could not write the vocabulary file (${(error as Error).message})`);
    }
  }
}

/** Vocabulary notebook: search, sort, pronounce, copy, delete and export. */
export class VocabularyPanel {
  private panel: vscode.WebviewPanel | null = null;
  private language: 'zh-CN' | 'en' = 'en';

  constructor(
    private readonly store: VocabularyStore,
    private readonly speak: (text: string, voice: 'us' | 'zh') => Promise<string | null>
  ) {}

  async show(language: 'zh-CN' | 'en'): Promise<void> {
    this.language = language;
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'linguaVocabulary',
        stringsFor(language).vocabularyPanelTitle,
        vscode.ViewColumn.Beside,
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
    this.panel.title = stringsFor(language).vocabularyPanelTitle;
    this.panel.reveal(undefined, true);
    await this.render();
  }

  private async render(): Promise<void> {
    if (!this.panel) return;
    const entries = await this.store.all();
    const language = this.language;
    const s = stringsFor(language).settings;
    const nonce = Math.random().toString(36).slice(2);

    const rows = entries
      .map(
        (entry) => `<article class="item" data-word="${escape(entry.word)}" data-added="${entry.addedAt}" data-search="${escape(
          `${entry.word} ${entry.translation}`.toLowerCase()
        )}">
          <div class="wordrow">
            <span class="word">${escape(entry.word)}</span>
            ${entry.phonetic ? `<span class="ipa">/${escape(entry.phonetic)}/</span>` : ''}
            <button class="icon" data-speak="${escape(entry.word)}" title="${escape(s.vocabSpeak)}" aria-label="${escape(
              s.vocabSpeak
            )}">▶</button>
          </div>
          <div class="trans">${escape(entry.translation) || `<span class="muted">—</span>`}</div>
          <div class="ops">
            <button data-copy="${escape(entry.translation)}">${escape(s.vocabCopy)}</button>
            <button data-remove="${escape(entry.word)}" class="danger">${escape(s.vocabRemove)}</button>
          </div>
        </article>`
      )
      .join('');

    this.panel.webview.html = `<!DOCTYPE html>
<html lang="${language}"><head><meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin:0; padding:22px 24px 60px; background:var(--vscode-editor-background); color:var(--vscode-editor-foreground); font-family:var(--vscode-font-family); font-size:13px; }
  .wrap { max-width:820px; margin:0 auto; }
  .head { display:flex; align-items:baseline; gap:10px; }
  h1 { font-size:22px; margin:0; }
  .count { color:var(--vscode-descriptionForeground); font-size:12px; }
  .toolbar { margin:16px 0 10px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  .search { flex:1; min-width:180px; }
  .search input { width:100%; font:inherit; color:inherit; background:var(--vscode-input-background); border:1px solid var(--vscode-input-border, rgba(128,128,128,.4)); border-radius:6px; padding:7px 10px; }
  select { font:inherit; color:inherit; background:var(--vscode-dropdown-background, var(--vscode-input-background)); border:1px solid var(--vscode-input-border, rgba(128,128,128,.4)); border-radius:6px; padding:7px 8px; }
  button { font:inherit; color:var(--vscode-textLink-foreground); background:transparent; border:1px solid var(--vscode-button-border, rgba(128,128,128,.35)); border-radius:6px; padding:4px 11px; cursor:pointer; transition:background .15s ease, transform .12s ease; }
  button:hover { background:var(--vscode-toolbar-hoverBackground, rgba(128,128,128,.14)); }
  button:active { transform:scale(.97); }
  button:focus-visible, input:focus-visible, select:focus-visible { outline:2px solid var(--vscode-focusBorder); outline-offset:1px; }
  button.icon { padding:2px 8px; font-size:12px; }
  button.danger { color:var(--vscode-errorForeground, #f14c4c); }
  #list { display:flex; flex-direction:column; gap:10px; margin-top:14px; }
  .item { padding:13px 16px; border:1px solid var(--vscode-editorWidget-border, rgba(128,128,128,.25)); border-radius:9px; background:var(--vscode-editorWidget-background, rgba(128,128,128,.045)); }
  .wordrow { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
  .word { font-size:17px; font-weight:600; }
  .ipa { color:var(--vscode-descriptionForeground); font-family:var(--vscode-editor-font-family, monospace); font-size:13px; }
  .trans { margin-top:6px; font-size:13px; line-height:1.6; color:var(--vscode-descriptionForeground); white-space:pre-wrap; word-break:break-word; }
  .ops { margin-top:9px; display:flex; gap:8px; }
  .muted { color:var(--vscode-descriptionForeground); }
  #empty, #noMatch { margin-top:26px; padding:22px; border:1px dashed var(--vscode-editorWidget-border, rgba(128,128,128,.35)); border-radius:9px; color:var(--vscode-descriptionForeground); text-align:center; line-height:1.7; }
  #noMatch { display:none; }
  @media (prefers-reduced-motion: reduce) { * { transition:none !important; animation:none !important; } }
</style></head>
<body><div class="wrap">
  <div class="head">
    <h1>${escape(stringsFor(language).vocabularyPanelTitle)}</h1>
    <span class="count">${entries.length} ${escape(s.vocabWords)}</span>
  </div>
  <div class="toolbar">
    <span class="search"><input id="search" type="search" placeholder="${escape(s.vocabSearch)}" aria-label="${escape(
      s.vocabSearch
    )}" /></span>
    <select id="sort" aria-label="${escape(s.vocabRecent)}">
      <option value="recent">${escape(s.vocabRecent)}</option>
      <option value="alpha">${escape(s.vocabAlpha)}</option>
    </select>
    <button id="exportMd">${escape(s.vocabExportMd)}</button>
    <button id="exportCsv">${escape(s.vocabExportCsv)}</button>
  </div>
  <div id="list">${rows}</div>
  ${rows ? '' : `<div id="empty">${escape(s.vocabEmpty)}</div>`}
  <div id="noMatch">${escape(s.vocabNoMatch)}</div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const S = ${JSON.stringify(s)};
  const list = document.getElementById('list');
  const search = document.getElementById('search');
  const sort = document.getElementById('sort');
  const noMatch = document.getElementById('noMatch');
  let items = Array.from(list.querySelectorAll('.item'));
  let audioCtx = null;

  function applyFilter() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    items.forEach(function (item) {
      const match = !query || item.dataset.search.indexOf(query) >= 0;
      item.style.display = match ? '' : 'none';
      if (match) visible += 1;
    });
    noMatch.style.display = items.length && !visible ? 'block' : 'none';
  }

  function applySort() {
    items.sort(function (a, b) {
      if (sort.value === 'alpha') {
        return a.dataset.word.localeCompare(b.dataset.word, undefined, { sensitivity: 'base' });
      }
      return Number(b.dataset.added) - Number(a.dataset.added);
    });
    items.forEach(function (item) { list.appendChild(item); });
    applyFilter();
  }

  search.addEventListener('input', applyFilter);
  sort.addEventListener('change', applySort);

  document.getElementById('exportMd').addEventListener('click', function () {
    vscode.postMessage({ type: 'export', format: 'markdown' });
  });
  document.getElementById('exportCsv').addEventListener('click', function () {
    vscode.postMessage({ type: 'export', format: 'csv' });
  });

  document.addEventListener('click', function (event) {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.remove) { vscode.postMessage({ type: 'remove', word: target.dataset.remove }); return; }
    if (target.dataset.copy) {
      vscode.postMessage({ type: 'copy', text: target.dataset.copy });
      const label = target.textContent;
      target.textContent = S.vocabCopied;
      setTimeout(function () { target.textContent = label; }, 1400);
      return;
    }
    if (target.dataset.speak) { vscode.postMessage({ type: 'speak', text: target.dataset.speak }); }
  });

  function decode(base64) {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  window.addEventListener('message', function (event) {
    const data = event.data;
    if (!data || data.type !== 'speakResult' || !data.audio) return;
    if (!audioCtx) audioCtx = new AudioContext();
    audioCtx.decodeAudioData(decode(data.audio).buffer, function (buffer) {
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start(0);
    });
  });
</script></body></html>`;
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!message || typeof message !== 'object') return;
    const data = message as Record<string, unknown>;

    if (data.type === 'remove') {
      await this.store.remove(String(data.word || ''));
      await this.render();
      return;
    }
    if (data.type === 'copy') {
      await vscode.env.clipboard.writeText(String(data.text || ''));
      return;
    }
    if (data.type === 'speak') {
      const text = String(data.text || '');
      const audio = await this.speak(text, /[\u3400-\u9fff]/.test(text) ? 'zh' : 'us');
      void this.panel?.webview.postMessage({ type: 'speakResult', audio: audio || '' });
      return;
    }
    if (data.type === 'export') {
      await this.exportEntries(data.format === 'csv' ? 'csv' : 'markdown');
    }
  }

  private async exportEntries(formatName: 'markdown' | 'csv'): Promise<void> {
    const entries = await this.store.all();
    const s = stringsFor(this.language).settings;
    if (!entries.length) {
      void vscode.window.showInformationMessage(s.vocabExportEmpty);
      return;
    }

    const content = formatName === 'markdown' ? this.toMarkdown(entries) : this.toCsv(entries);
    const extension = formatName === 'markdown' ? 'md' : 'csv';
    const folder = vscode.workspace.workspaceFolders?.[0];
    const target = await vscode.window.showSaveDialog({
      saveLabel: stringsFor(this.language).save,
      filters:
        formatName === 'markdown'
          ? { Markdown: ['md'] }
          : { CSV: ['csv'] },
      defaultUri: folder ? vscode.Uri.joinPath(folder.uri, `lingua-vocabulary.${extension}`) : undefined
    });
    if (!target) return;
    await fs.writeFile(target.fsPath, content, 'utf8');
    vscode.window.setStatusBarMessage(format(s.vocabExported, { count: entries.length }), 3000);
  }

  private toMarkdown(entries: VocabularyEntry[]): string {
    const header = '# Lingua Vocabulary\n\n| Word | Phonetic | Meaning | Added |\n| --- | --- | --- | --- |\n';
    const rows = entries
      .map(
        (entry) =>
          `| ${escapeCell(entry.word)} | ${escapeCell(entry.phonetic ? `/${entry.phonetic}/` : '')} | ${escapeCell(
            entry.translation.replace(/\n/g, ' ')
          )} | ${escapeCell(new Date(entry.addedAt).toLocaleDateString())} |`
      )
      .join('\n');
    return `${header}${rows}\n`;
  }

  private toCsv(entries: VocabularyEntry[]): string {
    const lines = ['Word,Phonetic,Meaning,Added'];
    for (const entry of entries) {
      const fields = [
        entry.word,
        entry.phonetic ? `/${entry.phonetic}/` : '',
        entry.translation.replace(/\r?\n/g, ' '),
        new Date(entry.addedAt).toISOString()
      ];
      lines.push(fields.map(quoteCsv).join(','));
    }
    return `${lines.join('\n')}\n`;
  }
}

function escapeCell(value: string): string {
  return String(value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function quoteCsv(value: string): string {
  return `"${String(value || '').replace(/"/g, '""')}"`;
}

export function entryFromResult(result: LookupResult, fallbackWord: string): VocabularyEntry | null {
  const source = summarize(result);
  if (!source) return null;
  if (result.kind === 'word') {
    return {
      word: result.text || fallbackWord,
      phonetic: result.phonetics[0]?.text || '',
      translation: result.translation,
      addedAt: Date.now()
    };
  }
  if (result.kind === 'text') {
    return {
      word: (result.englishText || result.text || fallbackWord).trim(),
      phonetic: result.englishPhonetic || '',
      translation: result.translation,
      addedAt: Date.now()
    };
  }
  if (result.kind === 'identifier') {
    return {
      word: result.text,
      phonetic: '',
      translation: result.translation,
      addedAt: Date.now()
    };
  }
  return null;
}

function escape(value: string): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
}
