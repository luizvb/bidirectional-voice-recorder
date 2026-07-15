import db from '../config/db';
import { firstVoxaCommercialPlan } from './catalog';

export const VOXA_TRIAL_DAYS = 7;

export const VOXA_TRIAL_PROVISION_SQL = `INSERT INTO users(
       id, trial_plan_key, trial_started_at, trial_ends_at
     )
     VALUES($1, $2, NOW(), NOW() + INTERVAL '7 days')
     ON CONFLICT (id) DO NOTHING`;

/**
 * Materializes a new Voxa account and its one-time trial atomically. Existing
 * rows are intentionally untouched, so deploying this does not backfill trials.
 */
export async function provisionVoxaAccount(userId: string): Promise<void> {
  const plan = firstVoxaCommercialPlan();
  await db.query(VOXA_TRIAL_PROVISION_SQL, [userId, plan.key]);
}
