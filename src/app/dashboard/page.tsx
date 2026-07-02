'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, MessageSquare, Target, Settings, BrainCircuit, Activity, BookOpen, Languages, ShieldAlert, Sparkles, Plus } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';

interface SessionData {
  characterId: string;
  characterName: string;
  questionsAsked: number;
  duration: number; // in ms
  timestamp: number;
  language: string;
  lessonGoal: string;
  correctionsUsed: number;
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [filterChar, setFilterChar] = useState<string>('all');
  const [filterLang, setFilterLang] = useState<string>('all');
  
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('eduar_analytics') || '[]');
      setSessions(data.sort((a: any, b: any) => b.timestamp - a.timestamp));
    } catch { }
  }, []);

  const filtered = sessions.filter(s => {
    const matchChar = filterChar === 'all' || s.characterId === filterChar;
    const matchLang = filterLang === 'all' || s.language === filterLang;
    return matchChar && matchLang;
  });

  // Calculate Metrics
  const totalSessions = filtered.length;
  const totalQuestions = filtered.reduce((acc, s) => acc + s.questionsAsked, 0);
  const totalDurationMs = filtered.reduce((acc, s) => acc + s.duration, 0);
  const avgSessionMins = totalSessions > 0 ? (totalDurationMs / totalSessions / 60000).toFixed(1) : 0;
  const totalCorrections = filtered.reduce((acc, s) => acc + (s.correctionsUsed || 0), 0);
  const engagementScore = totalDurationMs > 0 ? (totalQuestions / (totalDurationMs / 60000)).toFixed(2) : 0;

  // Language Breakdown
  const langs = filtered.reduce((acc, s) => {
    const l = s.language || 'english';
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Most Popular Character
  const charCounts = filtered.reduce((acc, s) => {
    acc[s.characterName] = (acc[s.characterName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topChar = Object.entries(charCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const allChars = Array.from(new Set(sessions.map(s => s.characterId)));
  const allLangs = Array.from(new Set(sessions.map(s => s.language || 'english')));

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">Track AI engine usage, engagement, and learning outcomes.</p>
          </div>
          <div className="flex gap-2">
            <select value={filterChar} onChange={e => setFilterChar(e.target.value)} className="input-field py-2 text-sm bg-slate-800">
              <option value="all">All Characters</option>
              {allChars.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterLang} onChange={e => setFilterLang(e.target.value)} className="input-field py-2 text-sm bg-slate-800">
              <option value="all">All Languages</option>
              {allLangs.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Total Sessions" value={totalSessions} icon={BarChart3} color="text-indigo-400" bg="bg-indigo-500/10" />
          <MetricCard title="Total Questions" value={totalQuestions} icon={MessageSquare} color="text-cyan-400" bg="bg-cyan-500/10" />
          <MetricCard title="Avg Session Time" value={`${avgSessionMins}m`} icon={Clock} color="text-emerald-400" bg="bg-emerald-500/10" />
          <MetricCard title="Engagement Score" value={`${engagementScore} Q/m`} icon={Activity} color="text-purple-400" bg="bg-purple-500/10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Detailed Stats */}
          <div className="md:col-span-1 space-y-4">
            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Target size={16}/> Session Insights</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Top Character</span>
                  <span className="font-semibold text-white">{topChar}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">AI Corrections Needed</span>
                  <span className="font-semibold text-orange-400">{totalCorrections}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Total Teaching Time</span>
                  <span className="font-semibold text-white">{Math.floor(totalDurationMs / 3600000)}h {Math.floor((totalDurationMs % 3600000) / 60000)}m</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Languages size={16}/> Language Usage</h3>
              <div className="space-y-3">
                {Object.entries(langs).map(([l, count]) => (
                  <div key={l} className="flex justify-between items-center text-sm">
                    <span className="capitalize text-slate-300">{l}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${(count / totalSessions) * 100}%` }} />
                      </div>
                      <span className="font-semibold text-white w-8 text-right">{Math.round((count / totalSessions) * 100)}%</span>
                    </div>
                  </div>
                ))}
                {Object.keys(langs).length === 0 && <span className="text-sm text-slate-500">No data available</span>}
              </div>
            </div>
          </div>

          {/* Session Log Table */}
          <div className="md:col-span-2 glass-panel p-5 flex flex-col h-full">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><BookOpen size={16}/> Recent Sessions</h3>
            <div className="flex-1 overflow-auto pr-2">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Character</th>
                    <th className="px-4 py-3">Lesson Goal</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Questions</th>
                    <th className="px-4 py-3 rounded-r-lg">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.slice(0, 15).map((s, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                        {s.characterName}
                        {s.correctionsUsed > 0 && <span title="Teacher corrections applied"><ShieldAlert size={12} className="text-orange-400" /></span>}
                      </td>
                      <td className="px-4 py-3 text-slate-300 truncate max-w-[150px]" title={s.lessonGoal}>{s.lessonGoal || 'General Session'}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDuration(s.duration)}</td>
                      <td className="px-4 py-3 font-mono text-cyan-400">{s.questionsAsked}</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(s.timestamp).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No session data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

function MetricCard({ title, value, icon: Icon, color, bg }: { title: string, value: string | number, icon: any, color: string, bg: string }) {
  return (
    <div className="glass-panel p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{title}</div>
      </div>
    </div>
  );
}
