import { create } from 'zustand';
import type { Character, ScriptLine, LearningLevel } from '@/lib/characters/characterData';

// ─────────────────────────────────────────────────────────────
// Session Store — manages the active AR session state
// Universal Character AI Engine with cost control, caching,
// safety lock, and offline support.
// ─────────────────────────────────────────────────────────────

export type SessionMode = 'scripted' | 'voice' | 'hybrid';
export type SessionStatus = 'idle' | 'loading' | 'live' | 'ended';
export type CharacterState = 'idle' | 'speaking' | 'listening' | 'thinking' | 'gesturing';
export type SupportedLanguage = 'english' | 'hindi' | 'marathi';
export type AgeGroup = '5-7' | '8-10' | '11-14' | '15+';
export type CharacterMood = 'calm' | 'energetic' | 'serious' | 'funny' | 'inspiring';

export interface SessionInteraction {
  id: string;
  speaker: 'student' | 'character';
  message: string;
  timestamp: number;
  inputType: 'voice' | 'text' | 'button';
}

export interface TeacherCorrection {
  question: string;
  correctedAnswer: string;
  timestamp: number;
}

export interface CachedAnswer {
  question: string;
  answer: string;
  characterId: string;
  timestamp: number;
}

export interface CostUsage {
  dailyTokensUsed: number;
  dailyVoiceCallsUsed: number;
  sessionQuestionsUsed: number;
  lastResetDate: string; // YYYY-MM-DD
}

export interface TeacherSessionTemplate {
  id: string;
  name: string;
  characterId: string;
  learningLevel: LearningLevel;
  language: SupportedLanguage;
  ageGroup: AgeGroup;
  mood: CharacterMood;
  lessonGoal: string;
  teacherOverridePrompt: string;
  personalityStrength: number;
  savedAt: number;
}

// ── Cost control limits ────────────────────────────────────
export const COST_LIMITS = {
  dailyTokenLimit: 50,       // max Gemini calls per day
  dailyVoiceLimit: 100,      // max TTS calls per day
  perSessionLimit: 20,       // max questions per session
  maxWordsPerResponse: 150,  // max words in Gemini response
  maxTTSSentences: 3,        // max sentences sent to TTS
  maxSessionMemory: 10,      // last N messages in memory
  maxKnowledgeChunks: 30,    // max chunks loaded per character
};

// ── Safety filter keywords ─────────────────────────────────
export const SAFETY_BLOCKED_TOPICS = [
  'violence', 'weapon', 'murder', 'kill', 'suicide',
  'sexual', 'porn', 'nude', 'sex',
  'drugs', 'alcohol', 'smoking',
  'hate', 'racist', 'discrimination',
  'bomb', 'terrorist', 'extremist',
];

interface SessionStore {
  // ── Active session
  sessionId: string | null;
  character: Character | null;
  mode: SessionMode;
  status: SessionStatus;
  characterState: CharacterState;

  // ── Script state
  activeScript: ScriptLine[];
  currentScriptLine: ScriptLine | null;
  scriptIndex: number;
  isAutoplay: boolean;

  // ── Conversation log
  interactions: SessionInteraction[];

  // ── AR / display
  projectorMode: boolean;
  cameraEnabled: boolean;
  characterScale: number;  // 1.0 = default
  characterPosition: { x: number; y: number; z: number };
  characterRotation: { x: number; y: number; z: number };

  // ── Placement & Mode Controls
  transformMode: 'translate' | 'rotate' | 'scale';
  isPlacementLocked: boolean;
  placementMode: 'edit' | 'presentation';

  // ── Calibration & Camera Calibration
  cameraOpacity: number;
  cameraBlur: number;
  cameraOffset: { x: number; y: number };
  cameraMirror: boolean;
  showGrid: boolean;
  showCenteringGuide: boolean;
  speechRate: number;

  // ── Custom Background & Realism / Real-Time Expressions
  backgroundMode: 'camera' | 'image' | 'video';
  backgroundImageUrl: string | null;
  backgroundVideoUrl: string | null;
  activeExpression: 'thinking' | 'happy' | 'confused' | 'excited' | 'serious' | 'normal';
  showSelfieSegmentation: boolean;
  isQuickSetupOpen: boolean;
  selectedVoice: string | null;

  // ── Mouth / lip-sync
  mouthOpenAmount: number;  // 0–1
  isSpeaking: boolean;
  currentSubtitle: string;
  faceMorphs: Record<string, number>;

  // ── Recording
  isRecording: boolean;
  recordingDuration: number;

  // ── Universal AI Engine State ───────────────────────────
  aiModeEnabled: boolean;
  selectedLanguage: SupportedLanguage;
  ageGroup: AgeGroup;
  mood: CharacterMood;
  lessonGoal: string;
  teacherOverridePrompt: string;
  personalityStrength: number;
  learningLevel: LearningLevel;
  selectedTemplate: any | null;

  // ── Session memory (last N messages for Gemini context)
  sessionHistory: Array<{ role: 'student' | 'character'; message: string }>;

  // ── Teacher corrections (override Gemini)
  teacherCorrections: TeacherCorrection[];

  // ── Question suggestions (pre-session)
  suggestedQuestions: string[];

  // ── Caching layer (skip Gemini for repeated questions)
  answerCache: CachedAnswer[];

  // ── Cost control
  costUsage: CostUsage;

  // ── Safety
  safeMode: boolean;

  // ── Offline detection
  isOffline: boolean;

  // ── Interrupt queue (when character is speaking)
  interruptQueue: string[];

  // ── Analytics
  analyticsSessionStart: number | null;
  analyticsQuestionsAsked: number;
  analyticsCorrectionsUsed: number;

  // ── Actions (original) ──────────────────────────────────
  startSession: (character: Character, mode?: SessionMode) => void;
  endSession: () => void;
  setCharacterState: (state: CharacterState) => void;
  setCurrentScriptLine: (line: ScriptLine | null) => void;
  nextScriptLine: () => void;
  prevScriptLine: () => void;
  addInteraction: (interaction: Omit<SessionInteraction, 'id' | 'timestamp'>) => void;
  setMouthOpen: (amount: number) => void;
  setIsSpeaking: (speaking: boolean) => void;
  setSubtitle: (text: string) => void;
  setFaceMorphs: (morphs: Record<string, number>) => void;
  toggleProjectorMode: () => void;
  toggleCamera: () => void;
  setCharacterScale: (scale: number) => void;
  setCharacterPosition: (pos: { x: number; y: number; z: number }) => void;
  setCharacterRotation: (rot: { x: number; y: number; z: number }) => void;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  setPlacementLocked: (locked: boolean) => void;
  setPlacementMode: (mode: 'edit' | 'presentation') => void;
  setCameraOpacity: (v: number) => void;
  setCameraBlur: (v: number) => void;
  setCameraOffset: (offset: { x: number; y: number }) => void;
  setCameraMirror: (v: boolean) => void;
  setShowGrid: (v: boolean) => void;
  setShowCenteringGuide: (v: boolean) => void;
  setSpeechRate: (v: number) => void;
  setActiveScript: (script: ScriptLine[]) => void;
  saveRoomLayout: (charId: string) => void;
  loadRoomLayout: (charId: string) => void;
  setSelectedVoice: (voice: string | null) => void;
  saveStageProfile: (charId: string) => void;
  loadStageProfile: (charId: string) => void;
  setIsRecording: (v: boolean) => void;
  setRecordingDuration: (s: number) => void;
  setBackgroundMode: (mode: 'camera' | 'image' | 'video') => void;
  setBackgroundImageUrl: (url: string | null) => void;
  setBackgroundVideoUrl: (url: string | null) => void;
  setActiveExpression: (expr: 'thinking' | 'happy' | 'confused' | 'excited' | 'serious' | 'normal') => void;
  setShowSelfieSegmentation: (enabled: boolean) => void;
  setQuickSetupOpen: (open: boolean) => void;

  // ── New AI Engine Actions ───────────────────────────────
  setAiModeEnabled: (v: boolean) => void;
  setSelectedLanguage: (lang: SupportedLanguage) => void;
  setAgeGroup: (ag: AgeGroup) => void;
  setMood: (mood: CharacterMood) => void;
  setLessonGoal: (goal: string) => void;
  setTeacherOverridePrompt: (prompt: string) => void;
  setPersonalityStrength: (v: number) => void;
  setLearningLevel: (level: LearningLevel) => void;
  setSelectedTemplate: (template: any | null) => void;

  // ── Session memory
  addHistoryMessage: (role: 'student' | 'character', message: string) => void;
  clearHistory: () => void;

  // ── Teacher corrections
  addCorrection: (q: string, a: string) => void;
  removeCorrection: (q: string) => void;
  loadCorrections: (charId: string) => void;
  saveCorrections: (charId: string) => void;

  // ── Question suggestions
  setSuggestedQuestions: (qs: string[]) => void;

  // ── Caching
  getCachedAnswer: (characterId: string, question: string) => string | null;
  addCachedAnswer: (characterId: string, question: string, answer: string) => void;

  // ── Cost control
  incrementTokenUsage: () => boolean;  // returns false if limit exceeded
  incrementVoiceUsage: () => boolean;
  incrementSessionQuestion: () => boolean;
  resetDailyUsageIfNeeded: () => void;
  canUseAI: () => boolean;

  // ── Safety
  setSafeMode: (v: boolean) => void;
  isQuestionSafe: (q: string) => boolean;

  // ── Offline
  setIsOffline: (v: boolean) => void;

  // ── Interrupt queue
  addToInterruptQueue: (q: string) => void;
  popInterruptQueue: () => string | null;

  // ── Teacher session templates
  saveTeacherSession: (name: string) => void;
  loadTeacherSession: (template: TeacherSessionTemplate) => void;
  getTeacherSessions: () => TeacherSessionTemplate[];
  deleteTeacherSession: (id: string) => void;
  exportSession: () => string; // returns JSON

  // ── Analytics
  getAnalytics: () => { questionsAsked: number; sessionDuration: number; characterId: string | null };

  reset: () => void;
}

const DEFAULT_POSITION = { x: 0, y: -1.2, z: -3 };

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function loadCostUsage(): CostUsage {
  if (typeof window === 'undefined') {
    return { dailyTokensUsed: 0, dailyVoiceCallsUsed: 0, sessionQuestionsUsed: 0, lastResetDate: getTodayString() };
  }
  try {
    const raw = localStorage.getItem('eduar_cost_usage');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { dailyTokensUsed: 0, dailyVoiceCallsUsed: 0, sessionQuestionsUsed: 0, lastResetDate: getTodayString() };
}

function saveCostUsage(usage: CostUsage): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('eduar_cost_usage', JSON.stringify(usage));
  }
}

function loadAnswerCache(): CachedAnswer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('eduar_answer_cache');
    if (raw) {
      const parsed = JSON.parse(raw) as CachedAnswer[];
      // Keep cache under 200 entries
      return parsed.slice(-200);
    }
  } catch { /* ignore */ }
  return [];
}

function saveAnswerCache(cache: CachedAnswer[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('eduar_answer_cache', JSON.stringify(cache.slice(-200)));
  }
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionId: null,
  character: null,
  mode: 'scripted',
  status: 'idle',
  characterState: 'idle',

  activeScript: [],
  currentScriptLine: null,
  scriptIndex: 0,
  isAutoplay: false,

  interactions: [],

  projectorMode: false,
  cameraEnabled: true,
  characterScale: 1.0,
  characterPosition: DEFAULT_POSITION,
  characterRotation: { x: 0, y: 0, z: 0 },

  transformMode: 'translate',
  isPlacementLocked: false,
  placementMode: 'edit',

  cameraOpacity: 1.0,
  cameraBlur: 0.0,
  cameraOffset: { x: 0, y: 0 },
  cameraMirror: true,
  showGrid: true,
  showCenteringGuide: false,
  speechRate: 0.85,

  backgroundMode: 'camera',
  backgroundImageUrl: null,
  backgroundVideoUrl: null,
  activeExpression: 'normal',
  showSelfieSegmentation: true,
  isQuickSetupOpen: false,
  selectedVoice: null,

  mouthOpenAmount: 0,
  isSpeaking: false,
  currentSubtitle: '',
  faceMorphs: {
    mouthOpen: 0,
    jawOpen: 0,
    lipsPucker: 0,
    lipsWide: 0,
    lipsPress: 0,
    smileLeft: 0,
    smileRight: 0,
    blinkLeft: 0,
    blinkRight: 0,
    browInnerUp: 0,
    browDown: 0,
  },

  isRecording: false,
  recordingDuration: 0,

  // ── Universal AI Engine defaults ──────────────────────────
  aiModeEnabled: false,
  selectedLanguage: 'english',
  ageGroup: '8-10',
  mood: 'calm',
  lessonGoal: '',
  teacherOverridePrompt: '',
  personalityStrength: 7,
  learningLevel: 'beginner',
  selectedTemplate: null,
  sessionHistory: [],
  teacherCorrections: [],
  suggestedQuestions: [],
  answerCache: loadAnswerCache(),
  costUsage: loadCostUsage(),
  safeMode: true,
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  interruptQueue: [],
  analyticsSessionStart: null,
  analyticsQuestionsAsked: 0,
  analyticsCorrectionsUsed: 0,

  // ── Original Actions ──────────────────────────────────────

  startSession: (character, mode = 'scripted') => {
    const id = `session_${Date.now()}`;
    const firstLine = character.scripts[0] ?? null;

    // Load custom layout if it exists
    let pos = DEFAULT_POSITION;
    let rot = { x: 0, y: 0, z: 0 };
    let sc = 1.0;
    let bgMode: 'camera' | 'image' | 'video' = 'camera';
    let bgImgUrl: string | null = null;
    let bgVidUrl: string | null = null;
    let showSelfieSeg = true;
    let selectedVoice: string | null = null;
    let cameraOpacity = 1.0;
    let cameraBlur = 0;
    let cameraMirror = true;

    if (typeof window !== 'undefined') {
      const profilesStr = localStorage.getItem('eduar_stage_profiles');
      let profile: any = null;
      if (profilesStr) {
        try {
          const profiles = JSON.parse(profilesStr);
          profile = profiles[character.id];
        } catch {}
      }

      if (profile) {
        if (profile.position) pos = profile.position;
        if (profile.rotation) rot = profile.rotation;
        if (profile.scale !== undefined) sc = profile.scale;
        if (profile.backgroundMode) bgMode = profile.backgroundMode;
        if (profile.backgroundImageUrl) bgImgUrl = profile.backgroundImageUrl;
        if (profile.backgroundVideoUrl) bgVidUrl = profile.backgroundVideoUrl;
        if (profile.showSelfieSegmentation !== undefined) showSelfieSeg = profile.showSelfieSegmentation;
        if (profile.selectedVoice) selectedVoice = profile.selectedVoice;
        if (profile.cameraOpacity !== undefined) cameraOpacity = profile.cameraOpacity;
        if (profile.cameraBlur !== undefined) cameraBlur = profile.cameraBlur;
        if (profile.cameraMirror !== undefined) cameraMirror = profile.cameraMirror;
      } else {
        const savedLayoutStr = localStorage.getItem(`layout_${character.id}`);
        if (savedLayoutStr) {
          try {
            const layout = JSON.parse(savedLayoutStr);
            if (layout.position) pos = layout.position;
            if (layout.rotation) rot = layout.rotation;
            if (layout.scale !== undefined) sc = layout.scale;
            if (layout.backgroundMode) bgMode = layout.backgroundMode;
            if (layout.backgroundImageUrl) bgImgUrl = layout.backgroundImageUrl;
            if (layout.backgroundVideoUrl) bgVidUrl = layout.backgroundVideoUrl;
            if (layout.showSelfieSegmentation !== undefined) showSelfieSeg = layout.showSelfieSegmentation;
          } catch (e) {
            console.warn('Failed to parse saved layout:', e);
          }
        }
      }
    }

    if (!selectedVoice) {
      const isIndian = character.voiceProfile?.accent?.includes('IN') || 
                       character.defaultLanguage === 'hindi' || 
                       character.defaultLanguage === 'marathi' ||
                       ['gandhi', 'kalam', 'vivekananda', 'shivaji', 'ambedkar'].includes(character.id);
      
      const isFemale = ['curie', 'cleopatra'].includes(character.id) || 
                       character.name.toLowerCase().includes('rani') || 
                       character.name.toLowerCase().includes('savitribai') || 
                       character.name.toLowerCase().includes('kalpana');

      if (isIndian) {
        selectedVoice = isFemale ? 'indian-female-1' : 'indian-male-1';
      } else {
        selectedVoice = isFemale ? 'child-friendly' : 'deep-narrator';
      }
    }

    // Reset daily cost counters if new day
    const usage = loadCostUsage();
    const today = getTodayString();
    if (usage.lastResetDate !== today) {
      usage.dailyTokensUsed = 0;
      usage.dailyVoiceCallsUsed = 0;
      usage.lastResetDate = today;
    }
    usage.sessionQuestionsUsed = 0;
    saveCostUsage(usage);

    // Load teacher corrections for this character
    let corrections: TeacherCorrection[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`corrections_${character.id}`);
        if (raw) corrections = JSON.parse(raw);
      } catch { /* ignore */ }
    }

    set({
      sessionId: id,
      character,
      mode,
      status: 'live',
      characterState: 'idle',
      scriptIndex: 0,
      activeScript: character.scripts,
      currentScriptLine: firstLine,
      interactions: [],
      currentSubtitle: character.introMonologue,
      characterPosition: pos,
      characterRotation: rot,
      characterScale: sc,
      backgroundMode: bgMode,
      backgroundImageUrl: bgImgUrl,
      backgroundVideoUrl: bgVidUrl,
      showSelfieSegmentation: showSelfieSeg,
      selectedVoice,
      cameraOpacity,
      cameraBlur,
      cameraMirror,
      isPlacementLocked: false,
      placementMode: 'presentation',
      // AI engine session reset
      sessionHistory: [],
      teacherCorrections: corrections,
      costUsage: usage,
      interruptQueue: [],
      analyticsSessionStart: Date.now(),
      analyticsQuestionsAsked: 0,
      analyticsCorrectionsUsed: 0,
      personalityStrength: character.personalityStrength ?? 7,
      speechRate: 0.85,
    });
  },

  endSession: () => {
    // Track analytics
    const { analyticsSessionStart, analyticsQuestionsAsked, analyticsCorrectionsUsed, character, selectedLanguage, lessonGoal } = get();
    if (typeof window !== 'undefined' && character) {
      try {
        const analytics = JSON.parse(localStorage.getItem('eduar_analytics') || '[]');
        analytics.push({
          characterId: character.id,
          characterName: character.name,
          questionsAsked: analyticsQuestionsAsked,
          duration: analyticsSessionStart ? Date.now() - analyticsSessionStart : 0,
          timestamp: Date.now(),
          language: selectedLanguage,
          lessonGoal: lessonGoal || 'General',
          correctionsUsed: analyticsCorrectionsUsed,
        });
        // Keep last 100 sessions
        localStorage.setItem('eduar_analytics', JSON.stringify(analytics.slice(-100)));
      } catch { /* ignore */ }
    }

    set({ status: 'ended', characterState: 'idle', isSpeaking: false });
  },

  setCharacterState: (state) => set({ characterState: state }),

  setCurrentScriptLine: (line) => set({ currentScriptLine: line }),

  nextScriptLine: () => {
    const { activeScript, scriptIndex } = get();
    if (!activeScript || activeScript.length === 0) return;
    const next = Math.min(scriptIndex + 1, activeScript.length - 1);
    set({ scriptIndex: next, currentScriptLine: activeScript[next] });
  },

  prevScriptLine: () => {
    const { activeScript, scriptIndex } = get();
    if (!activeScript || activeScript.length === 0) return;
    const prev = Math.max(scriptIndex - 1, 0);
    set({ scriptIndex: prev, currentScriptLine: activeScript[prev] });
  },

  addInteraction: (interaction) => {
    const entry: SessionInteraction = {
      ...interaction,
      id: `int_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
    };
    set((s) => ({ interactions: [...s.interactions, entry] }));
  },

  setMouthOpen: (amount) => set({ mouthOpenAmount: Math.max(0, Math.min(1, amount)) }),
  setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),
  setSubtitle: (text) => set({ currentSubtitle: text }),
  setFaceMorphs: (morphs) => set((s) => ({ faceMorphs: { ...s.faceMorphs, ...morphs } })),
  toggleProjectorMode: () => set((s) => ({ projectorMode: !s.projectorMode })),
  toggleCamera: () => set((s) => ({ cameraEnabled: !s.cameraEnabled })),
  setCharacterScale: (scale) => set({ characterScale: scale }),
  setCharacterPosition: (pos) => set({ characterPosition: { ...pos, z: Math.min(-1.2, pos.z) } }),
  setCharacterRotation: (rot) => set({ characterRotation: rot }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setPlacementLocked: (locked) => set({ isPlacementLocked: locked }),
  setPlacementMode: (mode) => set({ placementMode: mode }),
  setCameraOpacity: (v) => set({ cameraOpacity: Math.max(0, Math.min(1, v)) }),
  setCameraBlur: (v) => set({ cameraBlur: Math.max(0, Math.min(10, v)) }),
  setCameraOffset: (offset) => set({ cameraOffset: offset }),
  setCameraMirror: (v) => set({ cameraMirror: v }),
  setShowGrid: (v) => set({ showGrid: v }),
  setShowCenteringGuide: (v) => set({ showCenteringGuide: v }),
  setSpeechRate: (v) => set({ speechRate: Math.max(0.5, Math.min(2.0, v)) }),
  setActiveScript: (script) => {
    const firstLine = script[0] ?? null;
    set({
      activeScript: script,
      scriptIndex: 0,
      currentScriptLine: firstLine,
    });
  },
  saveRoomLayout: (charId) => {
    const { characterPosition, characterRotation, characterScale, backgroundMode, backgroundImageUrl, backgroundVideoUrl, showSelfieSegmentation } = get();
    if (typeof window !== 'undefined') {
      const layout = {
        position: characterPosition,
        rotation: characterRotation,
        scale: characterScale,
        backgroundMode,
        backgroundImageUrl,
        backgroundVideoUrl,
        showSelfieSegmentation,
      };
      localStorage.setItem(`layout_${charId}`, JSON.stringify(layout));
    }
  },
  loadRoomLayout: (charId) => {
    if (typeof window !== 'undefined') {
      const savedLayoutStr = localStorage.getItem(`layout_${charId}`);
      if (savedLayoutStr) {
        try {
          const layout = JSON.parse(savedLayoutStr);
          set({
            characterPosition: layout.position || DEFAULT_POSITION,
            characterRotation: layout.rotation || { x: 0, y: 0, z: 0 },
            characterScale: layout.scale || 1.0,
            backgroundMode: layout.backgroundMode || 'camera',
            backgroundImageUrl: layout.backgroundImageUrl || null,
            backgroundVideoUrl: layout.backgroundVideoUrl || null,
            showSelfieSegmentation: layout.showSelfieSegmentation !== undefined ? layout.showSelfieSegmentation : true,
          });
        } catch (e) {
          console.warn('Failed to load layout:', e);
        }
      }
    }
  },
  setIsRecording: (v) => set({ isRecording: v }),
  setRecordingDuration: (s) => set({ recordingDuration: s }),

  setBackgroundMode: (mode) => set((s) => ({ 
    backgroundMode: mode,
    showSelfieSegmentation: (mode === 'image' || mode === 'video') ? true : s.showSelfieSegmentation
  })),
  setBackgroundImageUrl: (url) => set({ backgroundImageUrl: url }),
  setBackgroundVideoUrl: (url) => set({ backgroundVideoUrl: url }),
  setActiveExpression: (expr) => set({ activeExpression: expr }),
  setShowSelfieSegmentation: (enabled) => set({ showSelfieSegmentation: enabled }),
  setQuickSetupOpen: (open) => set({ isQuickSetupOpen: open }),
  setSelectedVoice: (voice) => set({ selectedVoice: voice }),
  saveStageProfile: (charId) => {
    const { 
      characterPosition, characterRotation, characterScale, 
      selectedVoice, backgroundMode, backgroundImageUrl, backgroundVideoUrl, 
      showSelfieSegmentation, cameraOpacity, cameraBlur, cameraMirror 
    } = get();
    
    if (typeof window !== 'undefined') {
      const profilesStr = localStorage.getItem('eduar_stage_profiles') || '{}';
      try {
        const profiles = JSON.parse(profilesStr);
        profiles[charId] = {
          position: characterPosition,
          rotation: characterRotation,
          scale: characterScale,
          selectedVoice,
          backgroundMode,
          backgroundImageUrl,
          backgroundVideoUrl,
          showSelfieSegmentation,
          cameraOpacity,
          cameraBlur,
          cameraMirror
        };
        localStorage.setItem('eduar_stage_profiles', JSON.stringify(profiles));
      } catch (e) {
        console.warn('Failed to save stage profile:', e);
      }
    }
  },
  loadStageProfile: (charId) => {
    if (typeof window !== 'undefined') {
      const profilesStr = localStorage.getItem('eduar_stage_profiles');
      if (profilesStr) {
        try {
          const profiles = JSON.parse(profilesStr);
          const profile = profiles[charId];
          if (profile) {
            set({
              characterPosition: profile.position || DEFAULT_POSITION,
              characterRotation: profile.rotation || { x: 0, y: 0, z: 0 },
              characterScale: profile.scale || 1.0,
              selectedVoice: profile.selectedVoice || null,
              backgroundMode: profile.backgroundMode || 'camera',
              backgroundImageUrl: profile.backgroundImageUrl || null,
              backgroundVideoUrl: profile.backgroundVideoUrl || null,
              showSelfieSegmentation: profile.showSelfieSegmentation !== undefined ? profile.showSelfieSegmentation : true,
              cameraOpacity: profile.cameraOpacity !== undefined ? profile.cameraOpacity : 1.0,
              cameraBlur: profile.cameraBlur !== undefined ? profile.cameraBlur : 0,
              cameraMirror: profile.cameraMirror !== undefined ? profile.cameraMirror : true,
            });
          }
        } catch (e) {
          console.warn('Failed to load stage profile:', e);
        }
      }
    }
  },

  // ── New AI Engine Actions ─────────────────────────────────

  setAiModeEnabled: (v) => set({ aiModeEnabled: v }),
  setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
  setAgeGroup: (ag) => set({ ageGroup: ag }),
  setMood: (mood) => set({ mood }),
  setLessonGoal: (goal) => set({ lessonGoal: goal }),
  setTeacherOverridePrompt: (prompt) => set({ teacherOverridePrompt: prompt }),
  setPersonalityStrength: (v) => set({ personalityStrength: Math.max(1, Math.min(10, v)) }),
  setLearningLevel: (level) => set({ learningLevel: level }),
  setSelectedTemplate: (template) => set({ selectedTemplate: template }),

  // ── Session memory ──────────────────────────────────────
  addHistoryMessage: (role, message) => {
    set((s) => {
      const newHistory = [...s.sessionHistory, { role, message }];
      // Keep only last N messages (performance budget)
      return { sessionHistory: newHistory.slice(-COST_LIMITS.maxSessionMemory) };
    });
  },
  clearHistory: () => set({ sessionHistory: [] }),

  // ── Teacher corrections ─────────────────────────────────
  addCorrection: (q, a) => {
    set((s) => ({
      teacherCorrections: [
        ...s.teacherCorrections.filter((c) => c.question.toLowerCase() !== q.toLowerCase()),
        { question: q, correctedAnswer: a, timestamp: Date.now() },
      ],
      analyticsCorrectionsUsed: s.analyticsCorrectionsUsed + 1,
    }));
  },
  removeCorrection: (q) => {
    set((s) => ({
      teacherCorrections: s.teacherCorrections.filter(
        (c) => c.question.toLowerCase() !== q.toLowerCase()
      ),
    }));
  },
  loadCorrections: (charId) => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`corrections_${charId}`);
        if (raw) set({ teacherCorrections: JSON.parse(raw) });
      } catch { /* ignore */ }
    }
  },
  saveCorrections: (charId) => {
    if (typeof window !== 'undefined') {
      const { teacherCorrections } = get();
      localStorage.setItem(`corrections_${charId}`, JSON.stringify(teacherCorrections));
    }
  },

  // ── Question suggestions ────────────────────────────────
  setSuggestedQuestions: (qs) => set({ suggestedQuestions: qs }),

  // ── Caching layer ───────────────────────────────────────
  getCachedAnswer: (characterId, question) => {
    const { answerCache } = get();
    const normalized = question.toLowerCase().trim();
    const cached = answerCache.find(
      (c) => c.characterId === characterId && c.question.toLowerCase().trim() === normalized
    );
    return cached ? cached.answer : null;
  },
  addCachedAnswer: (characterId, question, answer) => {
    set((s) => {
      const newCache = [
        ...s.answerCache,
        { characterId, question: question.toLowerCase().trim(), answer, timestamp: Date.now() },
      ];
      const trimmed = newCache.slice(-200);
      saveAnswerCache(trimmed);
      return { answerCache: trimmed };
    });
  },

  // ── Cost control ────────────────────────────────────────
  incrementTokenUsage: () => {
    const { costUsage } = get();
    const today = getTodayString();
    let usage = { ...costUsage };
    if (usage.lastResetDate !== today) {
      usage = { dailyTokensUsed: 0, dailyVoiceCallsUsed: 0, sessionQuestionsUsed: 0, lastResetDate: today };
    }
    if (usage.dailyTokensUsed >= COST_LIMITS.dailyTokenLimit) return false;
    usage.dailyTokensUsed += 1;
    saveCostUsage(usage);
    set({ costUsage: usage });
    return true;
  },
  incrementVoiceUsage: () => {
    const { costUsage } = get();
    const today = getTodayString();
    let usage = { ...costUsage };
    if (usage.lastResetDate !== today) {
      usage = { dailyTokensUsed: 0, dailyVoiceCallsUsed: 0, sessionQuestionsUsed: 0, lastResetDate: today };
    }
    if (usage.dailyVoiceCallsUsed >= COST_LIMITS.dailyVoiceLimit) return false;
    usage.dailyVoiceCallsUsed += 1;
    saveCostUsage(usage);
    set({ costUsage: usage });
    return true;
  },
  incrementSessionQuestion: () => {
    const { costUsage } = get();
    if (costUsage.sessionQuestionsUsed >= COST_LIMITS.perSessionLimit) return false;
    const usage = { ...costUsage, sessionQuestionsUsed: costUsage.sessionQuestionsUsed + 1 };
    saveCostUsage(usage);
    set({ costUsage: usage, analyticsQuestionsAsked: get().analyticsQuestionsAsked + 1 });
    return true;
  },
  resetDailyUsageIfNeeded: () => {
    const { costUsage } = get();
    const today = getTodayString();
    if (costUsage.lastResetDate !== today) {
      const usage = { dailyTokensUsed: 0, dailyVoiceCallsUsed: 0, sessionQuestionsUsed: 0, lastResetDate: today };
      saveCostUsage(usage);
      set({ costUsage: usage });
    }
  },
  canUseAI: () => {
    const { costUsage, isOffline } = get();
    if (isOffline) return false;
    const today = getTodayString();
    if (costUsage.lastResetDate !== today) return true; // New day, counters will reset
    return (
      costUsage.dailyTokensUsed < COST_LIMITS.dailyTokenLimit &&
      costUsage.sessionQuestionsUsed < COST_LIMITS.perSessionLimit
    );
  },

  // ── Safety ──────────────────────────────────────────────
  setSafeMode: (v) => set({ safeMode: v }),
  isQuestionSafe: (q) => {
    const { safeMode } = get();
    if (!safeMode) return true;
    const lower = q.toLowerCase();
    return !SAFETY_BLOCKED_TOPICS.some((topic) => lower.includes(topic));
  },

  // ── Offline ─────────────────────────────────────────────
  setIsOffline: (v) => set({ isOffline: v }),

  // ── Interrupt queue ─────────────────────────────────────
  addToInterruptQueue: (q) => {
    set((s) => ({ interruptQueue: [...s.interruptQueue, q] }));
  },
  popInterruptQueue: () => {
    const { interruptQueue } = get();
    if (interruptQueue.length === 0) return null;
    const [next, ...rest] = interruptQueue;
    set({ interruptQueue: rest });
    return next;
  },

  // ── Teacher session templates ───────────────────────────
  saveTeacherSession: (name) => {
    const { character, learningLevel, selectedLanguage, ageGroup, mood, lessonGoal, teacherOverridePrompt, personalityStrength } = get();
    if (!character || typeof window === 'undefined') return;
    const template: TeacherSessionTemplate = {
      id: `tmpl_${Date.now()}`,
      name,
      characterId: character.id,
      learningLevel,
      language: selectedLanguage,
      ageGroup,
      mood,
      lessonGoal,
      teacherOverridePrompt,
      personalityStrength,
      savedAt: Date.now(),
    };
    const existing = JSON.parse(localStorage.getItem('eduar_session_templates') || '[]');
    existing.push(template);
    localStorage.setItem('eduar_session_templates', JSON.stringify(existing));
  },
  loadTeacherSession: (template) => {
    set({
      learningLevel: template.learningLevel,
      selectedLanguage: template.language,
      ageGroup: template.ageGroup,
      mood: template.mood,
      lessonGoal: template.lessonGoal,
      teacherOverridePrompt: template.teacherOverridePrompt,
      personalityStrength: template.personalityStrength,
    });
  },
  getTeacherSessions: () => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('eduar_session_templates') || '[]');
    } catch { return []; }
  },
  deleteTeacherSession: (id) => {
    if (typeof window === 'undefined') return;
    const templates = JSON.parse(localStorage.getItem('eduar_session_templates') || '[]');
    localStorage.setItem('eduar_session_templates', JSON.stringify(templates.filter((t: TeacherSessionTemplate) => t.id !== id)));
  },
  exportSession: () => {
    const { character, learningLevel, selectedLanguage, ageGroup, mood, lessonGoal, teacherOverridePrompt, personalityStrength, sessionHistory, teacherCorrections, interactions } = get();
    return JSON.stringify({
      characterId: character?.id,
      characterName: character?.name,
      learningLevel,
      language: selectedLanguage,
      ageGroup,
      mood,
      lessonGoal,
      teacherOverridePrompt,
      personalityStrength,
      sessionHistory,
      teacherCorrections,
      interactions,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  },

  // ── Analytics ───────────────────────────────────────────
  getAnalytics: () => {
    const { analyticsQuestionsAsked, analyticsSessionStart, character } = get();
    return {
      questionsAsked: analyticsQuestionsAsked,
      sessionDuration: analyticsSessionStart ? Date.now() - analyticsSessionStart : 0,
      characterId: character?.id ?? null,
    };
  },

  reset: () => set({
    sessionId: null, character: null, status: 'idle',
    characterState: 'idle', interactions: [], currentSubtitle: '',
    isSpeaking: false, isRecording: false, recordingDuration: 0,
    scriptIndex: 0, currentScriptLine: null,
    activeScript: [],
    characterScale: 1.0,
    characterPosition: DEFAULT_POSITION,
    characterRotation: { x: 0, y: 0, z: 0 },
    transformMode: 'translate',
    isPlacementLocked: false,
    placementMode: 'edit',
    cameraOpacity: 1.0,
    cameraBlur: 0.0,
    cameraOffset: { x: 0, y: 0 },
    cameraMirror: true,
    showGrid: true,
    showCenteringGuide: false,
    backgroundMode: 'camera',
    backgroundImageUrl: null,
    backgroundVideoUrl: null,
    activeExpression: 'normal',
    showSelfieSegmentation: true,
    isQuickSetupOpen: false,
    faceMorphs: {
      mouthOpen: 0,
      jawOpen: 0,
      lipsPucker: 0,
      lipsWide: 0,
      lipsPress: 0,
      smileLeft: 0,
      smileRight: 0,
      blinkLeft: 0,
      blinkRight: 0,
      browInnerUp: 0,
      browDown: 0,
    },
    // AI engine reset
    aiModeEnabled: false,
    selectedTemplate: null,
    sessionHistory: [],
    teacherCorrections: [],
    suggestedQuestions: [],
    interruptQueue: [],
    analyticsSessionStart: null,
    analyticsQuestionsAsked: 0,
    mood: 'calm',
    lessonGoal: '',
    teacherOverridePrompt: '',
  }),
}));
