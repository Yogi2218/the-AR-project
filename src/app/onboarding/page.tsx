'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, School, BookOpen, GraduationCap,
  ChevronRight, CheckCircle2, Sparkles, ArrowRight
} from 'lucide-react';

const SUBJECTS = [
  'Physics', 'Chemistry', 'Biology', 'Mathematics',
  'History', 'Geography', 'English', 'Hindi',
  'Science', 'Social Studies', 'Environmental Science', 'Computer Science',
];

const CLASS_LEVELS = [
  'Grade 1–2', 'Grade 3–5', 'Grade 6–8', 'Grade 9–10',
  'Grade 11–12', 'Undergraduate', 'Museum / Public',
];

const STEPS = [
  { id: 'name',    label: 'Your Name',    icon: User },
  { id: 'school',  label: 'School',       icon: School },
  { id: 'class',   label: 'Class Level',  icon: GraduationCap },
  { id: 'subjects',label: 'Subjects',     icon: BookOpen },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    school_name: '',
    school_id: '',
    class_level: '',
    subjects: [] as string[],
  });

  function toggleSubject(subject: string) {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  }

  function canAdvance(): boolean {
    if (step === 0) return form.full_name.trim().length >= 2;
    if (step === 1) return form.school_name.trim().length >= 2;
    if (step === 2) return !!form.class_level;
    if (step === 3) return form.subjects.length > 0;
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          school_name: form.school_name,
          school_id: form.school_id,
          class_level: form.class_level,
          subjects: form.subjects,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to save onboarding');
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Onboarding save error:', err);
      setSaving(false);
    }
  }

  const StepIcon = STEPS[step].icon;

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden grid-bg"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Glow */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
           style={{ background: 'radial-gradient(circle,#6278f8,transparent)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg mx-4"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#6278f8,#4a57ed)' }}>
              <Sparkles size={22} className="text-white" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Welcome to EduAR!</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Let's set up your teacher profile — takes 30 seconds
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-2"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: i < step
                    ? 'rgba(98,120,248,0.8)'
                    : i === step
                    ? 'linear-gradient(135deg,#6278f8,#4a57ed)'
                    : 'rgba(255,255,255,0.05)',
                  color: i <= step ? 'white' : 'var(--text-secondary)',
                  border: i === step ? '2px solid #8199fb' : '2px solid transparent',
                }}
              >
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px" style={{ background: i < step ? '#6278f8' : 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(98,120,248,0.15)' }}>
              <StepIcon size={20} style={{ color: '#8199fb' }} />
            </div>
            <div>
              <div className="text-xs font-medium mb-0.5" style={{ color: '#8199fb' }}>
                Step {step + 1} of {STEPS.length}
              </div>
              <h2 className="font-semibold text-white">{STEPS[step].label}</h2>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ── Step 0: Name ── */}
            {step === 0 && (
              <motion.div key="name"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <label className="block text-sm font-medium text-white mb-2">Full Name *</label>
                <input
                  id="onboarding-name"
                  type="text"
                  className="input-field w-full"
                  placeholder="e.g. Priya Sharma"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && canAdvance() && setStep(1)}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  This appears in your sessions and profile
                </p>
              </motion.div>
            )}

            {/* ── Step 1: School ── */}
            {step === 1 && (
              <motion.div key="school"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">School Name *</label>
                  <input
                    id="onboarding-school-name"
                    type="text"
                    className="input-field w-full"
                    placeholder="e.g. Delhi Public School, Pune"
                    value={form.school_name}
                    onChange={(e) => setForm((f) => ({ ...f, school_name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    School ID <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
                  </label>
                  <input
                    id="onboarding-school-id"
                    type="text"
                    className="input-field w-full"
                    placeholder="e.g. DPS-PUNE-001"
                    value={form.school_id}
                    onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Used to group teachers from the same school
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Class Level ── */}
            {step === 2 && (
              <motion.div key="class"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <label className="block text-sm font-medium text-white mb-3">Which grade do you primarily teach? *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CLASS_LEVELS.map((level) => (
                    <button
                      key={level}
                      id={`class-${level.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => setForm((f) => ({ ...f, class_level: level }))}
                      className="py-2.5 px-3 rounded-xl text-sm font-medium text-left transition-all"
                      style={{
                        background: form.class_level === level
                          ? 'rgba(98,120,248,0.25)'
                          : 'rgba(255,255,255,0.04)',
                        border: form.class_level === level
                          ? '1px solid rgba(98,120,248,0.6)'
                          : '1px solid rgba(255,255,255,0.06)',
                        color: form.class_level === level ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {form.class_level === level && <CheckCircle2 size={12} className="inline mr-1.5 text-indigo-400" />}
                      {level}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Subjects ── */}
            {step === 3 && (
              <motion.div key="subjects"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <label className="block text-sm font-medium text-white mb-3">
                  Which subjects do you teach? *{' '}
                  <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((subject) => {
                    const selected = form.subjects.includes(subject);
                    return (
                      <button
                        key={subject}
                        id={`subject-${subject.toLowerCase().replace(/\s+/g,'-')}`}
                        onClick={() => toggleSubject(subject)}
                        className="py-1.5 px-3 rounded-full text-sm font-medium transition-all"
                        style={{
                          background: selected ? 'rgba(98,120,248,0.25)' : 'rgba(255,255,255,0.04)',
                          border: selected ? '1px solid rgba(98,120,248,0.6)' : '1px solid rgba(255,255,255,0.08)',
                          color: selected ? 'white' : 'var(--text-secondary)',
                        }}
                      >
                        {selected && <CheckCircle2 size={11} className="inline mr-1 text-indigo-400" />}
                        {subject}
                      </button>
                    );
                  })}
                </div>
                {form.subjects.length > 0 && (
                  <p className="text-xs mt-3" style={{ color: '#8199fb' }}>
                    {form.subjects.length} subject{form.subjects.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="btn-secondary flex-1 py-3"
                disabled={saving}
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                id="onboarding-next-btn"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                style={{ opacity: canAdvance() ? 1 : 0.4 }}
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                id="onboarding-finish-btn"
                onClick={handleFinish}
                disabled={!canAdvance() || saving}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                style={{ opacity: canAdvance() && !saving ? 1 : 0.5 }}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>Enter Dashboard <ArrowRight size={16} /></>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
