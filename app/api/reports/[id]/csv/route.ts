import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the report by its ID (params.id is a report ID, not a scan ID)
    const { data: report, error } = await supabase
      .from('reports')
      .select('*, scans(*)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !report) {
      console.log('CSV report lookup failed:', error, params.id, user.id);
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Fetch violations using the scan_id from the report
    const { data: violations } = await supabase
      .from('violations')
      .select('*')
      .eq('scan_id', report.scan_id);

    const headers = [
      'Rule ID',
      'Impact',
      'Description',
      'WCAG Criterion',
      'Element HTML',
      'Fix Summary',
      'Help URL',
    ];

    const rows = (violations || []).map((v: any) =>
      [
        v.rule_id || v.id || '',
        v.impact || '',
        (v.rule_description || v.description || '').replace(/"/g, '""'),
        v.wcag_criterion || '',
        (v.element_html || '').replace(/"/g, '""'),
        (v.fix_summary || v.help || '').replace(/"/g, '""'),
        v.help_url || v.helpUrl || '',
      ]
        .map((cell: string) => `"${cell}"`)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="wcag-report-${params.id}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('CSV export error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}