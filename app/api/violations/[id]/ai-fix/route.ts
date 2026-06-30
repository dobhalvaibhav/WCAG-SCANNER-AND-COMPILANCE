import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PLANS } from '@/lib/stripe/plans'

export async function POST(
  request: Request,
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
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const plan = profile?.subscription_status || 'free'
  const limit = PLANS[plan]?.limits?.aiFixesPerMonth ?? 0

  if (limit === 0) {
    return Response.json(
      { error: 'AI Fix Generator requires Pro or Agency plan', code: 'UPGRADE_REQUIRED' },
      { status: 403 }
    )
  }

  // Check monthly usage
  const monthYear = new Date().toISOString().slice(0, 7) // "2026-06"
  const { data: usage } = await supabase
    .from('ai_fix_usage')
    .select('fixes_generated')
    .eq('user_id', user.id)
    .eq('month_year', monthYear)
    .single()

  const currentCount = usage?.fixes_generated || 0
  if (currentCount >= limit) {
    return Response.json(
      { error: `Monthly AI fix limit reached (${limit}). Resets next month.`, code: 'LIMIT_REACHED' },
      { status: 429 }
    )
  }

  // Fetch the violation with ownership check
  const { data: violation } = await supabase
    .from('violations')
    .select('*, scans!inner(user_id)')
    .eq('id', params.id)
    .single()

  if (!violation || (violation.scans as any).user_id !== user.id) {
    return Response.json({ error: 'Violation not found' }, { status: 404 })
  }

  // If already generated, return cached result instead of burning a credit
  if (violation.ai_fix_html) {
    return Response.json({
      fixHtml: violation.ai_fix_html,
      explanation: violation.ai_fix_explanation,
      cached: true,
    })
  }

  // Call the AI API — supports DeepSeek or Claude
  const useClaude = !!process.env.ANTHROPIC_API_KEY
  const apiKey = useClaude ? process.env.ANTHROPIC_API_KEY! : process.env.DEEPSEEK_API_KEY!

  let aiResponse: Response

  if (useClaude) {
    aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are an accessibility expert fixing a WCAG violation.
Rule violated: ${violation.rule_id}
Description: ${violation.rule_description}
Broken HTML: ${violation.element_html}
Return ONLY valid JSON in this exact shape, nothing else:
{"fixedHtml": "the corrected HTML snippet", "explanation": "one sentence explaining what changed and why"}`
          }
        ]
      })
    })
  } else {
    aiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are an accessibility expert fixing a WCAG violation.
Rule violated: ${violation.rule_id}
Description: ${violation.rule_description}
Broken HTML: ${violation.element_html}
Return ONLY valid JSON in this exact shape, nothing else:
{"fixedHtml": "the corrected HTML snippet", "explanation": "one sentence explaining what changed and why"}`
          }
        ]
      })
    })
  }

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text()
    console.error('AI API error:', aiResponse.status, errorText)
    return Response.json({ error: 'AI service temporarily unavailable' }, { status: 502 })
  }

  const aiData = await aiResponse.json()
  let textContent = ''

  if (useClaude) {
    const textBlock = aiData.content?.find((c: any) => c.type === 'text')
    textContent = textBlock?.text || ''
  } else {
    // DeepSeek / OpenAI-compatible format
    textContent = aiData.choices?.[0]?.message?.content || ''
  }

  let fixHtml = ''
  let explanation = ''

  if (textContent) {
    try {
      const parsed = JSON.parse(textContent)
      fixHtml = parsed.fixedHtml || ''
      explanation = parsed.explanation || ''
    } catch {
      return Response.json({ error: 'AI response could not be parsed' }, { status: 500 })
    }
  }

  if (!fixHtml) {
    return Response.json({ error: 'AI returned empty fix' }, { status: 500 })
  }

  // Save the fix to the violation row (cached for future views)
  await supabase
    .from('violations')
    .update({
      ai_fix_html: fixHtml,
      ai_fix_explanation: explanation,
      ai_fix_generated_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  // Increment usage counter
  await supabase
    .from('ai_fix_usage')
    .upsert({
      user_id: user.id,
      month_year: monthYear,
      fixes_generated: currentCount + 1,
    }, { onConflict: 'user_id,month_year' })

  return Response.json({ fixHtml, explanation, cached: false })
}