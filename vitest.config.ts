import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts', 'src/providers/**/*.ts']
    }
  },
  resolve: {
    alias: {
      vscode: resolve(__dirname, 'test/mocks/vscode.ts')
    }
  }
});
