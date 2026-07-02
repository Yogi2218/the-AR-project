import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/google';
import { createClient } from '@supabase/supabase-js';

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

// ─────────────────────────────────────────────────────────────
// GET /api/admin/templates — List all pending script templates
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const supabase = await checkAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: templates, error } = await supabase
      .from('teacher_templates')
      .select('*');

    if (error) throw error;

    // Filter templates where status is pending_approval
    const pending = (templates || []).filter(t => t.script?.status === 'pending_approval');

    return NextResponse.json({ templates: pending });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/admin/templates — Approve a script template
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const supabase = await checkAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing template ID' }, { status: 400 });
    }
    
    // Get existing template
    const { data: tpl, error: fetchErr } = await supabase
      .from('teacher_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr) throw fetchErr;

    const updatedScript = {
      ...tpl.script,
      status: 'approved',
      editCount: 0
    };

    const { error: updateErr } = await supabase
      .from('teacher_templates')
      .update({
        script: updatedScript,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
