import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Grid3x3, Settings,
  LayoutDashboard, BarChart3, ArrowRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore, type AppPage } from '../store';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
  keywords?: string[];
}

export function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette, setPage, toggleEditMode } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { id: 'goto-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => { setPage('dashboard'); closeCommandPalette(); }, category: 'Navigate', keywords: ['home'] },
    { id: 'goto-keypanel', label: 'Open Keypanel', icon: Grid3x3, action: () => { setPage('keypanel'); closeCommandPalette(); }, category: 'Navigate', keywords: ['keys', 'buttons'] },
    { id: 'goto-analytics', label: 'Open Analytics', icon: BarChart3, action: () => { setPage('analytics'); closeCommandPalette(); }, category: 'Navigate' },
    { id: 'goto-settings', label: 'Open Settings', icon: Settings, action: () => { setPage('settings'); closeCommandPalette(); }, category: 'Navigate' },
    { id: 'toggle-edit', label: 'Toggle Edit Mode', description: 'Enable/disable keypanel editing', icon: Grid3x3, action: () => { toggleEditMode(); setPage('keypanel'); closeCommandPalette(); }, category: 'Keypanel', keywords: ['edit keys'] },
  ];

  const filtered = query.trim() === ''
    ? commands.slice(0, 8)
    : commands.filter((c) => {
        const q = query.toLowerCase();
        return c.label.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.keywords?.some((k) => k.includes(q)) ||
          c.category.toLowerCase().includes(q);
      });

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (commandPaletteOpen) closeCommandPalette();
        else useStore.getState().openCommandPalette();
      }
      if (e.key === 'Escape' && commandPaletteOpen) closeCommandPalette();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCommandPalette}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 mx-4"
          >
            <div className="bg-frost-900/95 backdrop-blur-2xl border border-frost-700/50 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-frost-800/50">
                <Search size={18} className="text-frost-500 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent text-frost-100 placeholder-frost-500 focus:outline-none text-sm"
                />
                <kbd className="text-[10px] bg-frost-800/50 px-2 py-1 rounded border border-frost-700/50 text-frost-500">ESC</kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-frost-500 text-sm">No commands found</div>
                ) : (
                  Object.entries(grouped).map(([category, cmds]) => (
                    <div key={category} className="mb-2">
                      <p className="text-[10px] font-semibold text-frost-600 uppercase tracking-widest px-3 py-1.5">{category}</p>
                      {cmds.map((cmd) => {
                        const Icon = cmd.icon;
                        return (
                          <motion.button
                            key={cmd.id}
                            onClick={cmd.action}
                            whileHover={{ x: 2 }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-frost-800/50 transition-colors group text-left"
                          >
                            <div className="w-7 h-7 rounded-lg bg-frost-800/50 flex items-center justify-center shrink-0 group-hover:bg-arctic-500/20 transition-colors">
                              <Icon size={14} className="text-frost-400 group-hover:text-arctic-400 transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-frost-200 group-hover:text-frost-100 font-medium">{cmd.label}</p>
                              {cmd.description && (
                                <p className="text-xs text-frost-600 truncate">{cmd.description}</p>
                              )}
                            </div>
                            <ArrowRight size={14} className="text-frost-700 group-hover:text-arctic-500 transition-colors shrink-0" />
                          </motion.button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-3 border-t border-frost-800/50 text-[10px] text-frost-600">
                <span><kbd className="bg-frost-800/50 px-1.5 py-0.5 rounded border border-frost-700/50">↑↓</kbd> navigate</span>
                <span><kbd className="bg-frost-800/50 px-1.5 py-0.5 rounded border border-frost-700/50">↵</kbd> select</span>
                <span><kbd className="bg-frost-800/50 px-1.5 py-0.5 rounded border border-frost-700/50">ESC</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
