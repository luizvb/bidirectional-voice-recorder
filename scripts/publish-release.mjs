import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'backend');
const releaseDir = join(root, 'release');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = `v${pkg.version}`;
const vercel = process.platform === 'win32' ? 'vercel.cmd' : 'vercel';
const node = process.execPath;
const scriptPath = fileURLToPath(import.meta.url);

if (process.argv[2] === '--upload-one') {
  const [, , , file, pathname, cacheControlMaxAge] = process.argv;
  const cleanEnv = { ...process.env };
  delete cleanEnv.VERCEL_OIDC_TOKEN;
  delete cleanEnv.BLOB_STORE_ID;

  const result = spawnSync(vercel, [
    'blob', 'put', file,
    '--access', 'public',
    '--pathname', pathname,
    '--allow-overwrite', 'true',
    '--multipart', 'true',
    '--cache-control-max-age', cacheControlMaxAge
  ], {
    cwd: backend,
    env: cleanEnv,
    encoding: 'utf8'
  });

  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  process.exit(result.status ?? 1);
}

const artifacts = readdirSync(releaseDir)
  .map((name) => join(releaseDir, name))
  .filter((file) => {
    if (!statSync(file).isFile()) return false;
    const extension = extname(file).toLowerCase();
    return extension === '.dmg' || extension === '.exe' || (extension === '.zip' && basename(file).includes('-win-'));
  });

if (artifacts.length === 0) {
  throw new Error('No macOS or Windows release artifacts found. Run npm run release:all first.');
}

function upload(file, pathname, cacheControlMaxAge = 31536000) {
  const result = spawnSync(vercel, [
    'env', 'run', '-e', 'production', '--',
    node, scriptPath, '--upload-one', file, pathname, String(cacheControlMaxAge)
  ], {
    cwd: backend,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    throw new Error(`Failed to upload ${basename(file)} to Vercel Blob.`);
  }

  const output = `${result.stdout}\n${result.stderr}`;
  const urls = output.match(/https:\/\/[^\s)]+\.blob\.vercel-storage\.com\/[^\s)]+/g) || [];
  const url = urls.at(-1)?.replace(/["',]$/, '');
  if (!url) {
    throw new Error(`Vercel did not return a Blob URL for ${basename(file)}.`);
  }
  return url;
}

const downloads = {};
for (const artifact of artifacts) {
  const filename = basename(artifact);
  const platform = extname(filename).toLowerCase() === '.dmg' ? 'macos' : 'windows';
  downloads[platform] = {
    filename,
    url: upload(artifact, `releases/${version}/${filename}`)
  };
}

const manifest = {
  product: pkg.build?.productName || 'Voxa',
  version: pkg.version,
  publishedAt: new Date().toISOString(),
  downloads
};
const manifestPath = join(releaseDir, 'downloads.json');
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
manifest.manifestUrl = upload(manifestPath, 'releases/latest.json', 60);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify(manifest, null, 2));
