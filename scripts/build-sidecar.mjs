import { chmodSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];

if (!['mac', 'win'].includes(target)) {
  throw new Error('Usage: node scripts/build-sidecar.mjs <mac|win>');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...options.env },
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

function build(goos, goarch, output) {
  mkdirSync(dirname(output), { recursive: true });
  run('go', ['build', '-trimpath', '-ldflags=-s -w', '-o', output, './cmd/recorderd'], {
    env: { CGO_ENABLED: '0', GOOS: goos, GOARCH: goarch }
  });
}

if (target === 'win') {
  const output = join(root, 'release-assets', 'windows', 'recorderd.exe');
  build('windows', 'amd64', output);
  console.log(`Windows sidecar: ${output}`);
  process.exit(0);
}

if (process.platform !== 'darwin') {
  throw new Error('The universal macOS sidecar must be built on macOS (lipo is required).');
}

const outputDir = join(root, 'release-assets', 'macos');
const arm64 = join(outputDir, 'recorderd-arm64');
const amd64 = join(outputDir, 'recorderd-amd64');
const universal = join(outputDir, 'recorderd');

build('darwin', 'arm64', arm64);
build('darwin', 'amd64', amd64);
run('lipo', ['-create', arm64, amd64, '-output', universal]);
chmodSync(universal, 0o755);
rmSync(arm64);
rmSync(amd64);

if (!existsSync(universal)) {
  throw new Error('Universal macOS sidecar was not generated.');
}

console.log(`Universal macOS sidecar: ${universal}`);
