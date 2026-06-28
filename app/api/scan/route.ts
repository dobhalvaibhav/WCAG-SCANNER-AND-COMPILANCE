import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isValidUrl } from '@/lib/utils';
import { PLANS } from '@/lib/stripe/plans';
import { z } from 'zod';

const scanRequestSchema = z.object({
  url: z.string().min(1, 'URL is required').refine(isValidUrl, 'Invalid URL format'),
  max_pages: z.number().int().min(1).max(200).optional().default(1),
  wcag_level: z.enum(['A', 'AA', 'AAA']).optional().default('AA'),
});

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

export async function POST(request: NextRequest) {
  try {
    // ── Auth client (respects RLS) ── used ONLY for reading user session
    const authClient = await createClient();

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    rateLimitMap.set(ip, now);

    // Parse and validate
    const body = await request.json();
    const parsed = scanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { url, max_pages, wcag_level } = parsed.data;

    // Get user session
    const { data: { user } } = await authClient.auth.getUser();
    let userId: string | null = user?.id || null;
    let planLimits = PLANS.free.limits;
    let currentCount = 0;

    // ── Service client (bypasses RLS) ── used for ALL DB writes
    const db = createServiceClient();

    if (user) {
      // Check user limits
      const { data: profileData } = await db
        .from('profiles')
        .select('subscription_status, scans_used_this_month')
        .eq('id', user.id)
        .single();

      if (profileData) {
        planLimits = PLANS[profileData.subscription_status as keyof typeof PLANS]?.limits || PLANS.free.limits;
        currentCount = profileData.scans_used_this_month || 0;

        if (currentCount >= planLimits.scansPerMonth) {
          return NextResponse.json(
            {
              error: 'Scan limit reached',
              code: 'SCAN_LIMIT_REACHED',
              message: `You have used all ${planLimits.scansPerMonth} scans for this month. Upgrade to continue scanning.`,
            },
            { status: 429 }
          );
        }
      }
    }

    // Cap pages to plan limit server-side
    const cappedPages = Math.min(max_pages, planLimits.pagesPerScan);

    // Insert scan record (service role bypasses RLS)
    const scanId = crypto.randomUUID();
    const { error: insertError } = await db.from('scans').insert({
      id: scanId,
      user_id: userId,
      url,
      status: 'pending',
      pages_requested: cappedPages,
      wcag_level,
      started_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Failed to insert scan:', insertError);
      return NextResponse.json({ error: 'Failed to create scan record' }, { status: 500 });
    }

    // Increment scan count for authenticated users
    if (userId) {
      await db
        .from('profiles')
        .update({ scans_used_this_month: currentCount + 1 })
        .eq('id', userId);
    }

    // Trigger the scan asynchronously (fire and forget)
    triggerScan(scanId, url, cappedPages, wcag_level).catch(console.error);

    return NextResponse.json({
      scan_id: scanId,
      status: 'pending',
      message: 'Scan started successfully',
    });
  } catch (error: any) {
    console.error('Scan API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function triggerScan(
  scanId: string,
  url: string,
  maxPages: number,
  wcagLevel: 'A' | 'AA' | 'AAA'
) {
  // Service client — background writes bypass RLS
  const db = createServiceClient();

  try {
    // Mark as running
    await db.from('scans').update({ status: 'running' }).eq('id', scanId);

    // Read axe-core source HERE (real Node.js context, not webpack-compiled)
    // and pass it to the scan engine to avoid path-resolution issues.
    const fs = await import('fs');
    const path = await import('path');
    const axeCoreSource = fs.readFileSync(
      path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.js'),
      'utf8',
    );

    // Dynamic import to avoid bundling puppeteer in edge
    const { runScan } = await import('@/lib/scanner/engine');
    const result = await runScan({ url, maxPages, wcagLevel, axeCoreSource });

    // Update scan record
    const { error: updateError } = await db
      .from('scans')
      .update({
        status: result.scan.status,
        pages_scanned: result.scan.pages_scanned,
        compliance_score: result.scan.compliance_score,
        total_violations: result.scan.total_violations,
        critical_count: result.scan.critical_count,
        serious_count: result.scan.serious_count,
        moderate_count: result.scan.moderate_count,
        minor_count: result.scan.minor_count,
        big_six: result.scan.big_six as any,
        error_message: result.scan.error_message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId);

    if (updateError) {
      console.error('Failed to update scan:', updateError);
    }

    // Insert violations
    if (result.violations.length > 0) {
      const violationsToInsert = result.violations.map((v) => ({
        scan_id: scanId,
        rule_id: v.rule_id,
        rule_description: v.rule_description,
        impact: v.impact,
        wcag_criterion: v.wcag_criterion,
        wcag_level: v.wcag_level,
        page_url: v.page_url,
        element_html: v.element_html?.slice(0, 1000),
        element_selector: v.element_selector?.slice(0, 500),
        fix_summary: v.fix_summary?.slice(0, 500),
        fix_detail: v.fix_detail?.slice(0, 2000),
        help_url: v.help_url,
      }));

      const { error: violationsError } = await db
        .from('violations')
        .insert(violationsToInsert);

      if (violationsError) {
        console.error('Failed to insert violations:', violationsError);
      }
    }
  } catch (error) {
    console.error('Scan failed:', error);
    await db
      .from('scans')
      .update({
        status: 'failed',
        error_message: (error as any)?.message || 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId);
  }
}
