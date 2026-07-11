import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'extension', 'dist');
const release = path.join(root, 'release');
const output = path.join(release, 'voxa-meet-extension.zip');

execFileSync('npm', ['run', 'build:extension'], { cwd: root, stdio: 'inherit' });
if (!existsSync(dist)) throw new Error('Extension build output was not created.');
mkdirSync(release, { recursive: true });
rmSync(output, { force: true });
execFileSync('zip', ['-X', '-r', output, '.'], { cwd: dist, stdio: 'inherit' });
console.log(output);
