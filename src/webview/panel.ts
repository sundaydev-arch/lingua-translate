import type { LinguaConfig, LookupResult } from '../core/types';
import { stringsFor } from '../i18n';

/**
 * Builds the translation result panel. The webview cannot reach the network directly due to the host CSP,
 * so pronunciation audio is fetched by the extension host, passed in as base64, and decoded/played here with Web Audio.
 */
export function renderPanelHtml(
  text: string,
  initialResult: LookupResult | null,
  config: LinguaConfig,
  id: number,
  language: 'zh-CN' | 'en'
): string {
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const initialText = JSON.stringify(text).replace(/</g, '\\u003c');
  const initialData = initialResult
    ? JSON.stringify({ ...initialResult, autoPlay: config.autoPlay }).replace(/</g, '\\u003c')
    : 'null';
  const strings = stringsFor(language);

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size, 13px);
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 720px; margin: 0 auto; padding: 30px 30px 72px; }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .brand { font-size: 10px; font-weight: 600; letter-spacing: 0.22em; color: var(--vscode-descriptionForeground); }
  .badge {
    font-size: 10px; letter-spacing: 0.06em;
    color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-editorWidget-border, rgba(128, 128, 128, 0.3));
    border-radius: 999px; padding: 2px 9px;
  }
  .head {
    margin: 10px 0 0; font-size: 34px; font-weight: 600; line-height: 1.15;
    letter-spacing: -0.02em; word-break: break-word;
  }
  .head.mono { font-family: var(--vscode-editor-font-family, ui-monospace, Menlo, monospace); font-size: 26px; letter-spacing: 0; }
  .phonrow { margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 20px; }
  .phon { display: inline-flex; align-items: center; gap: 7px; }
  .tag {
    font-size: 10px; line-height: 1.5; color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-editorWidget-border, rgba(128, 128, 128, 0.3));
    border-radius: 4px; padding: 0 4px;
  }
  .ipa {
    font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 15px; color: var(--vscode-descriptionForeground); letter-spacing: 0.02em;
  }
  .phon-line { margin-top: 8px; font-size: 12px; line-height: 1.9; color: var(--vscode-descriptionForeground); }
  .phon-line .ipa { font-size: 13px; }
  button { font: inherit; color: inherit; }
  button:focus-visible { outline: 2px solid var(--vscode-focusBorder); outline-offset: 2px; }
  .play {
    min-width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center;
    gap: 5px; padding: 0 9px; border-radius: 7px;
    border: 1px solid var(--vscode-button-border, rgba(128, 128, 128, 0.4));
    background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.08));
    color: var(--vscode-textLink-foreground); font-size: 11px; line-height: 1;
    cursor: pointer; user-select: none;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
  }
  .play:hover { background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.16)); }
  .play:active { transform: scale(0.94); }
  .playing { background: var(--vscode-button-background, #0e639c); color: var(--vscode-button-foreground, #fff); border-color: transparent; }
  .failed { border-color: var(--vscode-errorForeground, #f14c4c); color: var(--vscode-errorForeground, #f14c4c); }
  .loading { opacity: 0.55; }
  .rule { height: 1px; margin: 20px 0 0; background: var(--vscode-editorWidget-border, rgba(128, 128, 128, 0.3)); }
  .senses { margin-top: 18px; display: flex; flex-direction: column; gap: 11px; }
  .sense { display: grid; grid-template-columns: 40px 1fr; gap: 12px; align-items: start; }
  .pos { font-size: 11px; font-style: italic; color: var(--vscode-textLink-foreground); padding-top: 3px; }
  .cn { font-size: 15px; line-height: 1.62; }
  .sep { color: var(--vscode-descriptionForeground); margin: 0 1px; }
  .actions { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 8px; }
  .ghost {
    font-size: 12px; color: var(--vscode-textLink-foreground); background: transparent;
    border: 1px solid var(--vscode-button-border, rgba(128, 128, 128, 0.35));
    border-radius: 6px; padding: 5px 12px; cursor: pointer;
    transition: background 0.15s ease, transform 0.12s ease;
  }
  .ghost:hover { background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.14)); }
  .ghost:active { transform: scale(0.97); }
  .card {
    margin-top: 20px; padding: 16px 18px; border-radius: 10px;
    background: var(--vscode-editorWidget-background, rgba(128, 128, 128, 0.06));
    border: 1px solid var(--vscode-editorWidget-border, rgba(128, 128, 128, 0.22));
    animation: rise 0.22s ease-out both;
  }
  .label { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--vscode-descriptionForeground); }
  .wrap > .label { display: block; margin-top: 24px; }
  .row { display: flex; align-items: center; justify-content: flex-start; gap: 10px; }
  #content > .row { margin-top: 22px; }
  .source { margin: 12px 0 0; font-size: 14px; line-height: 1.62; color: var(--vscode-descriptionForeground); white-space: pre-wrap; word-break: break-word; }
  .translation { margin: 10px 0 0; font-size: 17px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
  details.en { margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--vscode-editorWidget-border, rgba(128, 128, 128, 0.26)); }
  summary { cursor: pointer; font-size: 12px; color: var(--vscode-descriptionForeground); list-style: none; user-select: none; }
  summary::-webkit-details-marker { display: none; }
  summary::before { content: '▸'; display: inline-block; width: 14px; transition: transform 0.15s ease; }
  details[open] summary::before { transform: rotate(90deg); }
  .pos-block { margin-top: 14px; animation: rise 0.18s ease-out both; }
  .pos-title { font-size: 12px; font-style: italic; color: var(--vscode-textLink-foreground); }
  .def { margin-top: 6px; font-size: 14px; line-height: 1.62; }
  .eg { margin-top: 5px; padding-left: 10px; border-left: 2px solid var(--vscode-editorWidget-border, rgba(128, 128, 128, 0.35)); color: var(--vscode-descriptionForeground); font-size: 13px; font-style: italic; line-height: 1.55; }
  .syn { margin-top: 7px; font-size: 12px; color: var(--vscode-descriptionForeground); }
  .summary { margin-top: 10px; font-size: 14px; line-height: 1.6; color: var(--vscode-foreground); }
  .parts { margin-top: 18px; }
  .part { padding: 12px 0; border-top: 1px solid var(--vscode-editorWidget-border, rgba(128, 128, 128, 0.24)); animation: rise 0.2s ease-out both; }
  .part:first-child { border-top: none; }
  .part-top { display: flex; align-items: center; gap: 9px; }
  .word { font-size: 16px; font-weight: 600; }
  .part .ipa { font-size: 12px; }
  .part .t { margin-top: 4px; font-size: 13px; line-height: 1.55; color: var(--vscode-descriptionForeground); }
  .footer { margin-top: 22px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--vscode-descriptionForeground); }
  .muted { color: var(--vscode-descriptionForeground); }
  .skeleton { margin-top: 22px; }
  .bar { height: 12px; margin-bottom: 12px; border-radius: 6px; background: rgba(128, 128, 128, 0.18); animation: pulse 1.3s ease-in-out infinite; }
  .bar.short { width: 42%; }
  .bar.mid { width: 72%; }
  @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
  @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @media (max-width: 520px) {
    .wrap { padding: 22px 18px 56px; }
    .head { font-size: 28px; }
    .sense { grid-template-columns: 34px 1fr; gap: 8px; }
  }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <span class="brand">${escapeHtml(strings.brand)}</span>
      <span id="badge" class="badge"></span>
    </div>
    <div id="content" aria-live="polite" aria-busy="true">
      <div class="skeleton">
        <div class="bar short"></div>
        <div class="bar mid"></div>
        <div class="bar"></div>
      </div>
    </div>
  </div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const S = ${JSON.stringify(strings)};
  const initialText = ${initialText};
  const initialData = ${initialData};
  const expectedId = ${JSON.stringify(id)};

  const isMac = String(navigator.platform || '').toUpperCase().indexOf('MAC') >= 0;
  const shortcut = isMac ? '⌘⌥T' : 'Ctrl+Alt+T';
  const footerHint = S.footerHint.replace('{shortcut}', shortcut);

  const badgeEl = document.getElementById('badge');
  const contentEl = document.getElementById('content');

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  let audioCtx = null;
  let sourceNode = null;
  let activeBtn = null;
  const speechCache = new Map();
  const pendingSpeech = new Map();

  function audioContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function setActive(btn) {
    if (activeBtn) { activeBtn.classList.remove('playing'); activeBtn.classList.remove('loading'); }
    activeBtn = btn || null;
    if (activeBtn) { activeBtn.classList.remove('loading'); activeBtn.classList.add('playing'); }
  }

  function flashFailed(btn) {
    if (!btn) return;
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.classList.add('failed');
    btn.textContent = btn.classList.contains('play') ? '✕' : S.speechFailed;
    clearTimeout(btn.failedTimer);
    btn.failedTimer = setTimeout(function () {
      btn.classList.remove('failed');
      btn.textContent = btn.dataset.label;
    }, 1600);
  }

  function stopSpeech() {
    if (sourceNode) { try { sourceNode.stop(0); } catch (error) { /* already stopped */ } sourceNode = null; }
    setActive(null);
  }

  function playBuffer(buffer, btn) {
    const ctx = audioContext();
    if (!ctx) { flashFailed(btn); setActive(null); return; }
    stopSpeech();
    sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(ctx.destination);
    sourceNode.onended = function () { if (activeBtn === btn) setActive(null); };
    setActive(btn);
    sourceNode.start(0);
  }

  function base64Bytes(value) {
    const bin = atob(value);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function speakText(text, voice, btn) {
    const value = String(text || '').trim();
    if (!value) return;
    if (btn && btn === activeBtn) { stopSpeech(); return; }
    stopSpeech();

    const key = voice + '|' + value;
    const cached = speechCache.get(key);
    if (cached) { playBuffer(cached, btn); return; }

    if (btn) { btn.classList.add('loading'); activeBtn = btn; }
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 7);
    pendingSpeech.set(id, { btn: btn || null, key });
    vscode.postMessage({ type: 'speak', id, text: value, voice });
  }

  function onSpeechResult(message) {
    const pending = pendingSpeech.get(message.id);
    if (!pending) return;
    pendingSpeech.delete(message.id);
    const btn = pending.btn;
    if (btn) btn.classList.remove('loading');

    if (!message.ok || !message.audio) {
      if (btn) flashFailed(btn);
      if (activeBtn === btn) setActive(null);
      return;
    }

    const ctx = audioContext();
    if (!ctx) { if (btn) flashFailed(btn); setActive(null); return; }

    ctx.decodeAudioData(base64Bytes(message.audio).buffer, function (buffer) {
      speechCache.set(pending.key, buffer);
      if (pending.btn === null || pending.btn === activeBtn) playBuffer(buffer, pending.btn);
    }, function () {
      if (btn) flashFailed(btn);
      if (activeBtn === btn) setActive(null);
    });
  }

  function speakButton(text, voice, label, wide) {
    if (!text) return '';
    const body = '▶' + (wide ? ' ' + label : '');
    return '<button type="button" class="' + (wide ? 'ghost' : 'play') + '"' +
      ' data-speak="' + esc(text) + '" data-voice="' + esc(voice) + '"' +
      ' title="' + esc(label) + '" aria-label="' + esc(label) + '">' + esc(body) + '</button>';
  }

  function vocabButton(word, phonetic, translation) {
    if (!word) return '';
    return '<button class="ghost" data-vocab="' + esc(word) + '"' +
      ' data-phonetic="' + esc(phonetic || '') + '"' +
      ' data-translation="' + esc(translation || '') + '">' + esc(S.vocabulary) + '</button>';
  }

  function phoneticHtml(data) {
    const list = (data.phonetics || []).map(function (item) {
      const voice = item.label === 'UK' ? 'uk' : 'us';
      return '<span class="phon">' +
        (item.label ? '<span class="tag">' + esc(item.label) + '</span>' : '') +
        '<span class="ipa">/' + esc(item.text) + '/</span>' +
        speakButton(data.text, voice, S.speak, false) +
        '</span>';
    });
    if (!list.length) return '<span class="ipa">' + esc(S.noPhonetic) + '</span>';
    return list.join('');
  }

  function renderWord(data) {
    badgeEl.textContent = S.badgeWord;
    const senses = (data.senses || []).length
      ? data.senses.map(function (sense) {
          return '<div class="sense">' +
            '<span class="pos">' + esc(sense.pos) + '</span>' +
            '<span class="cn">' + sense.items.map(esc).join('<span class="sep">；</span>') + '</span>' +
            '</div>';
        }).join('')
      : '<div class="sense"><span class="pos"></span><span class="cn muted">' + esc(S.noMeaning) + '</span></div>';

    const firstPhonetic = (data.phonetics || []).length ? data.phonetics[0].text : '';
    let html = '<h1 class="head">' + esc(data.text) + '</h1>' +
      '<div class="phonrow">' + phoneticHtml(data) + '</div>' +
      '<div class="rule"></div>' +
      '<div class="senses">' + senses + '</div>' +
      '<div class="actions">' +
        speakButton(data.text, 'us', S.speakWord, true) +
        (data.translation ? '<button class="ghost" data-copy="' + esc(data.translation) + '">' + esc(S.copyMeaning) + '</button>' : '') +
        vocabButton(data.text, firstPhonetic, data.translation) +
      '</div>';

    const meanings = data.meanings || [];
    if (meanings.length) {
      const blocks = meanings.map(function (meaning) {
        const defs = (meaning.definitions || []).map(function (item) {
          return '<div class="def">' + esc(item.definition) +
            (item.example ? '<div class="eg">' + esc(item.example) + '</div>' : '') + '</div>';
        }).join('');
        const syn = (meaning.synonyms || []).length
          ? '<div class="syn">' + esc(S.synonyms) + '：' + meaning.synonyms.map(esc).join(' · ') + '</div>'
          : '';
        return '<div class="pos-block">' +
          (meaning.partOfSpeech ? '<div class="pos-title">' + esc(meaning.partOfSpeech) + '</div>' : '') +
          defs + syn + '</div>';
      }).join('');
      html += '<details class="en"><summary>' + esc(S.englishDefinitions) + '（' + meanings.length + '）</summary>' + blocks + '</details>';
    }

    html += '<div class="footer"><span>' + esc(S.source) + '：' + esc(data.sources || '') + '</span><span>' + esc(footerHint) + '</span></div>';
    contentEl.innerHTML = html;
    contentEl.setAttribute('aria-busy', 'false');
    if (data.autoPlay) speakText(data.text, 'us', null);
  }

  function renderIdentifier(data) {
    badgeEl.textContent = S.badgeIdentifier;
    const rows = (data.items || []).map(function (item) {
      return '<div class="part">' +
        '<div class="part-top">' +
          '<span class="word">' + esc(item.word) + '</span>' +
          (item.phonetic ? '<span class="ipa">/' + esc(item.phonetic) + '/</span>' : '') +
          speakButton(item.word, 'us', S.speak + ' ' + item.word, false) +
          vocabButton(item.word, item.phonetic, item.translation) +
        '</div>' +
        '<div class="t">' + (item.translation ? esc(item.translation) : '<span class="muted">' + esc(S.noMeaning) + '</span>') + '</div>' +
        '</div>';
    }).join('');

    contentEl.innerHTML = '<h1 class="head mono">' + esc(data.text) + '</h1>' +
      (data.translation ? '<div class="summary">' + esc(data.translation) + '</div>' : '') +
      '<div class="parts">' + (rows || '<div class="part muted">' + esc(S.noMeaning) + '</div>') + '</div>' +
      '<div class="footer"><span>' + esc(S.source) + '：' + esc(data.sources || '') + '</span><span>' + esc(footerHint) + '</span></div>';
  }

  function renderText(data) {
    const isZh = data.sourceLang === 'zh-CN';
    const english = data.englishText || '';
    badgeEl.textContent = data.badge === 'phrase' ? S.badgePhrase : (data.badge === 'glossary' ? S.badgeGlossary : S.badgeSentence);

    const phonetic = data.englishPhonetic
      ? '<span class="phon"><span class="ipa">/' + esc(data.englishPhonetic) + '/</span></span>'
      : '';
    const phoneticLine = data.englishPhonetics && data.englishPhonetics.length
      ? '<div class="phon-line">' +
        data.englishPhonetics
          .map((item) => esc(item.word) + ' <span class="ipa">/' + esc(item.ipa) + '/</span>')
          .join('&nbsp; · &nbsp;') +
        '</div>'
      : '';
    const originalVoice = isZh ? 'zh' : 'en';

    contentEl.innerHTML =
      '<div class="row"><span class="label">' + esc(S.original) + '</span>' + (isZh ? '' : speakButton(data.text, 'en', S.speakOriginal, false)) + '</div>' +
      '<div class="source">' + esc(data.text) + '</div>' +
      '<div class="card">' +
        '<div class="row">' +
          '<span class="label">' + esc(isZh ? S.english : S.translation) + '</span>' +
          (isZh && english ? speakButton(english, 'en', S.speakEnglish, false) + phonetic : '') +
        '</div>' +
        '<div class="translation">' + esc(data.translation) + '</div>' +
        (isZh ? phoneticLine : '') +
        '<div class="actions">' +
          '<button class="ghost" data-copy="' + esc(data.translation) + '">' + esc(S.copyTranslation) + '</button>' +
          (isZh ? speakButton(data.text, 'zh', S.speakChinese, true) : '') +
          vocabButton(isZh ? (data.englishText || '') : data.text, '', isZh ? '' : data.translation) +
        '</div>' +
      '</div>' +
      '<div class="footer"><span>' + esc(S.source) + '：' + esc(data.sources || '') + '</span><span>' + esc(footerHint) + '</span></div>';
    if (data.autoPlay) speakText(data.text, originalVoice, null);
  }

  function renderError(data) {
    badgeEl.textContent = S.badgeFailed;
    contentEl.innerHTML =
      '<div class="card" role="alert">' +
        '<div class="label">' + esc(S.errorTitle) + '</div>' +
        '<div class="translation" style="font-size:15px">' + esc(data.message) + '</div>' +
        '<div class="actions">' +
          '<button class="ghost" data-command="linguaTranslate.translateText" data-argument="' + esc(initialText) + '">' + esc(S.retry) + '</button>' +
          '<button class="ghost" data-command="linguaTranslate.openSettings">' + esc(S.openSettings) + '</button>' +
          '<button class="ghost" data-copy="' + esc(initialText) + '">' + esc(S.copyOriginal) + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="footer"><span></span><span>' + esc(footerHint) + '</span></div>';
    contentEl.setAttribute('aria-busy', 'false');
  }

  function render(data) {
    if (!data) {
      badgeEl.textContent = S.badgeLoading;
      contentEl.setAttribute('aria-busy', 'true');
      contentEl.innerHTML = '<div class="skeleton"><div class="bar short"></div><div class="bar mid"></div><div class="bar"></div></div>';
      return;
    }
    contentEl.setAttribute('aria-busy', 'false');
    if (data.kind === 'word') renderWord(data);
    else if (data.kind === 'identifier') renderIdentifier(data);
    else if (data.kind === 'text') renderText(data);
    else renderError(data);
  }

  document.addEventListener('click', function (event) {
    const commandTarget = event.target.closest('[data-command]');
    if (commandTarget) {
      vscode.postMessage({
        type: 'command',
        command: commandTarget.getAttribute('data-command'),
        argument: commandTarget.getAttribute('data-argument') || ''
      });
      return;
    }
    const speakTarget = event.target.closest('[data-speak]');
    if (speakTarget) {
      speakText(speakTarget.getAttribute('data-speak'), speakTarget.getAttribute('data-voice') || 'us', speakTarget);
      return;
    }
    const copyTarget = event.target.closest('[data-copy]');
    if (copyTarget) {
      vscode.postMessage({ type: 'copy', text: copyTarget.getAttribute('data-copy') });
      const original = copyTarget.textContent;
      copyTarget.textContent = S.copied;
      setTimeout(function () { copyTarget.textContent = original; }, 1400);
      return;
    }
    const vocabTarget = event.target.closest('[data-vocab]');
    if (vocabTarget) {
      vscode.postMessage({
        type: 'vocabulary',
        word: vocabTarget.getAttribute('data-vocab'),
        phonetic: vocabTarget.getAttribute('data-phonetic') || '',
        translation: vocabTarget.getAttribute('data-translation') || ''
      });
      const original = vocabTarget.textContent;
      vocabTarget.textContent = S.added;
      setTimeout(function () { vocabTarget.textContent = original; }, 1400);
    }
  });

  window.addEventListener('message', function (event) {
    const data = event.data;
    if (!data) return;
    if (data.type === 'speakResult') { onSpeechResult(data); return; }
    if (data.id !== expectedId || !data.kind) return;
    render(data);
  });

  if (initialData) render(initialData);
</script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
}
