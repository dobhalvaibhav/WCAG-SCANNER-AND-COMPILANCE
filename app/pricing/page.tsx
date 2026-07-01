'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import { PLANS } from '@/lib/stripe/plans';
import PricingCard from '@/components/billing/PricingCard';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function PricingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (planId: string) => {
    if (planId === 'free') {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/signup?plan=free');
      }
      return;
    }

    if (user) {
      setLoading(planId);
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan_id: planId, annual: false }),
        });
        if (res.ok) {
          const { url } = await res.json();
          window.location.href = url;
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(null);
    } else {
      router.push(`/signup?plan=${planId}`);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold mb-4">
              Simple, <span className="gradient-text">Transparent</span> Pricing
            </h1>
            <p className="text-text-secondary max-w-xl mx-auto">
              Start free. Upgrade when you need more scans, monitoring, and professional reports.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {Object.values(PLANS).map((plan, i) => {
              const isPopular = plan.id === 'pro';
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                >
                  <PricingCard
                    plan={plan}
                    isPopular={isPopular}
                    onSelect={handleSelect}
                    loading={loading === plan.id}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Feature comparison */}
          <div className="mt-20 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Full Feature Comparison</h2>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-semibold w-[280px]">Feature</th>
                      <th className="text-center p-4 text-sm font-semibold">Free</th>
                      <th className="text-center p-4 text-sm font-semibold bg-accent/5">Pro</th>
                      <th className="text-center p-4 text-sm font-semibold">Agency</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[
                      ['Monthly scans', '3', '50', '200'],
                      ['Pages per scan', '1', '50', '200'],
                      ['Monitored sites', '0', '5', '25'],
                      ['Scan history', '7 days', '90 days', '1 year'],
                      ['PDF reports', '—', <Check key="1" className="w-4 h-4 text-success inline" />, <Check key="2" className="w-4 h-4 text-success inline" />],
                      ['API access', '—', <Check key="3" className="w-4 h-4 text-success inline" />, <Check key="4" className="w-4 h-4 text-success inline" />],
                      ['Agency dashboard', '—', '—', <Check key="5" className="w-4 h-4 text-success inline" />],
                      ['White-label PDFs', '—', '—', <Check key="6" className="w-4 h-4 text-success inline" />],
                      ['Email alerts', '—', <Check key="7" className="w-4 h-4 text-success inline" />, <Check key="8" className="w-4 h-4 text-success inline" />],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="p-4 text-text-secondary">{row[0]}</td>
                        <td className="p-4 text-center">{row[1]}</td>
                        <td className="p-4 text-center bg-accent/5">{row[2]}</td>
                        <td className="p-4 text-center">{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}