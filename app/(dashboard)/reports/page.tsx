import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ReportsPage() {
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

  const { data: reports, error } = await supabase
    .from('reports')
    .select(`
      id,
      name,
      created_at,
      is_public,
      scan_id,
      scans (
        url,
        compliance_score,
        total_violations,
        critical_count,
        serious_count,
        status,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  console.log('Reports:', reports?.length, 'Error:', error)

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Reports</h1>
        <p className="text-red-400">Error loading reports: {error.message}</p>
      </div>
    )
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Reports</h1>
        <p className="text-gray-400">No reports yet. Run a scan to get started.</p>
        <Link href="/dashboard/scanner" 
          className="mt-4 inline-block bg-purple-600 text-white px-4 py-2 rounded-lg">
          Run First Scan
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Reports</h1>
      <p className="text-gray-400 mb-6">
        Your scan history and compliance reports.
      </p>
      <div className="space-y-4">
        {reports.map((report) => {
          const scan = report.scans as any
          const score = scan?.compliance_score ?? 0
          const scoreColor = score >= 90 ? '#22D3A0' 
            : score >= 75 ? '#22c55e'
            : score >= 50 ? '#F59E0B' 
            : '#EF4444'

          return (
            <Link key={report.id} href={`/reports/${report.id}`}>
              <div className="bg-[#111118] border border-[#2A2A3A] rounded-xl p-6 
                hover:border-purple-500 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {scan?.url || 'Unknown URL'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      {new Date(report.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Violations</p>
                      <p className="text-white font-medium">
                        {scan?.total_violations ?? 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Score</p>
                      <p className="font-bold text-xl" 
                        style={{ color: scoreColor }}>
                        {score}/100
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: scoreColor + '20',
                        color: scoreColor 
                      }}>
                      {score >= 90 ? 'Excellent' 
                        : score >= 75 ? 'Good'
                        : score >= 50 ? 'Fair' 
                        : 'Poor'}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}