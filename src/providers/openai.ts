import { postJson } from '../core/http';
import { languageName, buildSystemPrompt } from './prompt';
import type { Provider, TranslationOutcome } from '../core/types';

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export const openAiProvider: Provider = {
  id: 'openai',
  name: 'OpenAI',
  isConfigured: (config) => Boolean(config.openaiApiKey),
  async translate(request, config): Promise<TranslationOutcome> {
    const base = config.openaiBaseUrl.replace(/\/+$/, '');
    const data = await postJson<OpenAiResponse>(
      `${base}/chat/completions`,
      {
        model: config.openaiModel,
        temperature: 0,
        messages: [
          { role: 'system', content: buildSystemPrompt(request.target) },
          { role: 'user', content: request.text }
        ]
      },
      {
        proxy: config.proxy,
        timeout: 30000,
        headers: { Authorization: `Bearer ${config.openaiApiKey}` }
      }
    );

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error(`OpenAI returned no text${data?.error?.message ? `: ${data.error.message}` : ''}`);

    return {
      text,
      providerId: 'openai',
      provider: `OpenAI · ${config.openaiModel}`,
      target: request.target,
      detectedSource: request.source
    };
  }
};

/** Exposed for the settings page to show target-language names, so the UI and the LLM prompt don't keep separate mappings. */
export { languageName };
