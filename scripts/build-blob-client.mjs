import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'release-assets', 'blob-client.cjs');

mkdirSync(dirname(output), { recursive: true });
buildSync({
  entryPoints: [join(root, 'scripts', 'blob-client-entry.mjs')],
  outfile: output,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  minify: true,
  sourcemap: false,
  logLevel: 'info'
});

console.log(`Bundled Vercel Blob client: ${output}`);
