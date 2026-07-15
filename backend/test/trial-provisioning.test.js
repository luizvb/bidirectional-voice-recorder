const assert = require('node:assert/strict');
const test = require('node:test');

const db = require('../dist/config/db').default;
const { firstVoxaCommercialPlan, VOXA_PUBLIC_PLANS } = require('../dist/billing/catalog');
const { provisionVoxaAccount, VOXA_TRIAL_DAYS, VOXA_TRIAL_PROVISION_SQL } = require('../dist/billing/trial');

test('trial chooses the deterministic first active public commercial plan', () => {
  const plan = firstVoxaCommercialPlan();
  assert.equal(plan, VOXA_PUBLIC_PLANS.filter((candidate) => candidate.active && candidate.public && candidate.commercialStatus === 'approved').sort((left, right) => left.displayOrder - right.displayOrder || left.key.localeCompare(right.key))[0]);
  assert.equal(plan.key, 'voxa_pro');
});

test('new-account trial provisioning is atomic, idempotent and never creates Stripe state', async () => {
  const originalQuery = db.query;
  const calls = [];
  db.query = async (text, params) => { calls.push({ text, params }); return { rowCount: 1, rows: [] }; };
  try {
    await provisionVoxaAccount('user_new');
  } finally {
    db.query = originalQuery;
  }

  assert.equal(VOXA_TRIAL_DAYS, 7);
  assert.deepEqual(calls, [{ text: VOXA_TRIAL_PROVISION_SQL, params: ['user_new', 'voxa_pro'] }]);
  assert.match(VOXA_TRIAL_PROVISION_SQL, /NOW\(\),\s*NOW\(\) \+ INTERVAL '7 days'/i);
  assert.match(VOXA_TRIAL_PROVISION_SQL, /ON CONFLICT \(id\) DO NOTHING/i);
  assert.doesNotMatch(VOXA_TRIAL_PROVISION_SQL, /stripe_customer_id|stripe_subscription_id|subscription_price_id/i);
  assert.doesNotMatch(VOXA_TRIAL_PROVISION_SQL, /DO UPDATE/i);
});
