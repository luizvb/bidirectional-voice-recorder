import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requestedTarget = process.argv[2] || 'current';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;

const targets = requestedTarget === 'all'
  ? ['mac', 'win']
  : requestedTarget === 'current'
    ? [process.platform === 'win32' ? 'win' : 'mac']
    : [requestedTarget];

if (targets.some((target) => !['mac', 'win'].includes(target))) {
  throw new Error('Usage: node scripts/build-release.mjs <current|mac|win|all>');
}

if (targets.includes('mac') && process.platform !== 'darwin') {
  throw new Error('macOS DMG generation must run on macOS. Use release:win on Windows.');
}

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

rmSync(resolve(root, 'release'), { recursive: true, force: true });
run(npm, ['run', 'build:react']);
run(node, ['scripts/build-blob-client.mjs']);

for (const target of targets) {
  run(node, ['scripts/build-sidecar.mjs', target]);

  if (target === 'mac') {
    run(npm, ['exec', 'electron-builder', '--', '--mac', 'dmg', '--universal'], {
      CSC_IDENTITY_AUTO_DISCOVERY: 'false'
    });
  } else {
    const windowsTarget = process.platform === 'win32' ? 'nsis' : 'zip';
    run(npm, ['exec', 'electron-builder', '--', '--win', windowsTarget, '--x64']);
  }
}

console.log(`Release artifacts are available in ${resolve(root, 'release')}`);
