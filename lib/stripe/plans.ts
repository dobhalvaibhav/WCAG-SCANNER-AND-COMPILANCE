import type { Plan } from '@/types/user';

export const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    stripePriceId: null,
    limits: {
      scansPerMonth: 3,
      pagesPerScan: 1,
      monitoredSites: 0,
      historyDays: 7,
      pdfReports: false,
      apiAccess: false,
      agencyDashboard: false,
      whiteLabel: false,
      aiFixesPerMonth: 0,
    },
    features: [
      '3 scans per month',
      '1 page per scan',
      'Basic violation report',
      '7-day history',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 25,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID!,
    limits: {
      scansPerMonth: 50,
      pagesPerScan: 50,
      monitoredSites: 5,
      historyDays: 90,
      pdfReports: true,
      apiAccess: true,
      agencyDashboard: false,
      whiteLabel: false,
      aiFixesPerMonth: 100,
    },
    features: [
      '50 scans per month',
      'Up to 50 pages per scan',
      'PDF compliance reports',
      'Weekly monitoring on 5 sites',
      'API access',
      '90-day history',
      'Email alerts on regressions',
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 45,
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID!,
    limits: {
      scansPerMonth: 200,
      pagesPerScan: 200,
      monitoredSites: 25,
      historyDays: 365,
      pdfReports: true,
      apiAccess: true,
      agencyDashboard: true,
      whiteLabel: true,
      aiFixesPerMonth: 500,
    },
    features: [
      '200 scans per month',
      'Up to 200 pages per scan',
      'Multi-site agency dashboard',
      'White-labeled PDF reports',
      'Monitor 25 sites',
      'Priority support',
      'Full API access',
      '1-year history',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlan(planId: string): Plan | undefined {
  return PLANS[planId];
}

export function getPlanLimits(planId: string) {
  const plan = getPlan(planId);
  return plan?.limits ?? PLANS.free.limits;
}

export function getAnnualPrice(planId: string): number {
  const plan = getPlan(planId);
  if (!plan || plan.price === 0) return 0;
  return plan.price * 10;
}
