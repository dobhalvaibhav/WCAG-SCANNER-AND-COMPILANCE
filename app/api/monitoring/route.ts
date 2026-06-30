import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PLANS } from '@/lib/stripe/plans';
import { z } from 'zod';

const createMonitorSchema = z.object({
  url: z.string().url(),
  frequency: z.enum(['weekly', 'monthly']).optional().default('weekly'),
});

const toggleMonitorSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean(),
});

const deleteMonitorSchema = z.object({
  id: z.string().uuid(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: sites, error } = await supabase
      .from('monitored_sites')
      .select(`
        *,
        last_scan:scans!monitored_sites_last_scan_id_fkey (
          compliance_score,
          total_violations,
          status
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch monitored sites:', error);
      return NextResponse.json({ error: 'Failed to fetch monitored sites' }, { status: 500 });
    }

    return NextResponse.json({ sites: sites || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check plan limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    const planLimits = PLANS[profile?.subscription_status || 'free']?.limits || PLANS.free.limits;

    // Free plan cannot monitor
    if (planLimits.monitoredSites === 0) {
      return NextResponse.json(
        { error: 'Site monitoring is available on Pro and Agency plans. Upgrade to continue.' },
        { status: 403 }
      );
    }

    const { count } = await supabase
      .from('monitored_sites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count || 0) >= planLimits.monitoredSites) {
      return NextResponse.json(
        { error: `You can only monitor ${planLimits.monitoredSites} sites on your plan. Upgrade to add more.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = createMonitorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { url, frequency } = parsed.data;

    const { data: site, error } = await supabase
      .from('monitored_sites')
      .insert({
        user_id: user.id,
        url,
        scan_frequency: frequency,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create monitored site:', error);
      return NextResponse.json({ error: 'Failed to create monitored site' }, { status: 500 });
    }

    return NextResponse.json({ site });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = toggleMonitorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id, is_active } = parsed.data;

    const { error } = await supabase
      .from('monitored_sites')
      .update({ is_active })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to toggle site:', error);
      return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = deleteMonitorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id } = parsed.data;

    const { error } = await supabase
      .from('monitored_sites')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete site:', error);
      return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}