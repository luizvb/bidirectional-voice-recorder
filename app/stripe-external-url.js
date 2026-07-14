const STRIPE_EXTERNAL_HOSTS = new Set(['checkout.stripe.com', 'billing.stripe.com']);

function parseStripeExternalUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid Stripe URL.');
  }

  if (url.protocol !== 'https:' || !STRIPE_EXTERNAL_HOSTS.has(url.hostname) || url.username || url.password || url.port) {
    throw new Error('External billing URL is not allowed.');
  }
  return url.toString();
}

module.exports = { parseStripeExternalUrl };

