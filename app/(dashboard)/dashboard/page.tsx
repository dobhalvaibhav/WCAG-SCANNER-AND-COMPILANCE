import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ScanLine } from 'lucide-react'
import { PLANS } from '@/lib/stripe/plans'

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile for plan info
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, scans_used_this_month')
    .eq('id', user.id)
    .single()

  const planName = profile?.subscription_status || 'free'

  // Total scans count
  const { count: totalScans } = await supabase
    .from('scans')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Recent completed scans
  const { data: recentScans } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5)

  // Average score
  const avgScore = recentScans && recentScans.length > 0
    ? Math.round(
        recentScans.reduce((sum, s) => sum + (s.compliance_score || 0), 0)
        / recentScans.length
      )
    : null

  // Monitored sites count
  const { count: monitoredCount } = await supabase
    .from('monitored_sites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Fetch reports for linking
  const { data: reports } = await supabase
    .from('reports')
    .select('id, scan_id')
    .eq('user_id', user.id)

  const reportByScanId = new Map<string, string>()
  if (reports) {
    reports.forEach((r: any) => {
      if (r.scan_id) reportByScanId.set(r.scan_id, r.id)
    })
  }

  // Limit info from PLANS in lib/stripe/plans.ts
  const planLimits = PLANS[planName]?.limits || PLANS.free.limits

  const scoreColor = (score: number) => {
    if (score >= 75) return '#22D3A0'
    if (score >= 50) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
          </p>
        </div>
        <Link
          href="/scanner"
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
        >
          <ScanLine className="w-5 h-5" />
          New Scan
        </Link>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-text-muted text-sm">Total Scans</p>
          <p className="text-3xl font-bold text-white mt-1">{totalScans ?? 0}</p>
          <p className="text-xs text-text-muted mt-1">
            {planLimits.scansPerMonth - (profile?.scans_used_this_month || 0)} remaining this month
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-text-muted text-sm">Avg Score</p>
          <p
            className="text-3xl font-bold mt-1"
            style={{ color: avgScore != null ? scoreColor(avgScore) : '#8B8BA7' }}
          >
            {avgScore != null ? avgScore : '-'}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-text-muted text-sm">Sites Monitored</p>
          <p className="text-3xl font-bold text-white mt-1">{monitoredCount ?? 0}</p>
          <p className="text-xs text-text-muted mt-1">
            of {planLimits.monitoredSites} max
          </p>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="bg-surface border border-border rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-white">Recent Scans</h2>
          <Link href="/reports" className="text-sm text-accent hover:text-accent-hover transition-colors">
            View All →
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentScans && recentScans.length > 0 ? (
            recentScans.map((scan) => {
              const color = scoreColor(scan.compliance_score || 0)
              const reportId = reportByScanId.get(scan.id)
              const href = reportId ? `/reports/${reportId}` : '#'
              return (
                <Link
                  key={scan.id}
                  href={href}
                  className="flex items-center justify-between p-4 hover:bg-surface-elevated/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      {scan.compliance_score || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary truncate max-w-[300px]">{scan.url}</p>
                      <p className="text-xs text-text-muted">
                        {new Date(scan.created_at).toLocaleDateString()} · {scan.total_violations} issues
                      </p>
                    </div>
                  </div>
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {scan.compliance_score || 'N/A'}
                  </span>
                </Link>
              )
            })
          ) : (
            <div className="p-10 text-center">
              <ScanLine className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-1">No scans yet</h3>
              <p className="text-text-secondary text-sm mb-4">
                Run your first WCAG compliance scan to see results here.
              </p>
              <Link
                href="/scanner"
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm"
              >
                <ScanLine className="w-4 h-4" />
                Start Your First Scan
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}