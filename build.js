const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const targetArg = process.argv.find(arg => arg.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'all';

/** @type {import('esbuild').BuildOptions} */
const extensionConfig = {
  entryPoints: [path.join(__dirname, 'src/extension/extension.ts')],
  bundle: true,
  outfile: path.join(__dirname, 'dist/extension.js'),
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  logLevel: 'info',
};

/** @type {import('esbuild').BuildOptions} */
const webviewConfig = {
  entryPoints: [path.join(__dirname, 'src/webview/index.tsx')],
  bundle: true,
  outfile: path.join(__dirname, 'dist/webview.js'),
  format: 'iife',
  platform: 'browser',
  target: 'chrome110',
  sourcemap: true,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  loader: {
    '.css': 'css',
    '.svg': 'text',
  },
  logLevel: 'info',
};

async function run() {
  try {
    if (target === 'extension' || target === 'all') {
      console.log('Building Extension Host...');
      if (isWatch) {
        const ctx = await esbuild.context(extensionConfig);
        await ctx.watch();
      } else {
        await esbuild.build(extensionConfig);
      }
    }

    if (target === 'webview' || target === 'all') {
      console.log('Building React Webview...');
      if (isWatch) {
        const ctx = await esbuild.context(webviewConfig);
        await ctx.watch();
      } else {
        await esbuild.build(webviewConfig);
      }
    }
    console.log('Build completed successfully.');
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

run();
