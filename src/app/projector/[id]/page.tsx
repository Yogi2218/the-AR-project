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
  const {
    character, startSession, currentSubtitle, isSpeaking, isRecording, loadRoomLayout,
    setCharacterPosition, setCharacterRotation, setCharacterScale,
    setCameraOpacity, setCameraBlur, setCameraMirror,
    setShowGrid, setShowCenteringGuide,
    setBackgroundMode, setBackgroundImageUrl, setBackgroundVideoUrl,
    setShowSelfieSegmentation, setActiveExpression,
    setSubtitle, setIsSpeaking, setMouthOpen, setActiveScript
  } = useSessionStore();
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

    // Cross-window sync via BroadcastChannel
    const channel = new BroadcastChannel('eduar-session');
    channel.onmessage = (e) => {
      const { type, layout, script, line } = e.data;
      
      if (type === 'UPDATE_LAYOUT' && layout) {
        if (layout.characterPosition) setCharacterPosition(layout.characterPosition);
        if (layout.characterRotation) setCharacterRotation(layout.characterRotation);
        if (layout.characterScale !== undefined) setCharacterScale(layout.characterScale);
        if (layout.cameraOpacity !== undefined) setCameraOpacity(layout.cameraOpacity);
        if (layout.cameraBlur !== undefined) setCameraBlur(layout.cameraBlur);
        if (layout.cameraMirror !== undefined) setCameraMirror(layout.cameraMirror);
        if (layout.showGrid !== undefined) setShowGrid(layout.showGrid);
        if (layout.showCenteringGuide !== undefined) setShowCenteringGuide(layout.showCenteringGuide);
        if (layout.backgroundMode) setBackgroundMode(layout.backgroundMode);
        if (layout.backgroundImageUrl !== undefined) setBackgroundImageUrl(layout.backgroundImageUrl);
        if (layout.backgroundVideoUrl !== undefined) setBackgroundVideoUrl(layout.backgroundVideoUrl);
        if (layout.showSelfieSegmentation !== undefined) setShowSelfieSegmentation(layout.showSelfieSegmentation);
        if (layout.activeExpression) setActiveExpression(layout.activeExpression);
      } else if (type === 'SET_ACTIVE_SCRIPT' && script) {
        setActiveScript(script);
      } else if (type === 'SPEAK_LINE' && line) {
        const activeChar = char || character;
        if (activeChar) {
          setSubtitle(line.answer);
          speechEngine?.speak({
            text: line.answer,
            voiceProfile: activeChar.voiceProfile,
            characterId: activeChar.id,
            preRecordedAudio: line.audio,
            preRecordedAlignment: line.alignment,
            onStart: () => { setIsSpeaking(true); setMouthOpen(0.5); },
            onEnd:   () => { setIsSpeaking(false); setMouthOpen(0); },
            onWord:  (word) => {
              const v = word.match(/[aeiouáéíóú]/gi)?.length ?? 1;
              setMouthOpen(Math.min(0.9, v * 0.3));
            }
          });
        }
      } else if (type === 'SPEAK_INTRO') {
        const activeChar = char || character;
        if (activeChar) {
          setSubtitle(activeChar.introMonologue);
          
          const playSpeech = () => {
            speechEngine?.speak({
              text: activeChar.introMonologue,
              voiceProfile: activeChar.voiceProfile,
              characterId: activeChar.id,
              onStart: () => { setIsSpeaking(true); setMouthOpen(0.6); },
              onEnd:   () => { setIsSpeaking(false); setMouthOpen(0); },
            });
          };

          if (activeChar.category === 'animal') {
            const soundUrl = activeChar.id === 'lion'
              ? 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Panthera_leo_roar.ogg'
              : 'https://upload.wikimedia.org/wikipedia/commons/8/81/Tiger_Growl.ogg';
            const audioSfx = new Audio(soundUrl);
            audioSfx.volume = 0.8;
            audioSfx.play().catch(e => console.warn('SFX failed:', e));
            // Delay speech slightly to let the roar play
            setTimeout(playSpeech, 1500);
          } else {
            playSpeech();
          }
        }
      } else if (type === 'STOP_SPEAKING') {
        speechEngine?.stop();
        setIsSpeaking(false);
        setMouthOpen(0);
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('storage', onStorage);
      channel.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

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
