const assert = require('node:assert/strict');
const test = require('node:test');

const { shouldApplyVoxaSubscriptionSnapshot, subscriptionIdFromVoxaInvoice, voxaNormalizedBillingState, voxaPaidAccess, voxaSubscriptionSnapshot } = require('../dist/billing/lifecycle');

test('Voxa normalizes paid, renewal, recovery and cancellation states', () => {
  const now = new Date('2026-07-14T12:00:00Z');
  assert.equal(voxaNormalizedBillingState({ status: 'active' }, now), 'active');
  assert.equal(voxaNormalizedBillingState({ status: 'active', cancelAtPeriodEnd: true }, now), 'cancel_scheduled');
  assert.equal(voxaNormalizedBillingState({ status: 'past_due', graceUntil: '2026-07-15T12:00:00Z' }, now), 'past_due_grace');
  assert.equal(voxaNormalizedBillingState({ status: 'past_due', graceUntil: '2026-07-13T12:00:00Z' }, now), 'past_due_blocked');
  assert.equal(voxaNormalizedBillingState({ status: 'canceled' }, now), 'canceled');
  assert.equal(voxaPaidAccess('past_due_grace'), true);
  assert.equal(voxaPaidAccess('past_due_blocked'), false);
});

test('Voxa snapshots item periods and scheduled cancellation from canonical subscription data', () => {
  const subscription = {
    status: 'active', cancel_at_period_end: true,
    items: { data: [{ current_period_start: 1_700_000_000, current_period_end: 1_702_592_000 }] },
  };
  const snapshot = voxaSubscriptionSnapshot(subscription, 1_700_000_010, 3);
  assert.equal(snapshot.status, 'active');
  assert.equal(snapshot.cancelAtPeriodEnd, true);
  assert.equal(snapshot.periodStart.toISOString(), '2023-11-14T22:13:20.000Z');
  assert.equal(snapshot.periodEnd.toISOString(), '2023-12-14T22:13:20.000Z');
});

test('paid and failed invoice delivery cannot regress a canonical active subscription out of order or in the same second', () => {
  const second = 1_700_000_010;
  const canonicalActive = { status: 'active', cancel_at_period_end: false, items: { data: [] } };
  const paidSnapshot = voxaSubscriptionSnapshot(canonicalActive, second, 3);
  const delayedFailedSnapshot = voxaSubscriptionSnapshot(canonicalActive, second, 3);
  assert.equal(delayedFailedSnapshot.status, 'active');
  assert.equal(shouldApplyVoxaSubscriptionSnapshot(paidSnapshot, delayedFailedSnapshot), true);

  const stalePastDue = { ...delayedFailedSnapshot, status: 'past_due' };
  assert.equal(shouldApplyVoxaSubscriptionSnapshot(paidSnapshot, stalePastDue), false);
  assert.equal(shouldApplyVoxaSubscriptionSnapshot(paidSnapshot, { ...stalePastDue, providerUpdatedAt: new Date((second - 1) * 1_000) }), false);
  assert.equal(shouldApplyVoxaSubscriptionSnapshot(stalePastDue, paidSnapshot), true);
});

test('invoice subscription extraction supports current and legacy Stripe payloads', () => {
  assert.equal(subscriptionIdFromVoxaInvoice({ parent: { subscription_details: { subscription: 'sub_current' } } }), 'sub_current');
  assert.equal(subscriptionIdFromVoxaInvoice({ subscription: { id: 'sub_legacy' } }), 'sub_legacy');
  assert.equal(subscriptionIdFromVoxaInvoice({}), undefined);
});

