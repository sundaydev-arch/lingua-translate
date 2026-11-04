import { promises as fs } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { LinguaConfig } from './types';

/**
 * Glossary: the `linguaTranslate.glossary` setting object plus an optional JSON file.
 * Exact matches take priority, then case-insensitive matching; identifiers are additionally matched word by word.
 */
export class Glossary {
  private entries = new Map<string, string>();
  private loadedKey = '';

  async reload(config: LinguaConfig): Promise<void> {
    const key = JSON.stringify(config.glossary) + '|' + config.glossaryPath;
    if (key === this.loadedKey) return;
    this.loadedKey = key;
    this.entries.clear();

    for (const [word, translation] of Object.entries(config.glossary || {})) {
      if (!word || !translation) continue;
      this.entries.set(word.toLowerCase(), translation);
    }

    if (config.glossaryPath) {
      try {
        const file = resolveWorkspacePath(config.glossaryPath);
        if (file) {
          const raw = await fs.readFile(file, 'utf8');
          const data = JSON.parse(raw) as Record<string, string>;
          for (const [word, translation] of Object.entries(data)) {
            if (!word || !translation) continue;
            this.entries.set(word.toLowerCase(), String(translation));
          }
        }
      } catch {
        // Ignore missing or malformed files without interrupting translation
      }
    }
  }

  lookup(text: string): string | undefined {
    const key = text.trim().toLowerCase();
    if (!key) return undefined;
    return this.entries.get(key);
  }

  lookupPhrase(text: string): string | undefined {
    const direct = this.lookup(text);
    if (direct) return direct;

    // Look up long phrases word by word and only accept the result when every word hits, avoiding half-translated output
    const words = text
      .toLowerCase()
      .split(/[^a-z0-9\u3400-\u9fff]+/)
      .filter(Boolean);
    if (words.length < 2) return undefined;
    const translated = words.map((word) => this.entries.get(word));
    if (translated.some((item) => !item)) return undefined;
    return translated.join('');
  }

  get size(): number {
    return this.entries.size;
  }

  toObject(): Record<string, string> {
    return Object.fromEntries(this.entries);
  }
}

function resolveWorkspacePath(filePath: string): string | undefined {
  if (path.isAbsolute(filePath)) return filePath;
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return undefined;
  return path.join(folder.uri.fsPath, filePath);
}
