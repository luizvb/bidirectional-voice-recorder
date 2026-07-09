const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { loadEnvFile } = require('../app/env-loader');

test('env loader reads .env key values without overwriting existing env', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-env-'));
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(envPath, [
    '# local secrets',
    'DEEPGRAM_API_KEY="from-file"',
    'EXISTING_VALUE=from-file'
  ].join('\n'));

  const previousDeepgram = process.env.DEEPGRAM_API_KEY;
  const previousExisting = process.env.EXISTING_VALUE;
  delete process.env.DEEPGRAM_API_KEY;
  process.env.EXISTING_VALUE = 'from-shell';

  try {
    loadEnvFile(envPath);
    assert.equal(process.env.DEEPGRAM_API_KEY, 'from-file');
    assert.equal(process.env.EXISTING_VALUE, 'from-shell');
  } finally {
    restoreEnv('DEEPGRAM_API_KEY', previousDeepgram);
    restoreEnv('EXISTING_VALUE', previousExisting);
  }
});

function restoreEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
