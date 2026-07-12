const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const manifestPath = path.join(__dirname, '..', 'extension', 'dist', 'manifest.json');

test('Meet extension build uses the minimum Manifest V3 permissions', () => {
  assert.equal(fs.existsSync(manifestPath), true, 'run npm run build:extension first');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.minimum_chrome_version, '116');
  assert.equal(manifest.version, '0.1.3');
  assert.deepEqual(manifest.permissions.sort(), ['activeTab', 'offscreen', 'sidePanel', 'storage', 'tabCapture'].sort());
  assert.equal(manifest.host_permissions.includes('<all_urls>'), false);
  assert.equal(manifest.host_permissions.includes('https://meet.google.com/*'), true);
  assert.equal(manifest.background.type, 'module');
});

test('Meet extension has no remote-code CSP allowance', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.content_security_policy.extension_pages, "script-src 'self'; object-src 'self'");
});

test('Meet extension supports guest capture before authentication', () => {
  const sidePanel = fs.readFileSync(path.join(__dirname, '..', 'extension', 'src', 'side-panel', 'main.tsx'), 'utf8');
  const worker = fs.readFileSync(path.join(__dirname, '..', 'extension', 'src', 'service-worker.ts'), 'utf8');

  assert.match(sidePanel, /disabled=\{!consent \|\| busy\}/);
  assert.match(sidePanel, /state\.phase === 'awaiting_auth'/);
  assert.match(worker, /phase: 'awaiting_auth'/);
  assert.match(worker, /if \(auth\.authToken\)/);
});

test('Meet extension notifies the side panel and closes the auth tab through Chrome', () => {
  const worker = fs.readFileSync(path.join(__dirname, '..', 'extension', 'src', 'service-worker.ts'), 'utf8');
  assert.match(worker, /type: 'AUTH_CHANGED'/);
  assert.match(worker, /chrome\.tabs\.remove\(authTabId\)/);
  assert.match(worker, /VOXA_CLOSE_AUTH_TAB/);
});

test('Meet capture uses the validated active tab without requiring a targetTabId grant', () => {
  const worker = fs.readFileSync(path.join(__dirname, '..', 'extension', 'src', 'service-worker.ts'), 'utf8');
  assert.match(worker, /chrome\.tabCapture\.getMediaStreamId\(\)/);
  assert.doesNotMatch(worker, /getMediaStreamId\(\{\s*targetTabId/);
  assert.match(worker, /message\.type === 'START_CAPTURE' && current\.phase === 'preparing'/);
});
