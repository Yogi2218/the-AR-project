'use client';
import { useState, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/stores/sessionStore';
import { useAIEngine } from '@/hooks/useAIEngine';

// ─────────────────────────────────────────────────────────────
// VoiceInput — Web Speech API microphone input
// Captures student speech, matches to script keywords,
// triggers character response automatically.
// ─────────────────────────────────────────────────────────────

interface VoiceInputProps {
  onTranscript?: (text: string) => void;
}

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const [error,       setError]       = useState('');
  const [supported,   setSupported]   = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const { character } = useSessionStore();
  const { handleQuestion, isProcessing } = useAIEngine();

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';
      setRecognition(rec);
    }
  }, []);

  const handleMatch = useCallback(async (input: string) => {
    if (!character || isProcessing) return;
    await handleQuestion(input);
  }, [character, handleQuestion, isProcessing]);

  const startListening = useCallback(() => {
    if (!recognition) return;
    setError('');
    setTranscript('');
    setIsListening(true);

    recognition.onresult = (event: any) => {
      const current = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join('');
      setTranscript(current);
      onTranscript?.(current);

      if (event.results[event.results.length - 1].isFinal) {
        handleMatch(current);
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      setError(event.error === 'no-speech' ? 'No speech detected. Try again.' : `Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [recognition, handleMatch, onTranscript]);

  const stopListening = useCallback(() => {
    recognition?.stop();
    setIsListening(false);
  }, [recognition]);

  if (!supported) {
    return (
      <div className="text-xs text-center px-3 py-2 rounded-xl"
           style={{ color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)' }}>
        Voice input requires Chrome or Edge
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Mic button */}
      <motion.button
        onClick={isListening ? stopListening : startListening}
        className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all"
        style={{
          background: isListening
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #6278f8, #4a57ed)',
          boxShadow: isListening
            ? '0 0 30px rgba(239,68,68,0.6)'
            : '0 0 20px rgba(98,120,248,0.4)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
      >
        {isListening ? (
          <>
            {/* Pulse rings */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-red-400"
              animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-red-400"
              animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
              transition={{ duration: 1, delay: 0.3, repeat: Infinity }}
            />
            <MicOff size={22} color="white" />
          </>
        ) : (
          <Mic size={22} color="white" />
        )}
      </motion.button>

      {/* State label */}
      <div className="text-xs font-medium" style={{ color: isListening ? '#f87171' : 'var(--text-secondary)' }}>
        {isListening ? '🎙 Listening...' : 'Tap to speak'}
      </div>

      {/* Live transcript */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-3 py-2 rounded-xl text-sm max-w-xs text-center"
            style={{ background: 'rgba(98,120,248,0.1)', color: '#8199fb', border: '1px solid rgba(98,120,248,0.2)' }}
          >
            "{transcript}"
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs px-3 py-1"
            style={{ color: '#f87171' }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
