'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, CameraOff, Maximize2, Minimize2, Volume2, VolumeX,
  ChevronLeft, Settings2, MessageSquare, Mic, X, Info,
  MonitorPlay, BookOpen, Send, Sliders, Lock, Unlock, RefreshCw,
  Eye, EyeOff, BrainCircuit, ShieldAlert, Activity, ThumbsUp, Edit2, Pin
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { getCharacterById } from '@/lib/characters/characterData';
import { useSessionStore } from '@/stores/sessionStore';
import { speechEngine } from '@/lib/tts/speechEngine';
import ScriptPlayer from '@/components/session/ScriptPlayer';
import RecordingPanel from '@/components/session/RecordingPanel';
import VoiceInput from '@/components/session/VoiceInput';
import { useAIEngine } from '@/hooks/useAIEngine';

// Dynamic import for AR scene (no SSR — needs window/WebGL)
const ARScene = dynamic(() => import('@/components/ar/ARScene'), { ssr: false });

function WebcamPreview() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch((err) => console.warn("Webcam preview access denied:", err));
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);
  return (
    <div className="w-full h-full relative bg-slate-950 flex items-center justify-center overflow-hidden rounded-2xl border border-indigo-500/20">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover scale-x-[-1]"
      />
      <div className="absolute top-4 right-4 bg-indigo-600/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white tracking-wider flex items-center gap-1.5 shadow-lg border border-indigo-400/30">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        PRESENTER FEED
      </div>
    </div>
  );
}

type Panel = 'script' | 'voice' | 'record' | 'info' | 'ai' | null;

export default function SessionPage() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    character, status, startSession, endSession,
    cameraEnabled, toggleCamera, toggleProjectorMode, projectorMode,
    isSpeaking, isRecording, characterState, currentSubtitle,
    setSubtitle, setIsSpeaking, setMouthOpen,

    // Calibration Rig states
    characterPosition, characterRotation, characterScale,
    transformMode, isPlacementLocked, placementMode,
    speechRate,
    cameraOpacity, cameraBlur, cameraOffset, cameraMirror,
    showGrid, showCenteringGuide,
    backgroundMode, backgroundImageUrl, backgroundVideoUrl,
    activeExpression, showSelfieSegmentation, isQuickSetupOpen,

    // Calibration Rig actions
    setCharacterPosition, setCharacterRotation, setCharacterScale,
    setTransformMode, setPlacementLocked, setPlacementMode,
    setSpeechRate,
    setCameraOpacity, setCameraBlur, setCameraOffset, setCameraMirror,
    setShowGrid, setShowCenteringGuide,
    setActiveScript, saveRoomLayout, loadRoomLayout,
    setBackgroundMode, setBackgroundImageUrl, setBackgroundVideoUrl,
    setActiveExpression, setShowSelfieSegmentation, setQuickSetupOpen,

    // AI Engine State
    aiModeEnabled, setAiModeEnabled,
    selectedLanguage, setSelectedLanguage,
    ageGroup, setAgeGroup,
    mood, setMood,
    learningLevel, setLearningLevel,
    lessonGoal, setLessonGoal,
    teacherOverridePrompt, setTeacherOverridePrompt,
    safeMode, setSafeMode,
    costUsage, canUseAI
  } = useSessionStore();

  const searchParams = useSearchParams();
  const isPopup = searchParams.get('popup') === 'true';
  const templateIdParam = searchParams.get('template');

  const [activePanel, setActivePanel] = useState<Panel>('script');
  const [textInput,   setTextInput]   = useState('');
  const [muted,       setMuted]       = useState(false);
  const [showAR,      setShowAR]      = useState(false);
  const [projWin,     setProjWin]     = useState<Window | null>(null);
  const [fullscreenCamera, setFullscreenCamera] = useState(false);

  const [calibrationOpen, setCalibrationOpen] = useState(true);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const { handleQuestion, isProcessing } = useAIEngine();

  // Custom scripts selectors
  const [customScripts, setCustomScripts] = useState<any[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('default');

  // ── Load character & start session ──────────────────────
  useEffect(() => {
    const char = getCharacterById(params.id);
    if (!char) { router.push('/characters'); return; }
    startSession(char, 'scripted');

    // Speak intro after short delay
    setTimeout(() => {
      setSubtitle(char.introMonologue);
      if (isPopup) {
        // Broadcast intro instead of speaking locally
        const channel = new BroadcastChannel('eduar-session');
        channel.postMessage({ type: 'SPEAK_INTRO' });
        channel.close();
        setIsSpeaking(true);
        setMouthOpen(0.6);
        setTimeout(() => {
          setIsSpeaking(false);
          setMouthOpen(0);
        }, 6000);
      } else {
        speechEngine.speak({
          text: char.introMonologue,
          voiceProfile: char.voiceProfile,
          onStart: () => { setIsSpeaking(true); setMouthOpen(0.5); },
          onEnd:   () => { setIsSpeaking(false); setMouthOpen(0); },
        });
      }
    }, 1500);

    setShowAR(true);
    return () => { speechEngine.stop(); endSession(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, isPopup]);

  // Load custom script template from Supabase database if passed
  const { activeScript } = useSessionStore();
  useEffect(() => {
    if (!character || !templateIdParam) return;
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => {
        if (data.templates) {
          const found = data.templates.find((t: any) => t.id === templateIdParam);
          if (found && found.script?.questions) {
            const mapped = found.script.questions.map((q: any, idx: number) => ({
              id: `db_${idx}`,
              question: q.q,
              keywords: [],
              answer: q.a,
              followUp: ''
            }));
            setActiveScript(mapped);
          }
        }
      })
      .catch(console.error);
  }, [character, templateIdParam, setActiveScript]);

  // Broadcast layout & character placement updates in real time
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('eduar-session');
    channel.postMessage({
      type: 'UPDATE_LAYOUT',
      layout: {
        characterPosition,
        characterRotation,
        characterScale,
        cameraOpacity,
        cameraBlur,
        cameraMirror,
        showGrid,
        showCenteringGuide,
        backgroundMode,
        backgroundImageUrl,
        backgroundVideoUrl,
        showSelfieSegmentation,
        activeExpression
      }
    });
    return () => channel.close();
  }, [
    characterPosition, characterRotation, characterScale,
    cameraOpacity, cameraBlur, cameraMirror, showGrid, showCenteringGuide,
    backgroundMode, backgroundImageUrl, backgroundVideoUrl, showSelfieSegmentation,
    activeExpression
  ]);

  // Sync activeScript to Projector page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('eduar-session');
    if (activeScript.length > 0) {
      channel.postMessage({ type: 'SET_ACTIVE_SCRIPT', script: activeScript });
    }
    return () => channel.close();
  }, [activeScript]);

  // Keyboard shortcut triggers (keys 1-9) for scripts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const line = activeScript[num - 1];
        if (line) {
          const channel = new BroadcastChannel('eduar-session');
          if (isPopup) {
            channel.postMessage({ type: 'SPEAK_LINE', line });
            setSubtitle(line.answer);
            setIsSpeaking(true);
            const duration = Math.min(8000, line.answer.length * 70);
            setTimeout(() => {
              setIsSpeaking(false);
              setMouthOpen(0);
            }, duration);
          } else {
            setSubtitle(line.answer);
            speechEngine.speak({
              text: line.answer,
              voiceProfile: character?.voiceProfile || { pitch: 1, rate: 0.9, volume: 1.0, accent: 'en-IN' },
              characterId: character?.id,
              onStart: () => { setIsSpeaking(true); setMouthOpen(0.5); },
              onEnd: () => { setIsSpeaking(false); setMouthOpen(0); },
            });
          }
          channel.close();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeScript, character, isPopup, setIsSpeaking, setMouthOpen, setSubtitle]);

  // Load custom scripts list
  useEffect(() => {
    if (!character) return;
    const list = [];
    const seen = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('script_') && !seen.has(key)) {
        seen.add(key);
        try {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            if (parsed.characterId === character.id) {
              list.push({ ...parsed, id: key });
            }
          }
        } catch (e) {
          console.warn('Failed to parse script for dropdown:', e);
        }
      }
    }
    setCustomScripts(list);
  }, [character]);

  // Open calibration rig by default in edit mode
  useEffect(() => {
    if (placementMode === 'edit') {
      setCalibrationOpen(true);
    }
  }, [placementMode]);

  // ── Text question submit ─────────────────────────────────
  const handleTextSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !character || isProcessing) return;
    
    const question = textInput;
    setTextInput('');
    await handleQuestion(question);
  }, [textInput, character, isProcessing, handleQuestion]);

  // ── Projector mode ───────────────────────────────────────
  const handleProjectorMode = useCallback(() => {
    if (projWin && !projWin.closed) {
      projWin.close();
      setProjWin(null);
      toggleProjectorMode();
      return;
    }
    const url = `/projector/${params.id}`;
    const w = window.open(url, '_blank',
      'toolbar=no,location=no,status=no,menubar=no,fullscreen=yes,width=1920,height=1080'
    );
    setProjWin(w);
    toggleProjectorMode();
  }, [projWin, params.id, toggleProjectorMode]);

  // ── Mute toggle ──────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!muted) speechEngine.stop();
    setMuted((v) => !v);
  }, [muted]);

  // ── Layout saving & resetting ────────────────────────────
  const handleSaveLayout = () => {
    if (character) {
      saveRoomLayout(character.id);
      setLayoutSaved(true);
      setTimeout(() => setLayoutSaved(false), 2000);
    }
  };

  const handleResetLayout = () => {
    if (character) {
      setCharacterPosition({ x: 0, y: -1.2, z: -3 });
      setCharacterRotation({ x: 0, y: 0, z: 0 });
      setCharacterScale(1.0);
    }
  };

  // ── Script Switching ─────────────────────────────────────
  const handleScriptChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedScriptId(val);
    if (!character) return;

    if (val === 'default') {
      setActiveScript(character.scripts);
    } else {
      const found = customScripts.find((s) => s.id === val);
      if (found) {
        const mapped = found.pairs.map((p: any, idx: number) => ({
          id: p.id || `custom_${idx}`,
          question: p.question,
          keywords: typeof p.keywords === 'string' ? p.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : (p.keywords || []),
          answer: p.answer,
          followUp: p.followUp,
        }));
        setActiveScript(mapped);
      }
    }
  }, [character, customScripts, setActiveScript]);

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🎭</div>
          <div className="text-white font-medium">Loading character...</div>
        </div>
      </div>
    );
  }

  // Calculate live distance to camera
  const dist = Math.sqrt(
    characterPosition.x ** 2 +
    characterPosition.y ** 2 +
    characterPosition.z ** 2
  );

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: '#050710' }}>

      {/* ── Top Bar ─────────────────────────────────────────── */}
      {!fullscreenCamera && (
        <header className="glass-dark flex items-center gap-3 px-4 py-3 z-30"
                style={{ borderBottom: '1px solid rgba(98,120,248,0.2)' }}>
          <button onClick={() => router.push('/dashboard')}
                  className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-sm">
            <ChevronLeft size={14} /> Back
          </button>

          <div className="flex items-center gap-2 flex-1">
            <span className="text-2xl">{character.emoji}</span>
            <div>
              <div className="font-semibold text-white text-sm">{character.name}</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{character.subject}</div>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2">
            {isRecording && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                   style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                <div className="recording-dot" style={{ width: 7, height: 7 }} />
                REC
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                   style={{ background: 'rgba(98,120,248,0.15)', color: '#8199fb' }}>
                🔊 Speaking
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button onClick={() => { speechEngine.stop(); endSession(); router.push(`/session/${params.id}/setup`); }}
                    className="btn-secondary p-2 flex items-center gap-1 text-xs" title="Back to Stage Setup">
              <Settings2 size={14} /> Setup
            </button>
            <button onClick={toggleCamera}   className="btn-secondary p-2">
              {cameraEnabled ? <Camera size={16} /> : <CameraOff size={16} />}
            </button>
            <button onClick={toggleMute}     className="btn-secondary p-2">
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button onClick={handleProjectorMode} className="btn-secondary p-2 flex items-center gap-1 text-xs">
              <MonitorPlay size={16} />
              {projectorMode ? 'Close Proj.' : 'Projector'}
            </button>
            <button onClick={() => setFullscreenCamera(true)} className="btn-secondary p-2 flex items-center gap-1 text-xs" title="Camera Only Full Screen">
              <Maximize2 size={16} />
              <span>Camera Only</span>
            </button>
          </div>
        </header>
      )}

      {/* ── Main content area ───────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Permanent Left Sidebar for Calibration */}
        {!fullscreenCamera && calibrationOpen && (
          <div className="w-80 h-full glass-dark border-r border-indigo-500/20 flex flex-col z-20 shadow-2xl overflow-hidden"
               style={{ borderRight: '1px solid rgba(98,120,248,0.15)' }}>
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Calibration Rig</span>
              </div>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                Dist: {dist.toFixed(2)}m
              </span>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Placement mode: Edit vs Presentation */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Placement Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPlacementMode('edit')}
                    className={`flex-1 py-1 text-xs rounded-lg border transition-all ${
                      placementMode === 'edit'
                        ? 'bg-indigo-500/20 border-indigo-500 text-white font-medium shadow-inner'
                        : 'border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    Edit Room
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlacementMode('presentation')}
                    className={`flex-1 py-1 text-xs rounded-lg border transition-all ${
                      placementMode === 'presentation'
                        ? 'bg-indigo-500/20 border-indigo-500 text-white font-medium shadow-inner'
                        : 'border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    Presentation
                  </button>
                </div>
              </div>

              {placementMode === 'edit' && (
                <>
                  {/* Lock Placement Toggle */}
                  <div className="flex items-center justify-between bg-white/[0.02] p-2 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-300 font-medium">Lock Transform Gizmo</span>
                    <button
                      type="button"
                      onClick={() => setPlacementLocked(!isPlacementLocked)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isPlacementLocked ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-green-500/20 border-green-500/40 text-green-400'
                      }`}
                    >
                      {isPlacementLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>

                  {!isPlacementLocked && (
                    /* Gizmo Transform Mode */
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Gizmo Tool</label>
                      <div className="flex gap-2">
                        {(['translate', 'rotate', 'scale'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTransformMode(t)}
                            className={`flex-1 py-1 text-[11px] rounded-lg border transition-all capitalize ${
                              transformMode === t
                                ? 'bg-indigo-500/25 border-indigo-500 text-white font-semibold shadow-inner'
                                : 'border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {t === 'translate' ? 'Move' : t === 'rotate' ? 'Rotate' : 'Scale'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tactile Placement Buttons Grid */}
                  <div className="space-y-3 border-t border-white/5 pt-3">
                    <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Tactile Room Controls</span>
                    
                    {/* Position Controls */}
                    <div className="space-y-1">
                      <span className="text-xs text-slate-300 font-medium">Position Character</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setCharacterPosition({ ...characterPosition, x: characterPosition.x - 0.1 })}
                          className="btn-secondary py-1 text-xs hover:bg-indigo-500/20"
                          title="Move Left"
                        >
                          ⬅️ Left
                        </button>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => setCharacterPosition({ ...characterPosition, y: characterPosition.y + 0.1 })}
                            className="btn-secondary py-0.5 text-[10px] hover:bg-indigo-500/20"
                            title="Move Up"
                          >
                            ⬆️ Up
                          </button>
                          <button
                            type="button"
                            onClick={() => setCharacterPosition({ ...characterPosition, y: characterPosition.y - 0.1 })}
                            className="btn-secondary py-0.5 text-[10px] hover:bg-indigo-500/20"
                            title="Move Down"
                          >
                            ⬇️ Down
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCharacterPosition({ ...characterPosition, x: characterPosition.x + 0.1 })}
                          className="btn-secondary py-1 text-xs hover:bg-indigo-500/20"
                          title="Move Right"
                        >
                          ➡️ Right
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setCharacterPosition({ ...characterPosition, z: characterPosition.z + 0.1 })}
                          className="btn-secondary py-1 text-xs hover:bg-indigo-500/20"
                          title="Move Forward"
                        >
                          🔍 Forward
                        </button>
                        <button
                          type="button"
                          onClick={() => setCharacterPosition({ ...characterPosition, z: characterPosition.z - 0.1 })}
                          className="btn-secondary py-1 text-xs hover:bg-indigo-500/20"
                          title="Move Backward"
                        >
                          🔎 Backward
                        </button>
                      </div>
                    </div>

                    {/* Scale Controls */}
                    <div className="space-y-1">
                      <span className="text-xs text-slate-300 font-medium">Scale (x{characterScale.toFixed(2)})</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCharacterScale(Math.max(0.2, characterScale - 0.05))}
                          className="btn-secondary py-1 text-xs hover:bg-indigo-500/20"
                          title="Smaller"
                        >
                          ➖ Smaller
                        </button>
                        <button
                          type="button"
                          onClick={() => setCharacterScale(Math.min(3.0, characterScale + 0.05))}
                          className="btn-secondary py-1 text-xs hover:bg-indigo-500/20"
                          title="Bigger"
                        >
                          ➕ Bigger
                        </button>
                      </div>
                    </div>

                    {/* Voiceover Speed Controls */}
                    <div className="space-y-1 border-t border-white/5 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-300 font-medium">Voiceover Speed</span>
                        <span className="text-[11px] font-mono text-indigo-400 font-bold">{speechRate.toFixed(2)}x</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSpeechRate(Math.max(0.5, speechRate - 0.1))}
                          className="btn-secondary py-1 text-xs hover:bg-indigo-500/20"
                          title="Slower"
                        >
                          🐢 Slower
                        </button>
                        <button
                          type="button"
                          onClick={() => setSpeechRate(Math.min(2.0, speechRate + 0.1))}
                          className="btn-secondary py-1 text-xs hover:bg-indigo-500/20"
                          title="Faster"
                        >
                          ⚡ Faster
                        </button>
                      </div>
                    </div>

                    {/* Rotation Controls */}
                    <div className="space-y-1">
                      <span className="text-xs text-slate-300 font-medium">Rotation</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCharacterRotation({ ...characterRotation, y: characterRotation.y - 0.15 })}
                          className="btn-secondary py-1 text-xs hover:bg-indigo-500/20"
                          title="Rotate Left"
                        >
                          🔄 Rotate L
                        </button>
                        <button
                          type="button"
                          onClick={() => setCharacterRotation({ ...characterRotation, y: characterRotation.y + 0.15 })}
                          className="btn-secondary py-1 text-xs hover:bg-indigo-500/20"
                          title="Rotate Right"
                        >
                          🔄 Rotate R
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Layout saving & reset */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={handleResetLayout}
                      className="flex-1 py-1.5 px-3 rounded-lg border border-white/10 text-[11px] hover:bg-white/5 flex items-center justify-center gap-1 text-slate-300 hover:text-white transition-colors"
                    >
                      <RefreshCw size={12} /> Reset Stage
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveLayout}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all ${
                        layoutSaved
                          ? 'bg-green-600 border border-green-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 border border-indigo-600 text-white'
                      }`}
                    >
                      {layoutSaved ? 'Saved!' : 'Save Stage'}
                    </button>
                  </div>
                </>
              )}

              {/* Guides and overlays */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Guides &amp; Overlays</span>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Show Alignment Grid</span>
                  <button
                    type="button"
                    onClick={() => setShowGrid(!showGrid)}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      showGrid ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-white/10 text-slate-400'
                    }`}
                  >
                    {showGrid ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Centering Crosshair</span>
                  <button
                    type="button"
                    onClick={() => setShowCenteringGuide(!showCenteringGuide)}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      showCenteringGuide ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-white/10 text-slate-400'
                    }`}
                  >
                    {showCenteringGuide ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Custom Background Settings */}
              <div className="space-y-3 border-t border-white/10 pt-3">
                <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Stage Background</span>
                
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Background Mode</label>
                  <select
                    value={backgroundMode}
                    onChange={(e) => setBackgroundMode(e.target.value as any)}
                    className="input-field text-xs py-1.5"
                  >
                    <option value="camera">Live Camera Feed</option>
                    <option value="image">Custom Image Upload</option>
                    <option value="video">Custom Video Loop</option>
                  </select>
                </div>

                {/* Selfie segmentation for all modes */}
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Human Selfie Segmentation</span>
                    <button
                      type="button"
                      onClick={() => setShowSelfieSegmentation(!showSelfieSegmentation)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        showSelfieSegmentation ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-white/10 text-slate-400'
                      }`}
                    >
                      {showSelfieSegmentation ? 'ON' : 'OFF'}
                    </button>
                  </div>

                {backgroundMode === 'image' && (
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-300 font-medium">Upload Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setBackgroundImageUrl(url);
                        }
                      }}
                      className="block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                    />
                    {backgroundImageUrl && (
                      <span className="text-[9px] text-slate-400 truncate block mt-1">Loaded: {backgroundImageUrl}</span>
                    )}
                  </div>
                )}

                {backgroundMode === 'video' && (
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-300 font-medium">Upload Video</label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setBackgroundVideoUrl(url);
                        }
                      }}
                      className="block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                    />
                    {backgroundVideoUrl && (
                      <span className="text-[9px] text-slate-400 truncate block mt-1">Loaded: {backgroundVideoUrl}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Real-time Facial Reactions Selector */}
              <div className="space-y-1.5 border-t border-white/10 pt-3">
                <label className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Manual Face Reaction</label>
                <select
                  value={activeExpression}
                  onChange={(e) => setActiveExpression(e.target.value as any)}
                  className="input-field text-xs py-1.5"
                >
                  <option value="normal">Normal (Neutral)</option>
                  <option value="thinking">Thinking (Asymmetric Brow)</option>
                  <option value="happy">Happy (Smile)</option>
                  <option value="confused">Confused (Head Tilt)</option>
                  <option value="excited">Excited (Wide Eyes)</option>
                  <option value="serious">Serious (Low Brow &amp; Press)</option>
                </select>
              </div>

              {/* Camera Calibration (Opacity and Blur only) */}
              <div className="space-y-3 border-t border-white/10 pt-3">
                <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Camera Adjustments</span>

                {/* Opacity slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Camera Opacity</span>
                    <span className="font-mono text-[10px]">{Math.round(cameraOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={cameraOpacity}
                    onChange={(e) => setCameraOpacity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Blur slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Background Blur</span>
                    <span className="font-mono text-[10px]">{cameraBlur.toFixed(1)}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={cameraBlur}
                    onChange={(e) => setCameraBlur(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Mirror toggle */}
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Mirror Image</span>
                  <button
                    type="button"
                    onClick={() => setCameraMirror(!cameraMirror)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      cameraMirror ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-white/10 text-slate-400'
                    }`}
                  >
                    {cameraMirror ? 'MIRRORED' : 'NORMAL'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AR Canvas — takes full area */}
        <div className="flex-1 relative">
          {showAR && (
            isPopup ? <WebcamPreview /> : <ARScene onCanvasReady={(c) => { canvasRef.current = c; }} />
          )}

          {/* Centering crosshair overlay */}
          {showCenteringGuide && !fullscreenCamera && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              {/* Horizontal line */}
              <div className="absolute w-full h-[1px] bg-cyan-500/40" />
              {/* Vertical line */}
              <div className="absolute h-full w-[1px] bg-cyan-500/40" />
              {/* Center reticle */}
              <div className="w-12 h-12 rounded-full border border-cyan-400/60 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400/80 animate-ping" style={{ animationDuration: '3s' }} />
              </div>
            </div>
          )}

          {/* Floating Calibration Toolbar Panel */}
          {!fullscreenCamera && (
            <div className="absolute top-4 left-4 z-20 flex flex-row items-center gap-2 max-w-[90vw]">
              <button
                type="button"
                onClick={() => setCalibrationOpen(!calibrationOpen)}
                className={`p-2.5 rounded-xl border flex items-center gap-1.5 shadow-lg transition-all ${
                  calibrationOpen 
                    ? 'bg-indigo-500/30 border-indigo-500 text-white' 
                    : 'glass-dark border-indigo-500/30 text-indigo-400 hover:text-white'
                }`}
              >
                <Sliders size={16} />
                <span className="text-xs font-semibold">
                  {calibrationOpen ? 'Hide Calibration' : 'Placement & Calibration'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setQuickSetupOpen(true)}
                className="p-2.5 rounded-xl glass-dark border border-cyan-500/30 text-cyan-400 hover:text-white flex items-center gap-1.5 shadow-lg transition-all"
              >
                <MonitorPlay size={16} />
                <span className="text-xs font-semibold">Set Stage Wizard</span>
              </button>
            </div>
          )}

          {/* Exit Fullscreen Camera button */}
          {fullscreenCamera && (
            <button
              onClick={() => setFullscreenCamera(false)}
              className="absolute top-4 left-4 z-50 p-2 flex items-center gap-1.5 rounded-full glass-dark border text-white hover:bg-white/10 transition-all text-xs font-semibold shadow-lg"
              style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}
              title="Exit Camera Only Mode"
            >
              <Minimize2 size={16} className="text-red-400" />
              <span className="text-red-400">Exit Camera Only</span>
            </button>
          )}

          {/* AR bracket overlay */}
          {!fullscreenCamera && (
            <div className="ar-overlay pointer-events-none">
              <div className="absolute top-8 left-8 bottom-8 right-8">
                <div className="relative w-full h-full">
                  <div className="ar-bracket ar-bracket-tl" />
                  <div className="ar-bracket ar-bracket-tr" />
                  <div className="ar-bracket ar-bracket-bl" />
                  <div className="ar-bracket ar-bracket-br" />
                  <div className="scan-line" />
                </div>
              </div>
            </div>
          )}

          {/* Character state badge */}
          {!fullscreenCamera && (
            <div className="absolute top-4 right-4 z-10">
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2"
                   style={{
                     background: 'rgba(0,0,0,0.6)',
                     border: `1px solid ${isSpeaking ? '#6278f8' : 'rgba(98,120,248,0.2)'}`,
                     color: isSpeaking ? '#8199fb' : 'var(--text-secondary)',
                   }}>
                <div className="w-2 h-2 rounded-full" style={{ background: isSpeaking ? '#6278f8' : '#374151' }} />
                {isSpeaking ? 'Speaking' : characterState === 'idle' ? 'Idle' : characterState}
              </div>
            </div>
          )}

          {/* Teacher Correction UI */}
          {!fullscreenCamera && <TeacherCorrectionUI onRegenerate={handleQuestion} />}

          {/* Text input at bottom */}
          {!fullscreenCamera && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={`Ask ${character.shortName} a question...`}
                  className="input-field flex-1 text-sm py-2.5"
                />
                <button type="submit" className="btn-primary px-4 py-2.5 flex items-center gap-1 text-sm">
                  <Send size={14} /> Ask
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── Right Panel ─────────────────────────────────────── */}
        {!fullscreenCamera && (
          <aside className="w-80 flex-shrink-0 flex flex-col glass-dark overflow-y-auto"
                 style={{ borderLeft: '1px solid rgba(98,120,248,0.15)' }}>

          {/* Panel tabs */}
          <div className="flex border-b" style={{ borderColor: 'rgba(98,120,248,0.15)' }}>
            {[
              { id: 'script', icon: BookOpen, label: 'Script'  },
              { id: 'voice',  icon: Mic,      label: 'Voice'   },
              { id: 'ai',     icon: BrainCircuit, label: 'AI Engine' },
              { id: 'record', icon: Settings2, label: 'Record' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActivePanel(activePanel === id ? null : id as Panel)}
                className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all"
                style={{
                  color: activePanel === id ? '#8199fb' : 'var(--text-secondary)',
                  borderBottom: activePanel === id ? '2px solid #6278f8' : '2px solid transparent',
                  background: activePanel === id ? 'rgba(98,120,248,0.08)' : 'transparent',
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activePanel === 'script' && (
                <motion.div key="script" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {/* Custom Script Switcher */}
                  <div className="glass-card p-3 space-y-2 border border-white/5 bg-white/[0.01]">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      Active Script Path
                    </label>
                    <select
                      value={selectedScriptId}
                      onChange={handleScriptChange}
                      className="input-field text-xs py-1.5"
                    >
                      <option value="default">Default built-in script</option>
                      {customScripts.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <ScriptPlayer />
                </motion.div>
              )}
              {activePanel === 'voice' && (
                <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-white font-semibold mb-1">Student Mic Input</div>
                    <div className="text-sm text-slate-400">
                      Students speak — {character.shortName} responds automatically
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <VoiceInput />
                  </div>
                  
                  {/* Voiceover Speed Adjustment */}
                  <div className="glass-card p-3 border border-white/5 bg-white/[0.01] space-y-2 mt-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      <span>Voiceover Speed Control</span>
                      <span className="font-mono text-cyan-400 font-bold">{speechRate.toFixed(2)}x</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => setSpeechRate(Math.max(0.5, speechRate - 0.05))}
                        className="p-1 px-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all text-xs"
                        title="Slower"
                      >
                        🐢 Slower
                      </button>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setSpeechRate(Math.min(2.0, speechRate + 0.05))}
                        className="p-1 px-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all text-xs"
                        title="Faster"
                      >
                        ⚡ Faster
                      </button>
                    </div>
                  </div>

                  <div className="w-full glass-card p-3 text-xs text-center text-slate-400">
                    💡 Tip: Use Chrome or Edge for best voice recognition
                  </div>
                </motion.div>
              )}
              {activePanel === 'record' && (
                <motion.div key="record" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <RecordingPanel />

                  {/* Projector guide */}
                  <div className="glass-card p-4 mt-4 space-y-3">
                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                      <MonitorPlay size={16} color="#8199fb" /> Projector Mode
                    </div>
                    <ol className="text-xs space-y-2" style={{ color: 'var(--text-secondary)' }}>
                      <li>1. Connect HDMI to projector</li>
                      <li>2. Set projector as <strong style={{ color: 'white' }}>Extended Display</strong></li>
                      <li>3. Click <strong style={{ color: 'white' }}>Projector</strong> button above</li>
                      <li>4. Move the new window to projector screen & fullscreen</li>
                    </ol>
                    <button onClick={handleProjectorMode} className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2">
                      <MonitorPlay size={14} />
                      {projectorMode ? 'Close Projector Window' : 'Open Projector Mode'}
                    </button>
                  </div>
                </motion.div>
              )}
              {activePanel === 'ai' && (
                <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="flex items-center justify-between glass-card p-3 border border-indigo-500/30">
                    <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
                      <BrainCircuit size={16} /> Enable Gemini AI
                    </div>
                    <button
                      onClick={() => setAiModeEnabled(!aiModeEnabled)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${aiModeEnabled ? 'bg-indigo-500' : 'bg-slate-600'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${aiModeEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  <div className={`space-y-4 transition-opacity ${!aiModeEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="glass-card p-3 space-y-3 border border-white/5 bg-white/[0.01]">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Classroom Profile</h3>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400">Language</label>
                          <select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value as any)} className="input-field text-xs py-1.5 w-full">
                            <option value="english">English</option>
                            <option value="hindi">Hindi</option>
                            <option value="marathi">Marathi</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400">Age Group</label>
                          <select value={ageGroup} onChange={e => setAgeGroup(e.target.value as any)} className="input-field text-xs py-1.5 w-full">
                            <option value="5-7">5-7 yrs</option>
                            <option value="8-10">8-10 yrs</option>
                            <option value="11-14">11-14 yrs</option>
                            <option value="15+">15+ yrs</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400">Level</label>
                          <select value={learningLevel} onChange={e => setLearningLevel(e.target.value as any)} className="input-field text-xs py-1.5 w-full">
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400">Mood</label>
                          <select value={mood} onChange={e => setMood(e.target.value as any)} className="input-field text-xs py-1.5 w-full">
                            <option value="neutral">Neutral</option>
                            <option value="enthusiastic">Enthusiastic</option>
                            <option value="calm">Calm</option>
                            <option value="playful">Playful</option>
                            <option value="serious">Serious</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-white/5">
                        <label className="text-[10px] text-slate-400">Lesson Goal (Optional)</label>
                        <input
                          type="text"
                          value={lessonGoal}
                          onChange={e => setLessonGoal(e.target.value)}
                          placeholder="e.g., Focus on gravity and spacetime"
                          className="input-field text-xs py-1.5 w-full"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Teacher Override (Optional)</label>
                        <textarea
                          value={teacherOverridePrompt}
                          onChange={e => setTeacherOverridePrompt(e.target.value)}
                          placeholder="Special instructions for the AI..."
                          className="input-field text-xs py-1.5 w-full resize-none h-16"
                        />
                      </div>

                      {/* Voiceover Speed Adjustment */}
                      <div className="space-y-1.5 pt-2 border-t border-white/5">
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>Voiceover Speed</span>
                          <span className="font-mono text-indigo-400 font-bold">{speechRate.toFixed(2)}x</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => setSpeechRate(Math.max(0.5, speechRate - 0.05))}
                            className="p-1 px-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all text-xs"
                            title="Slower"
                          >
                            🐢 Slower
                          </button>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.05"
                            value={speechRate}
                            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => setSpeechRate(Math.min(2.0, speechRate + 0.05))}
                            className="p-1 px-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all text-xs"
                            title="Faster"
                          >
                            ⚡ Faster
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-3 space-y-3 border border-white/5 bg-white/[0.01]">
                      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center justify-between text-slate-400">
                        <span>Cost & Safety</span>
                        {canUseAI() ? <span className="text-green-400">Active</span> : <span className="text-red-400">Limit Reached</span>}
                      </h3>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1"><Activity size={12}/> Daily Tokens</span>
                          <span className="font-mono text-cyan-300">{costUsage.dailyTokensUsed} / 50</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-cyan-500 h-full" style={{ width: `${(costUsage.dailyTokensUsed / 50) * 100}%` }} />
                        </div>
                        
                        <div className="flex items-center justify-between text-xs mt-2">
                          <span className="text-slate-400 flex items-center gap-1"><Mic size={12}/> Daily Voice</span>
                          <span className="font-mono text-indigo-300">{costUsage.dailyVoiceCallsUsed} / 100</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full" style={{ width: `${(costUsage.dailyVoiceCallsUsed / 100) * 100}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-xs text-slate-300 flex items-center gap-1"><ShieldAlert size={12} className="text-orange-400" /> Safe Mode</span>
                        <button
                          onClick={() => setSafeMode(!safeMode)}
                          className={`w-8 h-4 rounded-full relative transition-colors ${safeMode ? 'bg-orange-500' : 'bg-slate-600'}`}
                        >
                          <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${safeMode ? 'translate-x-4' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interaction log */}
          <div className="border-t p-3" style={{ borderColor: 'rgba(98,120,248,0.1)' }}>
            <div className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <MessageSquare size={12} /> Interaction Log
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              <InteractionLog />
            </div>
          </div>
        </aside>
      )}
      </div>

      {/* ── Set Stage Quick Setup Wizard Modal ── */}
      <AnimatePresence>
        {isQuickSetupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 text-white"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg glass-dark border border-indigo-500/30 rounded-3xl p-6 space-y-6 shadow-2xl relative"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => { setQuickSetupOpen(false); setSetupStep(1); }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <div className="text-center space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Step {setupStep} of 4</span>
                <h2 className="text-xl font-bold font-display text-white">"Set Stage" Configuration</h2>
              </div>

              {/* Step indicator bar */}
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      step <= setupStep ? 'bg-cyan-500' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              {/* Wizard Content */}
              <div className="min-h-[220px] flex flex-col justify-center">
                {setupStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-cyan-300">Choose Stage Background</h3>
                    <div className="space-y-3">
                      <select
                        value={backgroundMode}
                        onChange={(e) => setBackgroundMode(e.target.value as any)}
                        className="input-field w-full text-sm py-2"
                      >
                        <option value="camera">Live Camera Feed (Webcam)</option>
                        <option value="image">Custom Image Upload</option>
                        <option value="video">Custom Video Loop</option>
                      </select>

                      {/* Selfie segmentation for all background modes */}
                        <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5 text-sm">
                          <span>Enable Human Selfie Segmentation</span>
                          <button
                            type="button"
                            onClick={() => setShowSelfieSegmentation(!showSelfieSegmentation)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                              showSelfieSegmentation ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'border-white/10 text-slate-400'
                            }`}
                          >
                            {showSelfieSegmentation ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </div>

                      {backgroundMode === 'image' && (
                        <div className="space-y-2 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <label className="block text-xs text-slate-300 font-medium">Upload Background Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setBackgroundImageUrl(url);
                              }
                            }}
                            className="block w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500"
                          />
                          {backgroundImageUrl && (
                            <span className="text-[10px] text-slate-400 truncate block mt-1">Loaded: {backgroundImageUrl}</span>
                          )}
                        </div>
                      )}

                      {backgroundMode === 'video' && (
                        <div className="space-y-2 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <label className="block text-xs text-slate-300 font-medium">Upload Background Video</label>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setBackgroundVideoUrl(url);
                              }
                            }}
                            className="block w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500"
                          />
                          {backgroundVideoUrl && (
                            <span className="text-[10px] text-slate-400 truncate block mt-1">Loaded: {backgroundVideoUrl}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {setupStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-cyan-300 text-center">Position Character</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setCharacterPosition({ ...characterPosition, x: characterPosition.x - 0.1 })}
                        className="btn-secondary py-2 text-xs hover:bg-cyan-500/20"
                      >
                        ⬅️ Left
                      </button>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCharacterPosition({ ...characterPosition, y: characterPosition.y + 0.1 })}
                          className="btn-secondary py-1 text-xs hover:bg-cyan-500/20"
                        >
                          ⬆️ Up
                        </button>
                        <button
                          type="button"
                          onClick={() => setCharacterPosition({ ...characterPosition, y: characterPosition.y - 0.1 })}
                          className="btn-secondary py-1 text-xs hover:bg-cyan-500/20"
                        >
                          ⬇️ Down
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCharacterPosition({ ...characterPosition, x: characterPosition.x + 0.1 })}
                        className="btn-secondary py-2 text-xs hover:bg-cyan-500/20"
                      >
                        ➡️ Right
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => setCharacterPosition({ ...characterPosition, z: characterPosition.z + 0.1 })}
                        className="btn-secondary py-2 text-xs hover:bg-cyan-500/20"
                      >
                        🔍 Forward
                      </button>
                      <button
                        type="button"
                        onClick={() => setCharacterPosition({ ...characterPosition, z: characterPosition.z - 0.1 })}
                        className="btn-secondary py-2 text-xs hover:bg-cyan-500/20"
                      >
                        🔎 Backward
                      </button>
                    </div>
                  </div>
                )}

                {setupStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-cyan-300 text-center">Adjust Scale &amp; Rotation</h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="block text-xs text-slate-300 text-center">Scale (x{characterScale.toFixed(2)})</span>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setCharacterScale(Math.max(0.2, characterScale - 0.05))}
                            className="btn-secondary py-2 text-xs hover:bg-cyan-500/20"
                          >
                            ➖ Smaller
                          </button>
                          <button
                            type="button"
                            onClick={() => setCharacterScale(Math.min(3.0, characterScale + 0.05))}
                            className="btn-secondary py-2 text-xs hover:bg-cyan-500/20"
                          >
                            ➕ Bigger
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="block text-xs text-slate-300 text-center">Rotation</span>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setCharacterRotation({ ...characterRotation, y: characterRotation.y - 0.15 })}
                            className="btn-secondary py-2 text-xs hover:bg-cyan-500/20"
                          >
                            🔄 Rotate L
                          </button>
                          <button
                            type="button"
                            onClick={() => setCharacterRotation({ ...characterRotation, y: characterRotation.y + 0.15 })}
                            className="btn-secondary py-2 text-xs hover:bg-cyan-500/20"
                          >
                            🔄 Rotate R
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {setupStep === 4 && (
                  <div className="space-y-4 text-center">
                    <h3 className="font-semibold text-sm text-cyan-300">Ready to Launch!</h3>
                    <p className="text-xs text-slate-300 max-w-sm mx-auto">
                      All checks passed! Your stage background and placement settings are configured and optimized for the classroom.
                    </p>
                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl text-left space-y-1.5 max-w-sm mx-auto">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Summary Details:</div>
                      <div className="text-xs flex justify-between"><span>Background:</span> <span className="text-cyan-300 font-semibold uppercase">{backgroundMode}</span></div>
                      <div className="text-xs flex justify-between"><span>Scale:</span> <span className="text-cyan-300 font-semibold">{characterScale.toFixed(2)}x</span></div>
                      <div className="text-xs flex justify-between"><span>Z-Position:</span> <span className="text-cyan-300 font-semibold">{characterPosition.z.toFixed(1)}m</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard Nav Actions */}
              <div className="flex gap-3 pt-2">
                {setupStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setSetupStep((s) => s - 1)}
                    className="btn-secondary flex-1 py-2 text-sm font-semibold"
                  >
                    Back
                  </button>
                )}
                {setupStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setSetupStep((s) => s + 1)}
                    className="btn-primary flex-1 py-2 text-sm font-semibold"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (character) saveRoomLayout(character.id);
                      setQuickSetupOpen(false);
                      setSetupStep(1);
                    }}
                    className="btn-primary flex-1 py-2 text-sm font-semibold bg-green-600 border-green-600 hover:bg-green-500"
                  >
                    Launch Stage
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InteractionLog() {
  const { interactions } = useSessionStore();

  if (interactions.length === 0) {
    return <div className="text-xs py-2 text-center" style={{ color: 'var(--text-secondary)' }}>No interactions yet</div>;
  }

  return (
    <>
      {interactions.slice(-6).map((int) => (
        <div key={int.id} className="flex gap-2 text-xs">
          <span style={{ color: int.speaker === 'student' ? '#fbbf24' : '#8199fb', flexShrink: 0 }}>
            {int.speaker === 'student' ? '👤' : '🎭'}
          </span>
          <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
            {int.message.slice(0, 60)}{int.message.length > 60 ? '...' : ''}
          </span>
        </div>
      ))}
    </>
  );
}

function TeacherCorrectionUI({ onRegenerate }: { onRegenerate: (q: string) => void }) {
  const { interactions, addCorrection, character } = useSessionStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // We only show this if the very last interaction was from the character and the one before was the student
  if (interactions.length < 2) return null;
  const lastInteraction = interactions[interactions.length - 1];
  const prevInteraction = interactions[interactions.length - 2];

  if (lastInteraction.speaker !== 'character' || prevInteraction.speaker !== 'student') return null;

  const handleCorrect = () => {
    setIsEditing(true);
    setEditVal(lastInteraction.message);
  };

  const handleSaveCorrection = () => {
    addCorrection(prevInteraction.message, editVal);
    setIsEditing(false);
    setShowConfirm(true);
    setTimeout(() => setShowConfirm(false), 2000);
  };

  const handleSaveScript = () => {
    if (!character) return;
    try {
      const customScripts = JSON.parse(localStorage.getItem(`custom_scripts_${character.id}`) || '[]');
      let activeScript = customScripts.find((s: any) => s.id === 'custom_teacher_1');
      if (!activeScript) {
        activeScript = { id: 'custom_teacher_1', name: 'Saved QA Session', pairs: [] };
        customScripts.push(activeScript);
      }
      // Add the Q/A pair
      activeScript.pairs.push({
        id: `qa_${Date.now()}`,
        question: prevInteraction.message,
        answer: lastInteraction.message,
        keywords: prevInteraction.message.split(' ').filter((w) => w.length > 4)
      });
      localStorage.setItem(`custom_scripts_${character.id}`, JSON.stringify(customScripts));
      
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 2000);
    } catch { }
  };

  if (isEditing) {
    return (
      <div className="absolute bottom-20 left-4 right-4 z-20 glass-panel p-3 border border-orange-500/30 animate-in slide-in-from-bottom-2">
        <div className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wider flex items-center justify-between">
          <span>Correcting AI Response</span>
          <button onClick={() => setIsEditing(false)}><X size={14} className="text-slate-400" /></button>
        </div>
        <div className="text-xs text-slate-400 mb-1">Student asked: {prevInteraction.message}</div>
        <textarea
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          className="w-full h-20 bg-black/40 border border-white/10 rounded-lg text-sm text-white p-2 focus:border-indigo-500 focus:outline-none resize-none mb-2"
        />
        <div className="flex justify-end">
          <button onClick={handleSaveCorrection} className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1 bg-orange-500 hover:bg-orange-600 border-none">
            <Edit2 size={12} /> Save Correction
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-20 left-4 right-4 z-20 flex gap-2 overflow-x-auto pb-2 scrollbar-hide animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl whitespace-nowrap shadow-xl">
        {showConfirm ? (
          <div className="px-4 py-1.5 text-xs font-semibold text-emerald-400 flex items-center gap-1">
            <ThumbsUp size={14} /> Saved!
          </div>
        ) : (
          <>
            <button onClick={() => { setShowConfirm(true); setTimeout(() => setShowConfirm(false), 2000); }} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 rounded-xl text-xs font-medium text-emerald-400 transition-colors">
              <ThumbsUp size={14} /> Correct
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button onClick={handleCorrect} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 rounded-xl text-xs font-medium text-orange-400 transition-colors">
              <Edit2 size={14} /> Correct This
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button onClick={() => onRegenerate(prevInteraction.message)} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 rounded-xl text-xs font-medium text-indigo-400 transition-colors">
              <RefreshCw size={14} /> Regenerate
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button onClick={handleSaveScript} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 rounded-xl text-xs font-medium text-purple-400 transition-colors">
              <Pin size={14} /> Save to Script
            </button>
          </>
        )}
      </div>
    </div>
  );
}
