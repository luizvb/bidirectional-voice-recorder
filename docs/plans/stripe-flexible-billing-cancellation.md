# Stripe flexible billing cancellation compatibility

Status: `completed`

Owner: Coder

Date: 2026-07-14

## Objective and acceptance

- `AC-BILL-FLEX-001`: represent an `active` or `trialing` Stripe subscription as `cancel_scheduled` when either `cancel_at_period_end=true` or `cancel_at` is a future Unix timestamp relative to the provider event.
- Cover API `2026-06-24.dahlia` flexible billing payloads where the Customer Portal sets `cancel_at` to the period end while leaving `cancel_at_period_end=false`.
- Preserve Pro access through the current period and never treat `canceled_at` alone as the effective end date.

## Minimal slice

1. `completed` — normalize both provider representations into the existing persisted `cancelAtPeriodEnd` effective flag.
2. `completed` — add an explicit unit regression fixture for flexible billing, including the observed `canceled_at` request timestamp that must not determine effective cancellation by itself.
3. `completed` — backend `npm test -- --test-name-pattern='billing|Voxa'` passed 37/37 after TypeScript build; standalone backend build and React production build also passed. The React bundle retains its preexisting large-chunk warning.

No schema, migration, dependency, Checkout, Portal, Stripe/Vercel configuration or deployment change is required. Rollback is the isolated compatibility commit; Tester owns independent release readiness.
