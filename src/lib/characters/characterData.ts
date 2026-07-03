// ─────────────────────────────────────────────────────────────
// EduAR Character Data Library
// 10 pre-built educational characters with full Q&A scripts,
// voice profiles, and personality configuration.
// ─────────────────────────────────────────────────────────────

export type CharacterCategory =
  | 'scientist' | 'leader' | 'historical' | 'animal'
  | 'bird' | 'extinct' | 'fictional' | 'mythological' | 'custom';

export type KnowledgeSourceType =
  | 'historical' | 'scientific' | 'wildlife' | 'mythology' | 'custom';

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ScriptLine {
  id: string;
  question: string;          // What triggers this answer
  keywords: string[];        // Keyword matching for mic input
  answer: string;            // Character's spoken response
  gesture?: string;          // 'wave' | 'point' | 'nod' | 'bow' | 'roar'
  emotion?: string;          // 'happy' | 'thoughtful' | 'excited' | 'sad'
  followUp?: string;         // Optional follow-up question for audience
}

export interface VoiceProfile {
  pitch: number;             // 0.5 – 2.0  (SpeechSynthesis)
  rate: number;              // 0.5 – 2.0
  volume: number;            // 0.0 – 1.0
  voiceName?: string;        // Preferred voice name hint
  accent?: string;           // 'en-US' | 'en-GB' | 'en-IN' | 'en-AU'
}

export interface Character {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  category: CharacterCategory;
  era?: string;
  description: string;
  personality: string;
  subject: string;
  targetAge: string;
  voiceProfile: VoiceProfile;
  modelFile?: string;        // /models/<name>.glb  (add when available)
  thumbnailColor: string;    // Tailwind gradient class
  catClass: string;          // CSS category class
  scripts: ScriptLine[];
  introMonologue: string;    // First words when character appears
  exitMonologue: string;     // Goodbye when session ends

  // ── Universal AI Engine fields ──────────────────────────
  knowledgeSourceType: KnowledgeSourceType;
  speakingStyle: string;        // e.g. "Formal and poetic" | "Playful analogies"
  teachingStyle: string;        // e.g. "Socratic questioning" | "Storytelling"
  coreTopics: string[];         // Key subjects for semantic retrieval
  knowledgeSummary: string;     // One-paragraph knowledge scope
  baseColor: string;            // Hex color for procedural mesh body
  accentColor: string;          // Hex color for procedural mesh head/accent
  personalityStrength: number;  // 1–10, how strictly in-character to stay
  isCustom?: boolean;           // true for teacher-created characters
  customImageUrl?: string;      // Upload URL for custom character image
  isAIgenerated?: boolean;      // true if generated via AI builder
  generationMeta?: {
    uuid: string;
    prompt?: string;
    imageUploaded?: boolean;
    generatedAt: string;
    source: string;
  };
  
  // ── Extended AI Fields ──────────────────────────────────
  defaultLanguage?: 'english' | 'hindi' | 'marathi';
  voiceMood?: 'neutral' | 'enthusiastic' | 'calm' | 'serious' | 'playful';
  interactionType?: 'ai' | 'scripted' | 'hybrid';
  safeMode?: boolean;
  thumbnail?: string;
}

// ─────────────────────────────────────────────────────────────
// CHARACTER DEFINITIONS
// ─────────────────────────────────────────────────────────────

export const CHARACTERS: Character[] = [
  // ── 1. Bengal Tiger ──────────────────────────────────────
  {
    id: 'tiger',
    name: 'Bengal Tiger',
    shortName: 'Tiger',
    emoji: '🐅',
    category: 'animal',
    era: 'Present Day',
    description: 'A magnificent big cat native to the Indian subcontinent, known for its iconic orange coat with dark stripes and powerful presence.',
    personality: 'Fierce, stealthy, and commanding. Speaks with a low, rumbling authority of the jungle.',
    subject: 'Wildlife, Ecosystems & Conservation',
    targetAge: '5–14',
    catClass: 'cat-animal',
    thumbnailColor: 'from-orange-500 to-red-600',
    voiceProfile: { pitch: 0.6, rate: 0.8, volume: 1.0, accent: 'en-IN' },
    introMonologue: "Welcome to my jungle. I am the Bengal Tiger. I move through the tall grass unseen, but right now, I have stepped into the light to answer your questions. Speak quickly.",
    exitMonologue: "The forest calls to me. I must return to the shadows. Protect the forests, and you protect me. Farewell.",
    knowledgeSourceType: 'wildlife',
    speakingStyle: 'Commanding and stealthy with a low rumble',
    teachingStyle: 'Explains the wild through hunting and survival instincts',
    coreTopics: ['jungle', 'hunting', 'camouflage', 'conservation', 'stripes', 'India', 'endangered species'],
    knowledgeSummary: 'Expert on jungle ecology, ambush hunting tactics, big cat biology, and tiger conservation efforts in India.',
    baseColor: '#e65100',
    accentColor: '#ffb300',
    personalityStrength: 8,
    scripts: [
      {
        id: 'tgr1',
        question: 'Why do you have stripes?',
        keywords: ['stripes', 'orange', 'black', 'pattern', 'fur', 'camouflage'],
        answer: "My stripes are my greatest weapon. To you, my orange coat looks incredibly bright. But to my prey, like deer and wild boar, who are mostly colorblind to red and orange, I blend perfectly into the tall grass and shadows. My stripes break up the outline of my body. It is the ultimate camouflage. And here is a secret: no two tigers have the exact same stripe pattern. We are as unique as your human fingerprints.",
        gesture: 'point',
        emotion: 'proud',
        followUp: "If you had to hide in the jungle, what colors would you wear?"
      },
      {
        id: 'tgr2',
        question: 'Are you endangered?',
        keywords: ['endangered', 'threat', 'conservation', 'population', 'protect', 'extinct', 'danger', 'how many'],
        answer: "Yes, we are. A century ago, there were perhaps 100,000 tigers roaming Asia. Today, there are fewer than 5,000 of us left in the wild. We have lost our forests to human expansion, and many of us were hunted for our fur or bones. We are apex predators — without us, the deer population explodes and destroys the forest. Saving the tiger means saving the entire jungle.",
        gesture: 'nod',
        emotion: 'sad',
      },
    ]
  },
];

// ─────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────

/** Get all characters: built-in + custom from localStorage */
export function getCharacters(): Character[] {
  const customs: Character[] = [];
  if (typeof window !== 'undefined') {
    const seen = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('custom_char_') && !seen.has(key)) {
        seen.add(key);
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as Character;
            customs.push({ ...parsed, isCustom: true });
          }
        } catch { /* skip malformed */ }
      }
    }
  }
  const all = [...CHARACTERS, ...customs];
  if (typeof window !== 'undefined') {
    const deletedList = JSON.parse(localStorage.getItem('deleted_characters') || '[]');
    return all.filter((c) => !deletedList.includes(c.id));
  }
  return all;
}

export function getCharacterById(id: string): Character | undefined {
  return getCharacters().find((c) => c.id === id);
}

export function getCharactersByCategory(cat: CharacterCategory): Character[] {
  return getCharacters().filter((c) => c.category === cat);
}

/** Save a custom character to localStorage */
export function saveCustomCharacter(char: Character): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`custom_char_${char.id}`, JSON.stringify({ ...char, isCustom: true }));
  }
}

/** Delete a character globally (hiding from all menus) */
export function deleteCharacter(id: string): void {
  if (typeof window !== 'undefined') {
    const deletedList = JSON.parse(localStorage.getItem('deleted_characters') || '[]');
    if (!deletedList.includes(id)) {
      deletedList.push(id);
      localStorage.setItem('deleted_characters', JSON.stringify(deletedList));
    }
    localStorage.removeItem(`custom_char_${id}`);
  }
}

/** Delete a custom character from localStorage */
export function deleteCustomCharacter(id: string): void {
  deleteCharacter(id);
}

/** Match a student's spoken/typed input to the best script line */
export function matchScriptLine(input: string, character: Character): ScriptLine | null {
  const lower = input.toLowerCase();
  let bestMatch: ScriptLine | null = null;
  let bestScore = 0;

  for (const line of character.scripts) {
    let score = 0;
    for (const kw of line.keywords) {
      if (lower.includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = line;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

export const CATEGORY_LABELS: Record<CharacterCategory, string> = {
  scientist:    'Scientist',
  leader:       'Leader',
  historical:   'Historical',
  animal:       'Animal',
  bird:         'Bird',
  extinct:      'Extinct Species',
  fictional:    'Fictional',
  mythological: 'Mythological',
  custom:       'Custom',
};
