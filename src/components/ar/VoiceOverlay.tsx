'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/stores/sessionStore';
import { speechEngine } from '@/lib/tts/speechEngine';

// ─────────────────────────────────────────────────────────────
// SubtitleOverlay — shows character speech as captions
// ─────────────────────────────────────────────────────────────

export function SubtitleOverlay() {
  return null;
}

// ─────────────────────────────────────────────────────────────
// SpeakButton — triggers TTS for a given text
// ─────────────────────────────────────────────────────────────

interface SpeakButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function SpeakButton({ text, label, className }: SpeakButtonProps) {
  const { character, setIsSpeaking, setMouthOpen, setSubtitle } = useSessionStore();
  const [isActive, setIsActive] = useState(false);

  const handleSpeak = useCallback(() => {
    if (!character) return;

    if (speechEngine.isSpeaking) {
      speechEngine.stop();
      setIsActive(false);
      setIsSpeaking(false);
      setMouthOpen(0);
      return;
    }

    setIsActive(true);
    setSubtitle(text);

    speechEngine.speak({
      text,
      voiceProfile: character.voiceProfile,
      onStart: () => { setIsSpeaking(true); setMouthOpen(0.5); },
      onEnd:   () => { setIsActive(false); setIsSpeaking(false); setMouthOpen(0); },
      onWord:  (word) => {
        // Handled dynamically by faceMorphs in the speech engine tick loop
      },
      onError: () => { setIsActive(false); setIsSpeaking(false); },
    });
  }, [text, character, setIsSpeaking, setMouthOpen, setSubtitle]);

  return (
    <motion.button
      onClick={handleSpeak}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${className}`}
      style={{
        background: isActive ? 'rgba(98,120,248,0.3)' : 'rgba(98,120,248,0.1)',
        border: `1px solid ${isActive ? 'rgba(98,120,248,0.7)' : 'rgba(98,120,248,0.25)'}`,
        color: '#8199fb',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      {isActive ? (
        <>
          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
            ⏹
          </motion.span>
          Stop
        </>
      ) : (
        <><span>🔊</span> {label ?? 'Speak'}</>
      )}
    </motion.button>
  );
}
