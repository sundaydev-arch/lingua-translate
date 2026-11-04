import { postJson } from '../core/http';
import { buildSystemPrompt } from './prompt';
import type { Provider, TranslationOutcome } from '../core/types';

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
}

export const claudeProvider: Provider = {
  id: 'claude',
  name: 'Claude',
  isConfigured: (config) => Boolean(config.claudeApiKey),
  async translate(request, config): Promise<TranslationOutcome> {
    const base = config.claudeBaseUrl.replace(/\/+$/, '');
    const data = await postJson<ClaudeResponse>(
      `${base}/v1/messages`,
      {
        model: config.claudeModel,
        max_tokens: 2048,
        temperature: 0,
        system: buildSystemPrompt(request.target),
        messages: [{ role: 'user', content: request.text }]
      },
      {
        proxy: config.proxy,
        timeout: 30000,
        headers: {
          'x-api-key': config.claudeApiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    const text = data?.content?.find((item) => item.type === 'text')?.text?.trim();
    if (!text) throw new Error(`Claude 未返回译文${data?.error?.message ? `：${data.error.message}` : ''}`);

    return {
      text,
      providerId: 'claude',
      provider: `Claude · ${config.claudeModel}`,
      target: request.target,
      detectedSource: request.source
    };
  }
};
