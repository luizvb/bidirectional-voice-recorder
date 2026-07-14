const assert = require('node:assert/strict');
const test = require('node:test');

const { parseStripeExternalUrl } = require('../app/stripe-external-url');

test('Electron billing bridge accepts only HTTPS Stripe Checkout and Portal hosts', () => {
  assert.equal(parseStripeExternalUrl('https://checkout.stripe.com/c/pay/session'), 'https://checkout.stripe.com/c/pay/session');
  assert.equal(parseStripeExternalUrl('https://billing.stripe.com/p/session/abc'), 'https://billing.stripe.com/p/session/abc');
  assert.throws(() => parseStripeExternalUrl('http://checkout.stripe.com/c/pay/session'), /not allowed/);
  assert.throws(() => parseStripeExternalUrl('https://checkout.stripe.com.evil.example/session'), /not allowed/);
  assert.throws(() => parseStripeExternalUrl('https://stripe.com/session'), /not allowed/);
});

