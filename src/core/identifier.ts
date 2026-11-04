/**
 * Frequent abbreviations in code: dictionary definitions often miss the mark (e.g. id → a genetics term), so technical meanings are preferred here.
 * Also serves as an offline glossary, giving readable results when the network is unavailable.
 */
export const TECH_GLOSSARY: Record<string, string> = {
  id: '标识符 / 编号',
  ids: '标识符（复数）',
  url: '统一资源定位符（网址）',
  uri: '统一资源标识符',
  api: '应用程序接口',
  http: '超文本传输协议',
  https: '加密的超文本传输协议',
  json: 'JSON 数据格式',
  xml: '可扩展标记语言',
  html: '超文本标记语言',
  css: '层叠样式表',
  sql: '结构化查询语言',
  uuid: '通用唯一识别码',
  utf: 'Unicode 字符编码',
  ascii: '美国信息交换标准码',
  db: '数据库',
  env: '环境 / 环境变量',
  config: '配置',
  cfg: '配置',
  auth: '认证 / 鉴权',
  token: '令牌',
  cache: '缓存',
  sync: '同步',
  ui: '用户界面',
  ux: '用户体验',
  ip: '网络地址',
  cpu: '中央处理器',
  gpu: '图形处理器',
  sdk: '软件开发工具包',
  cli: '命令行工具',
  gui: '图形用户界面',
  req: '请求',
  res: '响应',
  resp: '响应',
  err: '错误',
  msg: '消息',
  doc: '文档',
  docs: '文档',
  img: '图片',
  pic: '图片',
  btn: '按钮',
  nav: '导航',
  ctx: '上下文',
  params: '参数',
  args: '参数',
  props: '属性',
  ref: '引用 / 引用对象',
  src: '源 / 来源',
  dest: '目标',
  tmp: '临时',
  temp: '临时',
  init: '初始化',
  exec: '执行',
  impl: '实现',
  spec: '规范 / 规格',
  prod: '生产环境',
  dev: '开发环境',
  local: '本地',
  remote: '远程',
  syncs: '同步（复数）',
  async: '异步',
  queue: '队列',
  worker: '工作线程',
  cron: '定时任务',
  ttl: '生存时间',
  jwt: 'JSON 网络令牌',
  oauth: '开放授权',
  cors: '跨域资源共享',
  crud: '增删改查',
  i18n: '国际化',
  l10n: '本地化',
  a11y: '无障碍访问'
};

// Code identifiers: captcha_id / getUserInfo / api.token
export function isIdentifier(text: string): boolean {
  if (/\s/.test(text) || text.length < 2) return false;
  return /^[A-Za-z_$][A-Za-z0-9_$.\-]*$/.test(text) && /[_$]|\.|([a-z0-9][A-Z])/.test(text);
}

export function isWordLike(text: string): boolean {
  return /^[A-Za-z][A-Za-z'’\-]*(?: [A-Za-z][A-Za-z'’\-]*){0,2}$/.test(text);
}

export function isSingleEnglishWord(text: string): boolean {
  return /^[A-Za-z][A-Za-z'’\-]*$/.test(text);
}

/** Split camelCase / snake_case / kebab-case / dotted paths into lowercase words and deduplicate. */
export function splitIdentifier(text: string): string[] {
  const parts = text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase())
    .filter((word) => word.length > 1);
  return Array.from(new Set(parts));
}

/** Extract the comment body: line comments (//, #, --), block comments, asterisk lines, and HTML comments. */
export function extractComment(line: string): string {
  const block = line.match(/\/\*+\s*(.+?)\s*\*+\/\s*$/);
  if (block) return block[1].trim();

  const trimmed = line.trim();
  const patterns = [/^\/\/+\s*(.+)$/, /^#+\s*(.+)$/, /^--+\s*(.+)$/, /^<!--\s*(.+?)\s*-->$/, /^\*\s*(.+)$/];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1].trim();
  }

  // Trailing comment: code // xxx
  const inline = line.match(/(?:^|\s)\/\/+\s*(.+)$/);
  if (inline) return inline[1].trim();
  const hash = line.match(/(?:^|\s)#\s*(.+)$/);
  if (hash && !/^#include|^#!/i.test(trimmed)) return hash[1].trim();
  return '';
}

/** Extract the content of the first string literal on the line (single quotes, double quotes, and backticks). */
export function extractString(line: string): string {
  const single = line.match(/'((?:[^'\\]|\\.){2,})'/);
  const double = line.match(/"((?:[^"\\]|\\.){2,})"/);
  const backtick = line.match(/`((?:[^`\\]|\\.){2,})`/);
  const picked = single || double || backtick;
  if (!picked) return '';
  return picked[1].replace(/\\n/g, ' ').replace(/\\t/g, ' ').trim();
}

/** Decide whether this line is worth translating once comments and strings are stripped. */
export function worthTranslating(value: string, targetLanguage: string): boolean {
  const text = value.trim();
  if (text.length < 2 || text.length > 500) return false;
  if (/^(?:https?:|www\.|[\w.-]+@[\w.-]+\.\w+$)/.test(text)) return false;
  const sourceIsChinese = /[\u3400-\u9fff]/.test(text);
  const targetIsChinese = targetLanguage.startsWith('zh');
  if (sourceIsChinese && targetIsChinese) return false;
  if (targetLanguage === 'en' && !sourceIsChinese && /[A-Za-z]{2}/.test(text)) return false;
  if (!sourceIsChinese && !targetIsChinese && /^[\x20-\x7e]+$/.test(text) && !/[A-Za-z]{2}/.test(text)) return false;
  return true;
}
