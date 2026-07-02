// ─────────────────────────────────────────────────────────────
// Upgraded Audio & Phoneme-Based Lip Sync Speech Engine
// ─────────────────────────────────────────────────────────────

import type { VoiceProfile } from '@/lib/characters/characterData';
import { useSessionStore } from '@/stores/sessionStore';

export interface SpeechOptions {
  text: string;
  voiceProfile: VoiceProfile;
  characterId?: string; // Optional but helps map the specific character
  onStart?: () => void;
  onEnd?: () => void;
  onWord?: (word: string, charIndex: number) => void;
  onError?: (err: string) => void;
}

interface AlignmentData {
  characters: string[];
  startTimes: number[];
  endTimes: number[];
}

interface ChunkData {
  text: string;
  startTime: number;
  endTime: number;
  charIndex: number;
}

// Linear interpolation helper
function lerp(start: number, end: number, amt: number) {
  return start + (end - start) * Math.min(1.0, Math.max(0.0, amt));
}

// Map phoneme-like chunks to Oculus-standard blendshape targets
function getVisemesForChunk(chunk: string) {
  const c = chunk.toLowerCase().trim();
  
  const targets = {
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
  };

  if (!c) {
    return targets; // Silence
  }

  // Check for vowels
  if (/[aeiouáéíóúäëïöü]/.test(c)) {
    if (c.includes('o') || c.includes('oo') || c.includes('ou') || c.includes('ow')) {
      targets.lipsPucker = 0.85;
      targets.mouthOpen = 0.5;
      targets.jawOpen = 0.35;
    } else if (c.includes('a') || c.includes('ah')) {
      targets.mouthOpen = 0.8;
      targets.jawOpen = 0.6;
    } else if (c.includes('e') || c.includes('ee') || c.includes('ea') || c.includes('y')) {
      targets.lipsWide = 0.8;
      targets.mouthOpen = 0.35;
      targets.jawOpen = 0.15;
    } else if (c.includes('i')) {
      targets.lipsWide = 0.65;
      targets.mouthOpen = 0.3;
      targets.jawOpen = 0.12;
    } else if (c.includes('u')) {
      targets.lipsPucker = 0.75;
      targets.mouthOpen = 0.2;
      targets.jawOpen = 0.15;
    }
  } else {
    // Consonants
    if (c.includes('m') || c.includes('b') || c.includes('p')) {
      targets.lipsPress = 1.0;
    } else if (c.includes('f') || c.includes('v')) {
      targets.lipsPress = 0.75;
      targets.jawOpen = 0.12;
    } else if (c.includes('l') || c.includes('d') || c.includes('n') || c.includes('t')) {
      targets.mouthOpen = 0.2;
      targets.jawOpen = 0.25;
    } else if (c.includes('sh') || c.includes('ch') || c.includes('s') || c.includes('z') || c.includes('j')) {
      targets.lipsWide = 0.4;
      targets.mouthOpen = 0.15;
    } else if (c.includes('w')) {
      targets.lipsPucker = 0.65;
      targets.mouthOpen = 0.15;
    } else if (c.includes('r')) {
      targets.lipsPucker = 0.3;
      targets.mouthOpen = 0.12;
    } else if (c.includes('k') || c.includes('g') || c.includes('h') || c.includes('q')) {
      targets.mouthOpen = 0.15;
      targets.jawOpen = 0.1;
    }
  }

  return targets;
}

// Group character alignments into phoneme-like digraph chunks
function chunkAlignment(alignment: AlignmentData): ChunkData[] {
  const chars = alignment.characters;
  const starts = alignment.startTimes;
  const ends = alignment.endTimes;
  const chunks: ChunkData[] = [];
  
  if (!chars || chars.length === 0) return [];
  
  let i = 0;
  while (i < chars.length) {
    let text = chars[i];
    let startTime = starts[i];
    let endTime = ends[i];
    const charIndex = i;

    // Merge adjacent characters for double consonants or common phonetic digraphs
    while (i + 1 < chars.length) {
      const nextChar = chars[i + 1];
      const combined = (text + nextChar).toLowerCase();
      
      const isDouble = nextChar.toLowerCase() === text.toLowerCase() && /[a-z]/i.test(nextChar);
      const isDigraph = ['th', 'sh', 'ch', 'ea', 'ou', 'oo', 'ow', 'ee'].includes(combined);
      
      if (isDouble || isDigraph) {
        text += nextChar;
        endTime = ends[i + 1];
        i++;
      } else {
        break;
      }
    }
    
    chunks.push({ text, startTime, endTime, charIndex });
    i++;
  }
  
  return chunks;
}

// Detect sentiment expressions in speech text
function detectExpression(text: string) {
  const t = text.toLowerCase();
  const expression = {
    smileLeft: 0,
    smileRight: 0,
    browInnerUp: 0,
    browDown: 0,
    blinkLeft: 0,
    blinkRight: 0,
  };

  if (t.includes('question') || t.includes('how') || t.includes('why') || t.includes('wonder') || t.includes('think')) {
    // Thinking
    expression.browInnerUp = 0.7;
    expression.browDown = 0.2;
    expression.smileLeft = 0.15;
  } else if (t.includes('guten tag') || t.includes('hello') || t.includes('welcome') || t.includes('happy') || t.includes('relativity') || t.includes('peace')) {
    // Happy
    expression.smileLeft = 0.75;
    expression.smileRight = 0.75;
    expression.browInnerUp = 0.3;
  } else if (t.includes('challenge') || t.includes('problem') || t.includes('difficult') || t.includes('conflict') || t.includes('war')) {
    // Frown / Serious
    expression.browDown = 0.8;
    expression.smileLeft = 0;
    expression.smileRight = 0;
  } else if (t.includes('amazing') || t.includes('eureka') || t.includes('incredible') || t.includes('surprise')) {
    // Surprise
    expression.browInnerUp = 0.9;
  } else {
    // Natural gentle speaking smile
    expression.smileLeft = 0.25;
    expression.smileRight = 0.25;
    expression.browInnerUp = 0.15;
  }

  return expression;
}

class SpeechEngine {
  private audio: HTMLAudioElement | null = null;
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private animFrameId: number | null = null;
  private isSpeakingActive = false;

  // Blink state
  private blinkTimer = 0;
  private isBlinking = false;
  private blinkDuration = 0.15; // 150ms
  private blinkElapsed = 0;

  // Active viseme states (to smooth and decay in rendering loops)
  private currentMorphs = {
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
    sentenceRelaxed: 0, // 0 = active speech, 1 = relaxed silence
  };

  constructor() {
    if (typeof window === 'undefined') return;
    this.synth = window.speechSynthesis;
  }

  speak(options: SpeechOptions): void {
    const { text, voiceProfile, characterId, onStart, onEnd, onWord, onError } = options;
    const charId = characterId || useSessionStore.getState().character?.id || 'einstein';

    this.stop();
    this.isSpeakingActive = true;

    const storeState = useSessionStore.getState();
    const lang = storeState.selectedLanguage;
    const voiceMood = storeState.mood;
    const voiceOverride = storeState.selectedVoice;

    // Request speech from server-side route
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text, 
        characterId: charId, 
        language: lang, 
        mood: voiceMood,
        voiceOverride: voiceOverride 
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!this.isSpeakingActive) return; // Cancelled

        if (data.audio) {
          this.playServerAudio(data.audio, data.alignment, text, onStart, onEnd, onWord);
        } else {
          console.warn('TTS: Server returned no audio stream. Falling back to browser SpeechSynthesis.');
          this.playClientFallback(text, voiceProfile, data.alignment, onStart, onEnd, onWord, onError);
        }
      })
      .catch((err) => {
        console.error('TTS: Server request error, playing offline fallback.', err);
        const alignment = this.estimateMockAlignment(text);
        this.playClientFallback(text, voiceProfile, alignment, onStart, onEnd, onWord, onError);
      });
  }

  private playServerAudio(
    audioSrc: string,
    alignment: AlignmentData,
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onWord?: (word: string, charIndex: number) => void
  ) {
    const audio = new Audio(audioSrc);
    this.audio = audio;

    // Scale audio speed based on teacher settings
    const storeRate = useSessionStore.getState().speechRate || 1.0;
    audio.playbackRate = storeRate;

    const chunks = chunkAlignment(alignment);
    const expressionTargets = detectExpression(text);

    let lastWordIndex = -1;
    let lastTime = Date.now();

    const tick = () => {
      if (!this.isSpeakingActive || audio.paused || audio.ended) {
        this.currentMorphs.sentenceRelaxed = 1.0;
        this.currentMorphs.lipsPress = 0.5; // close lips gently
        Object.keys(this.currentMorphs).forEach((key) => {
          const k = key as keyof typeof this.currentMorphs;
          if (k !== 'sentenceRelaxed' && k !== 'lipsPress') {
            this.currentMorphs[k] = 0;
          }
        });
        useSessionStore.getState().setFaceMorphs(this.currentMorphs);
        return;
      }

      this.animFrameId = requestAnimationFrame(tick);
      const currentTime = audio.currentTime;
      const now = Date.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000); // capped delta
      lastTime = now;

      // Viseme & Timing processing
      let activeChunk: ChunkData | null = null;
      let activeIndex = -1;

      for (let k = 0; k < chunks.length; k++) {
        if (currentTime >= chunks[k].startTime && currentTime <= chunks[k].endTime) {
          activeChunk = chunks[k];
          activeIndex = k;
          break;
        }
      }

      // Sentence Relaxation boundary check (silence or spacing > 100ms or punctuation end)
      const punctuationMatch = activeChunk ? /[.,!?;]/.test(activeChunk.text) : true;
      const isRelaxed = !activeChunk || punctuationMatch;

      if (isRelaxed) {
        this.currentMorphs.sentenceRelaxed = 1.0;
      } else {
        this.currentMorphs.sentenceRelaxed = 0.0;
      }

      // 1. Calculate Target Viseme (including Co-Articulation: blend 20% of next phoneme 25ms early)
      let targetViseme = getVisemesForChunk(''); // silent by default

      if (activeChunk && !isRelaxed) {
        const currentTargets = getVisemesForChunk(activeChunk.text);
        
        // Co-articulation check: lookahead 25ms early
        const lookaheadDuration = 0.025; // 25ms
        const timeToNext = activeChunk.endTime - currentTime;
        
        let nextTargets = getVisemesForChunk('');
        let blendFactor = 0;

        if (timeToNext <= lookaheadDuration && activeIndex + 1 < chunks.length) {
          const nextChunk = chunks[activeIndex + 1];
          nextTargets = getVisemesForChunk(nextChunk.text);
          const progress = 1.0 - (timeToNext / lookaheadDuration); // 0.0 to 1.0
          blendFactor = 0.20 * Math.max(0, Math.min(1, progress));
        }

        Object.keys(currentTargets).forEach((key) => {
          const k = key as keyof typeof currentTargets;
          targetViseme[k] = currentTargets[k] * (1.0 - blendFactor) + (nextTargets[k] || 0) * blendFactor;
        });

        // Trigger word boundary notifications
        if (activeChunk.charIndex !== lastWordIndex) {
          lastWordIndex = activeChunk.charIndex;
          const words = text.substring(activeChunk.charIndex).split(' ');
          onWord?.(words[0] || '', activeChunk.charIndex);
        }
      }

      // 2. Viseme Blend & Decay Rate interpolation (decay rate 8.0)
      const decayRate = 8.0;
      Object.keys(this.currentMorphs).forEach((key) => {
        const k = key as keyof typeof this.currentMorphs;
        if (k === 'sentenceRelaxed' || k === 'blinkLeft' || k === 'blinkRight') return; // Handled separately

        // Mix in expression offsets
        const exprVal = expressionTargets[k as keyof typeof expressionTargets] || 0;
        let targetVal = 0;

        if (isRelaxed) {
          // Sentence-end relaxation: close lips, decay mouth target to 0
          if (k === 'lipsPress') {
            targetVal = 0.4; // close lips gently
          } else if (k === 'mouthOpen' || k === 'jawOpen' || k === 'lipsPucker' || k === 'lipsWide') {
            targetVal = 0; // force close mouth
          } else {
            targetVal = exprVal; // retain background expressions (smile/brow)
          }
        } else {
          // Standard speaking blending
          targetVal = (targetViseme[k as keyof typeof targetViseme] || 0) * 0.8 + exprVal * 0.2;
        }

        // Apply viseme decay (blending in & out formula)
        this.currentMorphs[k] = lerp(this.currentMorphs[k], targetVal, delta * decayRate);
      });

      // 3. Eyelid Blinking Simulation (with +20% chance at sentence end)
      this.blinkTimer += delta;
      if (this.blinkTimer >= 1.0) {
        this.blinkTimer = 0;
        // Base 15% chance per second, +20% when relaxed (so 35%)
        const blinkChance = isRelaxed ? 0.35 : 0.15;
        if (Math.random() < blinkChance) {
          this.isBlinking = true;
          this.blinkElapsed = 0;
        }
      }

      let blinkVal = 0;
      if (this.isBlinking) {
        this.blinkElapsed += delta;
        if (this.blinkElapsed >= this.blinkDuration) {
          this.isBlinking = false;
        } else {
          const progress = this.blinkElapsed / this.blinkDuration;
          blinkVal = Math.sin(progress * Math.PI);
        }
      }
      this.currentMorphs.blinkLeft = blinkVal;
      this.currentMorphs.blinkRight = blinkVal;

      // Update store
      useSessionStore.getState().setFaceMorphs(this.currentMorphs);
    };

    audio.onplay = () => {
      onStart?.();
      lastTime = Date.now();
      tick();
    };

    audio.onended = () => {
      this.stop();
      onEnd?.();
    };

    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      onEnd?.();
    };

    audio.play().catch((err) => {
      console.warn('Audio auto-play blocked:', err);
      // Fallback to trigger events immediately if blocked
      onStart?.();
      setTimeout(() => onEnd?.(), 1000);
    });
  }

  private playClientFallback(
    text: string,
    voiceProfile: VoiceProfile,
    alignment: AlignmentData,
    onStart?: () => void,
    onEnd?: () => void,
    onWord?: (word: string, charIndex: number) => void,
    onError?: (err: string) => void
  ) {
    if (!this.synth) {
      onError?.('Web Speech API not supported');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;
    const storeRate = useSessionStore.getState().speechRate || 1.0;
    utterance.pitch = voiceProfile.pitch;
    utterance.rate = voiceProfile.rate * storeRate;
    utterance.volume = voiceProfile.volume;

    const synthVoices = this.synth.getVoices();
    const selectName = voiceProfile.voiceName?.toLowerCase() || '';
    const voice = synthVoices.find((v) => v.name.toLowerCase().includes(selectName)) || synthVoices[0];
    if (voice) utterance.voice = voice;

    // Simulate viseme ticking during fallback offline speech
    let startTime = Date.now();
    const chunks = chunkAlignment(alignment);
    const expressionTargets = detectExpression(text);
    let lastTime = Date.now();

    const fallbackTick = () => {
      if (!this.isSpeakingActive || !this.synth?.speaking) {
        this.currentMorphs.sentenceRelaxed = 1.0;
        this.currentMorphs.lipsPress = 0.5; // close lips gently
        Object.keys(this.currentMorphs).forEach((key) => {
          const k = key as keyof typeof this.currentMorphs;
          if (k !== 'sentenceRelaxed' && k !== 'lipsPress') {
            this.currentMorphs[k] = 0;
          }
        });
        useSessionStore.getState().setFaceMorphs(this.currentMorphs);
        return;
      }

      this.animFrameId = requestAnimationFrame(fallbackTick);
      const storeRate = useSessionStore.getState().speechRate || 1.0;
      const elapsed = ((Date.now() - startTime) / 1000) * (voiceProfile.rate * storeRate);
      const now = Date.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      let activeChunk: ChunkData | null = null;
      let activeIndex = -1;
      for (let k = 0; k < chunks.length; k++) {
        if (elapsed >= chunks[k].startTime && elapsed <= chunks[k].endTime) {
          activeChunk = chunks[k];
          activeIndex = k;
          break;
        }
      }

      // Sentence Relaxation boundary check
      const punctuationMatch = activeChunk ? /[.,!?;]/.test(activeChunk.text) : true;
      const isRelaxed = !activeChunk || punctuationMatch;

      if (isRelaxed) {
        this.currentMorphs.sentenceRelaxed = 1.0;
      } else {
        this.currentMorphs.sentenceRelaxed = 0.0;
      }

      // 1. Calculate Target Viseme (including Co-Articulation)
      let targetViseme = getVisemesForChunk('');

      if (activeChunk && !isRelaxed) {
        const currentTargets = getVisemesForChunk(activeChunk.text);

        // Co-articulation check: lookahead 25ms early
        const lookaheadDuration = 0.025; // 25ms
        const timeToNext = activeChunk.endTime - elapsed;
        
        let nextTargets = getVisemesForChunk('');
        let blendFactor = 0;

        if (timeToNext <= lookaheadDuration && activeIndex + 1 < chunks.length) {
          const nextChunk = chunks[activeIndex + 1];
          nextTargets = getVisemesForChunk(nextChunk.text);
          const progress = 1.0 - (timeToNext / lookaheadDuration);
          blendFactor = 0.20 * Math.max(0, Math.min(1, progress));
        }

        Object.keys(currentTargets).forEach((key) => {
          const k = key as keyof typeof currentTargets;
          targetViseme[k] = currentTargets[k] * (1.0 - blendFactor) + (nextTargets[k] || 0) * blendFactor;
        });
      }

      // 2. Viseme Blend & Decay Rate interpolation (decay rate 8.0)
      const decayRate = 8.0;
      Object.keys(this.currentMorphs).forEach((key) => {
        const k = key as keyof typeof this.currentMorphs;
        if (k === 'sentenceRelaxed' || k === 'blinkLeft' || k === 'blinkRight') return;

        const exprVal = expressionTargets[k as keyof typeof expressionTargets] || 0;
        let targetVal = 0;

        if (isRelaxed) {
          if (k === 'lipsPress') {
            targetVal = 0.4; // close lips gently
          } else if (k === 'mouthOpen' || k === 'jawOpen' || k === 'lipsPucker' || k === 'lipsWide') {
            targetVal = 0;
          } else {
            targetVal = exprVal;
          }
        } else {
          targetVal = (targetViseme[k as keyof typeof targetViseme] || 0) * 0.8 + exprVal * 0.2;
        }

        this.currentMorphs[k] = lerp(this.currentMorphs[k], targetVal, delta * decayRate);
      });

      // 3. Eyelid Blinking Simulation
      this.blinkTimer += delta;
      if (this.blinkTimer >= 1.0) {
        this.blinkTimer = 0;
        const blinkChance = isRelaxed ? 0.35 : 0.15;
        if (Math.random() < blinkChance) {
          this.isBlinking = true;
          this.blinkElapsed = 0;
        }
      }

      let blinkVal = 0;
      if (this.isBlinking) {
        this.blinkElapsed += delta;
        if (this.blinkElapsed >= this.blinkDuration) {
          this.isBlinking = false;
        } else {
          const progress = this.blinkElapsed / this.blinkDuration;
          blinkVal = Math.sin(progress * Math.PI);
        }
      }
      this.currentMorphs.blinkLeft = blinkVal;
      this.currentMorphs.blinkRight = blinkVal;

      useSessionStore.getState().setFaceMorphs(this.currentMorphs);
    };

    utterance.onstart = () => {
      onStart?.();
      startTime = Date.now();
      lastTime = Date.now();
      fallbackTick();
    };

    utterance.onend = () => {
      this.stop();
      onEnd?.();
    };

    utterance.onerror = (e) => {
      this.stop();
      onError?.(e.error);
    };

    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        const word = text.substring(e.charIndex, e.charIndex + e.charLength);
        onWord?.(word, e.charIndex);
      }
    };

    this.synth.speak(utterance);
  }

  private estimateMockAlignment(text: string): AlignmentData {
    const characters = text.split('');
    const startTimes: number[] = [];
    const endTimes: number[] = [];
    let currentTime = 0;

    characters.forEach((char) => {
      let duration = 0.065;
      if (char === ' ') duration = 0.12;
      else if (/[.,!?;]/.test(char)) duration = 0.3;

      startTimes.push(currentTime);
      currentTime += duration;
      endTimes.push(currentTime);
    });

    return {
      characters,
      startTimes,
      endTimes,
    };
  }

  stop(): void {
    this.isSpeakingActive = false;

    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }

    if (this.synth?.speaking) {
      this.synth.cancel();
    }
    this.currentUtterance = null;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Reset weights
    Object.keys(this.currentMorphs).forEach((key) => {
      const k = key as keyof typeof this.currentMorphs;
      this.currentMorphs[k] = k === 'sentenceRelaxed' ? 1.0 : 0.0;
    });
    useSessionStore.getState().setFaceMorphs(this.currentMorphs);
  }

  pause(): void {
    if (this.audio) this.audio.pause();
    if (this.synth) this.synth.pause();
  }

  resume(): void {
    if (this.audio) this.audio.play();
    if (this.synth) this.synth.resume();
  }

  get isSpeaking(): boolean {
    return this.isSpeakingActive || (this.synth?.speaking ?? false);
  }

  get availableVoices(): SpeechSynthesisVoice[] {
    return this.synth?.getVoices() || [];
  }
}

export const speechEngine = typeof window !== 'undefined'
  ? new SpeechEngine()
  : null as unknown as SpeechEngine;
