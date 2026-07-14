const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

test('billing UI discloses approved Voxa Pro amount and entitlement before Checkout', () => {
  const source = readFileSync('src/components/BillingView.tsx', 'utf8');
  assert.match(source, /R\$ 14,90\/month/);
  assert.match(source, /tax-exclusive/);
  assert.match(source, /provider transcription and AI specialist reports with Pro/);
  assert.match(source, /Keep and read recordings, transcripts and reports after cancellation/);
});

test('only provider-funded transcription and AI analysis require Pro', () => {
  const source = readFileSync('backend/src/routes/recordings.ts', 'utf8');
  assert.match(source, /post\('\/:id\/transcribe', requireVoxaPro, transcribeRecording\)/);
  assert.match(source, /post\('\/:id\/analyze', requireVoxaPro, analyzeRecording\)/);
  assert.doesNotMatch(source, /get\([^\n]+requireVoxaPro/);
});
