import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-jwt-key');

async function syncEmailUserProfile(supabaseUser: { id: string; email: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if profile exists by email
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, onboarding_complete')
    .eq('email', supabaseUser.email)
    .maybeSingle();

  if (existingProfile) {
    if (existingProfile.id === supabaseUser.id) {
      return existingProfile;
    }

    // Attempt to migrate the profile id to the new Supabase Auth id
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ id: supabaseUser.id })
        .eq('email', supabaseUser.email);

      if (!updateErr) {
        const { data: updated } = await supabase
          .from('profiles')
          .select('id, onboarding_complete')
          .eq('id', supabaseUser.id)
          .single();
        return updated;
      }
    } catch (e) {
      console.warn('Profile ID migration failed, trying fallback:', e);
    }
  }

  // Create new profile linked to the Supabase Auth UUID
  const { data: newProfile, error } = await supabase
    .from('profiles')
    .insert({
      id: supabaseUser.id,
      email: supabaseUser.email,
      full_name: supabaseUser.email.split('@')[0],
      avatar_url: '',
      role: 'teacher',
      onboarding_complete: false,
    })
    .select('id, onboarding_complete')
    .single();

  if (error) {
    console.error('Failed to sync profile in Supabase:', error.message);
    throw error;
  }

  return newProfile;
}

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    // Verify OTP
    const { data: authData, error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    if (verifyErr || !authData.user) {
      return NextResponse.json({ error: verifyErr?.message || 'Invalid or expired verification code.' }, { status: 400 });
    }

    const user = authData.user;

    // Sync profile
    const profile = await syncEmailUserProfile({
      id: user.id,
      email: user.email!,
    });

    // Create session cookie
    const sessionUser = {
      id: user.id,
      email: user.email!,
      name: user.email!.split('@')[0],
      picture: '',
    };

    const jwt = await new SignJWT(sessionUser)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      onboardingComplete: profile?.onboarding_complete ?? false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
