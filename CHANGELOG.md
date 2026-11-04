# Changelog

## 0.3.0

UX and workflow improvements:

- Added translation history (last 30 successful lookups) with a quick picker and clear action
- Added `Translate clipboard` and a status-bar quick menu covering translation, vocabulary, history, settings and toggles
- Vocabulary notebook: search, sort, one-click copy/pronounce, and Markdown / CSV export
- Settings webview: localized labels, range validation, file pickers for glossary/vocabulary paths, unsaved indicator, reset confirmation and a connection test
- Translation panel: platform-aware shortcut hint, Retry / Open settings actions on failure, ARIA live region and visible keyboard focus
- Localized all command messages, code actions and panels; fixed the stale engine-chain description in `package.nls`
- Logs are now English; comments remain English throughout

## 0.2.0

Rewritten as a standalone project (TypeScript + esbuild):

- Added hover translation (HoverProvider) and inline translations after comments / string literals (InlayHint)
- Added multiple engines: Google / Bing / MyMemory / LibreTranslate / Youdao / DeepL / Azure / Baidu / OpenAI / Claude / Gemini, with automatic fallback
- Added disk cache (TTL + LRU), settings webview, project glossary and vocabulary notebook
- Added the bundled ECDICT offline dictionary (108,123 entries including common inflections, about 3.2 MB gzipped)
- Added a multilingual UI (Simplified Chinese / English) backed by `package.nls`
- Added Code Actions, status bar entries and the pronounce command
- Added vitest unit tests and GitHub Actions CI / Release workflows

## 0.1.5

- Prefer Google (`client=at`) for translation, fall back to MyMemory with a 5-minute cooldown
- Automatic proxy resolution: settings → editor `http.proxy` → environment variables → macOS system proxy
- Whole-identifier translation; Chinese phrases get English equivalents plus per-word phonetics

## 0.1.0

- First release: selection translation panel, Youdao phonetics and definitions, Youdao / Baidu pronunciation
