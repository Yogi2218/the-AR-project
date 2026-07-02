import { NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/auth/google';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get('next') ?? '/dashboard';
  
  const authUrl = getGoogleAuthUrl(origin, next);
  return NextResponse.redirect(authUrl);
}
