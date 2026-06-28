'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ScanLine,
  FileText,
  Monitor,
  Building2,
  CreditCard,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { useSubscription } from '@/hooks/useSubscription';
import SignOutButton from '@/components/layout/SignOutButton';

interface Props {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: Props) {
  const pathname = usePathname();
  const { user } = useUser();
  const { plan } = useSubscription();

  const links = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/scanner', label: 'Scanner', icon: ScanLine },
    { href: '/reports', label: 'Reports', icon: FileText },
    { href: '/monitoring', label: 'Monitoring', icon: Monitor },
  ];

  if (plan.limits.agencyDashboard) {
    links.push({ href: '/agency', label: 'Agency', icon: Building2 });
  }

  links.push(
    { href: '/billing', label: 'Billing', icon: CreditCard },
    { href: '/settings', label: 'Settings', icon: Settings }
  );

  return (
    <aside className="w-64 bg-surface border-r border-border h-screen flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border h-16">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-text-primary">WCAG Scanner</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              )}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Plan badge + user */}
      <div className="p-3 border-t border-border space-y-3">
        <div className="px-3 py-2 bg-accent/10 rounded-lg">
          <p className="text-xs text-text-muted">Current Plan</p>
          <p className="font-semibold text-sm text-accent capitalize">{plan.name}</p>
        </div>

        {user && (
          <div className="px-3">
            <p className="text-sm text-text-primary truncate">{user.email}</p>
          </div>
        )}

        <SignOutButton />
      </div>
    </aside>
  );
}