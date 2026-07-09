'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Play, Save, RotateCcw, Volume2,
  Move, RotateCw, Maximize, Image, Video, Camera, User,
  Mic, Sparkles, CheckCircle, Settings2, ArrowRight, Plus, Trash2
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { getCharacterById } from '@/lib/characters/characterData';
import { useSessionStore } from '@/stores/sessionStore';
import { speechEngine } from '@/lib/tts/speechEngine';

const ARScene = dynamic(() => import('@/components/ar/ARScene'), { ssr: false });

const VOICE_PRESETS = [
  { id: 'indian-male-1',    label: 'Indian Male 1 (Akshay)',     origin: '🇮🇳', gender: 'M' },
  { id: 'indian-male-2',    label: 'Indian Male 2 (Deepak)',     origin: '🇮🇳', gender: 'M' },
  { id: 'indian-female-1',  label: 'Indian Female 1 (DB)',       origin: '🇮🇳', gender: 'F' },
  { id: 'indian-female-2',  label: 'Indian Female 2 (Kavita)',   origin: '🇮🇳', gender: 'F' },
  { id: 'deep-narrator',    label: 'Deep Narrator (Adam)',       origin: '🌍', gender: 'M' },
  { id: 'historical-wise',  label: 'Wise Voice (Brian)',         origin: '🇬🇧', gender: 'M' },
  { id: 'child-friendly',   label: 'Energetic (Rachel)',         origin: '🇺🇸', gender: 'F' },
];

type SetupStep = 'placement' | 'background' | 'voice' | 'script' | 'preview';
const STEPS: { id: SetupStep; label: string; icon: typeof Move }[] = [
  { id: 'placement',  label: 'Stage Placement',   icon: Move },
  { id: 'background', label: 'Background Setup',  icon: Image },
  { id: 'voice',      label: 'Voice Selection',   icon: Volume2 },
  { id: 'script',     label: 'Q&A Script Setup',  icon: Sparkles },
  { id: 'preview',    label: 'Preview & Launch',   icon: Play },
];

export default function SetupPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [showAR, setShowAR] = useState(false);
  const [activeStep, setActiveStep] = useState<SetupStep>('placement');
  const [profileSaved, setProfileSaved] = useState(false);
  const [testSpeaking, setTestSpeaking] = useState(false);

  const [showScriptCreator, setShowScriptCreator] = useState(false);
  const [newScriptTitle, setNewScriptTitle] = useState('');
  const [newScriptSystemPrompt, setNewScriptSystemPrompt] = useState('');
  const [newScriptQas, setNewScriptQas] = useState<{ q: string; a: string }[]>([{ q: '', a: '' }]);
  const [isSavingScript, setIsSavingScript] = useState(false);

  const handleAddQA = () => setNewScriptQas([...newScriptQas, { q: '', a: '' }]);
  const handleRemoveQA = (idx: number) => {
    if (newScriptQas.length === 1) return;
    setNewScriptQas(newScriptQas.filter((_, i) => i !== idx));
  };
  const handleQAChange = (idx: number, field: 'q' | 'a', value: string) => {
    setNewScriptQas(newScriptQas.map((qa, i) => i === idx ? { ...qa, [field]: value } : qa));
  };

  const {
    character, startSession, endSession,
    characterPosition, characterRotation, characterScale,
    setCharacterPosition, setCharacterRotation, setCharacterScale,
    setPlacementMode,
    backgroundMode, backgroundImageUrl, backgroundVideoUrl,
    setBackgroundMode, setBackgroundImageUrl, setBackgroundVideoUrl,
    showSelfieSegmentation, setShowSelfieSegmentation,
    selectedVoice, setSelectedVoice,
    cameraOpacity, setCameraOpacity,
    cameraBlur, setCameraBlur,
    cameraMirror, setCameraMirror,
    showGrid, setShowGrid,
    speechRate, setSpeechRate,
    saveStageProfile, loadStageProfile,
    setIsSpeaking, setMouthOpen, setSubtitle,
    selectedTemplate, setSelectedTemplate,
  } = useSessionStore();

  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => {
        if (data.templates) {
          setTemplates(data.templates);
        }
      })
      .catch(console.error);
  }, []);

  async function handleCreateScript() {
    if (!newScriptTitle.trim()) return;
    setIsSavingScript(true);
    try {
      const cleanQas = newScriptQas
        .filter(qa => qa.q.trim() && qa.a.trim())
        .map(qa => ({
          q: qa.q.trim(),
          a: qa.a.trim()
        }));

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: character?.id,
          title: newScriptTitle.trim(),
          script: {
            systemPrompt: newScriptSystemPrompt || 'You are an educational AI character.',
            questions: cleanQas
          }
        }),
      });

      if (!res.ok) throw new Error('Failed to save script template');
      
      // Reload templates list from database
      const reloadRes = await fetch('/api/templates');
      const reloadData = await reloadRes.json();
      if (reloadData.templates) {
        setTemplates(reloadData.templates);
        // Automatically select the newly created template
        const matched = reloadData.templates.find((t: any) => t.title === newScriptTitle.trim());
        if (matched) setSelectedTemplate(matched);
      }

      setShowScriptCreator(false);
      setNewScriptTitle('');
      setNewScriptSystemPrompt('');
      setNewScriptQas([{ q: '', a: '' }]);
    } catch (e) {
      console.error('Error saving script:', e);
      alert('Failed to save script template');
    } finally {
      setIsSavingScript(false);
    }
  }

  // Load character & start session in edit mode
  useEffect(() => {
    const char = getCharacterById(params.id);
    if (!char) { router.push('/characters'); return; }
    startSession(char, 'scripted');
    // Load saved profile if exists
    loadStageProfile(char.id);
    setPlacementMode('edit');
    setShowAR(true);
    return () => { speechEngine?.stop(); endSession(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const stepIndex = STEPS.findIndex(s => s.id === activeStep);

  const goNext = () => {
    if (activeStep === 'script' && selectedTemplate?.script?.status === 'pending_approval') {
      alert("You cannot proceed. This script is pending administrator approval because the edit limit was exceeded.");
      return;
    }
    const next = STEPS[stepIndex + 1];
    if (next) setActiveStep(next.id);
  };
  const goPrev = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setActiveStep(prev.id);
  };

  const handleSaveProfile = () => {
    if (character) {
      saveStageProfile(character.id);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }
  };

  const handleReset = () => {
    setCharacterPosition({ x: 0, y: -1.2, z: -3 });
    setCharacterRotation({ x: 0, y: 0, z: 0 });
    setCharacterScale(1.0);
  };

  const handleTestSpeak = () => {
    if (!character || testSpeaking) return;
    const testText = character.introMonologue.split('.').slice(0, 2).join('.') + '.';
    setTestSpeaking(true);
    setSubtitle(testText);
    speechEngine?.speak({
      text: testText,
      voiceProfile: character.voiceProfile || { pitch: 1, rate: 0.9, volume: 1.0, accent: 'en-IN' },
      characterId: character.id,
      onStart: () => { setIsSpeaking(true); setMouthOpen(0.5); },
      onEnd: () => { setIsSpeaking(false); setMouthOpen(0); setTestSpeaking(false); },
      onError: () => setTestSpeaking(false),
    });
  };

  const handleLaunch = () => {
    if (selectedTemplate?.script?.status === 'pending_approval') {
      alert("You cannot launch. This script is pending administrator approval because the edit limit was exceeded.");
      return;
    }
    if (character) {
      saveStageProfile(character.id);
    }
    speechEngine?.stop();
    endSession();
    
    // Redirect current tab to the main session view (which now handles projector mode natively)
    const tplQuery = selectedTemplate ? `?template=${selectedTemplate.id}` : '';
    window.location.href = `/session/${params.id}${tplQuery}`;
  };

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

  const dist = Math.sqrt(
    characterPosition.x ** 2 +
    characterPosition.y ** 2 +
    characterPosition.z ** 2
  );

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: '#050710' }}>

      {/* ── Top Bar ────────────────────────────────────────── */}
      <header className="glass-dark flex items-center gap-3 px-4 py-3 z-30"
              style={{ borderBottom: '1px solid rgba(98,120,248,0.2)' }}>
        <button onClick={() => router.push('/characters')}
                className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-sm">
          <ChevronLeft size={14} /> Characters
        </button>

        <div className="flex items-center gap-2 flex-1">
          <span className="text-2xl">{character.emoji}</span>
          <div>
            <div className="font-semibold text-white text-sm">{character.name}</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Stage Setup — Configure before teaching</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
            Step {stepIndex + 1}/{STEPS.length}
          </span>
        </div>
      </header>

      {/* ── Step Progress Bar ─────────────────────────────── */}
      <div className="px-4 py-2 glass-dark border-b border-indigo-500/10">
        <div className="flex gap-1 max-w-2xl mx-auto">
          {STEPS.map((step, i) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
                activeStep === step.id
                  ? 'bg-indigo-500/25 border border-indigo-500 text-white shadow-inner'
                  : i < stepIndex
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'border border-white/5 text-slate-500 hover:text-slate-300'
              }`}
            >
              {i < stepIndex ? <CheckCircle size={12} /> : <step.icon size={12} />}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Sidebar — Step Controls */}
        <div className="w-96 h-full glass-dark border-r border-indigo-500/15 flex flex-col z-20 overflow-hidden">
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">

            <AnimatePresence mode="wait">

              {/* ── STEP: Placement ──────────────────── */}
              {activeStep === 'placement' && (
                <motion.div key="placement" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Move size={14} className="text-indigo-400" /> Position Character</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Place your character on the virtual stage before teaching.</p>
                  </div>

                  {/* Position controls */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Move</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => setCharacterPosition({ ...characterPosition, x: characterPosition.x - 0.1 })} className="btn-secondary py-2 text-xs hover:bg-indigo-500/20">⬅️ Left</button>
                      <div className="flex flex-col gap-1">
                        <button type="button" onClick={() => setCharacterPosition({ ...characterPosition, y: characterPosition.y + 0.1 })} className="btn-secondary py-1 text-[10px] hover:bg-indigo-500/20">⬆️ Up</button>
                        <button type="button" onClick={() => setCharacterPosition({ ...characterPosition, y: characterPosition.y - 0.1 })} className="btn-secondary py-1 text-[10px] hover:bg-indigo-500/20">⬇️ Down</button>
                      </div>
                      <button type="button" onClick={() => setCharacterPosition({ ...characterPosition, x: characterPosition.x + 0.1 })} className="btn-secondary py-2 text-xs hover:bg-indigo-500/20">➡️ Right</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setCharacterPosition({ ...characterPosition, z: characterPosition.z + 0.1 })} className="btn-secondary py-1.5 text-xs hover:bg-indigo-500/20">🔍 Forward</button>
                      <button type="button" onClick={() => setCharacterPosition({ ...characterPosition, z: characterPosition.z - 0.1 })} className="btn-secondary py-1.5 text-xs hover:bg-indigo-500/20">🔎 Backward</button>
                    </div>
                  </div>

                  {/* Scale */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Scale (x{characterScale.toFixed(2)})</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setCharacterScale(Math.max(0.2, characterScale - 0.05))} className="btn-secondary py-1.5 text-xs hover:bg-indigo-500/20">➖ Smaller</button>
                      <button type="button" onClick={() => setCharacterScale(Math.min(3.0, characterScale + 0.05))} className="btn-secondary py-1.5 text-xs hover:bg-indigo-500/20">➕ Bigger</button>
                    </div>
                  </div>

                  {/* Rotation */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Rotation</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setCharacterRotation({ ...characterRotation, y: characterRotation.y - 0.15 })} className="btn-secondary py-1.5 text-xs hover:bg-indigo-500/20">🔄 Rotate L</button>
                      <button type="button" onClick={() => setCharacterRotation({ ...characterRotation, y: characterRotation.y + 0.15 })} className="btn-secondary py-1.5 text-xs hover:bg-indigo-500/20">🔄 Rotate R</button>
                    </div>
                  </div>

                  {/* Grid toggle */}
                  <div className="flex items-center justify-between bg-white/[0.02] p-2.5 rounded-xl border border-white/5 text-xs">
                    <span className="text-slate-300">Show Alignment Grid</span>
                    <button type="button" onClick={() => setShowGrid(!showGrid)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${showGrid ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'border-white/10 text-slate-400'}`}
                    >{showGrid ? 'ON' : 'OFF'}</button>
                  </div>

                  {/* Distance readout */}
                  <div className="text-center text-[10px] text-slate-500 font-mono">
                    Pos: ({characterPosition.x.toFixed(1)}, {characterPosition.y.toFixed(1)}, {characterPosition.z.toFixed(1)}) | Dist: {dist.toFixed(2)}m
                  </div>

                  {/* Reset */}
                  <button type="button" onClick={handleReset} className="w-full py-2 rounded-xl border border-white/10 text-xs flex items-center justify-center gap-1.5 text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                    <RotateCcw size={12} /> Reset to Default
                  </button>
                </motion.div>
              )}

              {/* ── STEP: Background ────────────────── */}
              {activeStep === 'background' && (
                <motion.div key="background" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Image size={14} className="text-cyan-400" /> Background Setup</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Choose the stage backdrop for your AR session.</p>
                  </div>

                  {/* Mode selector as cards */}
                  <div className="space-y-2">
                    {[
                      { mode: 'camera' as const, icon: Camera, label: 'Live Camera', desc: 'Use your webcam feed as the background' },
                      { mode: 'image' as const, icon: Image, label: 'Custom Image', desc: 'Upload a classroom or themed background' },
                      { mode: 'video' as const, icon: Video, label: 'Video Loop', desc: 'Play a looping background video' },
                    ].map(({ mode, icon: Icon, label, desc }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setBackgroundMode(mode)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                          backgroundMode === mode
                            ? 'bg-cyan-500/10 border-cyan-500/40 shadow-inner'
                            : 'border-white/5 hover:border-white/15 bg-white/[0.01]'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${backgroundMode === mode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-500'}`}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className={`text-xs font-semibold ${backgroundMode === mode ? 'text-white' : 'text-slate-300'}`}>{label}</div>
                          <div className="text-[10px] text-slate-500">{desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Upload area for image/video */}
                  {backgroundMode === 'image' && (
                    <div className="space-y-2 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <label className="block text-xs text-slate-300 font-medium">Upload Image</label>
                      <input type="file" accept="image/*"
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) setBackgroundImageUrl(URL.createObjectURL(file)); }}
                        className="block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                      />
                      {backgroundImageUrl && <span className="text-[9px] text-emerald-400 block">✓ Image loaded</span>}
                    </div>
                  )}
                  {backgroundMode === 'video' && (
                    <div className="space-y-2 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <label className="block text-xs text-slate-300 font-medium">Upload Video</label>
                      <input type="file" accept="video/*"
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) setBackgroundVideoUrl(URL.createObjectURL(file)); }}
                        className="block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                      />
                      {backgroundVideoUrl && <span className="text-[9px] text-emerald-400 block">✓ Video loaded</span>}
                    </div>
                  )}

                  {/* Human segmentation toggle */}
                  <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5 text-xs">
                    <div>
                      <div className="text-slate-300 font-medium flex items-center gap-1.5"><User size={12} className="text-cyan-400" /> Human Layer (Selfie Seg)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Places you in front of the backdrop, behind the character</div>
                    </div>
                    <button type="button" onClick={() => setShowSelfieSegmentation(!showSelfieSegmentation)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${showSelfieSegmentation ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'border-white/10 text-slate-400'}`}
                    >{showSelfieSegmentation ? 'ON' : 'OFF'}</button>
                  </div>

                  {/* Camera adjustments */}
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <label className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Camera Adjustments</label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Opacity</span>
                        <span className="font-mono text-[10px]">{Math.round(cameraOpacity * 100)}%</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.05" value={cameraOpacity} onChange={(e) => setCameraOpacity(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Background Blur</span>
                        <span className="font-mono text-[10px]">{cameraBlur.toFixed(1)}px</span>
                      </div>
                      <input type="range" min="0" max="10" step="0.5" value={cameraBlur} onChange={(e) => setCameraBlur(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Mirror Image</span>
                      <button type="button" onClick={() => setCameraMirror(!cameraMirror)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${cameraMirror ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'border-white/10 text-slate-400'}`}
                      >{cameraMirror ? 'MIRRORED' : 'NORMAL'}</button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── STEP: Voice ─────────────────────── */}
              {activeStep === 'voice' && (
                <motion.div key="voice" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Volume2 size={14} className="text-amber-400" /> Voice Selection</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Choose a natural voice preset. Indian characters default to Indian accents.</p>
                  </div>

                  {/* Voice preset grid */}
                  <div className="space-y-1.5">
                    {VOICE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedVoice(preset.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                          selectedVoice === preset.id
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-inner'
                            : 'border-white/5 hover:border-white/15 bg-white/[0.01]'
                        }`}
                      >
                        <span className="text-lg">{preset.origin}</span>
                        <div className="flex-1">
                          <div className={`text-xs font-medium ${selectedVoice === preset.id ? 'text-white' : 'text-slate-300'}`}>{preset.label}</div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          preset.gender === 'M' ? 'bg-blue-500/15 text-blue-400' : 'bg-pink-500/15 text-pink-400'
                        }`}>{preset.gender === 'M' ? 'Male' : 'Female'}</span>
                        {selectedVoice === preset.id && <CheckCircle size={14} className="text-amber-400" />}
                      </button>
                    ))}
                  </div>

                  {/* Speed */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-medium">Voiceover Speed</span>
                      <span className="font-mono text-amber-400 font-bold">{speechRate.toFixed(2)}x</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button type="button" onClick={() => setSpeechRate(Math.max(0.5, speechRate - 0.05))} className="p-1 px-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-xs">🐢</button>
                      <input type="range" min="0.5" max="2.0" step="0.05" value={speechRate} onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                      <button type="button" onClick={() => setSpeechRate(Math.min(2.0, speechRate + 0.05))} className="p-1 px-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-xs">⚡</button>
                    </div>
                  </div>

                  {/* Test speak button */}
                  <button
                    type="button"
                    onClick={handleTestSpeak}
                    disabled={testSpeaking}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      testSpeaking
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 cursor-wait'
                        : 'bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
                    }`}
                  >
                    <Mic size={14} />
                    {testSpeaking ? 'Speaking...' : 'Test Voice Preview'}
                  </button>
                </motion.div>
              )}

              {/* ── STEP: Q&A Script Setup ───────────── */}
              {activeStep === 'script' && (
                <motion.div key="script" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Sparkles size={14} className="text-emerald-400" /> Q&A Script Setup</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Configure preset script lessons or create custom Q&A answers.</p>
                  </div>

                  {/* Teacher Guide Banner */}
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3.5 space-y-2">
                    <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      💡 Teacher Setup Guide
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Follow these steps to configure your interactive classroom experience:
                    </p>
                    <ul className="text-[10px] text-slate-400 space-y-1.5 list-decimal list-inside pl-1">
                      <li>Use <strong className="text-white">Stage Placement</strong> (Step 1) to position, rotate, and scale the 3D character.</li>
                      <li>Use <strong className="text-white">Background Setup</strong> (Step 2) to mirror the feed, blur the room, or enable <strong className="text-white">Selfie Segmentation</strong> (which overlays you in front of the background, behind the character!).</li>
                      <li>Select a voice accent on <strong className="text-white">Voice Selection</strong> (Step 3).</li>
                      <li>Choose a preset script, or click <strong className="text-white">+ Add Script</strong> to write custom Q&As. <strong className="text-white">Tip:</strong> Write <code className="text-amber-300">*growl*</code> or <code className="text-amber-300">*roar*</code> in answers to trigger realistic animal sound effects!</li>
                      <li>Click <strong className="text-white">Launch Live Session</strong>. Your main window becomes the clean projector scene, and a separate popup control window opens for triggering answers with keys <code className="text-indigo-300">1</code>–<code className="text-indigo-300">9</code>!</li>
                    </ul>
                  </div>

                  {/* Template Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Classroom Script Template</label>
                      <button type="button" onClick={() => setShowScriptCreator(!showScriptCreator)} className="text-[10px] text-emerald-400 hover:text-emerald-300">
                        {showScriptCreator ? 'Cancel' : '+ Add Script'}
                      </button>
                    </div>

                    {!showScriptCreator ? (
                      <div className="space-y-3">
                        <select
                          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                          value={selectedTemplate?.id || ''}
                          onChange={(e) => {
                            const tpl = templates.find(t => t.id === e.target.value);
                            setSelectedTemplate(tpl || null);
                          }}
                        >
                          <option value="">No Template (Default Mode)</option>
                          {templates.filter(t => t.character_id === character.id).map(tpl => (
                            <option key={tpl.id} value={tpl.id} className="bg-slate-900 text-white">
                              {tpl.title} {tpl.script?.status === 'pending_approval' ? ' (⏳ Pending Approval)' : ''}
                            </option>
                          ))}
                        </select>

                        {selectedTemplate?.script?.status === 'pending_approval' && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex flex-col gap-1">
                            <div className="text-[11px] text-red-400 font-bold flex items-center gap-1.5">
                              ⏳ Locked: Pending Approval
                            </div>
                            <div className="text-[9px] text-slate-400 leading-normal">
                              This script has exceeded the 2 edits limit and must be approved by the administrator before you can launch the session.
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white/[0.03] border border-emerald-500/30 rounded-xl p-3 space-y-3 max-h-[350px] overflow-y-auto">
                        <div className="space-y-1">
                          <label className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Script Title</label>
                          <input
                            type="text"
                            placeholder="Topic / Lesson Name"
                            value={newScriptTitle}
                            onChange={(e) => setNewScriptTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">System Prompt (AI persona)</label>
                            <button
                              type="button"
                              onClick={() => setNewScriptSystemPrompt(`You are ${character.name}.\nPersonality: ${character.personality}\nSpeaking Style: ${character.speakingStyle}\nTeaching Style: ${character.teachingStyle}`)}
                              className="text-[10px] flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                            >
                              Load Default Persona
                            </button>
                          </div>
                          <textarea
                            placeholder="e.g. 'You are teaching about gravity. Answer questions simply.' (Leave empty to use default)"
                            value={newScriptSystemPrompt}
                            onChange={(e) => setNewScriptSystemPrompt(e.target.value)}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                        
                        {/* Dynamic Q&A list */}
                        <div className="space-y-2 border-t border-white/10 pt-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Questions & Answers</label>
                            <button
                              type="button"
                              onClick={handleAddQA}
                              className="text-[10px] flex items-center gap-0.5 text-emerald-400 hover:text-emerald-300 font-semibold"
                            >
                              <Plus size={10} /> Add Q&A
                            </button>
                          </div>

                          <div className="space-y-3">
                            {newScriptQas.map((qa, index) => (
                              <div key={index} className="p-2 bg-black/20 rounded-lg border border-white/5 relative space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-slate-400">Q{index + 1}</span>
                                  {newScriptQas.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveQA(index)}
                                      className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  placeholder={`Question ${index + 1}`}
                                  value={qa.q}
                                  onChange={(e) => handleQAChange(index, 'q', e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                                />
                                <textarea
                                  placeholder={`Answer ${index + 1}`}
                                  value={qa.a}
                                  onChange={(e) => handleQAChange(index, 'a', e.target.value)}
                                  rows={2}
                                  className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleCreateScript}
                          disabled={!newScriptTitle.trim() || isSavingScript}
                          className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 border border-emerald-500/50 rounded-lg py-2 text-xs font-semibold"
                        >
                          {isSavingScript ? 'Saving...' : 'Save & Select'}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── STEP: Preview & Launch ───────────── */}
              {activeStep === 'preview' && (
                <motion.div key="preview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Sparkles size={14} className="text-emerald-400" /> Preview & Launch</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Review your configuration, test, then launch into the live session.</p>
                  </div>

                  {/* Configuration summary */}
                  <div className="space-y-2 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Stage Configuration</div>
                    <div className="space-y-1.5">
                      <div className="text-xs flex justify-between"><span className="text-slate-400">Character</span><span className="text-white font-medium">{character.emoji} {character.name}</span></div>
                      <div className="text-xs flex justify-between"><span className="text-slate-400">Background</span><span className="text-cyan-300 font-medium capitalize">{backgroundMode}</span></div>
                      <div className="text-xs flex justify-between"><span className="text-slate-400">Voice Preset</span><span className="text-amber-300 font-medium">{VOICE_PRESETS.find(v => v.id === selectedVoice)?.label || 'Auto'}</span></div>
                      <div className="text-xs flex justify-between"><span className="text-slate-400">Script</span><span className="text-emerald-300 font-medium">{selectedTemplate?.title || 'No Script Template'}</span></div>
                      <div className="text-xs flex justify-between"><span className="text-slate-400">Scale</span><span className="text-indigo-300 font-mono">{characterScale.toFixed(2)}x</span></div>
                      <div className="text-xs flex justify-between"><span className="text-slate-400">Position</span><span className="text-indigo-300 font-mono">({characterPosition.x.toFixed(1)}, {characterPosition.y.toFixed(1)}, {characterPosition.z.toFixed(1)})</span></div>
                      <div className="text-xs flex justify-between"><span className="text-slate-400">Human Layer</span><span className={showSelfieSegmentation ? 'text-emerald-400' : 'text-slate-500'}>{showSelfieSegmentation ? 'Enabled' : 'Disabled'}</span></div>
                      <div className="text-xs flex justify-between"><span className="text-slate-400">Speech Rate</span><span className="text-indigo-300 font-mono">{speechRate.toFixed(2)}x</span></div>
                    </div>
                  </div>

                  {/* Test actions */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Quick Tests</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={handleTestSpeak} disabled={testSpeaking}
                        className="btn-secondary py-2 text-xs hover:bg-emerald-500/10 flex items-center justify-center gap-1.5">
                        <Volume2 size={12} /> {testSpeaking ? 'Speaking...' : 'Test Speak'}
                      </button>
                      <button type="button" onClick={handleReset}
                        className="btn-secondary py-2 text-xs hover:bg-emerald-500/10 flex items-center justify-center gap-1.5">
                        <RotateCcw size={12} /> Reset Position
                      </button>
                    </div>
                  </div>

                  {/* Save profile */}
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all border ${
                      profileSaved
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25'
                    }`}
                  >
                    <Save size={14} />
                    {profileSaved ? '✓ Profile Saved!' : 'Save Stage Profile'}
                  </button>

                  {/* Launch button */}
                  <button
                    type="button"
                    onClick={handleLaunch}
                    className="w-full py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                      color: 'white',
                    }}
                  >
                    <Play size={18} /> Launch Live Session <ArrowRight size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Bottom Nav Buttons ────────────────────────── */}
          <div className="p-4 border-t border-white/5 flex gap-3">
            {stepIndex > 0 && (
              <button type="button" onClick={goPrev} className="btn-secondary flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-1">
                <ChevronLeft size={14} /> Back
              </button>
            )}
            {stepIndex < STEPS.length - 1 && (
              <button type="button" onClick={goNext} className="btn-primary flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-1">
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── AR Canvas Preview ───────────────────────────── */}
        <div className="flex-1 relative">
          {showAR && <ARScene />}

          {/* Watermark */}
          <div className="absolute top-4 right-4 z-10">
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2"
                 style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(98,120,248,0.3)', color: '#8199fb' }}>
              <Settings2 size={12} /> Stage Preview
            </div>
          </div>

          {/* AR bracket overlay */}
          <div className="ar-overlay pointer-events-none">
            <div className="absolute top-8 left-8 bottom-8 right-8">
              <div className="relative w-full h-full">
                <div className="ar-bracket ar-bracket-tl" />
                <div className="ar-bracket ar-bracket-tr" />
                <div className="ar-bracket ar-bracket-bl" />
                <div className="ar-bracket ar-bracket-br" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
