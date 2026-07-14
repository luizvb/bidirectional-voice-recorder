const assert = require('node:assert/strict');
const test = require('node:test');

const { voxaProEntitlement } = require('../dist/billing/entitlement');

const now = new Date('2026-07-14T12:00:00Z');

test('Voxa Pro permits provider work only from authoritative paid local states', () => {
  assert.deepEqual(voxaProEntitlement({ subscription_status: 'active' }, now), { normalizedState: 'active', allowed: true });
  assert.deepEqual(voxaProEntitlement({ subscription_status: 'trialing' }, now), { normalizedState: 'trialing', allowed: true });
  assert.deepEqual(voxaProEntitlement({ subscription_status: 'active', cancel_at_period_end: true }, now), { normalizedState: 'cancel_scheduled', allowed: true });
  assert.deepEqual(voxaProEntitlement({ subscription_status: 'past_due', grace_until: '2026-07-15T12:00:00Z' }, now), { normalizedState: 'past_due_grace', allowed: true });
});

test('Voxa Pro fails closed outside grace while preserving read/history routes', () => {
  assert.equal(voxaProEntitlement(undefined, now).allowed, false);
  assert.deepEqual(voxaProEntitlement({ subscription_status: 'past_due', grace_until: '2026-07-13T12:00:00Z' }, now), { normalizedState: 'past_due_blocked', allowed: false });
  assert.equal(voxaProEntitlement({ subscription_status: 'canceled' }, now).allowed, false);
  assert.equal(voxaProEntitlement({ subscription_status: 'active', billing_reconciliation_required: true }, now).allowed, false);
});
