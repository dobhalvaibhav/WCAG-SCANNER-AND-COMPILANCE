import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/dashboard', '/agency', '/billing', '/settings', '/monitoring', '/reports', '/scanner'];
const API_PROTECTED_BASE = '/api/';
const PUBLIC_API_PATHS = ['/api/stripe/webhook', '/api/scan']; // free scan is public

// These paths must always load without a session cookie
const PUBLIC_PATHS = [
  '/reset-password',
  '/forgot-password',
  '/auth/callback',
  '/auth',
  '/login',
  '/signup',
  '/',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip all auth checks for public paths
  if (PUBLIC_PATHS.some(path => pathname === path)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  const { supabaseResponse, user } = await updateSession(request);

  // Check if the path is a protected dashboard route
  const isProtectedRoute = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  // Check if it's a protected API route
  const isApiRoute = pathname.startsWith(API_PROTECTED_BASE);
  const isPublicApiRoute = PUBLIC_API_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
  const isProtectedApiRoute = isApiRoute && !isPublicApiRoute;

  // Redirect unauthenticated users to login
  if (!user && (isProtectedRoute || isProtectedApiRoute)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};