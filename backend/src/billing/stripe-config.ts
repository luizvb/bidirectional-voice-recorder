import Stripe from 'stripe';

export class BillingConfigurationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 503, code = 'BILLING_NOT_CONFIGURED') {
    super(message);
    this.name = 'BillingConfigurationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type VoxaStripeConfig = {
  key: string;
  priceId: string;
  expectedLive: boolean;
  portalConfigurationId?: string;
};

export function voxaStripeConfig(env: NodeJS.ProcessEnv = process.env): VoxaStripeConfig {
  const key = (env.STRIPE_RESTRICTED_KEY || env.STRIPE_SECRET_KEY || '').trim();
  const priceId = (env.STRIPE_PRICE_VOXA || '').trim();
  if (!/^(rk|sk)_(test|live)_/.test(key)) throw new BillingConfigurationError('Stripe billing key is not configured.');
  if (!priceId.startsWith('price_')) throw new BillingConfigurationError('Voxa Stripe Price is not configured.');
  const portalConfigurationId = env.STRIPE_PORTAL_CONFIGURATION_ID?.trim() || undefined;
  return { key, priceId, expectedLive: /^(rk|sk)_live_/.test(key), portalConfigurationId };
}

export function assertVoxaPrice(price: Stripe.Price, config: VoxaStripeConfig) {
  if (price.id !== config.priceId || !price.active) throw new BillingConfigurationError('Voxa Stripe Price is inactive or unexpected.', 409, 'BILLING_CATALOG_MISMATCH');
  if (price.livemode !== config.expectedLive) throw new BillingConfigurationError('Voxa Stripe Price mode does not match the server key.', 409, 'BILLING_MODE_MISMATCH');
  if (price.currency !== 'brl' || price.unit_amount !== 1_490 || price.type !== 'recurring' || price.recurring?.interval !== 'month' || price.recurring?.interval_count !== 1) throw new BillingConfigurationError('Voxa Stripe Price does not match BRL 14.90 monthly.', 409, 'BILLING_CATALOG_MISMATCH');
  if (price.metadata?.owner_brand !== 'netolabs' || price.metadata?.product_key !== 'voxa' || price.metadata?.package_key !== 'voxa_pro' || price.metadata?.entitlement_key !== 'voxa_pro' || price.metadata?.catalog_version !== '2026-07-14' || price.metadata?.commercial_status !== 'approved') throw new BillingConfigurationError('Voxa Stripe Price metadata is invalid.', 409, 'BILLING_CATALOG_MISMATCH');
  const product = typeof price.product === 'string' ? null : price.product;
  if (!product || product.deleted) throw new BillingConfigurationError('Voxa Stripe Price does not belong to an active Product.', 409, 'BILLING_PARENT_MISMATCH');
  if (product.metadata?.owner_brand !== 'netolabs' || product.metadata?.product_key !== 'voxa' || product.metadata?.commercial_status !== 'approved') throw new BillingConfigurationError('Voxa Stripe Price does not belong to the approved NetoLabs Voxa Product.', 409, 'BILLING_PARENT_MISMATCH');
  return price;
}

export function assertVoxaSubscriptionPrice(subscription: Stripe.Subscription, config: VoxaStripeConfig) {
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId !== config.priceId) throw new BillingConfigurationError('Stripe subscription does not use the configured Voxa Price.', 409, 'BILLING_CATALOG_MISMATCH');
  if (subscription.metadata?.ownerBrand !== 'netolabs' || subscription.metadata?.productKey !== 'voxa') throw new BillingConfigurationError('Stripe subscription does not belong to NetoLabs Voxa.', 409, 'BILLING_PRODUCT_MISMATCH');
  return subscription;
}

export function voxaCheckoutEventAction(eventType: string) {
  if (eventType === 'checkout.session.completed' || eventType === 'checkout.session.async_payment_succeeded') return 'verify-and-grant' as const;
  if (eventType === 'checkout.session.async_payment_failed' || eventType === 'checkout.session.expired') return 'no-grant' as const;
  return 'ignore' as const;
}
