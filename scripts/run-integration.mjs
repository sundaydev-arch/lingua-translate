import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

const root = process.cwd();
const localCode =
  process.platform === 'darwin' ? '/Applications/Visual Studio Code.app/Contents/MacOS/Code' : undefined;
const executable = process.env.VSCODE_EXECUTABLE || (localCode && existsSync(localCode) ? localCode : undefined);

await runTests({
  // When an existing installation is available use it and skip the 300 MB download.
  ...(executable ? { vscodeExecutablePath: executable } : {}),
  extensionDevelopmentPath: root,
  extensionTestsPath: path.join(root, 'test/integration/run.js'),
  launchArgs: ['--disable-extensions', '--disable-workspace-trust']
});
