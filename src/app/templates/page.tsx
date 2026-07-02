'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SaveAll, Plus, Trash2, Edit, Play,
  Sparkles, Loader2, ArrowRight, BookOpen, PlusCircle, HelpCircle
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';

const ALL_CHARACTERS = [
  { id: 'einstein',  name: 'Albert Einstein' },
  { id: 'gandhi',    name: 'Mahatma Gandhi'  },
  { id: 'curie',     name: 'Marie Curie'     },
  { id: 'kalam',     name: 'APJ Abdul Kalam' },
  { id: 'cleopatra', name: 'Cleopatra'       },
  { id: 'davinci',   name: 'Leonardo da Vinci' }
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState('einstein');
  const [title, setTitle] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [qas, setQas] = useState<{ q: string; a: string }[]>([{ q: '', a: '' }]);
  const [editCount, setEditCount] = useState(0);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  function handleOpenCreate() {
    setTemplateId(null);
    setCharacterId('einstein');
    setTitle('');
    setSystemPrompt('');
    setQas([{ q: '', a: '' }]);
    setEditCount(0);
    setIsEditorOpen(true);
  }

  function handleOpenEdit(tpl: any) {
    setTemplateId(tpl.id);
    setCharacterId(tpl.character_id);
    setTitle(tpl.title);
    setSystemPrompt(tpl.script?.systemPrompt || '');
    setQas(tpl.script?.questions || [{ q: '', a: '' }]);
    setEditCount(tpl.script?.editCount || 0);
    setIsEditorOpen(true);
  }

  function handleAddQA() {
    setQas([...qas, { q: '', a: '' }]);
  }

  function handleRemoveQA(index: number) {
    if (qas.length === 1) return;
    setQas(qas.filter((_, i) => i !== index));
  }

  function handleQAChange(index: number, field: 'q' | 'a', value: string) {
    setQas(
      qas.map((qa, i) => (i === index ? { ...qa, [field]: value } : qa))
    );
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !systemPrompt) return;

    if (templateId && editCount >= 2) {
      const ok = confirm("Warning: This is your 3rd save. Saving this script will require administrator approval before it can be used. Do you want to proceed?");
      if (!ok) return;
    }

    // Filter out blank QAs
    const cleanQas = qas.filter((qa) => qa.q.trim() && qa.a.trim());

    setSaving(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: templateId,
          character_id: characterId,
          title: title.trim(),
          script: {
            systemPrompt: systemPrompt.trim(),
            questions: cleanQas,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to save template');
      await loadTemplates();
      setIsEditorOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm('Are you sure you want to delete this script template?')) return;
    try {
      const res = await fetch(`/api/templates?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      setTemplates(templates.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto min-h-screen relative">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Classroom Scripts</span>
              <Sparkles size={12} className="text-indigo-400" />
            </div>
            <h1 className="font-display text-3xl font-bold text-white">Q&A Script Templates</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Create custom teaching guides, topic scripts, and specific question-answers for your AR characters.
            </p>
          </div>

          <button onClick={handleOpenCreate} className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2">
            <Plus size={16} /> Create Template
          </button>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading scripts…</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-300">Failed to load templates: {error}</div>
        ) : templates.length === 0 ? (
          <div className="glass-card p-16 text-center max-w-lg mx-auto mt-12">
            <SaveAll size={48} className="mx-auto mb-4 opacity-30 text-indigo-400" />
            <h3 className="text-lg font-bold text-white mb-2">No custom scripts yet</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Create your first script template to configure exactly what your interactive avatars say and how they answer student questions.
            </p>
            <button onClick={handleOpenCreate} className="btn-primary py-2 px-5 text-xs mx-auto">
              Create First Script
            </button>
          </div>
        ) : (
          /* Templates Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => {
              const charName = ALL_CHARACTERS.find((c) => c.id === tpl.character_id)?.name || tpl.character_id;
              const qCount = tpl.script?.questions?.length || 0;

              return (
                <div key={tpl.id} className={`glass-card p-6 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 ${tpl.script?.status === 'pending_approval' ? 'border-amber-500/25 bg-amber-500/[0.01]' : ''}`}>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {charName}
                      </span>
                      <div className="flex items-center gap-2">
                        {tpl.script?.status === 'pending_approval' ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            Pending Approval
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            Approved
                          </span>
                        )}
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {qCount} custom Q&As
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-white text-lg mb-2">{tpl.title}</h3>
                    <p className="text-sm line-clamp-3 mb-6" style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {tpl.script?.systemPrompt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <button
                      onClick={() => handleOpenEdit(tpl)}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
                    >
                      <Edit size={12} /> Edit Template
                    </button>

                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1.5"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Drawer Editor */}
        <AnimatePresence>
          {isEditorOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditorOpen(false)}
                className="fixed inset-0 bg-black z-40"
              />

              {/* Drawer */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-xl z-50 glass-dark p-8 flex flex-col justify-between"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', height: '100vh', overflowY: 'auto' }}
              >
                <form onSubmit={handleSaveTemplate} className="space-y-6 flex flex-col justify-between min-h-full">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      {templateId ? 'Edit Script Template' : 'Create Script Template'}
                    </h3>
                    <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)' }}>
                      Set the character's scenario topic and pre-program answers to expected questions.
                    </p>

                    {templateId && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-5 flex items-center justify-between">
                        <div className="text-[11px] text-amber-300 font-medium">
                          ✍️ Save Count: <span className="font-bold text-white">{editCount}</span> of 2 edits used.
                          <div className="text-[9px] text-slate-400 font-normal mt-0.5">
                            Saving a 3rd time will require admin approval.
                          </div>
                        </div>
                        {editCount >= 2 && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-300">
                            Approval Needed Next
                          </span>
                        )}
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Title */}
                      <div>
                        <label className="block text-xs font-semibold text-white mb-2 uppercase tracking-wider">Script Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Water Cycle Lesson Script"
                          className="input-field w-full py-2.5"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                        />
                      </div>

                      {/* Character Select */}
                      <div>
                        <label className="block text-xs font-semibold text-white mb-2 uppercase tracking-wider">Target Character</label>
                        <select
                          className="input-field w-full py-2.5"
                          value={characterId}
                          onChange={(e) => setCharacterId(e.target.value)}
                        >
                          {ALL_CHARACTERS.map((char) => (
                            <option key={char.id} value={char.id} className="bg-slate-900 text-white">
                              {char.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* System Prompt */}
                      <div>
                        <label className="block text-xs font-semibold text-white mb-2 uppercase tracking-wider">Topic Script / Scenario</label>
                        <textarea
                          required
                          rows={4}
                          placeholder="e.g. Act as Albert Einstein. We are learning about Special Relativity. Explain time dilation simply using a train analogy..."
                          className="input-field w-full py-2.5 text-sm"
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                        />
                      </div>

                      {/* QA list builder */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-semibold text-white uppercase tracking-wider">Dynamic Questions & Answers</label>
                          <button
                            type="button"
                            onClick={handleAddQA}
                            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <PlusCircle size={12} /> Add QA Row
                          </button>
                        </div>

                        <div className="space-y-3 max-h-72 overflow-y-auto p-1 border border-white/5 rounded-xl bg-black/10">
                          {qas.map((qa, index) => (
                            <div key={index} className="p-3 rounded-lg bg-white/[0.01] border border-white/5 relative space-y-2">
                              {qas.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQA(index)}
                                  className="absolute top-2 right-2 text-red-400 hover:text-red-300 p-1"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                              <div>
                                <input
                                  type="text"
                                  placeholder="Student Question..."
                                  className="input-field w-full py-1.5 text-xs"
                                  value={qa.q}
                                  onChange={(e) => handleQAChange(index, 'q', e.target.value)}
                                />
                              </div>
                              <div>
                                <textarea
                                  placeholder="Pre-programmed Answer..."
                                  rows={2}
                                  className="input-field w-full py-1.5 text-xs"
                                  value={qa.a}
                                  onChange={(e) => handleQAChange(index, 'a', e.target.value)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8 border-t border-white/5 pt-4">
                    <button type="button" onClick={() => setIsEditorOpen(false)} className="btn-secondary flex-1 py-2.5 text-xs">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
                    >
                      {saving && <Loader2 size={12} className="animate-spin" />}
                      Save Template
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
