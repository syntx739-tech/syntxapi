import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Grid3x3, BarChart3, Settings, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';

const ADMIN_STORAGE_VERSION = 'empty-v3';

function readAdminList<T>(key: string): T[] {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T[] : [];
  } catch {
    return [];
  }
}

export function SearchOverlay() {
  const { searchOpen, closeSearch, setPage } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchOpen) closeSearch();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen]);

  const q = query.toLowerCase();

  const results = q.length < 2 ? [] : [
    ...readAdminList<{ value: string; plan: string; status: string }>(`arctic-admin-license-keys-${ADMIN_STORAGE_VERSION}`)
      .filter((k) => [k.value, k.plan].some((v) => v.toLowerCase().includes(q)))
      .map((k) => ({
        type: 'License Key' as const, id: k.value, title: k.value, subtitle: `${k.plan} · ${k.status}`,
        icon: '🔑', action: () => { setPage('keypanel'); closeSearch(); },
      })),
    ...readAdminList<{ username: string; plan: string; key: string; status: string }>(`arctic-admin-accounts-${ADMIN_STORAGE_VERSION}`)
      .filter((a) => [a.username, a.plan, a.key].some((v) => v.toLowerCase().includes(q)))
      .map((a) => ({
        type: 'User' as const, id: a.username, title: a.username, subtitle: `${a.plan} · ${a.status}`,
        icon: '👤', action: () => { setPage('keypanel'); closeSearch(); },
      })),
  ].slice(0, 12);

  const TYPE_COLORS: Record<string, string> = {
    'License Key': 'text-emerald-400 bg-emerald-500/10',
    Loader: 'text-violet-400 bg-violet-500/10',
    User: 'text-arctic-400 bg-arctic-500/10',
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSearch}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4"
          >
            <div className="bg-frost-900/95 backdrop-blur-2xl border border-frost-700/50 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4">
                <Search size={20} className="text-arctic-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search keys or users..."
                  className="flex-1 bg-transparent text-frost-100 placeholder-frost-500 focus:outline-none"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="p-1 rounded-lg text-frost-500 hover:text-frost-300 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>

              {query.length >= 2 && (
                <div className="border-t border-frost-800/50 max-h-96 overflow-y-auto p-2">
                  {results.length === 0 ? (
                    <div className="text-center py-8 text-frost-500 text-sm">
                      No results for "<span className="text-frost-300">{query}</span>"
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] text-frost-600 uppercase tracking-widest px-3 py-2 font-semibold">
                        {results.length} result{results.length !== 1 ? 's' : ''}
                      </p>
                      {results.map((r) => (
                        <motion.button
                          key={`${r.type}-${r.id}`}
                          onClick={r.action}
                          whileHover={{ x: 2 }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-frost-800/50 transition-colors group text-left"
                        >
                          <span className="text-lg w-8 text-center shrink-0">{r.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-frost-100 font-medium">{r.title}</p>
                            <p className="text-xs text-frost-500 truncate">{r.subtitle}</p>
                          </div>
                          <span className={cn('text-[10px] px-2 py-1 rounded-lg font-medium', TYPE_COLORS[r.type] ?? 'text-frost-400 bg-frost-800/50')}>
                            {r.type}
                          </span>
                          <ArrowRight size={14} className="text-frost-700 group-hover:text-arctic-500 transition-colors shrink-0" />
                        </motion.button>
                      ))}
                    </>
                  )}
                </div>
              )}

              {query.length < 2 && (
                <div className="border-t border-frost-800/50 p-4">
                  <p className="text-xs text-frost-600 mb-3">Quick access</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Keypanel', icon: Grid3x3, page: 'keypanel' },
                      { label: 'Analytics', icon: BarChart3, page: 'analytics' },
                      { label: 'Settings', icon: Settings, page: 'settings' },
                    ].map(({ label, icon: Icon, page }) => (
                      <button
                        key={page}
                        onClick={() => { setPage(page as any); closeSearch(); }}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-frost-800/30 hover:bg-frost-800/60 transition-colors"
                      >
                        <Icon size={18} className="text-arctic-400" />
                        <span className="text-xs text-frost-400">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
