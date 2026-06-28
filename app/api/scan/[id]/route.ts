import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth client only for reading the session cookie
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    // Use service client for DB reads so we don't hit RLS
    // (we manually verify ownership below)
    const db = createServiceClient();

    const { data: scan, error } = await db
      .from('scans')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Manual access check — user must own the scan (anonymous scans have no user_id)
    if (user && scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    // Allow anonymous users to read scans that have no owner
    if (!user && scan.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch violations via service client
    const { data: violations } = await db
      .from('violations')
      .select('*')
      .eq('scan_id', params.id)
      .order('impact', { ascending: false });

    return NextResponse.json({
      ...scan,
      violations: violations || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
