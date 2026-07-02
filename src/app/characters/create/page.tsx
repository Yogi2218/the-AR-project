'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, UploadCloud, ShieldAlert, Sparkles, User, Settings2, Image as ImageIcon } from 'lucide-react';
import { saveCustomCharacter, Character, CharacterCategory, KnowledgeSourceType } from '@/lib/characters/characterData';

export default function CreateCharacterPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState<Partial<Character>>({
    name: '',
    shortName: '',
    emoji: '🤖',
    category: 'custom' as CharacterCategory,
    subject: '',
    targetAge: '8-14',
    description: '',
    introMonologue: 'Hello! I am ready to learn with you.',
    exitMonologue: 'Goodbye!',
    
    // AI Fields
    personality: '',
    speakingStyle: '',
    teachingStyle: '',
    coreTopics: [],
    knowledgeSourceType: 'custom' as KnowledgeSourceType,
    knowledgeSummary: '',
    defaultLanguage: 'english',
    voiceMood: 'neutral',
    interactionType: 'hybrid',
    safeMode: true,
    personalityStrength: 7,

    // Visuals
    baseColor: '#6366f1',
    accentColor: '#818cf8',
    thumbnailColor: 'from-indigo-500 to-purple-600',
    catClass: 'cat-custom',
    
    // Voice (defaults)
    voiceProfile: { pitch: 1, rate: 1, volume: 1, accent: 'en-US' },
    scripts: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coreTopicsInput, setCoreTopicsInput] = useState('');
  
  // Upload states
  const [uploadingKnowledge, setUploadingKnowledge] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'knowledge' | 'avatar') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'knowledge') setUploadingKnowledge(true);
    else setUploadingAvatar(true);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        if (type === 'knowledge') {
          // Point the knowledge summary to the file URL for the backend to fetch, or just store the filename
          setFormData(prev => ({ ...prev, knowledgeSummary: `[FILE:${data.url}] ` + prev.knowledgeSummary }));
        } else {
          setFormData(prev => ({ ...prev, modelFile: data.url, thumbnail: data.url }));
        }
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload error');
    } finally {
      if (type === 'knowledge') setUploadingKnowledge(false);
      else setUploadingAvatar(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Process topics
    const topics = coreTopicsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    const newChar: Character = {
      ...formData as Character,
      id: `custom_char_${Date.now()}`,
      coreTopics: topics,
      isCustom: true
    };

    saveCustomCharacter(newChar);
    
    // Short delay for UX
    setTimeout(() => {
      router.push('/characters');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 overflow-y-auto" style={{ background: 'radial-gradient(circle at 50% 0%, #1e1b4b 0%, #020617 100%)' }}>
      
      {/* Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/characters')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Create AI Character
            </h1>
            <p className="text-slate-400">Design a custom educational personality</p>
          </div>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn-primary flex items-center gap-2 px-6 py-2 rounded-full font-semibold"
        >
          {isSubmitting ? <Sparkles className="animate-spin" size={18}/> : <Save size={18} />}
          Save Character
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          {/* Identity */}
          <div className="glass-panel p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-white/10 pb-2 mb-4">
              <User size={18} className="text-indigo-400" /> Identity
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Full Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleTextChange} className="input-field w-full" placeholder="e.g. Isaac Newton" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Short Name</label>
                <input required type="text" name="shortName" value={formData.shortName} onChange={handleTextChange} className="input-field w-full" placeholder="e.g. Newton" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Emoji</label>
                <input required type="text" name="emoji" value={formData.emoji} onChange={handleTextChange} className="input-field w-full text-center text-xl" />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs text-slate-400">Subject</label>
                <input required type="text" name="subject" value={formData.subject} onChange={handleTextChange} className="input-field w-full" placeholder="e.g. Physics & Calculus" />
              </div>
            </div>
          </div>

          {/* AI Personality */}
          <div className="glass-panel p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-white/10 pb-2 mb-4">
              <Sparkles size={18} className="text-purple-400" /> AI Personality & Behavior
            </h2>
            
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Personality Summary</label>
              <textarea name="personality" value={formData.personality} onChange={handleTextChange} className="input-field w-full h-20 resize-none" placeholder="e.g. Intense, brilliant, but slightly distracted..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Speaking Style</label>
                <input type="text" name="speakingStyle" value={formData.speakingStyle} onChange={handleTextChange} className="input-field w-full" placeholder="e.g. Formal, old-english" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Teaching Style</label>
                <input type="text" name="teachingStyle" value={formData.teachingStyle} onChange={handleTextChange} className="input-field w-full" placeholder="e.g. Socratic method" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Interaction Type</label>
                <select name="interactionType" value={formData.interactionType} onChange={handleTextChange} className="input-field w-full">
                  <option value="hybrid">Hybrid (Scripts + AI)</option>
                  <option value="ai">AI Dynamic Only</option>
                  <option value="scripted">Fixed Script Only</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Personality Strength (1-10)</label>
                <input type="number" min="1" max="10" name="personalityStrength" value={formData.personalityStrength} onChange={handleTextChange} className="input-field w-full" />
              </div>
            </div>
          </div>

          {/* Safe Mode */}
          <div className="glass-panel p-6 flex items-center justify-between border-l-4 border-orange-500">
            <div>
              <h2 className="text-md font-bold flex items-center gap-2 text-orange-400">
                <ShieldAlert size={18} /> Safe Mode (School Ready)
              </h2>
              <p className="text-xs text-slate-400">Prevents adult, political, and violent topics.</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData(p => ({...p, safeMode: !p.safeMode}))}
              className={`w-12 h-6 rounded-full relative transition-colors ${formData.safeMode ? 'bg-orange-500' : 'bg-slate-600'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.safeMode ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Knowledge Base */}
          <div className="glass-panel p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-white/10 pb-2 mb-4">
              <Settings2 size={18} className="text-blue-400" /> Knowledge Base
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Source Type</label>
                <select name="knowledgeSourceType" value={formData.knowledgeSourceType} onChange={handleTextChange} className="input-field w-full">
                  <option value="custom">Custom</option>
                  <option value="historical">Historical</option>
                  <option value="scientific">Scientific</option>
                  <option value="wildlife">Wildlife</option>
                  <option value="mythology">Mythology</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Core Topics (comma separated)</label>
                <input type="text" value={coreTopicsInput} onChange={e => setCoreTopicsInput(e.target.value)} className="input-field w-full" placeholder="Gravity, Optics, Motion" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 flex justify-between">
                <span>Knowledge Summary (or Paste Content)</span>
                <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1">
                  {uploadingKnowledge ? <Sparkles size={12} className="animate-spin"/> : <UploadCloud size={12}/>}
                  Upload .txt/.json
                  <input type="file" accept=".txt,.json" className="hidden" onChange={e => handleFileUpload(e, 'knowledge')} />
                </label>
              </label>
              <textarea name="knowledgeSummary" value={formData.knowledgeSummary} onChange={handleTextChange} className="input-field w-full h-32 resize-none text-xs font-mono" placeholder="Paste context here or upload a file..." />
            </div>
          </div>

          {/* Voice & Language */}
          <div className="glass-panel p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-white/10 pb-2 mb-4">
              <ImageIcon size={18} className="text-green-400" /> Voice & Presentation
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Default Language</label>
                <select name="defaultLanguage" value={formData.defaultLanguage} onChange={handleTextChange} className="input-field w-full">
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="marathi">Marathi</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Voice Mood</label>
                <select name="voiceMood" value={formData.voiceMood} onChange={handleTextChange} className="input-field w-full">
                  <option value="neutral">Neutral</option>
                  <option value="enthusiastic">Energetic / Enthusiastic</option>
                  <option value="calm">Calm</option>
                  <option value="serious">Serious</option>
                  <option value="playful">Funny / Playful</option>
                  <option value="inspiring">Inspiring</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-xs text-slate-400 flex justify-between">
                <span>3D Model or Avatar Image</span>
                <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1">
                  {uploadingAvatar ? <Sparkles size={12} className="animate-spin"/> : <UploadCloud size={12}/>}
                  Upload .glb/.png
                  <input type="file" accept=".glb,.gltf,.png,.jpg" className="hidden" onChange={e => handleFileUpload(e, 'avatar')} />
                </label>
              </label>
              <input type="text" name="modelFile" value={formData.modelFile || ''} onChange={handleTextChange} readOnly className="input-field w-full text-slate-400 bg-black/20" placeholder="No file uploaded" />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Intro Monologue</label>
              <input type="text" name="introMonologue" value={formData.introMonologue} onChange={handleTextChange} className="input-field w-full" />
            </div>
          </div>
          
        </div>
      </form>
    </div>
  );
}
