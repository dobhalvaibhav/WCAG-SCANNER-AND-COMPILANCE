'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Search } from 'lucide-react';
import { useScan } from '@/hooks/useScan';
import { useUser } from '@/hooks/useUser';
import ScanProgress from '@/components/scanner/ScanProgress';
import ComplianceScore from '@/components/scanner/ComplianceScore';
import BigSixSummary from '@/components/scanner/BigSixSummary';
import Navbar from '@/components/layout/Navbar';

export default function FreeScanPage() {
  const [url, setUrl] = useState('');
  const [ran, setRan] = useState(false);
  const { scanResult, loading, error, startScan, resetScan } = useScan();
  const { user } = useUser();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setRan(true);
    await startScan(url.trim(), 1, 'AA');
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20 bg-background">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {!ran ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                Free <span className="gradient-text">WCAG Scan</span>
              </h1>
              <p className="text-text-secondary max-w-xl mx-auto mb-8">
                Enter any website URL. We'll scan one page and show you the top accessibility issues — completely free, no signup required.
              </p>

              <form onSubmit={handleScan} className="max-w-xl mx-auto">
                <div className="flex gap-2 p-1.5 bg-surface-elevated border border-border rounded-xl shadow-glow">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Enter your website URL..."
                      className="w-full pl-10 pr-4 py-3 bg-transparent text-text-primary placeholder:text-text-muted outline-none rounded-lg"
                      aria-label="Website URL to scan"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !url.trim()}
                    className="px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    Scan Now
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {loading && <ScanProgress />}
              {error && (
                <div className="text-center py-8">
                  <p className="text-danger mb-2">{error}</p>
                  <button
                    onClick={resetScan}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-surface-elevated"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {scanResult && scanResult.status === 'completed' && (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <ComplianceScore score={scanResult.compliance_score || 0} total={scanResult.total_violations} />
                    <BigSixSummary bigSix={scanResult.big_six || { contrast: 0, alt_text: 0, labels: 0, links: 0, buttons: 0, lang: 0 }} />
                  </div>

                  <div className="bg-surface border border-border rounded-xl p-6">
                    <h3 className="font-semibold mb-4">
                      {scanResult.violations && scanResult.violations.length > 0
                        ? `Found ${scanResult.violations.length} issues`
                        : 'No issues found!'}
                    </h3>

                    {scanResult.violations?.slice(0, 3).map((v, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                        <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          v.impact === 'critical' ? 'bg-severity-critical' :
                          v.impact === 'serious' ? 'bg-severity-serious' :
                          v.impact === 'moderate' ? 'bg-severity-moderate' : 'bg-severity-minor'
                        }`} />
                        <div>
                          <p className="text-sm font-medium">{v.rule_description}</p>
                          <p className="text-xs text-text-muted">Fix: {v.fix_summary?.slice(0, 80)}...</p>
                        </div>
                      </div>
                    ))}

                    {scanResult.violations && scanResult.violations.length > 3 && (
                      <div className="mt-6 text-center">
                        <p className="text-text-secondary text-sm mb-4">
                          <strong>{scanResult.violations.length - 3} more issues hidden.</strong>
                        </p>
                        {user ? (
                          <Link
                            href="/scanner"
                            className="inline-block px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg"
                          >
                            Continue to Full Scanner →
                          </Link>
                        ) : (
                          <Link
                            href="/signup"
                            className="inline-block px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg"
                          >
                            Sign Up to See All Issues →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
