import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import type { LinguaConfig } from '../core/types';

const OCR_ENDPOINT = 'https://api.ocr.space/parse/image';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export interface CapturedImage {
  path: string;
  /** Temporary screenshots are removed by the caller after the OCR request. */
  temporary: boolean;
}

interface OcrResponse {
  ParsedResults?: Array<{ ParsedText?: string; FileParseExitCode?: number | string; ErrorMessage?: string }>;
  ErrorMessage?: string | string[];
  IsError?: boolean;
}

/**
 * Capture part of the screen on macOS with `screencapture -i`; on other platforms
 * fall back to a file picker so the command still works everywhere.
 * Returns undefined when the user cancels.
 */
export async function captureImage(): Promise<CapturedImage | undefined> {
  if (process.platform === 'darwin') {
    const filePath = path.join(os.tmpdir(), `lingua-ocr-${Date.now()}.png`);
    const captured = await new Promise<boolean>((resolve) => {
      execFile('screencapture', ['-i', '-x', filePath], { timeout: 120000 }, (error) => resolve(!error));
    });
    try {
      const stat = await fs.stat(filePath);
      if (captured && stat.size > 0) return { path: filePath, temporary: true };
    } catch {
      // Cancelled selections leave no file
    }
    await fs.unlink(filePath).catch(() => undefined);
    return undefined;
  }

  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { Images: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] },
    title: 'Select an image to recognize'
  });
  if (!picked?.length) return undefined;
  return { path: picked[0].fsPath, temporary: false };
}

/** Send the image to OCR.space and return the recognized plain text. */
export async function recognizeImage(filePath: string, config: LinguaConfig): Promise<string> {
  const stat = await fs.stat(filePath);
  if (stat.size > MAX_IMAGE_BYTES) throw new Error('Image is larger than 10 MB');
  const data = await fs.readFile(filePath);
  const boundary = `lingua-${Math.random().toString(36).slice(2)}`;
  const fields: Array<[string, string]> = [
    ['language', config.ocrLanguage || 'eng'],
    ['OCREngine', '2'],
    ['isOverlayRequired', 'false'],
    ['scale', 'true'],
    ['filetype', path.extname(filePath).replace('.', '') || 'png']
  ];

  const parts: Buffer[] = [];
  for (const [name, value] of fields) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(
        filePath
      )}"\r\nContent-Type: application/octet-stream\r\n\r\n`
    )
  );
  parts.push(data);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  const body = Buffer.concat(parts);

  const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = https.request(
      OCR_ENDPOINT,
      {
        method: 'POST',
        headers: {
          apikey: config.ocrApiKey || 'helloworld',
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(body.length),
          'User-Agent': 'lingua-translate'
        },
        timeout: 25000
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') }));
      }
    );
    request.on('timeout', () => request.destroy(new Error('OCR request timed out')));
    request.on('error', reject);
    request.write(body);
    request.end();
  });

  if (response.status < 200 || response.status >= 300) throw new Error(`OCR HTTP ${response.status}`);

  let parsed: OcrResponse;
  try {
    parsed = JSON.parse(response.body) as OcrResponse;
  } catch {
    throw new Error('OCR service returned invalid JSON');
  }

  const errors = Array.isArray(parsed.ErrorMessage) ? parsed.ErrorMessage : parsed.ErrorMessage ? [parsed.ErrorMessage] : [];
  const text = (parsed.ParsedResults || [])
    .map((item) => (item.ParsedText || '').trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (!text) throw new Error(errors.join('; ') || 'No text was recognized');
  return text;
}

/** Remove a temporary screenshot, ignoring errors (the file may already be gone). */
export async function cleanupImage(image: CapturedImage): Promise<void> {
  if (!image.temporary) return;
  await fs.unlink(image.path).catch(() => undefined);
}
