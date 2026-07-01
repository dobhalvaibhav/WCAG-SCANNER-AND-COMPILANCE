import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AIFixButton from '@/components/reports/AIFixButton'
import { calculateLawsuitRisk } from '@/lib/scanner/riskScore'
import ComplianceAssistant from '@/components/chat/ComplianceAssistant'

export default async function ReportDetailPage({
  params
}: {
  params: { id: string }
}) {
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

  // Fetch plan for gated features
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const { data: report, error } = await supabase
    .from('reports')
    .select('*, scans(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !report) notFound()

  const scan = report.scans as any

  const { data: violations } = await supabase
    .from('violations')
    .select('*')
    .eq('scan_id', report.scan_id)
    .order('impact', { ascending: false })

  const score = scan?.compliance_score ?? 0
  const scoreColor = score >= 90 ? '#22D3A0'
    : score >= 75 ? '#22c55e'
    : score >= 50 ? '#F59E0B'
    : '#EF4444'

  // Calculate lawsuit risk
  const risk = calculateLawsuitRisk({
    compliance_score: score,
    critical_count: scan?.critical_count ?? 0,
    serious_count: scan?.serious_count ?? 0,
    big_six: scan?.big_six || {},
    has_overlay_widget: scan?.has_overlay_widget ?? false,
  })

  const impactColors: Record<string, string> = {
    critical: '#FF3B3B',
    serious: '#FF7A00',
    moderate: '#FFB800',
    minor: '#64B5F6'
  }

  return (
    <>
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/reports"
        className="text-gray-400 hover:text-white text-sm 
          mb-6 inline-flex items-center gap-2">
        ← Back to Reports
      </Link>

      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white break-all">
            {scan?.url}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {new Date(report.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <a href={`/api/reports/${params.id}/pdf`}
            className="bg-purple-600 hover:bg-purple-700 text-white 
              px-4 py-2 rounded-lg text-sm transition-colors">
            Download PDF
          </a>
          <a href={`/api/reports/${params.id}/csv`}
            className="bg-[#1A1A24] hover:bg-[#2A2A3A] border 
              border-[#2A2A3A] text-white px-4 py-2 rounded-lg 
              text-sm transition-colors">
            Export CSV
          </a>
          <a href={`/api/reports/${params.id}/statement`}
            className="bg-[#1A1A24] hover:bg-[#2A2A3A] border 
              border-[#2A2A3A] text-white px-4 py-2 rounded-lg 
              text-sm transition-colors">
            Generate Statement
          </a>
        </div>
      </div>

      {/* Lawsuit Risk Assessment */}
      <div
        className="rounded-xl p-5 mb-6 border"
        style={{
          backgroundColor: risk.color + '15',
          borderColor: risk.color + '40',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Lawsuit Risk Assessment
            </p>
            <p className="text-2xl font-bold" style={{ color: risk.color }}>
              {risk.label}
            </p>
          </div>
          <div
            className="text-3xl font-bold w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: risk.color + '20', color: risk.color }}
          >
            {risk.score}
          </div>
        </div>
        <ul className="mt-4 space-y-1">
          {risk.factors.map((f, i) => (
            <li key={i} className="text-sm text-gray-300 flex gap-2">
              <span style={{ color: risk.color }}>•</span> {f}
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          Based on documented 2025 ADA lawsuit data. Not a legal prediction — consult an attorney for case-specific advice.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111118] border border-[#2A2A3A] rounded-xl p-4">
          <p className="text-gray-400 text-sm">Score</p>
          <p className="text-3xl font-bold mt-1" style={{ color: scoreColor }}>
            {score}/100
          </p>
        </div>
        <div className="bg-[#111118] border border-[#2A2A3A] rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Issues</p>
          <p className="text-3xl font-bold text-white mt-1">
            {scan?.total_violations ?? 0}
          </p>
        </div>
        <div className="bg-[#111118] border border-[#2A2A3A] rounded-xl p-4">
          <p className="text-gray-400 text-sm">Critical</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#FF3B3B' }}>
            {scan?.critical_count ?? 0}
          </p>
        </div>
        <div className="bg-[#111118] border border-[#2A2A3A] rounded-xl p-4">
          <p className="text-gray-400 text-sm">Serious</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#FF7A00' }}>
            {scan?.serious_count ?? 0}
          </p>
        </div>
      </div>

      {scan?.big_six && (
        <div className="bg-[#111118] border border-[#2A2A3A] 
          rounded-xl p-6 mb-8">
          <h2 className="text-base font-semibold text-white mb-4">
            Big Six Violations
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(scan.big_six as Record<string, number>)
              .map(([key, count]) => (
              <div key={key} className="flex items-center justify-between
                bg-[#0A0A0F] rounded-lg p-3">
                <span className="text-gray-400 text-sm capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className={`font-bold text-sm ${
                  count > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-base font-semibold text-white mb-4">
        All Violations ({violations?.length ?? 0})
      </h2>

      {!violations || violations.length === 0 ? (
        <div className="bg-[#111118] border border-[#2A2A3A] 
          rounded-xl p-8 text-center">
          <p className="text-green-400 text-lg font-medium">
            No violations found!
          </p>
          <p className="text-gray-400 text-sm mt-2">
            This site passed all automated WCAG checks.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {violations.map((v) => {
            const color = impactColors[v.impact] || '#64B5F6'
            return (
              <div key={v.id}
                className="bg-[#111118] border border-[#2A2A3A] 
                  rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <span className="px-2 py-1 rounded text-xs font-bold 
                    uppercase shrink-0 mt-0.5"
                    style={{
                      backgroundColor: color + '20',
                      color
                    }}>
                    {v.impact}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">
                      {v.rule_description || v.description || v.rule_id}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Rule ID: {v.rule_id || v.id}
                      {v.wcag_criterion && ` • WCAG ${v.wcag_criterion}`}
                    </p>
                    {v.element_html && (
                      <pre className="bg-[#0A0A0F] rounded-lg p-3 mt-3 
                        text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap 
                        break-all">
                        {v.element_html}
                      </pre>
                    )}
                    {(v.fix_summary || v.help) && (
                      <div className="mt-3 bg-purple-900/20 border 
                        border-purple-500/20 rounded-lg p-3">
                        <p className="text-purple-300 text-xs font-semibold mb-1">
                          How to fix:
                        </p>
                        <p className="text-gray-300 text-sm">
                          {v.fix_summary || v.help}
                        </p>
                      </div>
                    )}
                    <AIFixButton
                      violationId={v.id}
                      existingFix={v.ai_fix_html ? { html: v.ai_fix_html, explanation: v.ai_fix_explanation } : null}
                    />
                    {(v.help_url || v.helpUrl) && (
                      <a href={v.help_url || v.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 
                          text-xs mt-2 inline-block">
                        Learn more →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
    <ComplianceAssistant
      reportId={params.id}
      userPlan={profile?.subscription_status || 'free'}
    />
    </>
  )
}
