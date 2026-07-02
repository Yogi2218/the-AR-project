import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────
// /api/suggest — Question Suggestion Engine
// Generates likely student questions for a character before
// the session begins. Uses Gemini if available, otherwise
// falls back to character script questions.
// ─────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';

interface SuggestRequest {
  characterId: string;
  characterName: string;
  subject: string;
  coreTopics: string[];
  ageGroup: string;
  learningLevel: string;
  lessonGoal?: string;
  fallbackQuestions: string[]; // From existing scripts
}

export async function POST(request: Request) {
  try {
    const req: SuggestRequest = await request.json();

    // If no API key, return fallback questions immediately
    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        questions: req.fallbackQuestions.slice(0, 10),
        source: 'fallback',
      });
    }

    const ageInstruction =
      req.ageGroup === '5-7' ? 'for 5-7 year old children (very simple language)' :
      req.ageGroup === '8-10' ? 'for 8-10 year old students' :
      req.ageGroup === '11-14' ? 'for 11-14 year old teenagers' :
      'for 15+ year old advanced students';

    const levelInstruction =
      req.learningLevel === 'beginner' ? 'at a beginner level' :
      req.learningLevel === 'intermediate' ? 'at an intermediate level' :
      'at an advanced level';

    let prompt = `Generate exactly 10 interesting questions that a student might ask ${req.characterName} about ${req.subject}.

The questions should be ${ageInstruction} ${levelInstruction}.
Topics to cover: ${req.coreTopics.join(', ')}.`;

    if (req.lessonGoal) {
      prompt += `\nFocus especially on: "${req.lessonGoal}"`;
    }

    prompt += `\n\nRules:
- Return ONLY the questions, one per line
- No numbering, no bullets, no extra text
- Questions should be natural and curious
- Mix easy and thought-provoking questions`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 400,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      console.warn('Suggest API: Gemini failed, using fallback questions');
      return NextResponse.json({
        questions: req.fallbackQuestions.slice(0, 10),
        source: 'fallback',
      });
    }

    const data = await geminiRes.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse: split by newlines, clean up
    const questions = rawText
      .split('\n')
      .map((line: string) => line.replace(/^\d+[.)]\s*/, '').replace(/^[-•]\s*/, '').trim())
      .filter((line: string) => line.length > 5 && line.endsWith('?'));

    if (questions.length < 3) {
      // Gemini gave poor output, use fallback
      return NextResponse.json({
        questions: req.fallbackQuestions.slice(0, 10),
        source: 'fallback',
      });
    }

    return NextResponse.json({
      questions: questions.slice(0, 10),
      source: 'gemini',
    });

  } catch (error) {
    console.error('Suggest API Route Error:', error);
    return NextResponse.json(
      { questions: [], source: 'error' },
      { status: 500 }
    );
  }
}
