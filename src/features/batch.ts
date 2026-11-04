import { promises as fs } from 'fs';
import * as path from 'path';
import type { LinguaConfig } from '../core/types';
import { translateText } from '../providers';

const SUPPORTED_EXTENSIONS = new Set(['.md', '.markdown', '.txt']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'out', 'coverage', '.vscode', '.idea']);

export function isTranslatableFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/** Output path: `notes.md` → `notes.zh-CN.md`; the original file is never overwritten. */
export function translatedPath(filePath: string, targetLanguage: string): string {
  const ext = path.extname(filePath);
  const stem = filePath.slice(0, filePath.length - ext.length);
  return `${stem}.${languageSlug(targetLanguage)}${ext}`;
}

/** True when the file is a previous batch output for this target language. */
export function isTranslatedOutput(filePath: string, targetLanguage: string): boolean {
  const ext = path.extname(filePath);
  return path.basename(filePath).endsWith(`.${languageSlug(targetLanguage)}${ext}`);
}

function languageSlug(targetLanguage: string): string {
  return targetLanguage.replace(/[^A-Za-z0-9]+/g, '-').replace(/-+$/, '') || 'translated';
}

/**
 * Split text into paragraph-aware chunks under `limit` characters.
 * Empty paragraphs are dropped; callers rejoin chunks with a blank line.
 */
export function chunkText(text: string, limit = 1200): string[] {
  const blocks = text
    .split(/\n{2,}/)
    // Keep leading indentation (Markdown lists) and only drop trailing blank space.
    .map((block) => block.replace(/\s+$/, ''))
    .filter((block) => block.trim().length > 0);

  const chunks: string[] = [];
  let current = '';
  for (const block of blocks) {
    if (!current) {
      current = block;
      continue;
    }
    if (current.length + block.length + 2 <= limit) {
      current += `\n\n${block}`;
      continue;
    }
    chunks.push(current);
    current = block;
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Translate Markdown / plain text while leaving fenced code blocks untouched.
 * Chunks are sent sequentially to stay friendly to free translation services.
 */
export async function translateDocument(
  content: string,
  config: LinguaConfig,
  onProgress?: (done: number, total: number) => void
): Promise<string> {
  const plan = splitFencedCode(content).map((segment) =>
    segment.code ? { code: true as const, text: segment.text } : { code: false as const, chunks: chunkText(segment.text) }
  );
  const total = plan.reduce((sum, item) => sum + (item.code ? 0 : item.chunks.length), 0);
  const outputs: string[] = [];
  let done = 0;

  for (const item of plan) {
    if (item.code) {
      outputs.push(item.text);
      continue;
    }
    const parts: string[] = [];
    for (const chunk of item.chunks) {
      parts.push((await translateText(chunk, config)).text);
      done += 1;
      onProgress?.(done, Math.max(total, 1));
    }
    outputs.push(parts.join('\n\n'));
  }

  const translated = outputs.filter((part) => part.length > 0).join('\n\n');
  return content.endsWith('\n') ? `${translated}\n` : translated;
}

function splitFencedCode(content: string): Array<{ code: boolean; text: string }> {
  const segments: Array<{ code: boolean; text: string }> = [];
  const pattern = /```[\s\S]*?```/g;
  let last = 0;
  for (const match of content.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) segments.push({ code: false, text: content.slice(last, start) });
    segments.push({ code: true, text: match[0] });
    last = start + match[0].length;
  }
  if (last < content.length) segments.push({ code: false, text: content.slice(last) });
  return segments;
}

/** Recursively collect `.md` / `.txt` files, skipping build and dependency folders. */
export async function findTranslatableFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await walk(full);
        continue;
      }
      if (entry.isFile() && isTranslatableFile(full)) result.push(full);
    }
  };
  await walk(root);
  return result.sort();
}
