import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/google';
import { createClient } from '@supabase/supabase-js';

// Verify that the request is made by a super_admin
async function checkAdmin() {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'super_admin') {
    return null;
  }

  return supabase;
}

export async function GET() {
  const supabase = await checkAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 403 });
  }

  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ users });
  } catch (err: any) {
    console.error('[admin-users-get] Error fetching users:', err.message || err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await checkAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, role, status, visible_characters } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        role,
        status,
        visible_characters,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[admin-users-post] Error updating user:', err.message || err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
