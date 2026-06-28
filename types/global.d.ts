declare module 'framer-motion' {
  import * as React from 'react';
  export interface MotionProps {
    initial?: Record<string, any>;
    animate?: Record<string, any>;
    exit?: Record<string, any>;
    whileInView?: Record<string, any>;
    viewport?: { once?: boolean; amount?: number };
    transition?: Record<string, any>;
    variants?: Record<string, any>;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    [key: string]: any;
  }
  export const motion: {
    div: React.FC<MotionProps>;
    span: React.FC<MotionProps>;
    p: React.FC<MotionProps>;
    h1: React.FC<MotionProps>;
    h2: React.FC<MotionProps>;
    h3: React.FC<MotionProps>;
    section: React.FC<MotionProps>;
    nav: React.FC<MotionProps>;
    form: React.FC<MotionProps>;
    button: React.FC<MotionProps>;
    a: React.FC<MotionProps & React.AnchorHTMLAttributes<HTMLAnchorElement>>;
    li: React.FC<MotionProps>;
    ul: React.FC<MotionProps>;
    circle: React.FC<MotionProps & React.SVGProps<SVGCircleElement>>;
    svg: React.FC<MotionProps & React.SVGProps<SVGSVGElement>>;
  };
  export const AnimatePresence: React.FC<{
    children?: React.ReactNode;
    mode?: 'wait' | 'sync' | 'popLayout';
  }>;
}

declare module 'lucide-react' {
  import * as React from 'react';
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    absoluteStrokeWidth?: boolean;
  }
  export type LucideIcon = React.FC<LucideProps>;
  export const ArrowRight: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Search: LucideIcon;
  export const ScanLine: LucideIcon;
  export const Menu: LucideIcon;
  export const X: LucideIcon;
  export const Check: LucideIcon;
  export const Star: LucideIcon;
  export const ShieldAlert: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ListChecks: LucideIcon;
  export const FileText: LucideIcon;
  export const Bell: LucideIcon;
  export const Code: LucideIcon;
  export const Building2: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Calendar: LucideIcon;
  export const FileDown: LucideIcon;
  export const Loader2: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const Monitor: LucideIcon;
  export const CreditCard: LucideIcon;
  export const Settings: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const Lock: LucideIcon;
  export const User: LucideIcon;
  export const Trash2: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Plus: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Bug: LucideIcon;
  export const Key: LucideIcon;
  export const CheckCircle: LucideIcon;
}

declare module 'stripe' {
  export default class Stripe {
    constructor(apiKey: string, config?: Record<string, any>);
    checkout: { sessions: { create: (params: any) => Promise<any> } };
    billingPortal: { sessions: { create: (params: any) => Promise<any> } };
    customers: { create: (params: any) => Promise<any> };
    subscriptions: { retrieve: (id: string) => Promise<any> };
    webhooks: { constructEvent: (body: string, sig: string, secret: string) => any };
  }
}
