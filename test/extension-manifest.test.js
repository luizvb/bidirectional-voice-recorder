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
  assert.deepEqual(manifest.permissions.sort(), ['activeTab', 'offscreen', 'sidePanel', 'storage', 'tabCapture'].sort());
  assert.equal(manifest.host_permissions.includes('<all_urls>'), false);
  assert.equal(manifest.host_permissions.includes('https://meet.google.com/*'), true);
  assert.equal(manifest.background.type, 'module');
});

test('Meet extension has no remote-code CSP allowance', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.content_security_policy.extension_pages, "script-src 'self'; object-src 'self'");
});
