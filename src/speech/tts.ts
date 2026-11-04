import { getBinary } from '../core/http';
import { isSingleEnglishWord } from '../core/identifier';

export type Voice = 'us' | 'uk' | 'en' | 'zh';

const TTS_ENDPOINT = 'https://dict.youdao.com/dictvoice';
const TTS_FALLBACK = 'https://fanyi.baidu.com/gettts';

export function youdaoAudio(text: string, type: number): string {
  return `${TTS_ENDPOINT}?audio=${encodeURIComponent(text)}&type=${type}`;
}

export function baiduAudio(text: string, lang: string): string {
  return `${TTS_FALLBACK}?lan=${lang}&text=${encodeURIComponent(text)}&spd=3&source=web`;
}

/**
 * Audio is downloaded by the extension host process and handed to the webview as base64 for playback through Web Audio.
 * The webview is bound by the host CSP: it cannot reach the network directly or load remote URLs with <audio>.
 */
export class SpeechService {
  private readonly cache = new Map<string, Buffer>();

  constructor(private readonly getProxy: () => string) {}

  async load(text: string, voice: Voice): Promise<Buffer | null> {
    const value = String(text || '').trim();
    if (!value) return null;

    const key = `${voice}|${value}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const youdaoType = voice === 'uk' ? 1 : 2;
    const candidates =
      voice === 'zh'
        ? [baiduAudio(value, 'zh'), youdaoAudio(value, 2)]
        : isSingleEnglishWord(value)
          ? [youdaoAudio(value, youdaoType), baiduAudio(value, 'en')]
          : [baiduAudio(value, 'en'), youdaoAudio(value, 2)];

    for (const url of candidates) {
      try {
        const response = await getBinary(url, { proxy: this.getProxy(), timeout: 8000 });
        if (response.status >= 200 && response.status < 300 && response.body.length > 512) {
          this.cache.set(key, response.body);
          return response.body;
        }
      } catch {
        // Current pronunciation service unavailable, try the next one
      }
    }

    return null;
  }

  async loadBase64(text: string, voice: Voice): Promise<string | null> {
    const buffer = await this.load(text, voice);
    return buffer ? buffer.toString('base64') : null;
  }

  clear(): void {
    this.cache.clear();
  }
}
