import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isEmailDomainAllowed } from '@/lib/supabase/auth-helpers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    console.error('[auth/callback] No code in query params');
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createClient();

  // Exchange the OAuth code for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error('[auth/callback] Code exchange failed:', error?.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const user = data.user;
  const email = user.email ?? '';

  // ── Domain whitelist check ──
  if (!isEmailDomainAllowed(email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/login?error=domain_not_allowed&email=${encodeURIComponent(email)}`
    );
  }

  // ── Check if this is a new user (onboarding_complete will be false) ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', user.id)
    .returns<{ onboarding_complete: boolean }[]>()
    .maybeSingle();

  // New user or onboarding not done → send to /onboarding
  if (!profile || !profile.onboarding_complete) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  // Returning user → send to intended destination or dashboard
  const safeNext = next.startsWith('/') ? next : '/dashboard';
  return NextResponse.redirect(`${origin}${safeNext}`);
}
