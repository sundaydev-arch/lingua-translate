const esbuild = require('esbuild');

const production = !process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: !production,
  minify: production,
  logLevel: 'info'
};

async function main() {
  if (process.argv.includes('--watch')) {
    const context = await esbuild.context(options);
    await context.watch();
    console.log('[watch] Waiting for code changes…');
    return;
  }
  await esbuild.build(options);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
