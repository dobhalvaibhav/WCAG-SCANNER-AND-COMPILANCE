export type SubscriptionStatus = 'free' | 'pro' | 'agency';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_id: string | null;
  current_period_end: string | null;
  scans_used_this_month: number;
  created_at: string;
  updated_at: string;
}

export interface PlanLimits {
  scansPerMonth: number;
  pagesPerScan: number;
  monitoredSites: number;
  historyDays: number;
  pdfReports: boolean;
  apiAccess: boolean;
  agencyDashboard: boolean;
  whiteLabel: boolean;
  aiFixesPerMonth: number;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  stripePriceId: string | null;
  limits: PlanLimits;
  features: string[];
}