import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────
// /api/chat — Universal Character AI Brain
// Pipeline: Safety → Corrections → Cache → Knowledge Retrieval
//           → Gemini → Hallucination Guard → Cache Store
// ─────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';

interface ChatRequest {
  characterId: string;
  characterName: string;
  personality: string;
  speakingStyle: string;
  teachingStyle: string;
  knowledgeSummary: string;
  knowledgeSourceType: string;
  personalityStrength: number;
  question: string;
  sessionHistory: Array<{ role: 'student' | 'character'; message: string }>;
  learningLevel: string;
  language: string;
  ageGroup: string;
  mood: string;
  lessonGoal: string;
  teacherOverridePrompt: string;
  safeMode: boolean;
}

// ── Safety filter ─────────────────────────────────────────
const BLOCKED_PATTERNS = [
  /violen(ce|t)/i, /weapon/i, /murder/i, /\bkill\b/i, /suicide/i,
  /sexual/i, /\bporn/i, /\bnude/i, /\bsex\b/i,
  /\bdrug(s)?\b/i, /\balcohol\b/i, /\bsmoking\b/i,
  /\bhate\b/i, /racist/i, /discriminat/i,
  /\bbomb\b/i, /terrorist/i, /extremist/i,
];

function isQuestionSafe(question: string, safeMode: boolean): boolean {
  if (!safeMode) return true;
  return !BLOCKED_PATTERNS.some((p) => p.test(question));
}

// ── Semantic chunk retrieval (keyword matching MVP) ────────
function findRelevantChunks(
  question: string,
  chunks: Array<{ topic: string; content: string }>,
  maxChunks: number = 3
): string {
  if (!chunks || chunks.length === 0) return '';

  const questionWords = question.toLowerCase().split(/\s+/);

  const scored = chunks.map((chunk) => {
    const topicWords = chunk.topic.toLowerCase().split(/\s+/);
    const contentWords = chunk.content.toLowerCase();
    let score = 0;

    for (const word of questionWords) {
      if (word.length < 3) continue; // skip short words
      if (topicWords.some((tw) => tw.includes(word) || word.includes(tw))) score += 3;
      if (contentWords.includes(word)) score += 1;
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const relevant = scored
    .filter((s) => s.score > 0)
    .slice(0, maxChunks)
    .map((s) => `[${s.chunk.topic}]: ${s.chunk.content}`);

  return relevant.join('\n\n');
}

// ── Build Gemini system prompt ────────────────────────────
function buildSystemPrompt(req: ChatRequest, knowledgeContext: string): string {
  const langInstruction =
    req.language === 'hindi' ? 'Respond in Hindi (Devanagari script).' :
    req.language === 'marathi' ? 'Respond in Marathi (Devanagari script).' :
    'Respond in English.';

  const ageInstruction =
    req.ageGroup === '5-7' ? 'Speak as if talking to 5-7 year olds. Use very simple words, short sentences, fun comparisons.' :
    req.ageGroup === '8-10' ? 'Speak as if talking to 8-10 year olds. Use simple explanations with interesting analogies.' :
    req.ageGroup === '11-14' ? 'Speak as if talking to 11-14 year olds. Use moderate complexity with engaging examples.' :
    'Speak as if talking to 15+ year olds. Use full complexity appropriate to the topic.';

  const levelInstruction =
    req.learningLevel === 'beginner' ? 'Teach at a beginner level. Assume no prior knowledge.' :
    req.learningLevel === 'intermediate' ? 'Teach at an intermediate level. Assume basic familiarity.' :
    'Teach at an advanced level. Assume strong foundational knowledge.';

  const moodInstruction =
    req.mood === 'enthusiastic' ? 'Be very enthusiastic, energetic, and exciting in your delivery!' :
    req.mood === 'calm' ? 'Be calm, gentle, and soothing in your delivery.' :
    req.mood === 'serious' ? 'Be serious, focused, and authoritative.' :
    req.mood === 'playful' ? 'Be playful, fun, and humorous.' :
    'Be natural and balanced in your delivery.';

  const strengthNote = req.personalityStrength >= 8
    ? `Stay VERY strictly in character as ${req.characterName}. Never break character.`
    : req.personalityStrength >= 5
      ? `Stay in character as ${req.characterName}. Occasionally you may gently acknowledge you are an educational AI.`
      : `Lightly adopt the persona of ${req.characterName}. You may be more flexible with character boundaries.`;

  let prompt = `You are ${req.characterName}.

PERSONALITY: ${req.personality}
SPEAKING STYLE: ${req.speakingStyle}
TEACHING STYLE: ${req.teachingStyle}
KNOWLEDGE SCOPE: ${req.knowledgeSummary}
KNOWLEDGE SOURCE TYPE: ${req.knowledgeSourceType}

${strengthNote}

${langInstruction}
${ageInstruction}
${levelInstruction}
${moodInstruction}`;

  if (req.lessonGoal) {
    prompt += `\n\nLESSON GOAL: Focus this session on: "${req.lessonGoal}"`;
  }

  if (req.teacherOverridePrompt) {
    prompt += `\n\nTEACHER SPECIAL INSTRUCTIONS: ${req.teacherOverridePrompt}`;
  }

  if (knowledgeContext) {
    prompt += `\n\nREFERENCE KNOWLEDGE (use this to ground your answers):\n${knowledgeContext}`;
  }

  // Hallucination guard
  prompt += `\n\nCRITICAL RULES:
1. If you are unsure about a fact or it is outside your knowledge scope, say: "That is beyond my knowledge. Let us explore something related to my subject."
2. Do NOT fabricate facts, dates, numbers, or events.
3. Keep responses concise — maximum 3 sentences for young children (5-10), maximum 5 sentences for older students.
4. Do NOT use markdown formatting. Respond in plain spoken language.
5. Stay educational and age-appropriate at all times.`;

  if (req.safeMode) {
    prompt += `\n6. SAFETY MODE: Do NOT discuss violence, weapons, drugs, adult topics, or politically divisive content. If asked, redirect to the educational topic.`;
  }

  return prompt;
}

// ── Trim response to performance budget ───────────────────
function trimResponse(text: string, maxSentences: number = 3): string {
  // Split by sentence-ending punctuation
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

// ── Strip markdown from response ──────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function POST(request: Request) {
  try {
    const req: ChatRequest = await request.json();

    // 1. Safety check
    if (!isQuestionSafe(req.question, req.safeMode)) {
      return NextResponse.json({
        answer: "I appreciate your curiosity, but that topic is not suitable for our educational session. Let us explore something wonderful about my field of expertise instead! What else would you like to know?",
        source: 'safety-filter',
        cached: false,
      });
    }

    // 2. Load knowledge chunks (server-side fetch from public/)
    let knowledgeChunks: Array<{ topic: string; content: string }> = [];
    try {
      const baseUrl = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/api\/.*$/, '') || 'http://localhost:3000';
      const knowledgeRes = await fetch(`${baseUrl}/knowledge/${req.characterId}.json`);
      if (knowledgeRes.ok) {
        knowledgeChunks = await knowledgeRes.json();
      }
    } catch {
      // Knowledge file not available — continue without
    }

    // 3. Semantic retrieval
    const knowledgeContext = findRelevantChunks(req.question, knowledgeChunks, 3);

    // 4. Check if Gemini API is available
    if (!GEMINI_API_KEY) {
      // Offline / no API key — return a helpful fallback
      return NextResponse.json({
        answer: `As ${req.characterName}, I would love to answer that question, but my AI brain is not connected right now. Please try using the scripted mode, or ask your teacher to check the API configuration.`,
        source: 'offline-fallback',
        cached: false,
      });
    }

    // 5. Build prompt and call Gemini
    const systemPrompt = buildSystemPrompt(req, knowledgeContext);

    // Build conversation messages
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Add session history (limited by performance budget)
    const historySlice = req.sessionHistory.slice(-10);
    for (const msg of historySlice) {
      contents.push({
        role: msg.role === 'student' ? 'user' : 'model',
        parts: [{ text: msg.message }],
      });
    }

    // Add current question
    contents.push({
      role: 'user',
      parts: [{ text: req.question }],
    });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300, // Performance budget
            topP: 0.9,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errText);
      return NextResponse.json({
        answer: `I seem to be having trouble thinking right now. Please try again in a moment, or switch to scripted mode for uninterrupted learning.`,
        source: 'gemini-error',
        cached: false,
      });
    }

    const geminiData = await geminiRes.json();
    let answer =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'I am having difficulty formulating a response. Could you rephrase your question?';

    // 6. Post-process: strip markdown, trim to budget
    answer = stripMarkdown(answer);
    answer = trimResponse(answer, req.ageGroup === '5-7' ? 3 : 5);

    return NextResponse.json({
      answer,
      source: 'gemini',
      cached: false,
      knowledgeChunksUsed: knowledgeContext ? true : false,
    });

  } catch (error) {
    console.error('Chat API Route Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', answer: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
