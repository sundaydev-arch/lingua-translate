import * as vscode from 'vscode';

const WORD_PATTERN = /[\p{L}\p{N}_$'’\-]+/u;

/** Offers quick "Translate / Speak / Add to vocabulary" actions for the selection or the word under the cursor. */
export class LinguaCodeActionProvider implements vscode.CodeActionProvider {
  constructor(private readonly language: () => 'zh-CN' | 'en' = () => 'en') {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection
  ): vscode.CodeAction[] {
    let text = document.getText(range).trim();
    if (!text) {
      const wordRange = document.getWordRangeAtPosition(range.start, WORD_PATTERN);
      if (wordRange) text = document.getText(wordRange).trim();
    }
    if (!text || text.length > 2000) return [];

    const english = this.language() === 'en';
    const labels = english
      ? { translate: 'Lingua: Translate this text', speak: 'Lingua: Pronounce this text', vocabulary: 'Lingua: Add to vocabulary' }
      : { translate: 'Lingua：翻译这段文本', speak: 'Lingua：朗读这段文本', vocabulary: 'Lingua：加入生词本' };

    const actions: vscode.CodeAction[] = [];

    const translate = new vscode.CodeAction(labels.translate, vscode.CodeActionKind.RefactorRewrite);
    translate.command = {
      command: 'linguaTranslate.translateText',
      title: 'Lingua',
      arguments: [text]
    };
    actions.push(translate);

    const speak = new vscode.CodeAction(labels.speak, vscode.CodeActionKind.RefactorRewrite);
    speak.command = {
      command: 'linguaTranslate.speakText',
      title: 'Lingua',
      arguments: [text]
    };
    actions.push(speak);

    const vocabulary = new vscode.CodeAction(labels.vocabulary, vscode.CodeActionKind.RefactorRewrite);
    vocabulary.command = {
      command: 'linguaTranslate.addToVocabulary',
      title: 'Lingua',
      arguments: [text]
    };
    actions.push(vocabulary);

    return actions;
  }
}
