import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/google';

export async function GET(request: Request) {
  await clearSessionCookie();
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/`, { status: 302 });
}

export async function POST(request: Request) {
  await clearSessionCookie();
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/`, { status: 302 });
}
