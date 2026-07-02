'use client';

import { useState, useRef, useCallback, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Upload, Sparkles, Image as ImageIcon, Type, Layers,
  Loader2, CheckCircle2, AlertCircle, RotateCcw, Download, Save, Eye
} from 'lucide-react';
import { saveCustomCharacter, CHARACTERS, type Character, type CharacterCategory } from '@/lib/characters/characterData';

// ─── Preset Characters ──────────────────────────────────────────────────────

interface Preset {
  name: string;
  emoji: string;
  prompt: string;
  category: string;
}

const PRESETS: Preset[] = [
  // Historical
  { name: 'Vivekananda', emoji: '🙏', prompt: 'Swami Vivekananda in traditional Indian saffron robes with turban, realistic face, standing pose', category: 'Historical' },
  { name: 'Gandhi', emoji: '☮️', prompt: 'Mahatma Gandhi in white dhoti and round glasses, walking stick, realistic elderly Indian man', category: 'Historical' },
  { name: 'APJ Abdul Kalam', emoji: '🚀', prompt: 'APJ Abdul Kalam in formal suit with distinctive grey hair, smiling Indian scientist', category: 'Historical' },
  { name: 'Shivaji Maharaj', emoji: '⚔️', prompt: 'Chhatrapati Shivaji Maharaj in Maratha warrior armor with sword and shield, royal turban', category: 'Historical' },
  { name: 'Dr Ambedkar', emoji: '📜', prompt: 'Dr Babasaheb Ambedkar in blue suit with glasses and pen, Indian statesman', category: 'Historical' },
  { name: 'Savitribai Phule', emoji: '📚', prompt: 'Savitribai Phule in traditional Maharashtrian nauvari saree, Indian woman educator', category: 'Historical' },
  { name: 'Bhagat Singh', emoji: '🇮🇳', prompt: 'Bhagat Singh in hat and coat, young Indian revolutionary with mustache', category: 'Historical' },
  { name: 'Rani Lakshmi Bai', emoji: '🗡️', prompt: 'Rani Lakshmi Bai of Jhansi in warrior armor on horseback, Indian queen warrior', category: 'Historical' },
  { name: 'Chanakya', emoji: '🧠', prompt: 'Chanakya ancient Indian scholar in dhoti with sacred thread, wise old Brahmin teacher', category: 'Historical' },
  { name: 'Aryabhata', emoji: '🔢', prompt: 'Aryabhata ancient Indian mathematician and astronomer in traditional clothing', category: 'Historical' },
  { name: 'Kalpana Chawla', emoji: '🌌', prompt: 'Kalpana Chawla Indian-American astronaut in NASA spacesuit, smiling woman', category: 'Historical' },
  // Science
  { name: 'Einstein', emoji: '🧪', prompt: 'Albert Einstein in brown tweed jacket with wild white hair and mustache, chalkboard behind', category: 'Science' },
  { name: 'Newton', emoji: '🍎', prompt: 'Isaac Newton in 17th century English clothing with long curly wig, holding an apple', category: 'Science' },
  { name: 'Tesla', emoji: '⚡', prompt: 'Nikola Tesla in formal Victorian suit with slicked-back dark hair and mustache', category: 'Science' },
  { name: 'Curie', emoji: '⚗️', prompt: 'Marie Curie in early 1900s lab coat with dark hair in updo, holding a test tube', category: 'Science' },
  // Wildlife
  { name: 'Lion', emoji: '🦁', prompt: 'Realistic African lion with flowing mane, majestic pose, full body', category: 'Wildlife' },
  { name: 'Tiger', emoji: '🐅', prompt: 'Realistic Bengal tiger with orange and black stripes, full body, standing pose', category: 'Wildlife' },
  { name: 'Peacock', emoji: '🦚', prompt: 'Indian peacock with fully spread colorful tail feathers, realistic bird', category: 'Wildlife' },
  { name: 'Elephant', emoji: '🐘', prompt: 'Indian elephant with tusks, realistic grey skin, standing pose', category: 'Wildlife' },
  { name: 'Eagle', emoji: '🦅', prompt: 'Bald eagle with spread wings, realistic feathers, majestic flying pose', category: 'Wildlife' },
  // Fantasy
  { name: 'Dinosaur', emoji: '🦕', prompt: 'Realistic T-Rex dinosaur with detailed scales, standing pose, full body', category: 'Fantasy' },
  { name: 'Dragon', emoji: '🐉', prompt: 'Fantasy dragon with large wings and scales, breathing fire, full body', category: 'Fantasy' },
  { name: 'Space Robot', emoji: '🤖', prompt: 'Futuristic humanoid robot with glowing blue eyes, metallic silver body, standing', category: 'Fantasy' },
];

// ─── Pipeline Stage Names ────────────────────────────────────────────────────

type PipelineStage = 'idle' | 'generating' | 'rigging' | 'animating' | 'downloading' | 'complete' | 'error';

const STAGE_LABELS: Record<PipelineStage, string> = {
  idle: 'Ready',
  generating: 'Generating 3D Model…',
  rigging: 'Rigging Skeleton…',
  animating: 'Applying Animations…',
  downloading: 'Downloading GLB…',
  complete: 'Character Ready!',
  error: 'Generation Failed',
};

const STAGE_ORDER: PipelineStage[] = ['generating', 'rigging', 'animating', 'downloading', 'complete'];

function stageProgress(stage: PipelineStage): number {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

// ─── Tab Type ────────────────────────────────────────────────────────────────

type InputTab = 'upload' | 'prompt' | 'preset';

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function CreateAICharacterPage() {
  const router = useRouter();

  // Role authorization
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('eduar_role');
      if (!storedRole) {
        localStorage.setItem('eduar_role', 'teacher');
        setIsAuthorized(true);
      } else if (storedRole === 'teacher') {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
        const timer = setTimeout(() => router.push('/dashboard'), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [router]);

  // Input state
  const [activeTab, setActiveTab] = useState<InputTab>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [presetCategory, setPresetCategory] = useState('Historical');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pipeline state
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultData, setResultData] = useState<{
    uuid: string;
    modelUrl: string;
    metaUrl: string;
    expressionsUrl: string;
    visemesUrl: string;
  } | null>(null);

  // Save Modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: '',
    shortName: '',
    emoji: '🤖',
    category: 'custom' as CharacterCategory,
    subject: '',
    targetAge: '8-14',
    description: '',
    introMonologue: 'Hello! I am ready to learn with you.',
    exitMonologue: 'Goodbye!',
    personality: '',
  });

  const handleOpenSaveModal = () => {
    if (!resultData) return;

    let initialForm = {
      name: '',
      shortName: '',
      emoji: '🤖',
      category: 'custom' as CharacterCategory,
      subject: '',
      targetAge: '8-14',
      description: activeTab === 'prompt' ? prompt : '',
      introMonologue: 'Hello! I am ready to learn with you.',
      exitMonologue: 'Goodbye!',
      personality: activeTab === 'prompt' ? prompt : '',
    };

    if (activeTab === 'preset' && selectedPreset) {
      const builtInMatch = CHARACTERS.find(
        (c) =>
          c.name.toLowerCase().includes(selectedPreset.name.toLowerCase()) ||
          selectedPreset.name.toLowerCase().includes(c.shortName.toLowerCase())
      );

      if (builtInMatch) {
        initialForm = {
          name: builtInMatch.name,
          shortName: builtInMatch.shortName,
          emoji: builtInMatch.emoji,
          category: builtInMatch.category,
          subject: builtInMatch.subject,
          targetAge: builtInMatch.targetAge,
          description: builtInMatch.description,
          introMonologue: builtInMatch.introMonologue,
          exitMonologue: builtInMatch.exitMonologue,
          personality: builtInMatch.personality,
        };
      } else {
        let cat: CharacterCategory = 'custom';
        const pc = selectedPreset.category.toLowerCase();
        if (pc === 'historical') cat = 'historical';
        else if (pc === 'science') cat = 'scientist';
        else if (pc === 'wildlife') cat = 'animal';
        else if (pc === 'fantasy') cat = 'fictional';

        initialForm = {
          name: selectedPreset.name,
          shortName: selectedPreset.name,
          emoji: selectedPreset.emoji,
          category: cat,
          subject: selectedPreset.category + ' Study',
          targetAge: '8-14',
          description: selectedPreset.prompt,
          introMonologue: `Namaste! I am ${selectedPreset.name}. What shall we learn today?`,
          exitMonologue: 'Goodbye!',
          personality: selectedPreset.prompt,
        };
      }
    }

    setSaveForm(initialForm);
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!resultData) return;
    setIsSaving(true);

    try {
      let scripts: any[] = [];
      let builtInMatch = null;
      if (activeTab === 'preset' && selectedPreset) {
        builtInMatch = CHARACTERS.find(
          (c) =>
            c.name.toLowerCase().includes(selectedPreset.name.toLowerCase()) ||
            selectedPreset.name.toLowerCase().includes(c.shortName.toLowerCase())
        );
        if (builtInMatch) {
          scripts = builtInMatch.scripts;
        }
      }

      const newChar: Character = {
        id: `custom_char_${Date.now()}`,
        name: saveForm.name,
        shortName: saveForm.shortName,
        emoji: saveForm.emoji,
        category: saveForm.category,
        description: saveForm.description,
        personality: saveForm.personality || saveForm.description,
        subject: saveForm.subject,
        targetAge: saveForm.targetAge,
        voiceProfile: builtInMatch?.voiceProfile || { pitch: 1, rate: 1, volume: 1, accent: 'en-US' },
        modelFile: resultData.modelUrl,
        thumbnailColor: builtInMatch?.thumbnailColor || 'from-indigo-500 to-purple-600',
        catClass: `cat-${saveForm.category}`,
        scripts: scripts,
        introMonologue: saveForm.introMonologue,
        exitMonologue: saveForm.exitMonologue,
        knowledgeSourceType: builtInMatch?.knowledgeSourceType || 'custom',
        speakingStyle: builtInMatch?.speakingStyle || 'Informative',
        teachingStyle: builtInMatch?.teachingStyle || 'Storytelling',
        coreTopics: builtInMatch?.coreTopics || [saveForm.subject],
        knowledgeSummary: saveForm.description,
        baseColor: '#6366f1',
        accentColor: '#818cf8',
        personalityStrength: 7,
        isCustom: true,
        isAIgenerated: true,
        generationMeta: {
          uuid: resultData.uuid,
          prompt: activeTab === 'prompt' ? prompt : (activeTab === 'preset' ? selectedPreset?.prompt : undefined),
          imageUploaded: activeTab === 'upload',
          generatedAt: new Date().toISOString(),
          source: 'tripo',
        },
      };

      saveCustomCharacter(newChar);

      alert('Character successfully saved to library!');
      setIsSaveModalOpen(false);
      router.push('/characters');
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Image handling ─────────────────────────────────────────────────────────

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('Image must be under 15 MB');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── Generate handler ──────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setStage('generating');
    setErrorMessage('');
    setResultData(null);

    const formData = new FormData();

    if (activeTab === 'upload' && imageFile) {
      formData.append('image', imageFile);
    } else if (activeTab === 'prompt' && prompt.trim()) {
      formData.append('prompt', prompt.trim());
    } else if (activeTab === 'preset' && selectedPreset) {
      formData.append('prompt', selectedPreset.prompt);
    } else {
      setStage('error');
      setErrorMessage('Please provide an image, prompt, or select a preset.');
      return;
    }

    try {
      const response = await fetch('/api/character-gen', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok && !response.body) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'status') {
                const s = data.stage as PipelineStage;
                if (STAGE_ORDER.includes(s) || s === 'downloading') {
                  setStage(s);
                }
              } else if (currentEvent === 'complete') {
                setResultData(data);
                setStage('complete');
              } else if (currentEvent === 'error') {
                throw new Error(data.message);
              }
            } catch (parseErr: any) {
              if (parseErr.message && !parseErr.message.includes('JSON')) {
                throw parseErr;
              }
            }
            currentEvent = '';
          }
        }
      }
    } catch (err: any) {
      setStage('error');
      setErrorMessage(err.message || 'Something went wrong');
    }
  }, [activeTab, imageFile, prompt, selectedPreset]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStage('idle');
    setErrorMessage('');
    setResultData(null);
  }, []);

  // ── Determine if "Generate" is enabled ─────────────────────────────────────

  const canGenerate =
    stage === 'idle' || stage === 'error' || stage === 'complete'
      ? (activeTab === 'upload' && !!imageFile) ||
        (activeTab === 'prompt' && prompt.trim().length > 0) ||
        (activeTab === 'preset' && !!selectedPreset)
      : false;

  const isRunning = !['idle', 'complete', 'error'].includes(stage);

  // ── Preset categories ─────────────────────────────────────────────────────

  const categories = [...new Set(PRESETS.map((p) => p.category))];
  const filteredPresets = PRESETS.filter((p) => p.category === presetCategory);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-indigo-400" size={40} />
          <p className="text-slate-400 text-sm">Verifying teacher authorization...</p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center p-4 bg-slate-950" style={{ background: 'radial-gradient(circle at 50% 0%, #1e1b4b 0%, #020617 100%)' }}>
        <motion.div 
          className="max-w-md w-full border border-red-500/30 p-8 rounded-2xl text-center space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-red-400">Access Denied</h2>
          <p className="text-slate-300 text-sm">
            The AI Character Builder is restricted to teacher roles only. Students are not permitted to build custom characters.
          </p>
          <p className="text-xs text-slate-500">
            Redirecting to dashboard in 3 seconds...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white overflow-y-auto"
      style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1145 40%, #302b63 70%, #24243e 100%)',
      }}
    >
      {/* Decorative orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[160px]" />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-fuchsia-600/8 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:px-8 md:py-12">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/characters')}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 transition-all hover:scale-105"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
                AI Character Builder
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Generate realistic 3D characters with Tripo AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
              Tripo AI Engine
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left: Input Panel (3 cols) ─────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tab Selector */}
            <div className="flex gap-2 p-1 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              {([
                { id: 'upload' as InputTab, icon: Upload, label: 'Upload Image' },
                { id: 'prompt' as InputTab, icon: Type, label: 'Write Prompt' },
                { id: 'preset' as InputTab, icon: Layers, label: 'Presets' },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* ── Upload Tab ────────────────────────────────────────── */}
                {activeTab === 'upload' && (
                  <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
                    <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                      <ImageIcon size={18} className="text-indigo-400" />
                      Upload Character Image
                    </h3>
                    <p className="text-sm text-slate-400 mb-5">
                      Upload a front-facing photo or reference image of your character. The AI will generate a 3D model from it.
                    </p>

                    {!imagePreview ? (
                      <label className="flex flex-col items-center justify-center gap-3 w-full h-56 rounded-xl border-2 border-dashed border-white/20 hover:border-indigo-400/50 cursor-pointer transition-all hover:bg-white/5 group">
                        <Upload size={36} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                        <span className="text-slate-400 text-sm">
                          Click to upload or drag & drop
                        </span>
                        <span className="text-slate-500 text-xs">
                          PNG, JPG, WebP • Max 15 MB
                        </span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleImageSelect}
                        />
                      </label>
                    ) : (
                      <div className="relative group">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full max-h-72 object-contain rounded-xl border border-white/10"
                        />
                        <button
                          onClick={clearImage}
                          className="absolute top-3 right-3 p-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Prompt Tab ─────────────────────────────────────────── */}
                {activeTab === 'prompt' && (
                  <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
                    <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                      <Type size={18} className="text-purple-400" />
                      Describe Your Character
                    </h3>
                    <p className="text-sm text-slate-400 mb-5">
                      Write a detailed description. The more detail, the better the result.
                    </p>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={'Example: "Create Shivaji Maharaj in warrior armor with realistic face and sword, detailed Maratha armor, royal turban with jewels"'}
                      className="w-full h-40 rounded-xl bg-black/30 border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 p-4 text-sm text-white placeholder-slate-500 resize-none outline-none transition-all"
                      maxLength={500}
                    />
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-slate-500">
                        Be specific about clothing, pose, and details
                      </span>
                      <span className={`text-xs ${prompt.length > 450 ? 'text-orange-400' : 'text-slate-500'}`}>
                        {prompt.length}/500
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Preset Tab ─────────────────────────────────────────── */}
                {activeTab === 'preset' && (
                  <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
                    <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                      <Layers size={18} className="text-fuchsia-400" />
                      Choose a Preset Character
                    </h3>
                    <p className="text-sm text-slate-400 mb-5">
                      Select from pre-defined characters optimised for Indian education.
                    </p>

                    {/* Category tabs */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setPresetCategory(cat)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            presetCategory === cat
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Preset grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                      {filteredPresets.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => setSelectedPreset(preset)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:scale-[1.03] ${
                            selectedPreset?.name === preset.name
                              ? 'border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-500/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <span className="text-3xl">{preset.emoji}</span>
                          <span className="text-sm font-medium">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* ── Generate Button ────────────────────────────────────────── */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isRunning}
              className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
                canGenerate && !isRunning
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 hover:shadow-xl hover:shadow-purple-500/25 hover:scale-[1.01] text-white cursor-pointer'
                  : 'bg-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isRunning ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <Sparkles size={22} />
              )}
              {isRunning ? STAGE_LABELS[stage] : 'Generate 3D Character'}
            </button>
          </div>

          {/* ── Right: Status & Preview (2 cols) ────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                Generation Pipeline
              </h3>

              {/* Step indicators */}
              <div className="space-y-3">
                {STAGE_ORDER.map((s, i) => {
                  const isActive = stage === s;
                  const isPast = STAGE_ORDER.indexOf(stage) > i || stage === 'complete';
                  const isFuture = !isActive && !isPast;

                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                          isPast
                            ? 'bg-emerald-500 text-white'
                            : isActive
                              ? 'bg-indigo-500 text-white animate-pulse'
                              : 'bg-white/10 text-slate-500'
                        }`}
                      >
                        {isPast ? <CheckCircle2 size={16} /> : i + 1}
                      </div>
                      <span
                        className={`text-sm font-medium transition-colors ${
                          isPast
                            ? 'text-emerald-400'
                            : isActive
                              ? 'text-white'
                              : 'text-slate-500'
                        }`}
                      >
                        {STAGE_LABELS[s]}
                      </span>
                      {isActive && (
                        <Loader2 size={14} className="animate-spin text-indigo-400 ml-auto" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="mt-5 h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${stageProgress(stage)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>

              {/* Error */}
              {stage === 'error' && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Generation failed</p>
                    <p className="text-xs text-red-400 mt-1">{errorMessage}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Preview / Result Card */}
            <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 min-h-[280px] flex flex-col items-center justify-center">
              {stage === 'complete' && resultData ? (
                <div className="w-full space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <CheckCircle2 size={20} />
                    <span className="font-bold">Character Generated!</span>
                  </div>

                  {/* Simple 3D model info */}
                  <div className="rounded-xl bg-black/30 border border-white/10 p-4 space-y-2">
                    <p className="text-sm text-slate-300">
                      <span className="text-slate-500">Model:</span>{' '}
                      <code className="text-indigo-300">{resultData.modelUrl}</code>
                    </p>
                    <p className="text-sm text-slate-300">
                      <span className="text-slate-500">UUID:</span>{' '}
                      <code className="text-purple-300">{resultData.uuid}</code>
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={resultData.modelUrl}
                      download
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-all text-sm font-semibold"
                    >
                      <Download size={16} />
                      Download GLB
                    </a>
                    <button
                      onClick={handleOpenSaveModal}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 transition-all text-sm font-semibold"
                    >
                      <Save size={16} />
                      Save to Library
                    </button>
                  </div>

                  <button
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm"
                  >
                    <RotateCcw size={14} />
                    Generate Another
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center">
                    {isRunning ? (
                      <Loader2 size={32} className="text-indigo-400 animate-spin" />
                    ) : (
                      <Eye size={32} className="text-slate-600" />
                    )}
                  </div>
                  <p className="text-slate-500 text-sm">
                    {isRunning
                      ? 'Your character is being generated…'
                      : 'Your generated character will appear here'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Save Modal ── */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSaveModalOpen(false)}
            />

            {/* Modal Container */}
            <motion.div
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[90vh] z-10 text-white"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                background: 'linear-gradient(135deg, #151329 0%, #1a163a 100%)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <Save size={20} className="text-indigo-400" />
                  <h3 className="text-xl font-bold">Save Character to Library</h3>
                </div>
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Full Name</label>
                  <input
                    type="text"
                    required
                    value={saveForm.name}
                    onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                    className="w-full rounded-xl bg-black/30 border border-white/10 focus:border-indigo-500/50 p-3 text-sm text-white outline-none"
                    placeholder="e.g. Swami Vivekananda"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Short Name</label>
                  <input
                    type="text"
                    required
                    value={saveForm.shortName}
                    onChange={(e) => setSaveForm({ ...saveForm, shortName: e.target.value })}
                    className="w-full rounded-xl bg-black/30 border border-white/10 focus:border-indigo-500/50 p-3 text-sm text-white outline-none"
                    placeholder="e.g. Vivekananda"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Emoji Avatar</label>
                  <input
                    type="text"
                    required
                    value={saveForm.emoji}
                    onChange={(e) => setSaveForm({ ...saveForm, emoji: e.target.value })}
                    className="w-full rounded-xl bg-black/30 border border-white/10 focus:border-indigo-500/50 p-3 text-sm text-center text-xl outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Category</label>
                  <select
                    value={saveForm.category}
                    onChange={(e) => setSaveForm({ ...saveForm, category: e.target.value as CharacterCategory })}
                    className="w-full rounded-xl bg-black/30 border border-white/10 focus:border-indigo-500/50 p-3 text-sm text-white outline-none animate-none"
                  >
                    <option value="scientist">Scientist</option>
                    <option value="leader">Leader</option>
                    <option value="historical">Historical</option>
                    <option value="animal">Animal</option>
                    <option value="bird">Bird</option>
                    <option value="extinct">Extinct Species</option>
                    <option value="fictional">Fictional</option>
                    <option value="mythological">Mythological</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Subject / Specialty</label>
                  <input
                    type="text"
                    required
                    value={saveForm.subject}
                    onChange={(e) => setSaveForm({ ...saveForm, subject: e.target.value })}
                    className="w-full rounded-xl bg-black/30 border border-white/10 focus:border-indigo-500/50 p-3 text-sm text-white outline-none"
                    placeholder="e.g. Physics, Indian History"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Target Age</label>
                  <input
                    type="text"
                    required
                    value={saveForm.targetAge}
                    onChange={(e) => setSaveForm({ ...saveForm, targetAge: e.target.value })}
                    className="w-full rounded-xl bg-black/30 border border-white/10 focus:border-indigo-500/50 p-3 text-sm text-white outline-none"
                    placeholder="e.g. 8-14"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs text-slate-400 font-medium">Description & Knowledge Summary</label>
                  <textarea
                    value={saveForm.description}
                    onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value, personality: e.target.value })}
                    className="w-full h-20 rounded-xl bg-black/30 border border-white/10 focus:border-indigo-500/50 p-3 text-sm text-white outline-none resize-none"
                    placeholder="Describe what this character knows about..."
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs text-slate-400 font-medium">Intro Monologue</label>
                  <input
                    type="text"
                    required
                    value={saveForm.introMonologue}
                    onChange={(e) => setSaveForm({ ...saveForm, introMonologue: e.target.value })}
                    className="w-full rounded-xl bg-black/30 border border-white/10 focus:border-indigo-500/50 p-3 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex gap-3 justify-end border-t border-white/10 pt-4">
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={isSaving || !saveForm.name || !saveForm.shortName}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/20 disabled:from-white/10 disabled:to-white/10 disabled:text-slate-500 disabled:cursor-not-allowed transition-all text-sm font-semibold flex items-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Confirm & Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
