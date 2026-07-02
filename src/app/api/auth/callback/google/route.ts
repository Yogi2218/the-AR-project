import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, parseIdToken, syncUserProfile, createSessionCookie } from '@/lib/auth/google';
import { isEmailDomainAllowed } from '@/lib/supabase/auth-helpers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  const next = state ? decodeURIComponent(state) : '/dashboard';

  if (!code) {
    console.error('[google-callback] No code returned from Google');
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    // 1. Exchange code for Google ID token
    const idToken = await exchangeCodeForTokens(code, origin);

    // 2. Parse ID token payload
    const googleUser = parseIdToken(idToken);

    // 3. Check allowed email domain
    if (!isEmailDomainAllowed(googleUser.email)) {
      console.warn(`[google-callback] Domain not allowed for email: ${googleUser.email}`);
      return NextResponse.redirect(`${origin}/login?error=domain_not_allowed`);
    }

    // 4. Sync profile in Supabase using service role key
    const profile = await syncUserProfile(googleUser);

    // 5. Create secure JWT session cookie
    await createSessionCookie(googleUser);

    // 6. Route to onboarding or target destination
    if (!profile || !profile.onboarding_complete) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }

    const safeNext = next.startsWith('/') ? next : '/dashboard';
    return NextResponse.redirect(`${origin}${safeNext}`);

  } catch (error: any) {
    console.error('[google-callback] Authentication failed:', error.message || error);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }
}
