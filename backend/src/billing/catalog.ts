export type VoxaPublicPlan = {
  key: string;
  label: string;
  entitlementKey: string;
  displayOrder: number;
  active: boolean;
  public: boolean;
  commercialStatus: 'approved';
};

// This is the server-owned public catalog order. Stripe IDs remain environment
// configuration and are deliberately not persisted when a trial is provisioned.
export const VOXA_PUBLIC_PLANS: readonly VoxaPublicPlan[] = [
  {
    key: 'voxa_pro',
    label: 'Voxa Pro',
    entitlementKey: 'voxa_pro',
    displayOrder: 10,
    active: true,
    public: true,
    commercialStatus: 'approved',
  },
];

export function firstVoxaCommercialPlan(): VoxaPublicPlan {
  const plan = VOXA_PUBLIC_PLANS
    .filter((candidate) => candidate.active && candidate.public && candidate.commercialStatus === 'approved')
    .sort((left, right) => left.displayOrder - right.displayOrder || left.key.localeCompare(right.key))[0];
  if (!plan) throw new Error('Voxa has no active public commercial plan.');
  return plan;
}
