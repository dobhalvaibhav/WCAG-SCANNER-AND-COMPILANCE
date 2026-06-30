import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const db = createServiceClient();

  // Find sites due for scanning
  const now = new Date();
  const { data: sites } = await db
    .from('monitored_sites')
    .select('*, profiles(email, subscription_status)')
    .eq('is_active', true);

  if (!sites || sites.length === 0) {
    return Response.json({ success: true, processed: 0, message: 'No sites due' });
  }

  let processed = 0;

  for (const site of sites || []) {
    const lastScanned = site.last_scanned_at
      ? new Date(site.last_scanned_at)
      : new Date(0);

    const hoursSince = (now.getTime() - lastScanned.getTime()) / (1000 * 60 * 60);

    const isDue = site.scan_frequency === 'weekly'
      ? hoursSince >= 168   // 7 days
      : hoursSince >= 720;  // 30 days

    if (!isDue) continue;

    try {
      // Run scan
      const { runScan } = await import('@/lib/scanner/engine');
      const result = await runScan(site.url);

      // Save scan to DB
      const { data: scan } = await db
        .from('scans')
        .insert({
          user_id: site.user_id,
          url: site.url,
          status: 'completed',
          compliance_score: result.score,
          total_violations: result.totalViolations,
          critical_count: result.critical,
          serious_count: result.serious,
          moderate_count: result.moderate,
          minor_count: result.minor,
          big_six: result.bigSix as any,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!scan) {
        console.error(`Failed to create scan for ${site.url}`);
        continue;
      }

      // Create report
      const { data: report } = await db
        .from('reports')
        .insert({
          scan_id: scan.id,
          user_id: site.user_id,
          name: `Scheduled scan of ${site.url} - ${new Date().toLocaleDateString()}`,
        })
        .select()
        .single();

      // Update monitored site with last scan info
      await db
        .from('monitored_sites')
        .update({
          last_scan_id: scan.id,
          last_scanned_at: new Date().toISOString(),
        })
        .eq('id', site.id);

      // Send email via Resend
      const profile = site.profiles as any;
      if (profile?.email && report) {
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY!);

          const scoreColor = result.score >= 75 ? '#22D3A0'
            : result.score >= 50 ? '#F59E0B'
            : '#EF4444';

          await resend.emails.send({
            from: 'WCAG Scanner <reports@yourdomain.com>',
            to: profile.email,
            subject: `Weekly Report: ${site.url} scored ${result.score}/100`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; color: #F0F0FF; padding: 40px; border-radius: 12px;">
                <h1 style="color: #6C47FF; margin-bottom: 4px;">Scheduled Scan Report</h1>
                <p style="color: #8B8BA7;">${site.url}</p>

                <div style="background: #111118; border: 1px solid #2A2A3A; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                  <div style="font-size: 56px; font-weight: 800; color: ${scoreColor};">
                    ${result.score}/100
                  </div>
                  <div style="color: #8B8BA7; margin-top: 8px;">Compliance Score</div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 12px; border: 1px solid #2A2A3A; color: #FF3B3B;">Critical: ${result.critical}</td>
                    <td style="padding: 12px; border: 1px solid #2A2A3A; color: #FF7A00;">Serious: ${result.serious}</td>
                    <td style="padding: 12px; border: 1px solid #2A2A3A; color: #FFB800;">Moderate: ${result.moderate}</td>
                    <td style="padding: 12px; border: 1px solid #2A2A3A; color: #64B5F6;">Minor: ${result.minor}</td>
                  </tr>
                </table>

                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://wcag-scanner-tau.vercel.app'}/reports/${report.id}"
                  style="display: inline-block; background: #6C47FF; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  View Full Report →
                </a>

                <p style="color: #8B8BA7; font-size: 11px; margin-top: 32px; border-top: 1px solid #2A2A3A; padding-top: 16px;">
                  Automated scan using axe-core. Results are not legal advice.
                  Detects ~57% of WCAG issues automatically.
                </p>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error(`Failed to send email for ${site.url}:`, emailErr);
        }
      }

      console.log(`Scanned ${site.url}: score ${result.score}`);
      processed++;
    } catch (err) {
      console.error(`Failed to scan ${site.url}:`, err);
    }
  }

  return Response.json({
    success: true,
    processed,
    total: sites?.length ?? 0,
  });
}