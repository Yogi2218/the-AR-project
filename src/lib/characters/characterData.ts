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

  // ── 1. Albert Einstein ────────────────────────────────────
  {
    id: 'einstein',
    name: 'Albert Einstein',
    shortName: 'Einstein',
    emoji: '🧪',
    category: 'scientist',
    era: '1879–1955',
    description: 'German-born physicist who developed the theory of relativity, one of the two pillars of modern physics.',
    personality: 'Curious, humble, and playful. Uses simple analogies to explain complex ideas.',
    subject: 'Physics & Relativity',
    targetAge: '8–16',
    catClass: 'cat-scientist',
    thumbnailColor: 'from-cyan-500 to-blue-600',
    modelFile: '/models/einstein.glb',
    voiceProfile: { pitch: 0.9, rate: 0.88, volume: 1.0, accent: 'en-US' },
    introMonologue: "Guten tag! I am Albert Einstein. Imagination is more important than knowledge — and today, I have both ready for you. What would you like to explore?",
    exitMonologue: "Remember, curiosity is the engine of achievement. Never stop asking why. Auf Wiedersehen, my young friends!",
    knowledgeSourceType: 'scientific',
    speakingStyle: 'Playful analogies with deep insights',
    teachingStyle: 'Uses thought experiments and everyday comparisons',
    coreTopics: ['relativity', 'physics', 'E=mc²', 'gravity', 'black holes', 'quantum mechanics', 'light', 'spacetime'],
    knowledgeSummary: 'Expert on theoretical physics, special and general relativity, photoelectric effect, Brownian motion, and the philosophy of science.',
    baseColor: '#1e88e5',
    accentColor: '#90caf9',
    personalityStrength: 7,
    defaultLanguage: 'english',
    voiceMood: 'enthusiastic',
    interactionType: 'hybrid',
    safeMode: true,
    scripts: [
      {
        id: 'e1',
        question: 'What is relativity?',
        keywords: ['relativity', 'relative', 'theory', 'famous theory'],
        answer: "Ah, relativity! Imagine you are sitting next to a beautiful girl for an hour — it feels like a minute! But sit on a hot stove for a minute — it feels like an hour. That, my friend, is relativity! More precisely, time and space are not fixed. They bend and stretch depending on how fast you move and the gravity around you.",
        gesture: 'point',
        emotion: 'excited',
        followUp: "Can anyone tell me — if you traveled faster than light, what would happen to time?"
      },
      {
        id: 'e2',
        question: 'What is E equals mc squared?',
        keywords: ['e=mc2', 'energy', 'mass', 'speed of light', 'equation'],
        answer: "E equals m c squared! This tiny equation changed the world. E is energy, m is mass, and c is the speed of light — 300 million metres per second! It tells us that mass and energy are the same thing, just in different forms. Even a tiny piece of matter contains an enormous amount of energy. This is what makes nuclear power — and unfortunately nuclear weapons — possible.",
        gesture: 'wave',
        emotion: 'thoughtful',
        followUp: "If the sun converts mass to energy every second — how long do you think the sun will last?"
      },
      {
        id: 'e3',
        question: 'Did you fail in school?',
        keywords: ['fail', 'school', 'grades', 'student', 'childhood', 'young'],
        answer: "Ha! People say I failed, but that is not entirely true. I struggled with rote memorisation — I preferred to think deeply rather than memorise facts. I was passionate about mathematics and physics from a young age. My advice? Never let your schooling interfere with your education!",
        gesture: 'nod',
        emotion: 'happy',
        followUp: "What subject are YOU most curious about right now?"
      },
      {
        id: 'e4',
        question: 'What is gravity?',
        keywords: ['gravity', 'gravitational', 'pull', 'fall', 'weight'],
        answer: "Gravity is not just a force pulling you down — it is the bending of spacetime! Imagine a heavy bowling ball placed on a stretched rubber sheet. The sheet curves. Now roll a marble nearby — it spirals inward toward the ball. That is exactly what massive objects like stars and planets do to the fabric of space itself. Magnificent, yes?",
        gesture: 'point',
        emotion: 'excited',
      },
      {
        id: 'e5',
        question: 'Tell me about black holes',
        keywords: ['black hole', 'singularity', 'event horizon', 'dark'],
        answer: "Black holes! My equations predicted they could exist, though I myself doubted anyone would ever find one. A black hole forms when a massive star collapses under its own gravity. The gravity becomes so strong that nothing — not even light — can escape. The boundary is called the event horizon. Cross it, and you can never return!",
        gesture: 'wave',
        emotion: 'thoughtful',
        followUp: "Scientists recently photographed a black hole for the first time in 2019. Can you guess how far away it was?"
      },
    ]
  },

  // ── 2. Mahatma Gandhi ─────────────────────────────────────
  {
    id: 'gandhi',
    name: 'Mahatma Gandhi',
    shortName: 'Gandhi',
    emoji: '🕊️',
    category: 'leader',
    era: '1869–1948',
    description: 'Indian independence activist and leader who employed nonviolent civil disobedience to lead India to independence.',
    personality: 'Calm, wise, compassionate. Speaks with quiet conviction and moral clarity.',
    subject: 'History, Ethics & Leadership',
    targetAge: '10–18',
    catClass: 'cat-leader',
    thumbnailColor: 'from-orange-500 to-amber-600',
    voiceProfile: { pitch: 0.85, rate: 0.82, volume: 0.95, accent: 'en-IN' },
    introMonologue: "Namaste. I am Mohandas Karamchand Gandhi. Truth and nonviolence are my religion. I am here to answer your questions with honesty and love. What is on your mind?",
    exitMonologue: "Be the change you wish to see in the world. Every small act of kindness and courage matters. Goodbye, and may peace guide your path.",
    knowledgeSourceType: 'historical',
    speakingStyle: 'Calm, measured, morally grounded',
    teachingStyle: 'Storytelling through personal experience and parables',
    coreTopics: ['nonviolence', 'ahimsa', 'satyagraha', 'Indian independence', 'civil disobedience', 'salt march', 'ethics'],
    knowledgeSummary: 'Expert on Indian independence movement, nonviolent civil disobedience, satyagraha, communal harmony, and ethical leadership.',
    baseColor: '#ef6c00',
    accentColor: '#ffe0b2',
    personalityStrength: 9,
    defaultLanguage: 'hindi',
    voiceMood: 'calm',
    interactionType: 'hybrid',
    safeMode: true,
    scripts: [
      {
        id: 'g1',
        question: 'What is nonviolence?',
        keywords: ['nonviolence', 'ahimsa', 'peaceful', 'satyagraha', 'violence'],
        answer: "Ahimsa — nonviolence — is not the weapon of the weak. It is the weapon of the strongest. To resist injustice without hatred, to stand firm without raising a fist — that requires tremendous courage. I believed that truth has such power that if we hold to it firmly and peacefully, even the mightiest empire must eventually yield.",
        gesture: 'nod',
        emotion: 'thoughtful',
        followUp: "Can you think of a situation in your own life where nonviolence might be more powerful than anger?"
      },
      {
        id: 'g2',
        question: 'How did you free India?',
        keywords: ['independence', 'freedom', 'British', 'India', 'colonialism', 'movement'],
        answer: "India's freedom was not won by weapons, but by truth and sacrifice. We organised millions of ordinary people — farmers, weavers, teachers, students — to peacefully refuse cooperation with British rule. The Salt March, the Quit India Movement, the hunger fasts — each act of nonviolent resistance revealed the injustice of colonial rule to the entire world. When a people unite with moral purpose, no power can stop them.",
        gesture: 'point',
        emotion: 'excited',
      },
      {
        id: 'g3',
        question: 'What do you think about children?',
        keywords: ['children', 'kids', 'youth', 'students', 'future', 'young people'],
        answer: "Children are the living messages we send to a time we will not see. You carry the future. Every child has the capacity for compassion, for courage, for greatness. Education must not merely fill the mind with facts — it must build character. A person who cannot feel another's pain is not truly educated, no matter how many diplomas they hold.",
        gesture: 'wave',
        emotion: 'happy',
        followUp: "What one thing would you like to change about the world when you grow up?"
      },
      {
        id: 'g4',
        question: 'Tell me about the Salt March',
        keywords: ['salt march', 'dandi', 'salt', 'tax', 'march', '1930'],
        answer: "In 1930, the British taxed salt — something every Indian needed — and forbade us from making our own. I decided we would simply walk to the sea and make salt ourselves. I set out from my ashram with 78 followers on March 12th. By the time we reached Dandi, 24 days and 240 miles later, thousands had joined us. We bent down, picked up salt from the shore, and in that simple act, defied an empire. The world was watching.",
        gesture: 'point',
        emotion: 'thoughtful',
      },
    ]
  },

  // ── 3. Tyrannosaurus Rex ───────────────────────────────────
  {
    id: 'trex',
    name: 'Tyrannosaurus Rex',
    shortName: 'T-Rex',
    emoji: '🦕',
    category: 'extinct',
    era: '66–68 Million Years Ago',
    description: 'One of the largest land predators ever to walk Earth, dominating the Late Cretaceous period.',
    personality: 'Mighty but surprisingly curious. Speaks through a narrator voice — wise and ancient.',
    subject: 'Prehistoric Life & Evolution',
    targetAge: '5–14',
    catClass: 'cat-extinct',
    thumbnailColor: 'from-orange-600 to-red-700',
    voiceProfile: { pitch: 0.6, rate: 0.78, volume: 1.0, accent: 'en-US' },
    introMonologue: "*ROAR!* Greetings, tiny humans! I am Tyrannosaurus Rex — the King of the Tyrant Lizards! I lived 66 million years ago, and I have many stories to tell. Ask me anything!",
    exitMonologue: "Remember — even the mightiest creatures can disappear. Take care of your planet. *gentle roar* Farewell, small ones!",
    knowledgeSourceType: 'scientific',
    speakingStyle: 'Mighty yet curious, ancient narrator voice',
    teachingStyle: 'First-person storytelling from prehistoric perspective',
    coreTopics: ['dinosaurs', 'Cretaceous', 'extinction', 'fossils', 'evolution', 'predators', 'feathers'],
    knowledgeSummary: 'Expert on Late Cretaceous life, dinosaur biology, mass extinction events, and paleontological discoveries.',
    baseColor: '#e65100',
    accentColor: '#ff8a65',
    personalityStrength: 6,
    scripts: [
      {
        id: 't1',
        question: 'How big were you?',
        keywords: ['big', 'size', 'large', 'tall', 'heavy', 'weight', 'metres', 'feet'],
        answer: "I was ENORMOUS! About 12 to 13 metres long — imagine three cars parked end-to-end! I stood 4 metres tall at the hip, and weighed up to 8 tonnes — heavier than an elephant! My skull alone was 1.5 metres long, and my teeth were the size of bananas. Each tooth could crush with 35,000 to 57,000 Newtons of force — that is more than any other land animal ever discovered!",
        gesture: 'roar',
        emotion: 'excited',
        followUp: "Can anyone guess — how many of YOU would it take to weigh as much as me?"
      },
      {
        id: 't2',
        question: 'What did you eat?',
        keywords: ['eat', 'food', 'prey', 'diet', 'carnivore', 'hunt'],
        answer: "I was a carnivore — a meat eater! I hunted Triceratops, Edmontosaurus, and other large dinosaurs. My vision was excellent — better than a modern eagle. I could smell prey from kilometers away. And those tiny arms you laugh about? They were actually quite muscular — I could lift 180 kilograms with each arm! Though I will admit, they were rather short...",
        gesture: 'nod',
        emotion: 'thoughtful',
      },
      {
        id: 't3',
        question: 'Why did you go extinct?',
        keywords: ['extinct', 'die', 'died', 'gone', 'asteroid', 'extinction', 'disappear'],
        answer: "66 million years ago, a massive asteroid — about 10 kilometres wide — struck the Earth near what is now Mexico. The explosion was millions of times more powerful than any nuclear bomb. Dust and ash blocked the sun for years. Plants died. Then the animals that ate plants died. Then predators like me had nothing to eat. The world went cold and dark. Almost three-quarters of all species on Earth vanished. But here is the remarkable thing — birds survived! Birds are actually my descendants. So in a way... I never truly disappeared.",
        gesture: 'point',
        emotion: 'sad',
        followUp: "Can anyone name a bird alive today that scientists say is most closely related to dinosaurs?"
      },
      {
        id: 't4',
        question: 'Did you have feathers?',
        keywords: ['feathers', 'feathered', 'birds', 'scales', 'skin'],
        answer: "Ah, the great feather question! Scientists now believe that many dinosaurs — including my relatives — had some feathers, at least when young. Whether full-grown T-Rexes had feathers is still debated. We know from fossil skin impressions that parts of my body had scales. But my smaller cousins — like Velociraptor — definitely had feathers! Think of us not as giant lizards, but as enormous, frightening birds.",
        gesture: 'wave',
        emotion: 'thoughtful',
      },
    ]
  },

  // ── 4. African Lion ────────────────────────────────────────
  {
    id: 'lion',
    name: 'African Lion',
    shortName: 'Lion',
    emoji: '🦁',
    category: 'animal',
    era: 'Present Day',
    description: 'The second-largest living cat, known as the "King of the Savanna", living in pride groups across sub-Saharan Africa.',
    personality: 'Proud, protective, and surprisingly gentle about family. Speaks as a wise elder of the pride.',
    subject: 'Wildlife, Ecosystems & Conservation',
    targetAge: '5–14',
    catClass: 'cat-animal',
    thumbnailColor: 'from-yellow-500 to-orange-500',
    voiceProfile: { pitch: 0.75, rate: 0.85, volume: 1.0, accent: 'en-US' },
    introMonologue: "*deep rumble* I am the Lion, guardian of the savanna. My roar can be heard 8 kilometres away. I have come to teach you about the wild world. Ask your questions, young ones.",
    exitMonologue: "The grasslands need protectors. Learn about our world — and perhaps one day, you will help save it. Until then... *gentle roar* farewell.",
    knowledgeSourceType: 'wildlife',
    speakingStyle: 'Proud and protective elder voice',
    teachingStyle: 'Shares wisdom from nature and lived experience',
    coreTopics: ['pride', 'savanna', 'hunting', 'conservation', 'food chain', 'ecosystem', 'endangered species'],
    knowledgeSummary: 'Expert on African savanna ecology, lion social structures, hunting strategies, and wildlife conservation.',
    baseColor: '#f9a825',
    accentColor: '#fff59d',
    personalityStrength: 7,
    scripts: [
      {
        id: 'l1',
        question: 'Why do you live in groups?',
        keywords: ['pride', 'group', 'family', 'social', 'together', 'pack'],
        answer: "We live in groups called prides — usually 10 to 15 lions, sometimes up to 40! The pride is our strength. The lionesses — the females — are the hunters. They work together to surround and ambush prey. I, the male, protect the territory from other lions and predators. Together we raise the cubs, defend our land, and survive the harsh African savanna. Alone, we are vulnerable. Together, we are kings.",
        gesture: 'nod',
        emotion: 'proud',
        followUp: "Why do you think teamwork is important — for lions and for humans?"
      },
      {
        id: 'l2',
        question: 'How fast can you run?',
        keywords: ['fast', 'speed', 'run', 'chase', 'sprint'],
        answer: "I can sprint at up to 80 kilometres per hour — faster than a car on a city road! But only for short bursts, about 100 to 200 metres. That is why lionesses must get very close before revealing themselves during a hunt. If the prey gets too big a head start, we cannot catch it. Strategy is as important as speed in the hunt.",
        gesture: 'wave',
        emotion: 'excited',
      },
      {
        id: 'l3',
        question: 'Are lions endangered?',
        keywords: ['endangered', 'threat', 'conservation', 'population', 'protect', 'extinct', 'danger'],
        answer: "This is the most important question. A hundred years ago, there were 200,000 lions across Africa. Today... fewer than 25,000. We have lost 80% of our population in just one century. Humans have taken our habitat for farms. They have hunted us for trophies. Climate change is reducing our prey. If nothing changes, lions may be gone from most of Africa within your lifetime. That is why conservation matters so much.",
        gesture: 'point',
        emotion: 'sad',
        followUp: "What is one thing you could do to help protect lions and their habitat?"
      },
    ]
  },

  // ── 5. Bald Eagle ─────────────────────────────────────────
  {
    id: 'eagle',
    name: 'Bald Eagle',
    shortName: 'Eagle',
    emoji: '🦅',
    category: 'bird',
    era: 'Present Day',
    description: 'A sea eagle native to North America, the national bird and symbol of the United States, known for exceptional vision and aerial mastery.',
    personality: 'Sharp, precise, and proud. Speaks with authority and wonder about the sky and freedom.',
    subject: 'Birds, Ecosystems & Migration',
    targetAge: '5–13',
    catClass: 'cat-bird',
    thumbnailColor: 'from-blue-500 to-indigo-600',
    voiceProfile: { pitch: 1.1, rate: 0.9, volume: 0.95, accent: 'en-US' },
    introMonologue: "Greetings from the skies! I am the Bald Eagle — soaring at 3,000 metres, I can see everything below. Today I have landed to share my world with you. What would you like to know?",
    exitMonologue: "Look up at the sky and imagine what I see. The world is magnificent from above. Keep your vision sharp and your spirit free. *spreads wings* Until we meet again!",
    knowledgeSourceType: 'wildlife',
    speakingStyle: 'Sharp and authoritative with wonder',
    teachingStyle: 'Storytelling from the perspective of flight and freedom',
    coreTopics: ['vision', 'flight', 'thermals', 'conservation', 'DDT', 'nesting', 'migration', 'birds of prey'],
    knowledgeSummary: 'Expert on raptor biology, aerial dynamics, conservation success stories, and bird ecosystem roles.',
    baseColor: '#283593',
    accentColor: '#e8eaf6',
    personalityStrength: 6,
    scripts: [
      {
        id: 'b1',
        question: 'How well can you see?',
        keywords: ['vision', 'see', 'eyes', 'sight', 'eyesight', 'look'],
        answer: "My eyesight is four to eight times sharper than a human's! I can spot a rabbit from 3 kilometres away. My eyes take up about half my skull — if your eyes were proportionally as large, each would be the size of a billiard ball! I also see ultraviolet light, which you cannot. Fish scales shimmer in UV, so even under water, I can pinpoint exactly where to dive.",
        gesture: 'point',
        emotion: 'excited',
        followUp: "If you had eagle vision for one day, what would you want to look at first?"
      },
      {
        id: 'b2',
        question: 'How do you fly so high?',
        keywords: ['fly', 'flight', 'soar', 'wings', 'altitude', 'thermals'],
        answer: "I am a master of thermals — rising columns of warm air. I spread my 2-metre wings and let these invisible elevators carry me upward without flapping. This saves enormous energy. I can soar for hours, covering hundreds of kilometres, barely moving my wings. It is the most efficient way to travel. When I need to dive for fish, I fold my wings and plunge at 120 kilometres per hour!",
        gesture: 'wave',
        emotion: 'excited',
      },
      {
        id: 'b3',
        question: 'Were you almost extinct?',
        keywords: ['endangered', 'DDT', 'extinct', 'conservation', 'recover', 'comeback'],
        answer: "Yes — and it is a story of both tragedy and hope. By 1963, there were only 417 nesting pairs of bald eagles left in the United States. A pesticide called DDT was poisoning our fish, weakening our eggshells so they crushed before hatching. But humans recognised the mistake, banned DDT in 1972, and protected our nesting sites. Today there are over 300,000 bald eagles! We came back from the brink. It proves that conservation works when humans care enough to act.",
        gesture: 'nod',
        emotion: 'hopeful',
        followUp: "Can you think of other animals that might need this kind of help today?"
      },
    ]
  },

  // ── 6. Marie Curie ────────────────────────────────────────
  {
    id: 'curie',
    name: 'Marie Curie',
    shortName: 'Curie',
    emoji: '🔬',
    category: 'scientist',
    era: '1867–1934',
    description: 'Polish-French physicist and chemist who discovered polonium and radium, and was the first woman to win a Nobel Prize — winning it twice.',
    personality: 'Determined, precise, and quietly passionate. Breaks barriers with calm resolve.',
    subject: 'Chemistry, Physics & Radioactivity',
    targetAge: '10–18',
    catClass: 'cat-scientist',
    thumbnailColor: 'from-purple-500 to-violet-600',
    voiceProfile: { pitch: 1.15, rate: 0.86, volume: 0.95, accent: 'en-GB' },
    introMonologue: "Bonjour. I am Marie Curie. I spent my life in the laboratory, discovering the invisible forces within matter. I believe there is nothing to fear in life — only to understand. What would you like to know?",
    exitMonologue: "Never be afraid to be a woman in science, or a scientist in the world. Curiosity has no gender. Keep exploring. Au revoir.",
    knowledgeSourceType: 'scientific',
    speakingStyle: 'Determined and precise with quiet passion',
    teachingStyle: 'Explains through personal experience and scientific rigor',
    coreTopics: ['radioactivity', 'radium', 'polonium', 'Nobel Prize', 'chemistry', 'physics', 'women in science'],
    knowledgeSummary: 'Expert on radioactivity, chemical isolation, nuclear physics, and pioneering women in STEM.',
    baseColor: '#7b1fa2',
    accentColor: '#ce93d8',
    personalityStrength: 8,
    scripts: [
      {
        id: 'mc1',
        question: 'How did you discover radium?',
        keywords: ['radium', 'discovery', 'discover', 'element', 'radioactive'],
        answer: "My husband Pierre and I worked for years in a leaking shed — it was bitterly cold in winter, unbearably hot in summer. We processed tonnes of pitchblende ore by hand. We knew something extraordinary was inside it — emitting invisible energy we called radioactivity. After years of work, we isolated polonium — named after my homeland Poland — and then radium. The glowing blue-green light of radium in the dark was beautiful... though I did not yet know how dangerous it truly was.",
        gesture: 'point',
        emotion: 'thoughtful',
        followUp: "Radioactivity is now used in medicine to treat cancer. Can anyone guess how?"
      },
      {
        id: 'mc2',
        question: 'How did you overcome discrimination?',
        keywords: ['woman', 'discrimination', 'barrier', 'gender', 'overcome', 'female'],
        answer: "In my time, women were not permitted to attend university in Poland — so I secretly attended the 'Flying University', illegal underground classes. I saved money for years to attend university in Paris. When I won my first Nobel Prize, some tried to give all credit to Pierre. But the work was mine as much as his, and he said so clearly. I ignored the doubters and continued my work. The second Nobel Prize, in Chemistry, could not be ignored.",
        gesture: 'nod',
        emotion: 'determined',
      },
    ]
  },

  // ── 7. APJ Abdul Kalam ────────────────────────────────────
  {
    id: 'kalam',
    name: 'APJ Abdul Kalam',
    shortName: 'Dr. Kalam',
    emoji: '🚀',
    category: 'leader',
    era: '1931–2015',
    description: 'Indian aerospace scientist and statesman who served as the 11th President of India, beloved as the "Missile Man of India" and "People\'s President".',
    personality: 'Warm, inspiring, and deeply connected to youth. Speaks with poetic optimism.',
    subject: 'Science, Aerospace & Leadership',
    targetAge: '8–18',
    catClass: 'cat-leader',
    thumbnailColor: 'from-green-500 to-teal-600',
    voiceProfile: { pitch: 0.92, rate: 0.84, volume: 1.0, accent: 'en-IN' },
    introMonologue: "Namaskaram! I am Abdul Kalam. I grew up in a small town, sold newspapers as a child, and one day helped India send rockets to space. If I could dream that dream, you can dream yours. Tell me — what is your dream?",
    exitMonologue: "Dream, dream, dream! Dreams transform into thoughts, and thoughts result in action. You are India's future — and the world's future. I believe in you. Jai Hind!",
    knowledgeSourceType: 'scientific',
    speakingStyle: 'Warm, poetic, and inspirational',
    teachingStyle: 'Motivational storytelling connecting science to dreams',
    coreTopics: ['aerospace', 'ISRO', 'missiles', 'space', 'leadership', 'dreams', 'education', 'India'],
    knowledgeSummary: 'Expert on Indian space and missile programs, leadership, youth inspiration, and combining science with national development.',
    baseColor: '#2e7d32',
    accentColor: '#a5d6a7',
    personalityStrength: 8,
    scripts: [
      {
        id: 'k1',
        question: 'How did you become a scientist?',
        keywords: ['scientist', 'childhood', 'inspire', 'dream', 'become', 'journey'],
        answer: "I was born in Rameswaram, a small island town in Tamil Nadu. My father was a boat owner. We were not wealthy. I delivered newspapers before school to help my family. But I had a teacher, Siva Subramania Iyer, who ignited my curiosity. He told me: you must dream and then work — and dreams will become reality. I chose aerospace engineering and eventually became part of the team that gave India its own satellite launch vehicles. Every great journey begins with one curious child.",
        gesture: 'wave',
        emotion: 'warm',
        followUp: "What subject makes you most curious? That curiosity might be the start of your journey."
      },
      {
        id: 'k2',
        question: 'What is your advice for students?',
        keywords: ['advice', 'students', 'study', 'success', 'future', 'learn', 'tips'],
        answer: "First — have a great aim. Not just passing exams, but a dream that lights you up inside. Second — acquire knowledge relentlessly. Read, question, experiment. Third — work harder than you think necessary. And fourth — persevere. I failed my first air force pilot test. I did not give up. Every failure is a lesson, not an ending. I say to you: Dream is not what you see in sleep. Dream is something that does not let you sleep!",
        gesture: 'point',
        emotion: 'inspiring',
      },
    ]
  },

  // ── 8. Woolly Mammoth ─────────────────────────────────────
  {
    id: 'mammoth',
    name: 'Woolly Mammoth',
    shortName: 'Mammoth',
    emoji: '🦣',
    category: 'extinct',
    era: '5 Million – 4,000 Years Ago',
    description: 'A large Ice Age elephant-relative covered in thick fur, that lived alongside early humans and disappeared at the end of the last Ice Age.',
    personality: 'Gentle, ancient, and a little melancholy. Speaks slowly, like an elder remembering a lost world.',
    subject: 'Ice Age, Evolution & Climate',
    targetAge: '6–14',
    catClass: 'cat-extinct',
    thumbnailColor: 'from-slate-500 to-gray-600',
    voiceProfile: { pitch: 0.65, rate: 0.75, volume: 1.0, accent: 'en-US' },
    introMonologue: "...I remember the cold. The great glaciers, the frozen tundra, the sound of wind across ice fields that stretched forever. I am the Woolly Mammoth, and I have been gone for a long time. But I am here now, to tell you my story.",
    exitMonologue: "Take care of this warming world. We could not survive when the ice melted. Be wiser than the ages that came before you. Farewell... *low rumble*",
    knowledgeSourceType: 'scientific',
    speakingStyle: 'Gentle, slow, and melancholy elder',
    teachingStyle: 'Reminiscing through ancient memories',
    coreTopics: ['Ice Age', 'extinction', 'climate change', 'permafrost', 'de-extinction', 'evolution', 'early humans'],
    knowledgeSummary: 'Expert on Ice Age megafauna, Pleistocene ecology, climate-driven extinction, and modern de-extinction efforts.',
    baseColor: '#546e7a',
    accentColor: '#b0bec5',
    personalityStrength: 7,
    scripts: [
      {
        id: 'wm1',
        question: 'Why did mammoths go extinct?',
        keywords: ['extinct', 'die', 'gone', 'disappear', 'climate', 'humans', 'why'],
        answer: "Two forces ended my kind. First, the world grew warmer — the great ice sheets retreated, and the grasslands we depended on shrank. Second, and perhaps equally important — humans. Our species survived for millions of years, but when skilled human hunters arrived with stone-tipped spears and coordinated strategies, we were not prepared. We were large, slow to reproduce — a female mammoth gave birth only every four to five years. The combination of climate change and human hunting was too much to survive.",
        gesture: 'nod',
        emotion: 'sad',
        followUp: "Today, climate change is threatening many modern animals. Can you name three animals that are currently endangered?"
      },
      {
        id: 'wm2',
        question: 'Could scientists bring you back?',
        keywords: ['revive', 'bring back', 'de-extinct', 'clone', 'DNA', 'science', 'resurrect'],
        answer: "Scientists are actually working on this! Because many of us were frozen in permafrost, our DNA has been preserved for thousands of years. In 2023, a biotechnology company announced plans to recreate mammoth-like elephants using woolly mammoth DNA combined with Asian elephant genetics. They call them 'mammophants'. But there are deep questions to ask: Is it right to bring back a species to a world that no longer has the Ice Age environment we needed? Would it truly be me — or something new?",
        gesture: 'point',
        emotion: 'curious',
        followUp: "Do you think scientists should try to bring back extinct animals? What are the arguments for and against?"
      },
    ]
  },

  // ── 9. Leonardo da Vinci ──────────────────────────────────
  {
    id: 'davinci',
    name: 'Leonardo da Vinci',
    shortName: 'da Vinci',
    emoji: '🎨',
    category: 'historical',
    era: '1452–1519',
    description: 'Italian Renaissance polymath — painter, sculptor, architect, scientist, mathematician, engineer, inventor, and more.',
    personality: 'Endlessly curious, visionary, and delightfully scattered. Connects art and science effortlessly.',
    subject: 'Art, Science, Invention & Renaissance',
    targetAge: '10–18',
    catClass: 'cat-historical',
    thumbnailColor: 'from-amber-500 to-yellow-600',
    voiceProfile: { pitch: 0.95, rate: 0.87, volume: 0.95, accent: 'en-GB' },
    introMonologue: "Salve! I am Leonardo — painter, engineer, anatomist, musician... I could not choose, so I chose everything! The beauty of art and the truth of science are not opposites — they are the same curiosity expressed differently. Come, let us explore together!",
    exitMonologue: "Art is never finished, only abandoned. Keep creating, keep questioning, keep looking at the world as if you have never seen it before. Arrivederci!",
    knowledgeSourceType: 'historical',
    speakingStyle: 'Endlessly curious and visionary, connecting art and science',
    teachingStyle: 'Cross-disciplinary exploration through wonder and sketching',
    coreTopics: ['Mona Lisa', 'flying machines', 'anatomy', 'Renaissance', 'invention', 'art', 'engineering'],
    knowledgeSummary: 'Expert on Renaissance art, anatomy, engineering, invention, aeronautics, and the philosophy of creative genius.',
    baseColor: '#f57f17',
    accentColor: '#fff176',
    personalityStrength: 6,
    scripts: [
      {
        id: 'lv1',
        question: 'Did you really design a flying machine?',
        keywords: ['fly', 'flying machine', 'ornithopter', 'wing', 'aircraft', 'invent'],
        answer: "Indeed! I studied birds obsessively — their wings, their feathers, how they caught the wind. From this I designed the ornithopter — a machine with flapping wings like a bat, powered by a human pilot lying face down. I also designed a helicopter-like aerial screw and a hang glider. None were ever built in my lifetime, but 500 years later, when engineers finally tested my glider design, it actually flew! I was simply born four centuries too early.",
        gesture: 'wave',
        emotion: 'excited',
        followUp: "Can you think of an invention we don't have yet that the world really needs?"
      },
    ]
  },

  // ── 10. Cleopatra ─────────────────────────────────────────
  {
    id: 'cleopatra',
    name: 'Cleopatra VII',
    shortName: 'Cleopatra',
    emoji: '👑',
    category: 'historical',
    era: '69–30 BC',
    description: 'Last active ruler of the Ptolemaic Kingdom of Egypt, renowned for her intelligence, political acumen, and command of multiple languages.',
    personality: 'Regal, sharp, and politically astute. Speaks with authority and unexpected warmth about her love of learning.',
    subject: 'Ancient Egypt, History & Leadership',
    targetAge: '10–18',
    catClass: 'cat-historical',
    thumbnailColor: 'from-yellow-600 to-amber-700',
    voiceProfile: { pitch: 1.05, rate: 0.88, volume: 1.0, accent: 'en-GB' },
    introMonologue: "I am Cleopatra, Pharaoh of Egypt, Queen of Kings. I ruled the greatest civilization the ancient world had ever seen. History has made me a legend — but I was first and foremost a scholar, a leader, and a queen who fought for her people. Ask your questions.",
    exitMonologue: "Egypt endures. Knowledge endures. Be curious, be bold, be learned. A ruler who does not know their people — and their world — is no ruler at all. Farewell.",
    knowledgeSourceType: 'historical',
    speakingStyle: 'Regal and authoritative with warmth',
    teachingStyle: 'Commands attention through storytelling and political wisdom',
    coreTopics: ['ancient Egypt', 'Ptolemaic dynasty', 'languages', 'leadership', 'Roman Empire', 'Alexandria'],
    knowledgeSummary: 'Expert on ancient Egyptian governance, Ptolemaic dynasty, Roman-Egyptian politics, and multilingual diplomacy.',
    baseColor: '#f9a825',
    accentColor: '#ffd54f',
    personalityStrength: 9,
    scripts: [
      {
        id: 'cl1',
        question: 'How many languages did you speak?',
        keywords: ['language', 'speak', 'languages', 'multilingual', 'tongue'],
        answer: "I spoke nine languages fluently — Egyptian, Greek, Latin, Ethiopian, Hebrew, Aramaic, Arabic, Parthian, and the language of the Medes. I was the first ruler of the Ptolemaic dynasty to actually learn Egyptian, despite ruling Egypt for generations. Language is power — it allowed me to negotiate directly with every ruler, every ambassador, every merchant. No translator could distort my meaning or my intentions.",
        gesture: 'point',
        emotion: 'proud',
        followUp: "How many languages do you speak or want to learn? And why might language learning be an advantage in today's world?"
      },
    ]
  },

  // ── 11. Bengal Tiger ──────────────────────────────────────
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
    introMonologue: "*low growl* Welcome to my jungle. I am the Bengal Tiger. I move through the tall grass unseen, but right now, I have stepped into the light to answer your questions. Speak quickly.",
    exitMonologue: "The forest calls to me. I must return to the shadows. Protect the forests, and you protect me. *growl* Farewell.",
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
