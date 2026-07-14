import Stripe from 'stripe';

export type VoxaBillingSnapshot = {
  status: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: Date | null;
  providerUpdatedAt: Date;
};

function subscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const value = subscription as Stripe.Subscription & { current_period_start?: number; current_period_end?: number };
  return {
    start: item?.current_period_start ?? value.current_period_start,
    end: item?.current_period_end ?? value.current_period_end,
  };
}

export function stripeSubscriptionCancellationScheduled(
  subscription: Pick<Stripe.Subscription, 'cancel_at_period_end' | 'cancel_at'>,
  providerCreatedAt: number,
) {
  return subscription.cancel_at_period_end === true
    || (typeof subscription.cancel_at === 'number'
      && Number.isFinite(subscription.cancel_at)
      && subscription.cancel_at > providerCreatedAt);
}

export function voxaSubscriptionSnapshot(subscription: Stripe.Subscription, providerCreatedAt: number, graceDays = 3): VoxaBillingSnapshot {
  const period = subscriptionPeriod(subscription);
  const status = subscription.status;
  return {
    status,
    periodStart: period.start ? new Date(period.start * 1_000) : null,
    periodEnd: period.end ? new Date(period.end * 1_000) : null,
    cancelAtPeriodEnd: stripeSubscriptionCancellationScheduled(subscription, providerCreatedAt),
    graceUntil: status === 'past_due' ? new Date(providerCreatedAt * 1_000 + graceDays * 86_400_000) : null,
    providerUpdatedAt: new Date(providerCreatedAt * 1_000),
  };
}

export function shouldApplyVoxaSubscriptionSnapshot(existing: Pick<VoxaBillingSnapshot, 'status' | 'providerUpdatedAt'> | undefined, incoming: Pick<VoxaBillingSnapshot, 'status' | 'providerUpdatedAt'>) {
  if (!existing) return true;
  const delta = incoming.providerUpdatedAt.getTime() - existing.providerUpdatedAt.getTime();
  if (delta !== 0) return delta > 0;
  return !( ['active', 'trialing'].includes(existing.status) && ['past_due', 'unpaid'].includes(incoming.status) );
}

export function voxaNormalizedBillingState(input?: { status?: string | null; cancelAtPeriodEnd?: boolean | null; graceUntil?: Date | string | null; checkoutPendingUntil?: Date | string | null; reconciliationRequired?: boolean | null }, now = new Date()) {
  if (input?.reconciliationRequired) return 'reconciliation_required';
  if (input?.checkoutPendingUntil && new Date(input.checkoutPendingUntil) > now) return 'checkout_pending';
  if (!input?.status || ['inactive', 'free', 'trial_eligible'].includes(input.status)) return 'free';
  if (input.cancelAtPeriodEnd && ['active', 'trialing'].includes(input.status)) return 'cancel_scheduled';
  if (input.status === 'past_due') return input.graceUntil && new Date(input.graceUntil) > now ? 'past_due_grace' : 'past_due_blocked';
  if (['active', 'trialing', 'paused', 'canceled', 'incomplete'].includes(input.status)) return input.status;
  return input.status === 'unpaid' ? 'past_due_blocked' : 'reconciliation_required';
}

export function voxaPaidAccess(normalizedState: string) {
  return ['active', 'trialing', 'cancel_scheduled', 'past_due_grace'].includes(normalizedState);
}

export function subscriptionIdFromVoxaInvoice(invoice: Stripe.Invoice) {
  const value = invoice as Stripe.Invoice & { subscription?: string | { id?: string } | null; parent?: { subscription_details?: { subscription?: string | { id?: string } | null } | null } | null };
  const subscription = value.parent?.subscription_details?.subscription ?? value.subscription;
  return typeof subscription === 'string' ? subscription : subscription?.id;
}
