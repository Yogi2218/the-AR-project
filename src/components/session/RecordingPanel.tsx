'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Video, VideoOff, Pause, Play, Download, Circle
} from 'lucide-react';
import { sessionRecorder, SessionRecorder } from '@/lib/recording/sessionRecorder';
import { useSessionStore } from '@/stores/sessionStore';

// ─────────────────────────────────────────────────────────────
// RecordingPanel — session recording controls
// ─────────────────────────────────────────────────────────────

export default function RecordingPanel() {
  const { isRecording, setIsRecording, recordingDuration, setRecordingDuration } = useSessionStore();
  const [isPaused, setIsPaused] = useState(false);
  const [error,    setError]    = useState('');
  const [savedBlob, setSavedBlob] = useState<Blob | null>(null);
  const [mode,     setMode]     = useState<'screen' | 'canvas'>('screen');

  useEffect(() => {
    sessionRecorder.onDurationChange = (s) => setRecordingDuration(s);
    sessionRecorder.onStateChange = (state) => {
      setIsRecording(state === 'recording');
      setIsPaused(state === 'paused');
    };
  }, [setIsRecording, setRecordingDuration]);

  const startRecording = useCallback(async () => {
    setError('');
    setSavedBlob(null);
    const ok = await sessionRecorder.startScreenRecording();
    if (!ok) setError('Could not access screen. Try Canvas mode.');
  }, []);

  const pauseResume = useCallback(() => {
    if (isPaused) sessionRecorder.resume();
    else          sessionRecorder.pause();
  }, [isPaused]);

  const stopRecording = useCallback(async () => {
    const blob = await sessionRecorder.stop();
    if (blob) setSavedBlob(blob);
    setIsRecording(false);
    setRecordingDuration(0);
  }, [setIsRecording, setRecordingDuration]);

  const downloadRecording = useCallback(() => {
    if (!savedBlob) return;
    const ts = new Date().toISOString().slice(0, 16).replace('T', '_');
    SessionRecorder.downloadBlob(savedBlob, `EduAR_Session_${ts}.webm`);
  }, [savedBlob]);

  return (
    <div className="glass-dark rounded-2xl p-4 space-y-3" style={{ border: '1px solid rgba(98,120,248,0.25)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video size={16} color="#8199fb" />
          <span className="text-sm font-semibold text-white">Session Recording</span>
        </div>
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="recording-dot" />
            <span className="text-sm font-mono text-white">
              {SessionRecorder.formatDuration(recordingDuration)}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      {!isRecording && !savedBlob ? (
        <button onClick={startRecording} className="btn-danger w-full flex items-center justify-center gap-2 py-3">
          <Circle size={14} />
          Start Recording
        </button>
      ) : isRecording ? (
        <div className="flex gap-2">
          <button onClick={pauseResume} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={stopRecording} className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>
            <VideoOff size={14} /> Stop
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-center py-2 rounded-xl"
               style={{ background: 'rgba(74,222,128,0.1)', color: '#86efac', border: '1px solid rgba(74,222,128,0.2)' }}>
            ✓ Recording saved ({(savedBlob!.size / 1024 / 1024).toFixed(1)} MB)
          </div>
          <div className="flex gap-2">
            <button onClick={downloadRecording} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Download size={14} /> Download MP4
            </button>
            <button onClick={() => { setSavedBlob(null); }} className="btn-secondary flex items-center justify-center px-4">
              New
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs px-3 py-2 rounded-xl"
             style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Records screen + microphone audio
      </div>
    </div>
  );
}
