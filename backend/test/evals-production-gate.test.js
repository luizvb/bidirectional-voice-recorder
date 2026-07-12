const assert = require('node:assert/strict');
const test = require('node:test');

test('internal eval routes are not mounted in production', async (t) => {
  process.env.NODE_ENV = 'production';
  const app = require('../dist/server').default;
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/internal/evals/runs`);
  assert.equal(response.status, 404);
});
