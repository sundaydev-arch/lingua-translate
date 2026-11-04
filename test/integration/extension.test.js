const assert = require('assert');
const vscode = require('vscode');

const EXTENSION_ID = 'sundaydev-arch.lingua-translate';

const EXPECTED_COMMANDS = [
  'linguaTranslate.translateSelection',
  'linguaTranslate.translateHover',
  'linguaTranslate.translateClipboard',
  'linguaTranslate.ocrScreenshot',
  'linguaTranslate.translateFile',
  'linguaTranslate.translateFolder',
  'linguaTranslate.openSettings',
  'linguaTranslate.showMenu'
];

suite('Lingua Translate in a real VS Code host', () => {
  test('activates the extension', async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `extension ${EXTENSION_ID} should be discoverable`);
    await extension.activate();
    assert.ok(extension.isActive, 'extension should be active');
  });

  test('registers every public command', async () => {
    const commands = await vscode.commands.getCommands(true);
    for (const id of EXPECTED_COMMANDS) {
      assert.ok(commands.includes(id), `command ${id} should be registered`);
    }
  });

  test('contributes the documented settings', () => {
    const config = vscode.workspace.getConfiguration('linguaTranslate');
    assert.strictEqual(config.get('targetLanguage'), 'zh-CN');
    assert.strictEqual(config.get('engine'), 'auto');
    assert.strictEqual(config.get('ocr.language'), 'eng');
    assert.strictEqual(config.get('ocr.apiKey'), 'helloworld');
  });
});
