import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type') || 'oauth';
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Code exchange failed:', error.message);
      // If this is a password reset with expired code, redirect to forgot-password
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/forgot-password?error=expired', request.url));
      }
    }
  }

  // For password resets (type=recovery), go to reset-password page
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
