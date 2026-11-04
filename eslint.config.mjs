import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'out/**', 'coverage/**', 'node_modules/**', 'media/**', '*.vsix']
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ['*.js', '*.mjs', 'scripts/**/*.mjs', 'test/integration/**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off'
    }
  }
);
