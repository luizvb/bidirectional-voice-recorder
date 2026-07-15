import type { NextFunction, Request, Response } from 'express';
import db from '../config/db';
import { voxaNormalizedBillingState, voxaPaidAccess } from './lifecycle';

export type VoxaEntitlementRow = {
  subscription_status?: string | null;
  cancel_at_period_end?: boolean | null;
  grace_until?: Date | string | null;
  checkout_pending_until?: Date | string | null;
  billing_reconciliation_required?: boolean | null;
  trial_plan_key?: string | null;
  trial_started_at?: Date | string | null;
  trial_ends_at?: Date | string | null;
};

export const VOXA_ENTITLEMENT_SELECT = `
      SELECT subscription_status,
             subscription_cancel_at_period_end AS cancel_at_period_end,
             subscription_grace_until AS grace_until,
             checkout_pending_until, billing_reconciliation_required,
             trial_plan_key, trial_started_at, trial_ends_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `;

export function voxaProEntitlement(row: VoxaEntitlementRow | undefined, now = new Date()) {
  const normalizedState = voxaNormalizedBillingState(row ? {
    status: row.subscription_status,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    graceUntil: row.grace_until,
    checkoutPendingUntil: row.checkout_pending_until,
    reconciliationRequired: row.billing_reconciliation_required,
    trialPlanKey: row.trial_plan_key,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
  } : undefined, now);
  return { normalizedState, allowed: voxaPaidAccess(normalizedState) };
}

export async function requireVoxaPro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows } = await db.query(VOXA_ENTITLEMENT_SELECT, [req.user!.id]);
    const decision = voxaProEntitlement(rows[0] as VoxaEntitlementRow | undefined);
    if (!decision.allowed) {
      const trialExpired = decision.normalizedState === 'trial_expired';
      res.status(402).json({
        error: trialExpired
          ? 'Your 7-day trial has ended. Subscribe to Voxa Pro and add a payment method to continue.'
          : 'Voxa Pro is required to start provider transcription or AI analysis.',
        code: 'VOXA_PRO_REQUIRED',
        reason: trialExpired ? 'TRIAL_EXPIRED' : 'PLAN_REQUIRED',
        checkoutRequired: true,
        billingPath: '/?billing=required',
        billingState: decision.normalizedState,
      });
      return;
    }
    next();
  } catch {
    res.status(503).json({ error: 'Paid access could not be verified. Try again shortly.', code: 'BILLING_STATUS_UNAVAILABLE' });
  }
}
