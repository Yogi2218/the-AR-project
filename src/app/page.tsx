'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Brain, Mic, Video, Users, Zap, Globe,
  ChevronRight, Star, Play, BookOpen, Leaf, FlaskConical
} from 'lucide-react';

const FEATURES = [
  { icon: Brain,        title: 'AI-Powered Characters',  desc: 'Historical figures, animals, and scientists brought to life with scripted personalities and knowledge bases.' },
  { icon: Mic,          title: 'Voice Interaction',       desc: 'Students ask questions aloud. Characters respond with natural speech, facial animation, and gestures.' },
  { icon: Video,        title: 'Session Recording',       desc: 'Record every session as MP4 — save classroom highlights, create revision videos, share on school channels.' },
  { icon: Users,        title: 'Class-Ready Controls',   desc: 'Teacher control panel + audience interaction mode. Manage scripts, trigger responses, stay in control.' },
  { icon: Zap,          title: 'Projector Native',        desc: 'One-click HDMI extended display mode. Project AR characters on any classroom screen or auditorium stage.' },
  { icon: Globe,        title: 'No Installation Needed', desc: 'Runs entirely in the browser. Any laptop, any school — nothing to install, no enterprise license.' },
];

const CHARACTERS = [
  { emoji: '🧪', name: 'Albert Einstein',  subject: 'Physics & Relativity',   cat: 'Scientist',  color: 'cat-scientist' },
  { emoji: '🕊️', name: 'Mahatma Gandhi',  subject: 'History & Non-Violence',  cat: 'Leader',     color: 'cat-leader'    },
  { emoji: '🦕', name: 'Tyrannosaurus Rex', subject: 'Prehistoric Life',       cat: 'Extinct',    color: 'cat-extinct'   },
  { emoji: '🦁', name: 'African Lion',     subject: 'Wildlife & Ecosystems',   cat: 'Animal',     color: 'cat-animal'    },
  { emoji: '🦅', name: 'Bald Eagle',       subject: 'Birds & Migration',       cat: 'Bird',       color: 'cat-bird'      },
  { emoji: '🔭', name: 'Marie Curie',      subject: 'Chemistry & Radioactivity', cat: 'Scientist', color: 'cat-scientist' },
];

const STATS = [
  { value: '10+',  label: 'Pre-built Characters' },
  { value: '0₹',   label: 'Software License Cost' },
  { value: '< 5s', label: 'Session Launch Time' },
  { value: '100%', label: 'Browser-Based' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-dark px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#6278f8,#4a57ed)' }}>
            <span className="text-sm font-bold text-white">AR</span>
          </div>
          <span className="font-display font-bold text-xl text-white">EduAR</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Link href="/characters" className="hover:text-white transition-colors">Characters</Link>
          <Link href="/dashboard"  className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/scripts"    className="hover:text-white transition-colors">Scripts</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary text-sm py-2 px-4">Teacher Login</Link>
          <Link href="/session/demo" className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <Play size={14} /> Demo Session
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden gradient-hero grid-bg">
        {/* Glow orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
             style={{ background: 'radial-gradient(circle, #6278f8, transparent)' }} />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-15"
             style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-xs font-medium"
               style={{ background: 'rgba(98,120,248,0.15)', border: '1px solid rgba(98,120,248,0.3)', color: '#8199fb' }}>
            <Star size={12} />  Now available for school pilots — 100% free to try
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Bring{' '}
            <span className="gradient-brand">History & Science</span>
            <br />to Life in Your Classroom
          </h1>

          <p className="text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Project AI-powered AR characters — Einstein, Gandhi, Dinosaurs, Lions — onto any
            classroom stage. Students interact, ask questions, and learn from immersive living characters.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/session/demo"
                  className="btn-primary text-base py-4 px-8 flex items-center justify-center gap-2">
              <Play size={18} /> Launch Demo Session
            </Link>
            <Link href="/characters"
                  className="btn-secondary text-base py-4 px-8 flex items-center justify-center gap-2">
              <BookOpen size={18} /> View Characters <ChevronRight size={16} />
            </Link>
          </div>
        </motion.div>

        {/* Floating character previews */}
        <motion.div
          className="relative z-10 mt-20 flex justify-center gap-6 flex-wrap"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          {CHARACTERS.slice(0, 4).map((char, i) => (
            <motion.div
              key={char.name}
              className="glass-card p-4 w-36 cursor-pointer"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
            >
              <div className="text-4xl mb-2 text-center">{char.emoji}</div>
              <div className="text-xs font-semibold text-white text-center">{char.name.split(' ')[0]}</div>
              <div className={`badge badge-category ${char.color} mt-1 text-center w-full block`}>
                {char.cat}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              className="stat-card"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <div className="font-display text-3xl font-bold mb-1 gradient-brand">{s.value}</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-white mb-4">
              Everything Teachers Need
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>Built for classrooms, not tech labs</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                className="glass-card p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                     style={{ background: 'rgba(98,120,248,0.15)' }}>
                  <f.icon size={20} color="#8199fb" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Character Library Preview ──────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'rgba(98,120,248,0.03)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-white mb-4">
              10 Pre-Built Educational Characters
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>Each with full Q&A scripts, voice profiles, and personality</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CHARACTERS.map((char, i) => (
              <motion.div
                key={char.name}
                className="glass-card p-4 text-center cursor-pointer group"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-5xl mb-3">{char.emoji}</div>
                <div className="text-xs font-bold text-white mb-1">{char.name.split(' ').slice(-1)[0]}</div>
                <div className={`badge ${char.color} text-xs`}>{char.cat}</div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/characters" className="btn-primary inline-flex items-center gap-2">
              <Leaf size={16} /> Browse Full Library <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it Works ──────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-white mb-4">3 Steps to Launch</h2>
          </div>
          {[
            { step: '01', icon: BookOpen,    title: 'Pick a Character', desc: 'Choose from our library or create your own. Select a pre-built Q&A script or upload your own.' },
            { step: '02', icon: FlaskConical, title: 'Connect Projector', desc: 'Plug in HDMI, click "Projector Mode". The AR character appears on stage — instantly.' },
            { step: '03', icon: Users,        title: 'Start the Session', desc: 'Students ask questions, trigger scripts, or let the character present. Record everything as MP4.' },
          ].map((step, i) => (
            <motion.div
              key={step.step}
              className="flex gap-6 mb-8"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-sm"
                   style={{ background: 'linear-gradient(135deg,#6278f8,#4a57ed)', color: 'white' }}>
                {step.step}
              </div>
              <div className="glass-card p-4 flex-1">
                <h3 className="font-semibold text-white mb-1">{step.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto glass-card p-12">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Ready for Your Classroom?
          </h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            No software to install. No license to buy. Works on any laptop with a projector.
          </p>
          <Link href="/login" className="btn-primary text-lg py-4 px-10 inline-flex items-center gap-2">
            Get Started Free <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
        <span>EduAR — Educational AR Platform &copy; 2025 &nbsp;|&nbsp; Built for Schools &nbsp;|&nbsp; Open Source</span>
      </footer>
    </div>
  );
}
