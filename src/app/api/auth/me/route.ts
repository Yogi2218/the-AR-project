import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/google';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ profile: null });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({ profile });
}
