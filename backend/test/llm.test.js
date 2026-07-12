const assert = require('node:assert/strict');
const test = require('node:test');

const { buildAnalysisPrompt, normalizeAnalysisModes } = require('../dist/services/llm');
const { completeJsonWithOpenRouter } = require('../dist/services/llm');

test('analysis modes are validated, deduplicated and default to language', () => {
  assert.deepEqual(normalizeAnalysisModes(['meeting', 'interview', 'meeting', 'invalid']), ['meeting', 'interview']);
  assert.deepEqual(normalizeAnalysisModes([]), ['language']);
  assert.deepEqual(normalizeAnalysisModes('meeting'), ['language']);
});

test('combined analysis prompt includes selected schemas and safety boundaries', () => {
  const prompt = buildAnalysisPrompt('**Speaker 0** Hello', {
    modes: ['interview', 'language', 'meeting'],
    outputLanguage: 'pt-BR',
    context: 'Principal Engineer role'
  });

  assert.match(prompt, /Selected modes: interview, language, meeting/);
  assert.match(prompt, /INTERVIEW:/);
  assert.match(prompt, /LANGUAGE CLASS:/);
  assert.match(prompt, /MEETING:/);
  assert.match(prompt, /likely_advance\|uncertain\|likely_not_advance/);
  assert.match(prompt, /communicationSignals/);
  assert.match(prompt, /Principal Engineer role/);
  assert.match(prompt, /\*\*Speaker 0\*\* Hello/);
});

test('single analysis prompt excludes unselected instructions', () => {
  const prompt = buildAnalysisPrompt('Transcript', { modes: ['language'] });
  assert.match(prompt, /LANGUAGE CLASS:/);
  assert.doesNotMatch(prompt, /INTERVIEW:/);
  assert.doesNotMatch(prompt, /MEETING:/);
});

test('JSON completion parses fenced output and reports usage with mocked provider', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: '```json\n{"ok":true}\n```' } }], usage: { total_tokens: 321, cost: 0.004 } })
  });
  const result = await completeJsonWithOpenRouter({ apiKey: 'test', model: 'judge', systemPrompt: 'system', userPrompt: 'user' });
  assert.deepEqual(result.data, { ok: true });
  assert.deepEqual(result.usage, { totalTokens: 321, costUsd: 0.004 });
});
