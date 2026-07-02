'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Play, Filter, Sparkles } from 'lucide-react';
import { Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getCharacters, deleteCustomCharacter, CATEGORY_LABELS, type CharacterCategory, type Character } from '@/lib/characters/characterData';

const CATEGORIES: { value: CharacterCategory | 'all'; label: string }[] = [
  { value: 'all',          label: 'All'             },
  { value: 'scientist',    label: 'Scientists'      },
  { value: 'leader',       label: 'Leaders'         },
  { value: 'historical',   label: 'Historical'      },
  { value: 'animal',       label: 'Animals'         },
  { value: 'bird',         label: 'Birds'           },
  { value: 'extinct',      label: 'Extinct Species' },
];

export default function CharactersPage() {
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState<CharacterCategory | 'all'>('all');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [visibleList, setVisibleList] = useState<string[] | null>(null);

  useEffect(() => {
    async function loadVisibleCharacters() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const body = await res.json();
          if (body.profile) {
            // Admins see all; teachers see approved list
            if (body.profile.role !== 'super_admin') {
              setVisibleList(body.profile.visible_characters || []);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load user permissions:', err);
      }
    }
    loadVisibleCharacters();
    setCharacters(getCharacters());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm('Are you sure you want to delete this custom character?')) {
      deleteCustomCharacter(id.replace('custom_char_', ''));
      setCharacters(getCharacters());
    }
  };

  const filtered = characters.filter((c) => {
    const isVisible = !visibleList || visibleList.includes(c.id) || c.id.startsWith('custom_char_');
    const matchCat  = category === 'all' || c.category === category;
    const matchText = !search || c.name.toLowerCase().includes(search.toLowerCase())
                              || c.subject.toLowerCase().includes(search.toLowerCase());
    return isVisible && matchCat && matchText;
  });

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Character Library</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {characters.length} educational characters — click any to start a session
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/characters/create-ai" className="px-5 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #6278f8 0%, #a25bf6 100%)',
                    boxShadow: '0 4px 15px rgba(98, 120, 248, 0.4)',
                    color: 'white'
                  }}>
              <Sparkles size={16} /> Create with AI
            </Link>
            <Link href="/characters/create" className="btn-secondary flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold">
              <Plus size={16} /> Manual Create
            </Link>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search characters or subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className="text-sm px-4 py-2 rounded-xl font-medium transition-all"
                style={{
                  background: category === value ? 'rgba(98,120,248,0.25)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${category === value ? 'rgba(98,120,248,0.6)' : 'rgba(98,120,248,0.15)'}`,
                  color: category === value ? 'white' : 'var(--text-secondary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Character Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((char, i) => (
            <motion.div
              key={char.id}
              className="glass-card overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -3 }}
            >
              {/* Card header gradient */}
              <div className={`h-24 flex items-center justify-center bg-gradient-to-br ${char.thumbnailColor} relative`}>
                <span className="text-6xl">{char.emoji}</span>
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {char.isCustom && (
                    <button onClick={(e) => handleDelete(char.id, e)} className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                  <span className={`badge ${char.catClass}`}>{CATEGORY_LABELS[char.category] || 'Custom'}</span>
                </div>
                {char.era && (
                  <div className="absolute bottom-2 left-3 text-xs text-white/70 font-medium">{char.era}</div>
                )}
              </div>

              {/* Card body */}
              <div className="p-5 space-y-3">
                <div>
                  <h3 className="font-display font-bold text-white text-lg">{char.name}</h3>
                  <p className="text-sm font-medium" style={{ color: '#8199fb' }}>{char.subject}</p>
                </div>

                <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                  {char.description}
                </p>

                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>🎯 Ages {char.targetAge}</span>
                  <span>📝 {char.scripts.length} Q&amp;A scripts</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <Link href={`/session/${char.id}/setup`} className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm"
                    style={{ background: 'linear-gradient(135deg, #6278f8 0%, #a25bf6 100%)', borderColor: 'transparent' }}>
                    <Play size={14} /> Setup &amp; Launch
                  </Link>
                  <Link
                    href={`/session/${char.id}`}
                    className="btn-secondary px-3 py-2.5 text-xs"
                    title="Skip setup and launch directly"
                  >
                    Quick
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-lg font-medium text-white mb-2">No characters found</div>
            <div className="text-sm">Try a different search or category filter</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
