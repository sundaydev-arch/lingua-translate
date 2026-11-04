export interface UIStrings {
  brand: string;
  badgeWord: string;
  badgeIdentifier: string;
  badgePhrase: string;
  badgeSentence: string;
  badgeLoading: string;
  badgeFailed: string;
  badgeGlossary: string;
  noPhonetic: string;
  noMeaning: string;
  copyMeaning: string;
  copyTranslation: string;
  copyOriginal: string;
  copied: string;
  speak: string;
  speakWord: string;
  speakOriginal: string;
  speakChinese: string;
  speakEnglish: string;
  speechFailed: string;
  original: string;
  translation: string;
  english: string;
  englishDefinitions: string;
  synonyms: string;
  vocabulary: string;
  added: string;
  source: string;
  footerHint: string;
  errorTitle: string;
  offlineDictionary: string;
  settingsTitle: string;
  save: string;
  saved: string;
  reset: string;
  cancel: string;
  test: string;
  testing: string;
  testOk: string;
  testFail: string;
  sectionEngine: string;
  sectionDisplay: string;
  sectionDictionary: string;
  sectionCache: string;
  sectionProxy: string;
  sectionKeys: string;
  openVocabulary: string;
  retry: string;
  openSettings: string;
  panelTitle: string;
  settingsPanelTitle: string;
  vocabularyPanelTitle: string;
  noSelection: string;
  textTooLong: string;
  addedVocabulary: string;
  existingVocabulary: string;
  addFailed: string;
  noMeaningToAdd: string;
  cacheCleared: string;
  hoverOn: string;
  hoverOff: string;
  inlineOn: string;
  inlineOff: string;
  networkError: string;
  translateFailed: string;
  clipboardEmpty: string;
  historyTitle: string;
  historyEmpty: string;
  historyClear: string;
  historyCleared: string;
  menuTitle: string;
  menuTranslateSelection: string;
  menuTranslateClipboard: string;
  menuVocabulary: string;
  menuHistory: string;
  menuSettings: string;
  menuToggleHover: string;
  menuToggleInline: string;
  menuClearCache: string;
  clickToOpen: string;
  settings: Record<string, string>;
}

const zh: UIStrings = {
  brand: 'LINGUA',
  badgeWord: '单词',
  badgeIdentifier: '标识符',
  badgePhrase: '词语',
  badgeSentence: '整句',
  badgeLoading: '查询中',
  badgeFailed: '失败',
  badgeGlossary: '术语表',
  noPhonetic: '暂无音标',
  noMeaning: '暂无中文释义',
  copyMeaning: '复制释义',
  copyTranslation: '复制译文',
  copyOriginal: '复制原文',
  copied: '已复制',
  speak: '播放发音',
  speakWord: '朗读单词',
  speakOriginal: '朗读原文',
  speakChinese: '朗读中文',
  speakEnglish: '朗读英文',
  speechFailed: '无法播放',
  original: '原文',
  translation: '译文',
  english: '英文',
  englishDefinitions: '英文释义与例句',
  synonyms: '近义',
  vocabulary: '加入生词本',
  added: '已加入生词本',
  source: '数据来源',
  footerHint: '按 {shortcut} 可重新翻译选中内容',
  errorTitle: '翻译失败',
  offlineDictionary: 'ECDICT 离线词库',
  settingsTitle: 'Lingua 设置',
  save: '保存',
  saved: '设置已保存',
  reset: '恢复默认',
  cancel: '取消',
  test: '测试当前引擎',
  testing: '测试中…',
  testOk: '连接成功',
  testFail: '连接失败',
  sectionEngine: '翻译引擎',
  sectionDisplay: '显示与交互',
  sectionDictionary: '词典与术语',
  sectionCache: '缓存',
  sectionProxy: '网络代理',
  sectionKeys: 'API Key',
  openVocabulary: '打开生词本',
  retry: '重试',
  openSettings: '打开设置',
  panelTitle: 'Lingua 翻译',
  settingsPanelTitle: 'Lingua 设置',
  vocabularyPanelTitle: 'Lingua 生词本',
  noSelection: 'Lingua：请先选中要翻译的文本。',
  textTooLong: 'Lingua：内容过长，仅处理前 {max} 个字符。',
  addedVocabulary: 'Lingua：已加入生词本「{word}」',
  existingVocabulary: 'Lingua：生词本中已有「{word}」',
  addFailed: 'Lingua：加入生词本失败（{reason}）',
  noMeaningToAdd: '没有可加入生词本的释义',
  cacheCleared: 'Lingua：翻译缓存已清除',
  hoverOn: 'Lingua：悬停翻译已开启',
  hoverOff: 'Lingua：悬停翻译已关闭',
  inlineOn: 'Lingua：内联译文已开启',
  inlineOff: 'Lingua：内联译文已关闭',
  networkError: '网络请求失败，请检查网络连接，或在设置中配置代理（例如 http://127.0.0.1:7890）。',
  translateFailed: '翻译失败：{message}',
  clipboardEmpty: 'Lingua：剪贴板中没有可翻译的文本。',
  historyTitle: '最近翻译',
  historyEmpty: 'Lingua：还没有翻译记录。',
  historyClear: '清空翻译记录',
  historyCleared: 'Lingua：翻译记录已清空',
  menuTitle: 'Lingua 快捷菜单',
  menuTranslateSelection: '翻译选中内容',
  menuTranslateClipboard: '翻译剪贴板内容',
  menuVocabulary: '打开生词本',
  menuHistory: '最近翻译',
  menuSettings: '打开设置',
  menuToggleHover: '开关悬停翻译',
  menuToggleInline: '开关内联译文',
  menuClearCache: '清除翻译缓存',
  clickToOpen: '点击打开翻译面板',
  settings: {
    engine: '翻译引擎',
    targetLanguage: '目标语言',
    fallback: '失败时自动切换引擎',
    hoverEnabled: '启用悬停翻译',
    hoverDelay: '悬停延迟（毫秒）',
    hoverMaxLength: '悬停最大词长',
    inlineEnabled: '启用内联译文',
    inlineMode: '内联译文范围',
    inlineMaxLines: '内联最大处理行数',
    panelColumn: '面板打开位置',
    autoPlay: '打开时自动发音',
    uiLanguage: '界面语言',
    offlineDictionary: '使用 ECDICT 离线词库',
    onlineDictionary: '同时查询在线词典',
    glossaryPath: '术语表文件路径',
    vocabularyPath: '生词本文件路径',
    glossaryHint: 'JSON 格式，例如 {"api": "接口", "token": "令牌"}；相对路径基于工作区根目录。',
    vocabularyHint: '留空时保存在扩展全局存储中。',
    cacheEnabled: '启用磁盘缓存',
    cacheTtl: '缓存有效期（小时）',
    cacheMaxEntries: '缓存条目上限',
    proxy: 'HTTP 代理',
    proxyHint: '例如 http://127.0.0.1:7890。留空时自动读取编辑器、环境变量或系统代理。',
    credentials: 'API Key 与自建服务',
    libreUrl: 'LibreTranslate 地址',
    libreKey: 'LibreTranslate API Key',
    deeplKey: 'DeepL API Key',
    azureKey: 'Azure 订阅密钥',
    azureRegion: 'Azure 区域',
    baiduAppId: '百度 App ID',
    baiduAppKey: '百度 App Key',
    openaiKey: 'OpenAI API Key',
    openaiBaseUrl: 'OpenAI 接口地址',
    openaiModel: 'OpenAI 模型',
    claudeKey: 'Claude API Key',
    claudeBaseUrl: 'Claude 接口地址',
    claudeModel: 'Claude 模型',
    geminiKey: 'Gemini API Key',
    geminiModel: 'Gemini 模型',
    openJson: '打开 settings.json',
    resetConfirm: '确定要恢复所有 Lingua 设置为默认值吗？',
    resetButton: '恢复默认',
    saved: '设置已保存',
    unsaved: '有未保存的修改',
    browse: '选择文件',
    testHint: '测试会先保存当前表单，再用 Hello, world! 请求当前引擎。',
    engineAuto: '自动（推荐）',
    modeComment: '仅注释',
    modeString: '仅字符串',
    modeBoth: '注释和字符串',
    columnBeside: '在右侧新开一列',
    columnActive: '在当前列显示',
    uiAuto: '跟随 IDE 语言',
    en: 'English',
    zh: '简体中文',
    vocabEmpty: '还没有生词。选中单词后执行「加入生词本」。',
    vocabNoMatch: '没有匹配的生词。',
    vocabSearch: '搜索单词或释义…',
    vocabRecent: '最近添加',
    vocabAlpha: '按字母 A→Z',
    vocabExportMd: '导出 Markdown',
    vocabExportCsv: '导出 CSV',
    vocabCopy: '复制',
    vocabCopied: '已复制',
    vocabRemove: '删除',
    vocabSpeak: '播放发音',
    vocabWords: '个单词',
    vocabExportEmpty: '生词本为空，无法导出。',
    vocabExported: 'Lingua：已导出 {count} 个单词。'
  }
};

const en: UIStrings = {
  brand: 'LINGUA',
  badgeWord: 'Word',
  badgeIdentifier: 'Identifier',
  badgePhrase: 'Phrase',
  badgeSentence: 'Sentence',
  badgeLoading: 'Loading',
  badgeFailed: 'Failed',
  badgeGlossary: 'Glossary',
  noPhonetic: 'No phonetic',
  noMeaning: 'No meaning available',
  copyMeaning: 'Copy meaning',
  copyTranslation: 'Copy translation',
  copyOriginal: 'Copy original',
  copied: 'Copied',
  speak: 'Play pronunciation',
  speakWord: 'Pronounce word',
  speakOriginal: 'Read original',
  speakChinese: 'Read Chinese',
  speakEnglish: 'Read English',
  speechFailed: 'Cannot play',
  original: 'Original',
  translation: 'Translation',
  english: 'English',
  englishDefinitions: 'Definitions & examples',
  synonyms: 'Synonyms',
  vocabulary: 'Add to vocabulary',
  added: 'Added to vocabulary',
  source: 'Sources',
  footerHint: '{shortcut} re-translates the selection',
  errorTitle: 'Translation failed',
  offlineDictionary: 'ECDICT offline dictionary',
  settingsTitle: 'Lingua Settings',
  save: 'Save',
  saved: 'Settings saved',
  reset: 'Reset',
  cancel: 'Cancel',
  test: 'Test current engine',
  testing: 'Testing…',
  testOk: 'Connection OK',
  testFail: 'Connection failed',
  sectionEngine: 'Translation engine',
  sectionDisplay: 'Display & interaction',
  sectionDictionary: 'Dictionary & glossary',
  sectionCache: 'Cache',
  sectionProxy: 'Proxy',
  sectionKeys: 'API keys',
  openVocabulary: 'Open vocabulary',
  retry: 'Retry',
  openSettings: 'Open settings',
  panelTitle: 'Lingua Translate',
  settingsPanelTitle: 'Lingua Settings',
  vocabularyPanelTitle: 'Lingua Vocabulary',
  noSelection: 'Lingua: select some text first.',
  textTooLong: 'Lingua: the selection is too long; only the first {max} characters will be processed.',
  addedVocabulary: 'Lingua: added “{word}” to the vocabulary notebook.',
  existingVocabulary: 'Lingua: “{word}” is already in the vocabulary notebook.',
  addFailed: 'Lingua: could not add the word ({reason}).',
  noMeaningToAdd: 'No meaning available to add',
  cacheCleared: 'Lingua: translation cache cleared.',
  hoverOn: 'Lingua: hover translation enabled.',
  hoverOff: 'Lingua: hover translation disabled.',
  inlineOn: 'Lingua: inline translation enabled.',
  inlineOff: 'Lingua: inline translation disabled.',
  networkError: 'Network request failed. Check your connection or configure a proxy in settings (for example http://127.0.0.1:7890).',
  translateFailed: 'Translation failed: {message}',
  clipboardEmpty: 'Lingua: the clipboard has no text to translate.',
  historyTitle: 'Recent translations',
  historyEmpty: 'Lingua: no translation history yet.',
  historyClear: 'Clear history',
  historyCleared: 'Lingua: translation history cleared.',
  menuTitle: 'Lingua quick menu',
  menuTranslateSelection: 'Translate selection',
  menuTranslateClipboard: 'Translate clipboard',
  menuVocabulary: 'Open vocabulary',
  menuHistory: 'Recent translations',
  menuSettings: 'Open settings',
  menuToggleHover: 'Toggle hover translation',
  menuToggleInline: 'Toggle inline translation',
  menuClearCache: 'Clear translation cache',
  clickToOpen: 'Open the translation panel',
  settings: {
    engine: 'Translation engine',
    targetLanguage: 'Target language',
    fallback: 'Fall back to other engines on failure',
    hoverEnabled: 'Enable hover translation',
    hoverDelay: 'Hover delay (ms)',
    hoverMaxLength: 'Maximum hover word length',
    inlineEnabled: 'Enable inline translation',
    inlineMode: 'Inline translation scope',
    inlineMaxLines: 'Maximum inline lines',
    panelColumn: 'Panel position',
    autoPlay: 'Pronounce automatically on open',
    uiLanguage: 'UI language',
    offlineDictionary: 'Use the ECDICT offline dictionary',
    onlineDictionary: 'Also query online dictionaries',
    glossaryPath: 'Glossary file path',
    vocabularyPath: 'Vocabulary file path',
    glossaryHint: 'JSON such as {"api": "接口", "token": "令牌"}; relative paths resolve from the workspace root.',
    vocabularyHint: 'Leave empty to keep it in the extension global storage.',
    cacheEnabled: 'Enable disk cache',
    cacheTtl: 'Cache lifetime (hours)',
    cacheMaxEntries: 'Maximum cache entries',
    proxy: 'HTTP proxy',
    proxyHint: 'For example http://127.0.0.1:7890. Leave empty to use the editor, environment or system proxy.',
    credentials: 'API keys & self-hosted services',
    libreUrl: 'LibreTranslate URL',
    libreKey: 'LibreTranslate API key',
    deeplKey: 'DeepL API key',
    azureKey: 'Azure subscription key',
    azureRegion: 'Azure region',
    baiduAppId: 'Baidu App ID',
    baiduAppKey: 'Baidu App key',
    openaiKey: 'OpenAI API key',
    openaiBaseUrl: 'OpenAI base URL',
    openaiModel: 'OpenAI model',
    claudeKey: 'Claude API key',
    claudeBaseUrl: 'Claude base URL',
    claudeModel: 'Claude model',
    geminiKey: 'Gemini API key',
    geminiModel: 'Gemini model',
    openJson: 'Open settings.json',
    resetConfirm: 'Reset all Lingua settings to their defaults?',
    resetButton: 'Reset',
    saved: 'Settings saved',
    unsaved: 'Unsaved changes',
    browse: 'Choose a file',
    testHint: 'The test saves the current form, then sends “Hello, world!” through the selected engine.',
    engineAuto: 'Automatic (recommended)',
    modeComment: 'Comments only',
    modeString: 'String literals only',
    modeBoth: 'Comments and string literals',
    columnBeside: 'Open in a column beside the editor',
    columnActive: 'Replace the current column',
    uiAuto: 'Follow the IDE language',
    en: 'English',
    zh: '简体中文',
    vocabEmpty: 'No words yet. Select a word and run “Add to vocabulary”.',
    vocabNoMatch: 'No matching words.',
    vocabSearch: 'Search word or meaning…',
    vocabRecent: 'Recently added',
    vocabAlpha: 'Alphabetical A→Z',
    vocabExportMd: 'Export Markdown',
    vocabExportCsv: 'Export CSV',
    vocabCopy: 'Copy',
    vocabCopied: 'Copied',
    vocabRemove: 'Remove',
    vocabSpeak: 'Pronounce',
    vocabWords: 'words',
    vocabExportEmpty: 'The vocabulary notebook is empty.',
    vocabExported: 'Lingua: exported {count} words.'
  }
};

export function stringsFor(language: 'zh-CN' | 'en'): UIStrings {
  return language === 'en' ? en : zh;
}

/** Replaces `{name}` placeholders in a localized string. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}
