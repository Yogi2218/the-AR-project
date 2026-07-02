'use client';
import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Play, Square,
  RotateCcw, MessageSquare
} from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { speechEngine } from '@/lib/tts/speechEngine';
import { SpeakButton } from '@/components/ar/VoiceOverlay';

// ─────────────────────────────────────────────────────────────
// ScriptPlayer — Presenter control panel for scripted sessions
// Teacher navigates Q&A, triggers character speech
// ─────────────────────────────────────────────────────────────

export default function ScriptPlayer() {
  const {
    character, currentScriptLine, scriptIndex,
    nextScriptLine, prevScriptLine, setCurrentScriptLine,
    setSubtitle, setIsSpeaking, setMouthOpen, addInteraction,
    activeScript,
  } = useSessionStore();

  const [showAllScripts, setShowAllScripts] = useState(false);

  const speakCurrentLine = useCallback(() => {
    if (!currentScriptLine || !character) return;

    const text = currentScriptLine.answer;
    setSubtitle(text);
    addInteraction({ speaker: 'character', message: text, inputType: 'button' });

    speechEngine.speak({
      text,
      voiceProfile: character.voiceProfile,
      onStart: () => { setIsSpeaking(true); setMouthOpen(0.5); },
      onEnd:   () => { setIsSpeaking(false); setMouthOpen(0); },
      onWord:  (word) => {
        const v = word.match(/[aeiouáéíóú]/gi)?.length ?? 1;
        setMouthOpen(Math.min(0.9, v * 0.3));
      },
    });
  }, [currentScriptLine, character, setSubtitle, addInteraction, setIsSpeaking, setMouthOpen]);

  const speakIntro = useCallback(() => {
    if (!character) return;
    const text = character.introMonologue;
    setSubtitle(text);
    speechEngine.speak({
      text,
      voiceProfile: character.voiceProfile,
      onStart: () => { setIsSpeaking(true); setMouthOpen(0.6); },
      onEnd:   () => { setIsSpeaking(false); setMouthOpen(0); },
    });
  }, [character, setSubtitle, setIsSpeaking, setMouthOpen]);

  if (!character) return null;

  const totalLines = activeScript.length;

  return (
    <div className="glass-dark rounded-2xl p-4 space-y-4" style={{ border: '1px solid rgba(98,120,248,0.25)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{character.emoji}</span>
          <div>
            <div className="font-semibold text-white text-sm">{character.name}</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{character.subject}</div>
          </div>
        </div>
        <button
          onClick={speakIntro}
          className="text-xs btn-secondary py-1 px-3"
        >
          🎭 Intro
        </button>
      </div>

      {/* ── Current Script Line ── */}
      <AnimatePresence mode="wait">
        {currentScriptLine && (
          <motion.div
            key={currentScriptLine.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(98,120,248,0.08)', border: '1px solid rgba(98,120,248,0.2)' }}
          >
            {/* Question */}
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: '#8199fb' }}>
                STUDENT QUESTION ({scriptIndex + 1}/{totalLines})
              </div>
              <div className="text-sm text-white font-medium">{currentScriptLine.question}</div>
            </div>

            {/* Keywords */}
            <div className="flex flex-wrap gap-1">
              {currentScriptLine.keywords.slice(0, 4).map((kw) => (
                <span key={kw} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(98,120,248,0.15)', color: 'rgba(145,150,184,0.9)' }}>
                  {kw}
                </span>
              ))}
            </div>

            {/* Answer preview */}
            <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>CHARACTER ANSWER</div>
              <div className="text-sm text-white leading-relaxed line-clamp-3">
                {currentScriptLine.answer}
              </div>
            </div>

            {/* Follow-up */}
            {currentScriptLine.followUp && (
              <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="text-xs" style={{ color: '#fbbf24' }}>
                  💡 <strong>Follow-up:</strong> {currentScriptLine.followUp}
                </div>
              </div>
            )}

            {/* Speak button */}
            <SpeakButton
              text={currentScriptLine.answer}
              label="Character Speaks This Answer"
              className="w-full justify-center"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={prevScriptLine}
          disabled={scriptIndex === 0}
          className="flex-1 btn-secondary py-2 px-3 flex items-center justify-center gap-1 text-sm disabled:opacity-40"
        >
          <ChevronLeft size={16} /> Prev
        </button>

        <div className="text-xs text-center px-2" style={{ color: 'var(--text-secondary)', minWidth: 50 }}>
          {scriptIndex + 1} / {totalLines}
        </div>

        <button
          onClick={nextScriptLine}
          disabled={scriptIndex === totalLines - 1}
          className="flex-1 btn-secondary py-2 px-3 flex items-center justify-center gap-1 text-sm disabled:opacity-40"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* ── All scripts toggle ── */}
      <button
        onClick={() => setShowAllScripts((v) => !v)}
        className="w-full text-xs py-2 rounded-xl flex items-center justify-center gap-2"
        style={{ color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)' }}
      >
        <MessageSquare size={12} />
        {showAllScripts ? 'Hide' : 'Show All'} Q&A Scripts
      </button>

      {/* ── All Scripts List ── */}
      <AnimatePresence>
        {showAllScripts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-2 max-h-64 overflow-y-auto"
          >
            {activeScript.map((line, i) => (
              <button
                key={line.id}
                onClick={() => { setCurrentScriptLine(line); setShowAllScripts(false); }}
                className="w-full text-left p-3 rounded-xl transition-all text-sm"
                style={{
                  background: i === scriptIndex ? 'rgba(98,120,248,0.2)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${i === scriptIndex ? 'rgba(98,120,248,0.5)' : 'transparent'}`,
                  color: i === scriptIndex ? 'white' : 'var(--text-secondary)',
                }}
              >
                <span className="text-xs mr-2" style={{ color: '#8199fb' }}>Q{i + 1}</span>
                {line.question}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
