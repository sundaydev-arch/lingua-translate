import * as vscode from 'vscode';

export interface HistoryEntry {
  text: string;
  translation: string;
  at: number;
}

const STORAGE_KEY = 'lingua.history';
const MAX_ENTRIES = 30;

/** Keeps the most recent successful translations so they can be reopened from the quick menu. */
export class TranslationHistory {
  private entries: HistoryEntry[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    const stored = context.globalState.get<HistoryEntry[]>(STORAGE_KEY, []);
    if (Array.isArray(stored)) {
      this.entries = stored.filter((entry) => entry && typeof entry.text === 'string').slice(0, MAX_ENTRIES);
    }
  }

  add(text: string, translation: string): void {
    const value = text.trim();
    if (!value) return;
    const existing = this.entries.findIndex((entry) => entry.text === value);
    if (existing >= 0) this.entries.splice(existing, 1);
    this.entries.unshift({ text: value, translation: translation.trim(), at: Date.now() });
    this.entries = this.entries.slice(0, MAX_ENTRIES);
    void this.context.globalState.update(STORAGE_KEY, this.entries);
  }

  all(): HistoryEntry[] {
    return [...this.entries];
  }

  async clear(): Promise<void> {
    this.entries = [];
    await this.context.globalState.update(STORAGE_KEY, this.entries);
  }
}
