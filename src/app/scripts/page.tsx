'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, Download, ChevronDown, ChevronUp, Copy, Search, FileText } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { CHARACTERS } from '@/lib/characters/characterData';

interface QAPair {
  id: string;
  question: string;
  keywords: string;
  answer: string;
  followUp: string;
}

interface SavedScript {
  id: string;
  characterId: string;
  name: string;
  introduction?: string;
  pairs: QAPair[];
  createdAt: string;
}

const DEFAULT_QA = (): QAPair => ({
  id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  question: '',
  keywords: '',
  answer: '',
  followUp: ''
});

export default function ScriptsPage() {
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0].id);
  const [scriptName,   setScriptName]   = useState('');
  const [introduction, setIntroduction] = useState('');
  const [pairs,        setPairs]        = useState<QAPair[]>([DEFAULT_QA()]);
  const [expandedId,   setExpandedId]   = useState<string>('');
  const [saved,        setSaved]        = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);

  // Saved scripts management
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  // Autofocus target controller
  const [focusTarget, setFocusTarget] = useState<{ id: string; field: 'question' | 'answer' } | null>(null);

  useEffect(() => {
    loadSavedScripts();
    // Expand first pair by default on load
    if (pairs.length > 0) {
      setExpandedId(pairs[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSavedScripts = async () => {
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) return;
      const data = await res.json();
      if (data.templates) {
        const list: SavedScript[] = data.templates.map((t: any) => ({
          id: t.id,
          characterId: t.character_id,
          name: t.title,
          introduction: t.script?.introduction || t.script?.systemPrompt || '',
          pairs: (t.script?.questions || []).map((q: any, i: number) => ({
            id: `q_${t.id}_${i}`,
            question: q.q || '',
            keywords: q.keywords || '',
            answer: q.a || '',
            followUp: q.followUp || ''
          })),
          createdAt: t.created_at
        }));
        setSavedScripts(list);
      }
    } catch (e) {
      console.error('Failed to load scripts:', e);
    }
  };

  const handleNew = () => {
    const freshPair = DEFAULT_QA();
    setEditingId(null);
    setScriptName('');
    setIntroduction('');
    setSelectedChar(CHARACTERS[0].id);
    setPairs([freshPair]);
    setExpandedId(freshPair.id);
  };

  const handleLoad = (script: SavedScript) => {
    setEditingId(script.id);
    setScriptName(script.name);
    setIntroduction(script.introduction || '');
    setSelectedChar(script.characterId);
    setPairs(script.pairs);
    if (script.pairs.length > 0) {
      setExpandedId(script.pairs[0].id);
    }
  };

  const handleSave = async () => {
    setSaved(true);
    const scriptPayload = {
      systemPrompt: introduction,
      introduction: introduction,
      questions: pairs.map(p => ({
        q: p.question,
        a: p.answer,
        keywords: p.keywords,
        followUp: p.followUp
      }))
    };

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          character_id: selectedChar,
          title: scriptName || 'Untitled Script',
          script: scriptPayload
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.id) setEditingId(data.id);
        setTimeout(() => setSaved(false), 2000);
        await loadSavedScripts();
      } else {
        setSaved(false);
        alert('Failed to save script');
      }
    } catch (e) {
      console.error('Failed to save script:', e);
      setSaved(false);
    }
  };

  const handleDuplicate = async (script: SavedScript, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const scriptPayload = {
      systemPrompt: script.introduction,
      introduction: script.introduction,
      questions: script.pairs.map(p => ({
        q: p.question,
        a: p.answer,
        keywords: p.keywords,
        followUp: p.followUp
      }))
    };

    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: script.characterId,
          title: `${script.name} - Copy`,
          script: scriptPayload
        })
      });
      await loadSavedScripts();
    } catch (e) {
      console.error('Failed to duplicate script:', e);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId === id) {
      try {
        await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
        if (editingId === id) {
          handleNew();
        }
        setDeletingId(null);
        await loadSavedScripts();
      } catch (e) {
        console.error('Failed to delete script:', e);
      }
    } else {
      setDeletingId(id);
      // Auto-reset after 3 seconds if not confirmed
      setTimeout(() => {
        setDeletingId((curr) => curr === id ? null : curr);
      }, 3000);
    }
  };

  const addPair = (focusField: 'question' | 'answer') => {
    if (pairs.length >= 9) return;
    const newP = DEFAULT_QA();
    setPairs((p) => [...p, newP]);
    setExpandedId(newP.id);
    setFocusTarget({ id: newP.id, field: focusField });
  };

  const removePair = (id: string) => {
    setPairs((p) => p.filter((x) => x.id !== id));
  };

  const updatePair = (id: string, field: keyof QAPair, value: string) => {
    setPairs((p) => p.map((x) => x.id === id ? { ...x, [field]: value } : x));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const newPairs = [...pairs];
    const temp = newPairs[idx];
    newPairs[idx] = newPairs[idx - 1];
    newPairs[idx - 1] = temp;
    setPairs(newPairs);
  };

  const moveDown = (idx: number) => {
    if (idx === pairs.length - 1) return;
    const newPairs = [...pairs];
    const temp = newPairs[idx];
    newPairs[idx] = newPairs[idx + 1];
    newPairs[idx + 1] = temp;
    setPairs(newPairs);
  };

  const handleExport = () => {
    const script = { characterId: selectedChar, name: scriptName || 'Untitled Script', introduction, pairs };
    const blob = new Blob([JSON.stringify(script, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${script.name}.json`;
    a.click();
  };

  const char = CHARACTERS.find((c) => c.id === selectedChar)!;

  const filteredScripts = savedScripts.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-screen">
        
        {/* Left Column — Saved Scripts Panel */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white font-display">Saved Scripts</h2>
            <button
              onClick={handleNew}
              className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <Plus size={14} /> New Script
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search scripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>

          {/* Saved scripts list */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[70vh] pr-1">
            {filteredScripts.map((s) => {
              const scriptChar = CHARACTERS.find((c) => c.id === s.characterId);
              const isActive = editingId === s.id;
              const isDeleting = deletingId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => handleLoad(s)}
                  className={`glass-card p-4 flex items-center justify-between cursor-pointer transition-all hover:border-indigo-500/50 ${
                    isActive ? 'border-indigo-500 bg-indigo-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{scriptChar?.emoji ?? '📝'}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{s.name}</div>
                      <div className="text-xs text-slate-400">
                        {scriptChar?.name ?? s.characterId} · {s.pairs.length} QA pairs
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {!isDeleting && (
                      <button
                        onClick={(e) => handleDuplicate(s, e)}
                        title="Duplicate script"
                        className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(s.id, e)}
                      title={isDeleting ? "Click again to confirm delete" : "Delete script"}
                      className={`p-1.5 rounded transition-all text-xs font-semibold ${
                        isDeleting
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5'
                          : 'hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                      }`}
                    >
                      {isDeleting ? 'Confirm?' : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredScripts.length === 0 && (
              <div className="text-center py-12 text-slate-500 glass-card">
                <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs">No scripts found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Script Editor Panel */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-white">
                {editingId ? 'Edit Script' : 'Create Script'}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Design custom Q&amp;A paths for classroom interactive projections.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
                <Download size={16} /> Export JSON
              </button>
              <button
                onClick={handleSave}
                className={`btn-primary flex items-center gap-2 ${saved ? 'opacity-75' : ''}`}
              >
                <Save size={16} /> {saved ? 'Saved!' : 'Save Script'}
              </button>
            </div>
          </div>

          {/* Script config */}
          <div className="glass-card p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Script Name</label>
                <input
                  type="text"
                  placeholder="e.g. Einstein – Grade 8 Physics"
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Character</label>
                <select
                  value={selectedChar}
                  onChange={(e) => setSelectedChar(e.target.value)}
                  className="input-field"
                >
                  {CHARACTERS.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-white">System Prompt / Persona (Optional)</label>
                <button
                  type="button"
                  onClick={() => setIntroduction(`You are ${char.name}.\nPersonality: ${char.personality}\nSpeaking Style: ${char.speakingStyle}\nTeaching Style: ${char.teachingStyle}`)}
                  className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Load Default Persona
                </button>
              </div>
              <textarea
                placeholder="e.g. 'You are teaching about gravity. Answer questions simply.' (Leave empty to use default)"
                value={introduction}
                onChange={(e) => setIntroduction(e.target.value)}
                rows={4}
                className="input-field resize-none"
              />
            </div>

            {/* Character preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <span className="text-3xl">{char.emoji}</span>
              <div>
                <div className="text-white font-medium text-sm">{char.name}</div>
                <div className="text-xs text-slate-400">
                  {char.scripts.length} built-in scripts · {char.subject}
                </div>
              </div>
            </div>
          </div>

          {/* Q&A Pairs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Dialogue Flow ({pairs.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => addPair('question')}
                  disabled={pairs.length >= 9}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> Add Question
                </button>
                <button
                  onClick={() => addPair('answer')}
                  disabled={pairs.length >= 9}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> Add Answer
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {pairs.map((pair, idx) => {
                  const isExpanded = expandedId === pair.id;
                  return (
                    <motion.div
                      key={pair.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="glass-card overflow-hidden"
                    >
                      {/* Pair header */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? '' : pair.id)}
                        className="w-full flex items-center justify-between p-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-indigo-500/20 text-indigo-400">
                            {idx + 1}
                          </div>
                          <span className="text-sm font-medium text-white truncate max-w-sm">
                            {pair.question || 'New Q&A node...'}
                          </span>
                        </div>
                        
                        {/* Rearrange & Delete Actions */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                            title="Move up"
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            onClick={() => moveDown(idx)}
                            disabled={idx === pairs.length - 1}
                            title="Move down"
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <div className="w-px h-4 bg-white/10 mx-1" />
                          <button
                            onClick={() => removePair(pair.id)}
                            title="Remove pair"
                            className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Editor details */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-4 border-t border-white/5 bg-white/[0.01]">
                              <div className="pt-3">
                                <label className="block text-xs font-semibold mb-1.5 text-indigo-400">
                                  STUDENT QUESTION
                                </label>
                                <input
                                  ref={(el) => {
                                    if (el && focusTarget?.id === pair.id && focusTarget?.field === 'question') {
                                      el.focus();
                                      setFocusTarget(null);
                                    }
                                  }}
                                  type="text"
                                  placeholder="e.g. What is E=mc²?"
                                  value={pair.question}
                                  onChange={(e) => updatePair(pair.id, 'question', e.target.value)}
                                  className="input-field text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold mb-1.5 text-indigo-400">
                                  TRIGGER KEYWORDS (comma separated)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. energy, mass, speed of light, equation"
                                  value={pair.keywords}
                                  onChange={(e) => updatePair(pair.id, 'keywords', e.target.value)}
                                  className="input-field text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold mb-1.5 text-indigo-400">
                                  CHARACTER ANSWER
                                </label>
                                <textarea
                                  ref={(el) => {
                                    if (el && focusTarget?.id === pair.id && focusTarget?.field === 'answer') {
                                      el.focus();
                                      setFocusTarget(null);
                                    }
                                  }}
                                  placeholder="What the character will say in response..."
                                  value={pair.answer}
                                  onChange={(e) => updatePair(pair.id, 'answer', e.target.value)}
                                  rows={4}
                                  className="input-field text-sm resize-none"
                                />
                                <div className="text-xs mt-1 text-slate-400">
                                  {pair.answer.split(' ').filter(Boolean).length} words
                                  · ~{Math.ceil(pair.answer.split(' ').filter(Boolean).length / 3.0)}s spoken
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold mb-1.5 text-amber-400">
                                  FOLLOW-UP QUESTION (optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="A question the character asks the audience to prompt discussion..."
                                  value={pair.followUp}
                                  onChange={(e) => updatePair(pair.id, 'followUp', e.target.value)}
                                  className="input-field text-sm"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {pairs.length === 0 && (
                <div className="text-center py-12 text-slate-500 glass-card">
                  <div className="text-3xl mb-3">📝</div>
                  <div className="font-medium text-white mb-1">No Q&amp;A pairs yet</div>
                  <button onClick={() => addPair('question')} className="btn-primary mt-3">Add First Question</button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
