import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: report } = await supabase
    .from('reports')
    .select('*, scans(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!report) {
    return new Response('Not found', { status: 404 })
  }

  const { data: violations } = await supabase
    .from('violations')
    .select('*')
    .eq('scan_id', report.scan_id)
    .order('impact', { ascending: false })

  const scan = report.scans as any
  const score = scan?.compliance_score ?? 0
  const scoreColor = score >= 75 ? '#22D3A0' 
    : score >= 50 ? '#F59E0B' : '#EF4444'

  const violationsList = (violations || []).map((v: any) => `
    <tr style="border-bottom: 1px solid #2A2A3A;">
      <td style="padding: 12px; color: ${
        v.impact === 'critical' ? '#FF3B3B' :
        v.impact === 'serious' ? '#FF7A00' :
        v.impact === 'moderate' ? '#FFB800' : '#64B5F6'
      }; font-weight: bold; text-transform: uppercase; font-size: 12px;">
        ${v.impact || 'minor'}
      </td>
      <td style="padding: 12px; color: #F0F0FF;">
        ${v.rule_id || v.id || ''}
      </td>
      <td style="padding: 12px; color: #8B8BA7; font-size: 13px;">
        ${v.rule_description || v.description || ''}
      </td>
      <td style="padding: 12px; color: #8B8BA7; font-size: 12px;">
        ${v.fix_summary || v.help || ''}
      </td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #0A0A0F; 
          color: #F0F0FF;
          padding: 40px;
        }
        .header { 
          border-bottom: 2px solid #2A2A3A; 
          padding-bottom: 30px; 
          margin-bottom: 30px; 
        }
        .brand { color: #6C47FF; font-size: 14px; font-weight: 600; 
          letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
        .title { font-size: 28px; font-weight: 700; color: #F0F0FF; }
        .url { color: #8B8BA7; font-size: 14px; margin-top: 6px; }
        .date { color: #8B8BA7; font-size: 13px; margin-top: 4px; }
        .score-section { 
          display: flex; align-items: center; gap: 40px;
          background: #111118; border: 1px solid #2A2A3A;
          border-radius: 12px; padding: 24px; margin-bottom: 30px;
        }
        .score-circle { text-align: center; }
        .score-number { 
          font-size: 56px; font-weight: 800; 
          color: ${scoreColor};
          line-height: 1;
        }
        .score-label { color: #8B8BA7; font-size: 13px; margin-top: 4px; }
        .stats { display: flex; gap: 24px; flex-wrap: wrap; }
        .stat { background: #0A0A0F; border-radius: 8px; padding: 16px 20px; }
        .stat-value { font-size: 24px; font-weight: 700; }
        .stat-label { color: #8B8BA7; font-size: 12px; margin-top: 2px; }
        .section-title { 
          font-size: 18px; font-weight: 600; 
          margin-bottom: 16px; margin-top: 30px;
          color: #F0F0FF;
        }
        table { width: 100%; border-collapse: collapse; }
        th { 
          text-align: left; padding: 10px 12px; 
          color: #8B8BA7; font-size: 12px; 
          text-transform: uppercase; letter-spacing: 1px;
          border-bottom: 1px solid #2A2A3A;
          background: #111118;
        }
        .disclaimer {
          margin-top: 40px; padding: 16px;
          background: #111118; border: 1px solid #2A2A3A;
          border-radius: 8px; color: #8B8BA7; font-size: 12px;
        }
        .footer {
          margin-top: 20px; text-align: center;
          color: #8B8BA7; font-size: 11px;
          border-top: 1px solid #2A2A3A; padding-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">WCAG Scanner</div>
        <div class="title">Accessibility Compliance Report</div>
        <div class="url">${scan?.url || ''}</div>
        <div class="date">Generated: ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        })}</div>
      </div>

      <div class="score-section">
        <div class="score-circle">
          <div class="score-number">${score}</div>
          <div class="score-label">out of 100</div>
        </div>
        <div class="stats">
          <div class="stat">
            <div class="stat-value" style="color: #FF3B3B;">
              ${scan?.critical_count ?? 0}
            </div>
            <div class="stat-label">Critical</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color: #FF7A00;">
              ${scan?.serious_count ?? 0}
            </div>
            <div class="stat-label">Serious</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color: #FFB800;">
              ${scan?.moderate_count ?? 0}
            </div>
            <div class="stat-label">Moderate</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color: #64B5F6;">
              ${scan?.minor_count ?? 0}
            </div>
            <div class="stat-label">Minor</div>
          </div>
        </div>
      </div>

      <div class="section-title">
        Violations (${violations?.length ?? 0} total)
      </div>
      <table>
        <thead>
          <tr>
            <th>Impact</th>
            <th>Rule</th>
            <th>Description</th>
            <th>How to Fix</th>
          </tr>
        </thead>
        <tbody>
          ${violationsList || '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #22D3A0;">No violations found!</td></tr>'}
        </tbody>
      </table>

      <div class="disclaimer">
        ⚠️ This report was generated by automated scanning using axe-core. 
        Automated scans detect approximately 57% of WCAG issues. 
        Results do not constitute legal advice and do not guarantee 
        ADA or WCAG compliance. Consult a qualified accessibility 
        specialist for full compliance verification.
      </div>

      <div class="footer">
        Generated by WCAG Scanner • wcag-scanner-tau.vercel.app
      </div>
    </body>
    </html>
  `

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    }
  })
}