import { execFileSync } from 'child_process';
import * as vscode from 'vscode';
import type { EngineId, LinguaConfig } from './types';

let cachedSystemProxy: string | null = null;

/**
 * Proxy priority: extension setting → editor http.proxy → environment variables → system proxy (macOS).
 * Kept consistent with the previous behavior so users who already configured a proxy need no re-setup after upgrading.
 */
export function resolveProxy(explicit: string): string {
  const value = explicit.trim();
  if (value) return value;

  try {
    const httpProxy = String(vscode.workspace.getConfiguration('http').get('proxy', '') || '').trim();
    if (httpProxy) return httpProxy;
  } catch {
    // Some slimmed-down clients have no http.proxy setting
  }

  for (const key of ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']) {
    const env = String(process.env[key] || '').trim();
    if (env) return env;
  }

  return systemProxy();
}

function systemProxy(): string {
  if (cachedSystemProxy !== null) return cachedSystemProxy;
  cachedSystemProxy = '';
  if (process.platform !== 'darwin') return cachedSystemProxy;
  try {
    const text = execFileSync('scutil', ['--proxy'], { encoding: 'utf8', timeout: 2000 });
    const host = (text.match(/HTTPSProxy\s*:\s*(\S+)/) || [])[1];
    const port = (text.match(/HTTPSPort\s*:\s*(\d+)/) || [])[1];
    if (/HTTPSEnable\s*:\s*1/.test(text) && host && port) {
      cachedSystemProxy = `http://${host}:${port}`;
    }
  } catch {
    cachedSystemProxy = '';
  }
  return cachedSystemProxy;
}

function getString(section: vscode.WorkspaceConfiguration, key: string, fallback: string): string {
  const value = section.get<string>(key, fallback);
  return typeof value === 'string' ? value.trim() : fallback;
}

export function readConfig(): LinguaConfig {
  const section = vscode.workspace.getConfiguration('linguaTranslate');

  return {
    targetLanguage: getString(section, 'targetLanguage', 'zh-CN') || 'zh-CN',
    engine: section.get<EngineId | 'auto'>('engine', 'auto'),
    fallback: section.get<boolean>('fallback', true),
    hoverEnabled: section.get<boolean>('hover.enabled', true),
    hoverDelay: section.get<number>('hover.delay', 300),
    hoverMaxLength: section.get<number>('hover.maxLength', 40),
    inlineEnabled: section.get<boolean>('inline.enabled', false),
    inlineMode: section.get<'comment' | 'string' | 'both'>('inline.mode', 'comment'),
    inlineMaxLines: section.get<number>('inline.maxLines', 200),
    offlineDictionary: section.get<boolean>('dictionary.offline', true),
    onlineDictionary: section.get<boolean>('dictionary.online', true),
    cacheEnabled: section.get<boolean>('cache.enabled', true),
    cacheTtlHours: section.get<number>('cache.ttlHours', 168),
    cacheMaxEntries: section.get<number>('cache.maxEntries', 5000),
    proxy: resolveProxy(section.get<string>('proxy', '') || ''),
    panelColumn: section.get<'beside' | 'active'>('panelColumn', 'beside'),
    autoPlay: section.get<boolean>('autoPlay', false),
    uiLanguage: section.get<'auto' | 'zh-CN' | 'en'>('uiLanguage', 'auto'),
    glossary: section.get<Record<string, string>>('glossary', {}) || {},
    glossaryPath: getString(section, 'glossaryPath', ''),
    vocabularyPath: getString(section, 'vocabularyPath', ''),
    libretranslateUrl: getString(section, 'libretranslate.url', ''),
    libretranslateApiKey: getString(section, 'libretranslate.apiKey', ''),
    deeplApiKey: getString(section, 'deepl.apiKey', ''),
    azureApiKey: getString(section, 'azure.apiKey', ''),
    azureRegion: getString(section, 'azure.region', ''),
    baiduAppId: getString(section, 'baidu.appId', ''),
    baiduAppKey: getString(section, 'baidu.appKey', ''),
    openaiApiKey: getString(section, 'openai.apiKey', ''),
    openaiBaseUrl: getString(section, 'openai.baseUrl', 'https://api.openai.com/v1') || 'https://api.openai.com/v1',
    openaiModel: getString(section, 'openai.model', 'gpt-4o-mini') || 'gpt-4o-mini',
    claudeApiKey: getString(section, 'claude.apiKey', ''),
    claudeBaseUrl: getString(section, 'claude.baseUrl', 'https://api.anthropic.com') || 'https://api.anthropic.com',
    claudeModel: getString(section, 'claude.model', 'claude-3-5-haiku-latest') || 'claude-3-5-haiku-latest',
    geminiApiKey: getString(section, 'gemini.apiKey', ''),
    geminiModel: getString(section, 'gemini.model', 'gemini-1.5-flash') || 'gemini-1.5-flash'
  };
}

export async function updateSetting<T>(key: string, value: T): Promise<void> {
  await vscode.workspace.getConfiguration('linguaTranslate').update(key, value, vscode.ConfigurationTarget.Global);
}

export function uiLanguage(config: LinguaConfig): 'zh-CN' | 'en' {
  if (config.uiLanguage === 'zh-CN' || config.uiLanguage === 'en') return config.uiLanguage;
  return vscode.env.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}
