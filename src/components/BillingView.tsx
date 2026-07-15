import { AlertTriangle, ArrowUpRight, Check, CreditCard, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { platform, type BillingStatus } from '../platform';
import { Skeleton } from './ui/Skeleton';

export function voxaBillingPresentation(status: BillingStatus, locale = 'en') {
  const periodEnd = status.currentPeriodEnd ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(status.currentPeriodEnd)) : null;
  const grace = status.graceUntil ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(status.graceUntil)) : null;
  const trialEnd = status.trialEndsAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(status.trialEndsAt)) : null;
  if (status.normalizedState === 'trial_active') return { tone: 'paid', title: '7-day trial active — no card required', detail: `${status.planLabel} is included${trialEnd ? ` until ${trialEnd}` : ' for 7 days'}. Subscribe before it ends to keep Pro access.` };
  if (status.normalizedState === 'trial_expired') return { tone: 'attention', title: 'Your 7-day trial has ended', detail: 'Subscribe to Voxa Pro and add a payment method to continue transcription and AI analysis.' };
  if (status.normalizedState === 'checkout_pending') return { tone: 'pending', title: 'Confirming your Checkout', detail: 'Returning from Stripe does not confirm payment. Voxa is waiting for the signed webhook.' };
  if (status.normalizedState === 'active' || status.normalizedState === 'trialing') return { tone: 'paid', title: 'Payment confirmed', detail: `${status.planLabel} is active.${periodEnd ? ` Renews on ${periodEnd}.` : ''}` };
  if (status.normalizedState === 'cancel_scheduled') return { tone: 'pending', title: 'Cancellation scheduled', detail: periodEnd ? `Paid access continues until ${periodEnd}. Your recordings and reports remain available.` : 'Paid access continues through the current period. Your recordings and reports remain available.' };
  if (status.normalizedState === 'past_due_grace' || status.normalizedState === 'past_due_blocked') return { tone: 'attention', title: 'Payment needs attention', detail: grace && status.normalizedState === 'past_due_grace' ? `Update your payment method. Recovery access is available until ${grace}.` : 'Update your payment method in Stripe to recover paid access.' };
  if (status.normalizedState === 'canceled') return { tone: 'neutral', title: 'Subscription ended', detail: 'Your recordings, transcripts and reports are preserved. You can subscribe again at any time.' };
  if (status.normalizedState === 'reconciliation_required') return { tone: 'attention', title: 'Billing review required', detail: 'Voxa could not prove the latest provider state. No new paid access is granted while this is reviewed.' };
  if (status.normalizedState === 'incomplete') return { tone: 'attention', title: 'Payment incomplete', detail: 'Complete or update the payment in Stripe before using the paid plan.' };
  return { tone: 'neutral', title: 'Free plan', detail: 'Choose Voxa Pro to unlock the paid plan. Stripe shows the approved amount and renewal terms before confirmation.' };
}

export default function BillingView() {
  const [status, setStatus] = useState<BillingStatus | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const pollingRef = useRef<number | null>(null);
  const load = useCallback(async () => { try { setStatus(await platform.getBillingStatus()); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load billing.'); } finally { setLoading(false); } }, []);
  const startStatusPolling = useCallback(() => {
    if (pollingRef.current !== null) window.clearInterval(pollingRef.current);
    let attempts = 0;
    const poll = () => { attempts += 1; void load(); if (attempts >= 15 && pollingRef.current !== null) { window.clearInterval(pollingRef.current); pollingRef.current = null; } };
    pollingRef.current = window.setInterval(poll, 2_000); poll();
  }, [load]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('checkout') !== 'success') return;
    startStatusPolling();
  }, [startStatusPolling]);
  useEffect(() => {
    const onFocus = () => startStatusPolling();
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('focus', onFocus); if (pollingRef.current !== null) window.clearInterval(pollingRef.current); };
  }, [startStatusPolling]);
  const checkout = async () => { setBusy('checkout'); setError(''); try { const value = await platform.createCheckoutSession(); if (!value.url) throw new Error('Checkout is unavailable.'); await platform.openBillingUrl(value.url); startStatusPolling(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not open Checkout.'); setBusy(''); } };
  const portal = async () => { setBusy('portal'); setError(''); try { const value = await platform.createBillingPortalSession(); if (!value.url) throw new Error('Billing management is unavailable.'); await platform.openBillingUrl(value.url); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not open billing management.'); setBusy(''); } };
  if (loading) return <section className="billing-view" aria-label="Loading billing"><Skeleton className="billing-skeleton"/><Skeleton className="billing-skeleton billing-skeleton-large"/></section>;
  if (!status) return <section className="billing-view"><div className="billing-state attention"><AlertTriangle/><div><strong>Billing could not be loaded</strong><span>{error}</span></div><button className="button button-secondary" onClick={() => void load()}><RefreshCw/>Retry</button></div></section>;
  const presentation = voxaBillingPresentation(status);
  const shouldUsePortalForPlan = status.portalAvailable && !['free', 'canceled', 'trial_active', 'trial_expired'].includes(status.normalizedState);
  const accessLabel = status.normalizedState === 'trial_active' ? 'Trial' : status.paidAccess ? 'Paid' : status.checkoutRequired ? 'Locked' : 'Free';
  return <section className="billing-view"><header className="billing-view-head"><div><span>Plan and billing</span><h2>Voxa Pro</h2><p>New accounts receive 7 days of Pro without a card. Continued access is managed securely in Stripe.</p></div>{status.portalAvailable && <button className="button button-secondary" disabled={busy === 'portal'} onClick={() => void portal()}><CreditCard/>{busy === 'portal' ? 'Opening...' : 'Manage in Stripe'}</button>}</header>{error && <div className="billing-error" role="alert"><AlertTriangle/>{error}</div>}<div className={`billing-state ${presentation.tone}`} role="status" aria-live="polite"><div><strong>{presentation.title}</strong><span>{presentation.detail}</span></div>{(status.normalizedState.startsWith('past_due') || status.normalizedState === 'incomplete') && status.portalAvailable && <button className="button button-secondary" disabled={busy === 'portal'} onClick={() => void portal()}>Update payment<ArrowUpRight/></button>}</div><article className="billing-plan"><div><span>Voxa Pro</span><h3>Conversation intelligence without losing your history.</h3><p><strong>R$ 14,90/month after the trial</strong>, tax-exclusive. Stripe shows applicable payment methods and renewal terms before you confirm.</p><ul><li><Check/>7 days of Pro for each new account, with no card required</li><li><Check/>Generate provider transcription and AI specialist reports with Pro</li><li><Check/>Keep and read recordings, transcripts and reports after cancellation</li><li><Check/>Manage invoices, payment method and cancellation in Stripe</li></ul></div><aside><span>Current access</span><strong>{accessLabel}</strong><small>{status.normalizedState.replaceAll('_', ' ')}</small>{!shouldUsePortalForPlan && <button className="button button-primary" disabled={!status.configured || busy === 'checkout'} onClick={() => void checkout()}><ArrowUpRight/>{busy === 'checkout' ? 'Opening...' : status.normalizedState === 'canceled' ? 'Subscribe again' : status.checkoutRequired ? 'Subscribe to continue — card required' : 'Keep Voxa Pro — R$ 14,90/month'}</button>}{!status.configured && <small>Billing is not configured. Try again later.</small>}</aside></article></section>;
}
