import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PLAN_LIMITS: Record<string, number> = {
  free: 0,
  pro: 50,
  agency: 200,
}

export async function POST(request: Request) {
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
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const plan = profile?.subscription_status || 'free'
  const limit = PLAN_LIMITS[plan] ?? 0

  if (limit === 0) {
    return Response.json(
      { error: 'Compliance Assistant requires Pro or Agency plan', code: 'UPGRADE_REQUIRED' },
      { status: 403 }
    )
  }

  const monthYear = new Date().toISOString().slice(0, 7)
  const { data: usage } = await supabase
    .from('chatbot_usage')
    .select('messages_sent')
    .eq('user_id', user.id)
    .eq('month_year', monthYear)
    .single()

  const currentCount = usage?.messages_sent || 0
  if (currentCount >= limit) {
    return Response.json(
      { error: `Monthly chat limit reached (${limit}). Resets next month.`, code: 'LIMIT_REACHED' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const { message, reportId, history } = body

  // Fetch scan context so the AI knows what it's talking about
  let contextText = 'No specific report is loaded. Answer generally about WCAG compliance.'

  if (reportId) {
    const { data: report } = await supabase
      .from('reports')
      .select('*, scans(*)')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single()

    if (report) {
      const scan = report.scans as any
      const { data: violations } = await supabase
        .from('violations')
        .select('rule_id, impact, rule_description, wcag_criterion')
        .eq('scan_id', report.scan_id)
        .limit(20)

      contextText = `The user is looking at a scan of ${scan?.url}.
Compliance score: ${scan?.compliance_score}/100.
Total violations: ${scan?.total_violations}.
Critical: ${scan?.critical_count}, Serious: ${scan?.serious_count},
Moderate: ${scan?.moderate_count}, Minor: ${scan?.minor_count}.

Specific violations found:
${(violations || []).map(v =>
  `- [${v.impact}] ${v.rule_id}: ${v.rule_description} (WCAG ${v.wcag_criterion || 'N/A'})`
).join('\n')}`
    }
  }

  const systemPrompt = `You are a WCAG accessibility compliance assistant
inside a SaaS tool called WCAG Scanner. You help users understand their
specific accessibility violations, explain what they mean in plain English,
suggest how to fix them on common platforms (WordPress, Shopify, custom code),
and explain legal risk context.

IMPORTANT RULES:
- Only answer questions related to web accessibility, WCAG, ADA compliance,
  and the user's specific scan data below.
- If asked something unrelated to accessibility (general coding help,
  personal questions, other topics), politely redirect: "I'm focused on
  helping with accessibility compliance. Is there a WCAG issue I can help
  you understand?"
- You are not a lawyer. Never claim something is "definitely safe" or
  "guaranteed compliant." Always suggest consulting a professional for
  legal certainty.
- Keep answers concise and practical, 2-4 sentences unless the user asks
  for detailed step-by-step instructions.

Current scan context:
${contextText}`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []).slice(-6), // keep last 6 messages for context, avoid huge payloads
    { role: 'user', content: message }
  ]

  const aiResponse = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 400,
      temperature: 0.3,
    })
  })

  if (!aiResponse.ok) {
    const errText = await aiResponse.text()
    console.error('DeepSeek API error:', errText)
    return Response.json({ error: 'Assistant is temporarily unavailable' }, { status: 500 })
  }

  const aiData = await aiResponse.json()
  const reply = aiData.choices?.[0]?.message?.content || 'Sorry, I could not process that.'

  await supabase
    .from('chatbot_usage')
    .upsert({
      user_id: user.id,
      month_year: monthYear,
      messages_sent: currentCount + 1,
    }, { onConflict: 'user_id,month_year' })

  return Response.json({ reply, remaining: limit - currentCount - 1 })
}