import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-jwt-key');

export interface SessionUser {
  id: string; // Google sub ID
  email: string;
  name: string;
  picture: string;
}

// Generate the Google OAuth authorization URL
export function getGoogleAuthUrl(origin: string, next: string = '/dashboard'): string {
  const redirectUri = `${origin}/api/auth/callback/google`;
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: redirectUri,
    client_id: CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    state: encodeURIComponent(next),
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

// Exchange code for Google ID token and access token
export async function exchangeCodeForTokens(code: string, origin: string): Promise<string> {
  const redirectUri = `${origin}/api/auth/callback/google`;
  const url = 'https://oauth2.googleapis.com/token';
  const values = {
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values).toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch google token: ${errText}`);
  }

  const data = await response.json();
  return data.id_token;
}

// Decode Google ID Token payload
export function parseIdToken(idToken: string): SessionUser {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid ID Token format');
  }
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
  
  if (payload.aud !== CLIENT_ID) {
    throw new Error('JWT audience mismatch');
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name || payload.given_name || 'Teacher',
    picture: payload.picture || '',
  };
}

// Deterministically convert Google sub string to a valid UUID format
export function googleSubToUUID(sub: string): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(sub).digest('hex');
  // Format as: 8-4-4-4-12 hex characters (e.g., e4777cd3-4e45-5654-be8c-bb76f0e4777c)
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-');
}

// Create profile in Supabase database using service role (bypassing RLS since this runs server-side during signup)
export async function syncUserProfile(user: SessionUser) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const userUuid = googleSubToUUID(user.id);

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, onboarding_complete')
    .eq('email', user.email)
    .maybeSingle();

  if (existingProfile) {
    if (existingProfile.id !== userUuid) {
      // Re-create profile with correct UUID
      await supabase
        .from('profiles')
        .delete()
        .eq('email', user.email);
    } else {
      return existingProfile;
    }
  }

  // Create new profile linked to the deterministic UUID
  const { data: newProfile, error } = await supabase
    .from('profiles')
    .insert({
      id: userUuid,
      email: user.email,
      full_name: user.name,
      avatar_url: user.picture,
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

// Sign custom session JWT
export async function createSessionCookie(user: SessionUser) {
  const userUuid = googleSubToUUID(user.id);
  const jwt = await new SignJWT({ ...user, id: userUuid })
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
}

// Get user from session cookie
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set('session', '', { maxAge: -1, path: '/' });
}
