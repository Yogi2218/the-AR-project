import { getSessionUser } from '@/lib/auth/google';
import { NextResponse } from 'next/server';
import type { ApiType } from './types';

/**
 * Validate a server-side request has an authenticated session.
 * Returns the user if authenticated, or a 401 response if not.
 */
export async function requireAuth(
  request: Request
): Promise<{ user: { id: string; email?: string } } | NextResponse> {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please sign in.' },
      { status: 401 }
    );
  }

  return { user: { id: user.id, email: user.email } };
}

/**
 * Log API usage for billing / cost tracking.
 * Uses the service role to bypass RLS on usage_logs.
 * Call this from any API route that consumes paid APIs.
 */
export async function logUsage(
  userId: string,
  apiType: ApiType,
  options: {
    tokensUsed?: number;
    charactersUsed?: number;
    modelGenerated?: boolean;
  } = {}
): Promise<void> {
  try {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from('usage_logs').insert({
      user_id: userId,
      api_type: apiType,
      tokens_used: options.tokensUsed ?? null,
      characters_used: options.charactersUsed ?? null,
      model_generated: options.modelGenerated ?? false,
    });
  } catch (err) {
    // Non-fatal — don't break the API call if logging fails
    console.warn('[logUsage] Failed to record usage:', err);
  }
}

/**
 * Check if an email domain is in the allowed whitelist.
 * Reads ALLOWED_EMAIL_DOMAINS from env (comma-separated).
 */
export function isEmailDomainAllowed(email: string): boolean {
  const allowedDomainsEnv = process.env.ALLOWED_EMAIL_DOMAINS;

  // If no whitelist is configured, allow everyone (open signup)
  if (!allowedDomainsEnv) return true;

  const allowedDomains = allowedDomainsEnv
    .split(',')
    .map((d) => d.trim().toLowerCase());

  const emailDomain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.includes(emailDomain ?? '');
}
