import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/session',
  '/characters',
  '/templates',
  '/settings',
  '/onboarding',
  '/recordings',
];

// API routes that require authentication
const PROTECTED_API_ROUTES = [
  '/api/character-gen',
  '/api/character-download',
  '/api/character-save',
  '/api/chat',
  '/api/tts',
  '/api/suggest',
];

// Routes that are always public (no redirect even if authenticated)
const PUBLIC_ONLY_ROUTES = ['/login'];

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-jwt-key');

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('session')?.value;

  let userPayload: any = null;

  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, JWT_SECRET);
      userPayload = payload;
    } catch {
      // Token is invalid/expired
    }
  }

  // ── Redirect authenticated users away from /login ──
  if (userPayload && PUBLIC_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ── Protect API routes ──
  if (PROTECTED_API_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // ── Protect page routes ──
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected && !userPayload) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Redirect authenticated user to /onboarding if not completed ──
  if (userPayload && isProtected && pathname !== '/onboarding') {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', userPayload.id)
      .maybeSingle();

    if (profile && !profile.onboarding_complete) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|mp3|mp4)$).*)',
  ],
};

export default proxy;
