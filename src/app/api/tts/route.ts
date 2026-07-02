import { NextResponse } from 'next/server';
import { getCharacterById } from '@/lib/characters/characterData';

// ─────────────────────────────────────────────────────────────
// /api/tts — Text-to-Speech with Multi-Language & Mood Support
// Pipeline: ElevenLabs → Google Cloud TTS → Client Fallback
// ─────────────────────────────────────────────────────────────

const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  einstein: 'JBFqnCBsd6RMkjVDRZzb', // George - Warm, Captivating Storyteller
  gandhi: 'v984ziaDjt5EKuv3UFRU',   // Akshay - Young Indian Male (clear)
  lion: 'IKne3meq5aSn9XLyUdCD',     // Charlie - Deep, Confident, Energetic
  eagle: 'SOYHLrjzK2X1ezoPC6cr',    // Harry - Fierce Warrior
};

const ELEVENLABS_PRESETS: Record<string, string> = {
  'indian-male-1': 'v984ziaDjt5EKuv3UFRU',   // Akshay - Young Indian Male
  'indian-male-2': 'N2lVS1w4GuCO155B77R6',   // Deepak - Conversational Indian Male
  'indian-female-1': '2F1KINpxsttim2WfMbVs', // DB - Indian Female
  'indian-female-2': 'z9fAnlkFcb3rZOwcc76s', // Kavita - Indian Female
  'deep-narrator': 'pNInz6obpgDQGcFmaJgB',   // Adam - Deep Narrator
  'historical-wise': 'cgSgspJ2msm6clMCxTsg', // Brian - Wise Voice
  'child-friendly': 'EXAVITQu4vr4xnSDxMaL',  // Rachel - Energetic Voice
};

const GOOGLE_PRESETS: Record<string, { languageCode: string; name: string; ssmlGender: 'MALE' | 'FEMALE' }> = {
  'indian-male-1': { languageCode: 'en-IN', name: 'en-IN-Wavenet-B', ssmlGender: 'MALE' },
  'indian-male-2': { languageCode: 'en-IN', name: 'en-IN-Wavenet-C', ssmlGender: 'MALE' },
  'indian-female-1': { languageCode: 'en-IN', name: 'en-IN-Wavenet-A', ssmlGender: 'FEMALE' },
  'indian-female-2': { languageCode: 'en-IN', name: 'en-IN-Wavenet-D', ssmlGender: 'FEMALE' },
  'deep-narrator': { languageCode: 'en-US', name: 'en-US-Journey-D', ssmlGender: 'MALE' },
  'historical-wise': { languageCode: 'en-GB', name: 'en-GB-Wavenet-D', ssmlGender: 'MALE' },
  'child-friendly': { languageCode: 'en-US', name: 'en-US-Standard-A', ssmlGender: 'FEMALE' },
};

function enhanceTextNaturalness(text: string, engine: 'elevenlabs' | 'google'): string {
  let clean = text.trim();
  if (clean.length === 0) return '';
  if (engine === 'elevenlabs') {
    clean = clean.replace(/;\s+/g, ', ');
    clean = clean.replace(/:\s+/g, ', ... ');
    clean = clean.replace(/([.!?])\s+/g, '$1 ... ');
    return clean;
  } else {
    let ssmlBody = clean;
    ssmlBody = ssmlBody.replace(/,\s*/g, ', <break time="250ms"/>');
    ssmlBody = ssmlBody.replace(/([.!?])\s*/g, '$1 <break time="450ms"/>');
    return `<speak><prosody pitch="+1%" rate="97%">${ssmlBody}</prosody></speak>`;
  }
}

// Google TTS voice mapping by language
const GOOGLE_VOICE_MAP: Record<string, { languageCode: string; maleName: string; femaleName: string }> = {
  english: { languageCode: 'en-US', maleName: 'en-US-Journey-D', femaleName: 'en-US-Journey-F' },
  hindi: { languageCode: 'hi-IN', maleName: 'hi-IN-Wavenet-B', femaleName: 'hi-IN-Wavenet-A' },
  marathi: { languageCode: 'mr-IN', maleName: 'mr-IN-Standard-B', femaleName: 'mr-IN-Standard-A' },
};

// Mood-based voice adjustments
const MOOD_ADJUSTMENTS: Record<string, { pitchDelta: number; rateDelta: number }> = {
  enthusiastic: { pitchDelta: 0.15, rateDelta: 0.1 },
  calm: { pitchDelta: -0.1, rateDelta: -0.1 },
  serious: { pitchDelta: -0.15, rateDelta: -0.05 },
  playful: { pitchDelta: 0.1, rateDelta: 0.08 },
  neutral: { pitchDelta: 0, rateDelta: 0 },
};

const FEMALE_CHARACTERS = new Set(['curie', 'cleopatra']);

// Character pacing estimator for fallbacks
function estimateAlignment(text: string) {
  const characters = text.split('');
  const startTimes: number[] = [];
  const endTimes: number[] = [];
  let currentTime = 0;

  characters.forEach((char) => {
    let duration = 0.065; // average speaking time per char
    if (char === ' ') {
      duration = 0.12;
    } else if (/[.,!?;]/.test(char)) {
      duration = 0.3;
    }
    startTimes.push(currentTime);
    currentTime += duration;
    endTimes.push(currentTime);
  });

  return {
    characters,
    character_start_times_seconds: startTimes,
    character_end_times_seconds: endTimes,
  };
}

// ── Trim text to performance budget (max 3 sentences for TTS) ──
function trimForTTS(text: string, maxSentences: number = 3): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, characterId, language = 'english', mood = 'neutral', voiceOverride } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Trim text to performance budget
    const trimmedText = trimForTTS(text);

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    const googleApiKey = process.env.GOOGLE_CLOUD_API_KEY;

    // Retrieve character config
    const charData = getCharacterById(characterId);

    // Heuristics for gender and Indian origin detection
    let isFemale = FEMALE_CHARACTERS.has(characterId) || 
                     (charData?.category === 'custom' && charData?.emoji === '👩') || 
                     charData?.name.toLowerCase().includes('rani') || 
                     charData?.name.toLowerCase().includes('savitribai') || 
                     charData?.name.toLowerCase().includes('kalpana') || 
                     charData?.name.toLowerCase().includes('curie') ||
                     charData?.name.toLowerCase().includes('cleopatra') ||
                     charData?.voiceProfile?.voiceName?.toLowerCase().includes('female') ||
                     charData?.voiceProfile?.voiceName?.toLowerCase().includes('woman');

    let isIndian = charData?.voiceProfile?.accent?.includes('IN') || 
                     charData?.defaultLanguage === 'hindi' || 
                     charData?.defaultLanguage === 'marathi' ||
                     characterId === 'gandhi' || 
                     characterId === 'kalam' || 
                     characterId === 'vivekananda' ||
                     characterId === 'shivaji' ||
                     characterId === 'ambedkar';

    if (voiceOverride && GOOGLE_PRESETS[voiceOverride]) {
      const preset = GOOGLE_PRESETS[voiceOverride];
      isFemale = preset.ssmlGender === 'FEMALE';
      isIndian = preset.languageCode.includes('IN');
    }

    let voiceId = voiceOverride && ELEVENLABS_PRESETS[voiceOverride]
      ? ELEVENLABS_PRESETS[voiceOverride]
      : ELEVENLABS_VOICE_MAP[characterId];

    if (!voiceId) {
      if (isIndian) {
        voiceId = isFemale 
          ? '2F1KINpxsttim2WfMbVs' // DB - Indian Hindi Voice (female)
          : 'v984ziaDjt5EKuv3UFRU'; // Akshay - Young Indian Male (clear)
      } else {
        voiceId = isFemale 
          ? 'hpp4J3VqNfWAUOO0d1Us' // Bella (female)
          : 'JBFqnCBsd6RMkjVDRZzb'; // George (male)
      }
    }

    // Enhance text naturalness
    const enhancedTextEleven = enhanceTextNaturalness(trimmedText, 'elevenlabs');
    const enhancedTextGoogle = enhanceTextNaturalness(trimmedText, 'google');

    // 1. Attempt ElevenLabs (English only — multilingual model supports all, but primary for English)
    if (elevenLabsApiKey && language === 'english') {
      try {
        console.log(`TTS API: Requesting ElevenLabs for voice ${voiceId} (isIndian: ${isIndian})...`);
        let response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': elevenLabsApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: enhancedTextEleven,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.75,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true,
              },
            }),
          }
        );

        // Retry with a guaranteed default voice if the custom voice ID is not found (404)
        if (response.status === 404) {
          const defaultVoiceId = isIndian
            ? (isFemale ? '2F1KINpxsttim2WfMbVs' : 'v984ziaDjt5EKuv3UFRU')
            : (isFemale ? 'hpp4J3VqNfWAUOO0d1Us' : 'pNInz6obpgDQGcFmaJgB');
          
          console.warn(`TTS API: Custom voice ${voiceId} not found. Retrying with pre-made default voice ${defaultVoiceId}...`);
          
          response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${defaultVoiceId}/with-timestamps`,
            {
              method: 'POST',
              headers: {
                'xi-api-key': elevenLabsApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: enhancedTextEleven,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                  stability: 0.75,
                  similarity_boost: 0.75,
                  style: 0.0,
                  use_speaker_boost: true,
                },
              }),
            }
          );
        }

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            audio: `data:audio/mpeg;base64,${data.audio_base64}`,
            alignment: {
              characters: data.alignment.characters,
              startTimes: data.alignment.character_start_times_seconds,
              endTimes: data.alignment.character_end_times_seconds,
            },
            engine: 'elevenlabs',
          });
        } else {
          const errorMsg = await response.text();
          console.warn(`TTS API: ElevenLabs failed. Response status: ${response.status}. Msg: ${errorMsg}`);
        }
      } catch (err) {
        console.warn('TTS API: ElevenLabs fetch error:', err);
      }
    }

    // 2. Attempt Google Cloud TTS Fallback (supports multi-language + mood)
    if (googleApiKey) {
      try {
        console.log(`TTS API: Requesting Google Cloud TTS (lang: ${language}, mood: ${mood})...`);

        const voiceConfig = GOOGLE_VOICE_MAP[language] || GOOGLE_VOICE_MAP.english;
        const moodAdj = MOOD_ADJUSTMENTS[mood] || MOOD_ADJUSTMENTS.neutral;

        let languageCode = voiceConfig.languageCode;
        let voiceName = isFemale ? voiceConfig.femaleName : voiceConfig.maleName;

        if (voiceOverride && GOOGLE_PRESETS[voiceOverride]) {
          const preset = GOOGLE_PRESETS[voiceOverride];
          languageCode = preset.languageCode;
          voiceName = preset.name;
        } else if (language === 'english' && isIndian) {
          languageCode = 'en-IN';
          voiceName = isFemale ? 'en-IN-Wavenet-A' : 'en-IN-Wavenet-B';
        }

        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { ssml: enhancedTextGoogle },
              voice: {
                languageCode: languageCode,
                name: voiceName,
                ssmlGender: isFemale ? 'FEMALE' : 'MALE',
              },
              audioConfig: {
                audioEncoding: 'MP3',
                pitch: moodAdj.pitchDelta * 20, // Google uses semitones (-20 to 20)
                speakingRate: 1.0 + moodAdj.rateDelta,
              },
            }),

          }
        );

        if (response.ok) {
          const data = await response.json();
          const alignment = estimateAlignment(trimmedText);
          return NextResponse.json({
            audio: `data:audio/mpeg;base64,${data.audioContent}`,
            alignment: {
              characters: alignment.characters,
              startTimes: alignment.character_start_times_seconds,
              endTimes: alignment.character_end_times_seconds,
            },
            engine: 'google',
          });
        } else {
          const errorMsg = await response.text();
          console.warn(`TTS API: Google Cloud TTS failed. Status: ${response.status}. Msg: ${errorMsg}`);
        }
      } catch (err) {
        console.warn('TTS API: Google Cloud TTS fetch error:', err);
      }
    }

    // 3. Absolute Fallback: offline text-to-speech response
    console.log('TTS API: Both APIs unavailable. Returning client-side fallback triggers.');
    const alignment = estimateAlignment(trimmedText);
    return NextResponse.json({
      audio: null, // Signals client to use window.SpeechSynthesis
      alignment: {
        characters: alignment.characters,
        startTimes: alignment.character_start_times_seconds,
        endTimes: alignment.character_end_times_seconds,
      },
      engine: 'client-fallback',
      language, // Pass language so client can pick correct SpeechSynthesis voice
    });

  } catch (error) {
    console.error('TTS API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
