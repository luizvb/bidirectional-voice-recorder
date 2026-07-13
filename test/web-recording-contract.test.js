const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('web recorder exposes direct microphone and shared tab or screen capture without Analyze as', () => {
  const dashboard = read('src/components/Dashboard.tsx');
  const recorder = read('src/hooks/useRecorder.ts');

  assert.match(dashboard, /captureMode: 'microphone'/);
  assert.match(dashboard, /captureMode: 'shared'/);
  assert.doesNotMatch(dashboard, /t\('recorder', 'analyzeAs'\)/);

  const displayRequest = recorder.indexOf('await navigator.mediaDevices.getDisplayMedia(options)');
  const microphoneRequest = recorder.indexOf('await navigator.mediaDevices.getUserMedia', displayRequest);
  assert.ok(displayRequest >= 0, 'shared capture must request getDisplayMedia');
  assert.ok(microphoneRequest > displayRequest, 'getDisplayMedia must preserve the initiating user gesture by running before microphone capture');
  assert.match(recorder, /systemAudio: 'include'/);
});

test('web PDF export downloads a generated PDF without opening a blank tab', () => {
  const platform = read('src/platform/web-platform.ts');
  const pdf = read('src/lib/browser-pdf.ts');

  assert.doesNotMatch(platform, /window\.open/);
  assert.match(platform, /downloadAnalysisPdf/);
  assert.match(pdf, /doc\.output\('blob'\)/);
  assert.match(pdf, /anchor\.download = fileName/);
});

test('protected recording media is loaded with auth before reaching the audio element', () => {
  const platform = read('src/platform/web-platform.ts');
  const history = read('src/components/HistoryView.tsx');

  assert.match(platform, /loadRecordingMedia/);
  assert.match(platform, /Authorization: `Bearer \$\{token\}`/);
  assert.match(platform, /URL\.createObjectURL\(blob\)/);
  assert.match(history, /platform\.loadRecordingMedia/);
  assert.match(history, /src=\{playbackSource \|\| undefined\}/);
  assert.doesNotMatch(history, /src=\{selected\.playbackUrl\}/);
});
