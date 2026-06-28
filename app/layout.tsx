export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WCAG Scanner — Automated Accessibility Compliance Audits',
  description:
    'Scan your website for WCAG and ADA compliance issues in seconds. Free scanner detects the 6 issues causing 96% of accessibility failures.',
  keywords: 'WCAG scanner, ADA compliance, accessibility audit, web accessibility, Section 508, axe-core scanner',
  openGraph: {
    title: 'WCAG Scanner — Automated Accessibility Compliance Audits',
    description: 'Free instant scan for WCAG/ADA violations. Fix the issues that cause 96% of lawsuits.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
