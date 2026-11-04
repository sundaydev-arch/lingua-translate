import { postJson } from '../core/http';
import { buildSystemPrompt } from './prompt';
import type { Provider, TranslationOutcome } from '../core/types';

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

export const geminiProvider: Provider = {
  id: 'gemini',
  name: 'Gemini',
  isConfigured: (config) => Boolean(config.geminiApiKey),
  async translate(request, config): Promise<TranslationOutcome> {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(config.geminiModel)}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`;

    const data = await postJson<GeminiResponse>(
      url,
      {
        systemInstruction: { parts: [{ text: buildSystemPrompt(request.target) }] },
        contents: [{ role: 'user', parts: [{ text: request.text }] }],
        generationConfig: { temperature: 0 }
      },
      { proxy: config.proxy, timeout: 30000 }
    );

    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!text) throw new Error(`Gemini 未返回译文${data?.error?.message ? `：${data.error.message}` : ''}`);

    return {
      text,
      providerId: 'gemini',
      provider: `Gemini · ${config.geminiModel}`,
      target: request.target,
      detectedSource: request.source
    };
  }
};
