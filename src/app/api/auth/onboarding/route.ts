import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/google';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { full_name, school_name, school_id, class_level, subjects } = body;

    if (!full_name || !school_name || !class_level || !subjects || subjects.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: full_name.trim(),
        school_name: school_name.trim(),
        school_id: school_id ? school_id.trim() : null,
        class_level,
        subjects,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('[onboarding-api] Supabase update error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[onboarding-api] Internal error:', err.message || err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
