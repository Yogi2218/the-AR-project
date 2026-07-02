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

    // Fetch existing template if editing
    let existingTemplate: any = null;
    if (id) {
      const { data } = await supabase
        .from('teacher_templates')
        .select('*')
        .eq('id', id)
        .single();
      existingTemplate = data;
    }

    let editCount = existingTemplate?.script?.editCount || 0;
    if (id) {
      editCount += 1;
    }

    let status = 'approved';
    if (editCount >= 2) {
      status = 'pending_approval';
    }

    const cleanQuestions = [];
    const questions = script?.questions || [];

    for (let i = 0; i < questions.length; i++) {
      const qa = questions[i];
      const oldQa = existingTemplate?.script?.questions?.find((q: any) => q.q === qa.q);

      // If answer is unchanged and has audio, reuse it
      if (oldQa && oldQa.a === qa.a && oldQa.audio) {
        cleanQuestions.push(oldQa);
      } else {
        // Answer changed or new - pre-record TTS audio
        try {
          const ttsUrl = new URL('/api/tts', request.url);
          const ttsRes = await fetch(ttsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: qa.a,
              characterId: character_id,
            })
          });
          if (ttsRes.ok) {
            const ttsData = await ttsRes.json();
            cleanQuestions.push({
              q: qa.q,
              a: qa.a,
              audio: ttsData.audio,
              alignment: ttsData.alignment
            });
          } else {
            cleanQuestions.push({ q: qa.q, a: qa.a });
          }
        } catch (e) {
          console.error('Failed to pre-generate audio for QA:', e);
          cleanQuestions.push({ q: qa.q, a: qa.a });
        }
      }
    }

    const finalScript = {
      systemPrompt: script.systemPrompt || 'You are an educational AI character.',
      questions: cleanQuestions,
      editCount,
      status
    };

    if (id) {
      // Update existing template
      const { error } = await supabase
        .from('teacher_templates')
        .update({
          character_id,
          title,
          script: finalScript,
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
          script: finalScript,
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
