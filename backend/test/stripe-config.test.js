const assert = require('node:assert/strict');
const test = require('node:test');

const { assertVoxaPrice, assertVoxaSubscriptionPrice, voxaCheckoutEventAction, voxaStripeConfig } = require('../dist/billing/stripe-config');

test('Voxa billing config is server-only, stable and fail-closed', () => {
  assert.throws(() => voxaStripeConfig({}), /key is not configured/);
  assert.throws(() => voxaStripeConfig({ STRIPE_RESTRICTED_KEY: 'rk_test_example' }), /Price is not configured/);
  assert.deepEqual(voxaStripeConfig({ STRIPE_RESTRICTED_KEY: 'rk_test_example', STRIPE_PRICE_VOXA: 'price_voxa' }), { key: 'rk_test_example', priceId: 'price_voxa', expectedLive: false, portalConfigurationId: undefined });
  assert.equal(voxaStripeConfig({ STRIPE_SECRET_KEY: 'sk_live_example', STRIPE_PRICE_VOXA: 'price_voxa' }).expectedLive, true);
});

test('Voxa Price must match mode, metadata and canonical Product parent', () => {
  const config = voxaStripeConfig({ STRIPE_RESTRICTED_KEY: 'rk_test_example', STRIPE_PRICE_VOXA: 'price_voxa' });
  const product = { id: 'prod_voxa', metadata: { owner_brand: 'netolabs', product_key: 'voxa', commercial_status: 'approved' } };
  const price = { id: 'price_voxa', active: true, livemode: false, currency: 'brl', unit_amount: 1490, type: 'recurring', recurring: { interval: 'month', interval_count: 1 }, metadata: { owner_brand: 'netolabs', product_key: 'voxa', package_key: 'voxa_pro', entitlement_key: 'voxa_pro', catalog_version: '2026-07-14', commercial_status: 'approved' }, product };
  assert.equal(assertVoxaPrice(price, config), price);
  assert.throws(() => assertVoxaPrice({ ...price, livemode: true }, config), /mode/);
  assert.throws(() => assertVoxaPrice({ ...price, unit_amount: 1491 }, config), /14.90 monthly/);
  assert.throws(() => assertVoxaPrice({ ...price, currency: 'usd' }, config), /14.90 monthly/);
  assert.throws(() => assertVoxaPrice({ ...price, recurring: { interval: 'year', interval_count: 1 } }, config), /14.90 monthly/);
  assert.throws(() => assertVoxaPrice({ ...price, product: { ...product, metadata: { owner_brand: 'netolabs', product_key: 'forge' } } }, config), /does not belong/);
  assert.throws(() => assertVoxaPrice({ ...price, metadata: {} }, config), /metadata/);
});

test('subscription events cannot grant access for another Price', () => {
  const config = voxaStripeConfig({ STRIPE_RESTRICTED_KEY: 'rk_test_example', STRIPE_PRICE_VOXA: 'price_voxa' });
  const subscription = { items: { data: [{ price: { id: 'price_voxa' } }] }, metadata: { ownerBrand: 'netolabs', productKey: 'voxa' } };
  assert.equal(assertVoxaSubscriptionPrice(subscription, config), subscription);
  assert.throws(() => assertVoxaSubscriptionPrice({ ...subscription, items: { data: [{ price: { id: 'price_forge' } }] } }, config), /configured Voxa Price/);
  assert.throws(() => assertVoxaSubscriptionPrice({ ...subscription, metadata: { ownerBrand: 'netolabs', productKey: 'forge' } }, config), /does not belong/);
});

test('delayed Checkout methods grant only after a signed positive event', () => {
  assert.equal(voxaCheckoutEventAction('checkout.session.completed'), 'verify-and-grant');
  assert.equal(voxaCheckoutEventAction('checkout.session.async_payment_succeeded'), 'verify-and-grant');
  assert.equal(voxaCheckoutEventAction('checkout.session.async_payment_failed'), 'no-grant');
  assert.equal(voxaCheckoutEventAction('checkout.session.expired'), 'no-grant');
});
