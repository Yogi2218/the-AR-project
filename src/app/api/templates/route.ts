import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/google';
import { createClient } from '@supabase/supabase-js';

async function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await getSupabaseClient();
    const { data: templates, error } = await supabase
      .from('teacher_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ templates });
  } catch (err: any) {
    console.error('[templates-get] Error:', err.message || err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, character_id, title, script, is_shared } = body;

    if (!character_id || !title || !script) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    if (id) {
      // Update existing template
      const { error } = await supabase
        .from('teacher_templates')
        .update({
          character_id,
          title,
          script,
          is_shared: !!is_shared,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } else {
      // Create new template
      const { error } = await supabase
        .from('teacher_templates')
        .insert({
          user_id: user.id,
          character_id,
          title,
          script,
          is_shared: !!is_shared,
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[templates-post] Error:', err.message || err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing template ID' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from('teacher_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[templates-delete] Error:', err.message || err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
