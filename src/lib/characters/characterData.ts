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
    introMonologue: "Roarrr! Namaste, my friends from Children's Academy, Thane! I am the Royal Bengal Tiger, your AR tiger friend, and I'm so happy to be with you today on International Tiger Day! I came from the forests of India, where tigers like me have lived for thousands of years. We are the guardians of the jungle when we are healthy, the whole forest is healthy: the trees, the rivers, and every animal that lives there. That's why I'm excited to spend today with you to share my story, answer your questions, and show you how even small actions can help tigers like me survive. So students of Children's Academy, are you ready to be my roar-some friends and protectors? Let's celebrate, learn, and pledge together — for me, and for every tiger yet to come! Roarrr! Happy International Tiger Day!",
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
      {
        id: 'tgr3',
        question: 'Why is July 29 celebrated as your special day?',
        keywords: ['july 29', 'special day', 'international tiger day', 'celebrate'],
        answer: "It's International Tiger Day! It reminds everyone that tigers like me are endangered and need protection.",
        gesture: 'nod',
        emotion: 'happy'
      },
      {
        id: 'tgr4',
        question: 'What do you mean by endangered? Why are there so few tigers left today?',
        keywords: ['endangered', 'so few left', 'why few tigers'],
        answer: "Humans have cut down my forest for farms and cities, and some hunt tigers illegally. Only about 5,500 of us are left in the wild.",
        gesture: 'point',
        emotion: 'sad'
      },
      {
        id: 'tgr5',
        question: 'What happens to the forest if tigers disappear?',
        keywords: ['disappear', 'what happens', 'if tigers disappear', 'without tigers'],
        answer: "I'm at the top of the food chain. Without me, deer and boar populations grow too fast and eat up all the plants — the whole forest gets unbalanced.",
        gesture: 'roar',
        emotion: 'thoughtful'
      },
      {
        id: 'tgr6',
        question: 'If you could make one rule for humans, what would it be?',
        keywords: ['one rule', 'rule for humans', 'human rule'],
        answer: "Never destroy a forest without planting new trees to replace it.",
        gesture: 'point',
        emotion: 'thoughtful'
      },
      {
        id: 'tgr7',
        question: 'What is poaching, and why does it hurt tigers like you? What can a kid like me do?',
        keywords: ['poaching', 'kid like me do', 'hurt tigers'],
        answer: "Poaching means hunting animals illegally. People kill tigers to sell our skin and bones, even though it's against the law. It's one of the biggest threats to my survival. You can help me by never buying things made from animal skin, bone, or fur, and tell your friends why it's wrong. Awareness is powerful!",
        gesture: 'nod',
        emotion: 'sad'
      },
      {
        id: 'tgr8',
        question: 'Why is losing forest land so dangerous for tigers?',
        keywords: ['losing forest land', 'dangerous', 'forest land', 'cut down'],
        answer: "I need a huge area to hunt in — sometimes over 100 square kilometres! When forests are cut down for farms, roads, or cities, I lose my home and my food.",
        gesture: 'point',
        emotion: 'sad'
      },
      {
        id: 'tgr9',
        question: 'Do tigers and humans ever come into conflict? Why?',
        keywords: ['conflict', 'tigers and humans', 'come into conflict', 'scares people'],
        answer: "Yes. As forests shrink, I sometimes wander closer to villages looking for food, and that scares people. This is called human-tiger conflict, and it's sad for both sides.",
        gesture: 'nod',
        emotion: 'sad'
      },
      {
        id: 'tgr10',
        question: 'How can students of Children\'s Academy help you, Sher?',
        keywords: ['students help', 'children\'s academy help', 'help you sher', 'help', 'sher'],
        answer: "You can do so much, even from your classroom! Plant a tree or start a small garden on the school campus. Make posters or a wall display for International Tiger Day to teach other students. Save paper — use both sides of your notebook, since paper comes from trees. Never buy or wear anything made from animal skin, fur, or bone. Tell your family what you learned, so more people join in. If you visit a zoo or national park, follow the rules — stay quiet, don't feed the animals, and don't leave litter behind. Every small habit in your school and home adds up to a safer forest for tigers like me!",
        gesture: 'wave',
        emotion: 'excited'
      }
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
