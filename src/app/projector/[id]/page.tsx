'use client';
// ─────────────────────────────────────────────────────────────
// Projector Mode Page — opens in second window/display
// Fullscreen AR character on projector/stage
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { getCharacterById } from '@/lib/characters/characterData';
import { useSessionStore } from '@/stores/sessionStore';
import { SubtitleOverlay } from '@/components/ar/VoiceOverlay';
import { speechEngine } from '@/lib/tts/speechEngine';

const ARScene = dynamic(() => import('@/components/ar/ARScene'), { ssr: false });

export default function ProjectorPage() {
  const params    = useParams<{ id: string }>();
  const { character, startSession, currentSubtitle, isSpeaking, isRecording, loadRoomLayout } = useSessionStore();
  const [showAR, setShowAR] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const char = getCharacterById(params.id);
    if (char) {
      if (!character) {
        startSession(char, 'scripted');
      } else {
        loadRoomLayout(char.id);
      }
    }
    setShowAR(true);

    // Keyboard shortcut: F for fullscreen
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === `layout_${params.id}`) {
        loadRoomLayout(params.id);
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('storage', onStorage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const char = mounted ? (character ?? getCharacterById(params.id)) : undefined;

  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: '#040508' }}>
      {/* AR Canvas */}
      {showAR && <ARScene />}

      {/* Subtitle */}
      <SubtitleOverlay />

      {/* Top-right corner logo (small, unobtrusive) */}
      <div className="absolute top-4 right-4 z-20 opacity-30 hover:opacity-80 transition-opacity">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white"
               style={{ background: '#6278f8' }}>AR</div>
          <span className="text-white text-xs font-medium">EduAR</span>
        </div>
      </div>

      {/* Character name + status bottom-left */}
      {char && (
        <div className="absolute bottom-6 left-6 z-20">
          <motion.div
            className="glass-dark rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ border: '1px solid rgba(98,120,248,0.3)' }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="text-3xl">{char.emoji}</span>
            <div>
              <div className="font-display font-bold text-white">{char.name}</div>
              <div className="text-sm" style={{ color: '#8199fb' }}>{char.subject}</div>
            </div>
            {isSpeaking && (
              <div className="flex gap-0.5 ml-2">
                {[0,1,2,3].map((i) => (
                  <motion.div key={i} className="w-1 rounded-full"
                    style={{ background: '#6278f8', height: 4 }}
                    animate={{ scaleY: [1, 4, 1] }}
                    transition={{ duration: 0.4, delay: i * 0.1, repeat: Infinity }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Hint: press F for fullscreen */}
      <div className="absolute bottom-6 right-6 z-20 text-xs opacity-40" style={{ color: 'var(--text-secondary)' }}>
        Press F for fullscreen
      </div>
    </div>
  );
}
