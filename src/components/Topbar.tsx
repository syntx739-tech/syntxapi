import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, Sun, Moon, Settings, ChevronRight,
  Wifi, WifiOff, Command, User, Zap, Clock,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store';

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  keypanel: 'Keypanel',
  analytics: 'Analytics',
  settings: 'Settings',
  device: 'Device Manager',
};

type TopbarProps = {
  adminUsername?: string;
  onLogout?: () => void;
};

export function Topbar({ adminUsername = 'Admin', onLogout }: TopbarProps) {
  const {
    currentPage, theme, toggleTheme, device,
    openCommandPalette, openSearch, toggleNotificationPanel, notifications, setPage,
  } = useStore();

  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;
  const isConnected = device.status === 'connected';

  const timeStr = clock.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  const dateStr = clock.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header className="flex items-center gap-4 px-6 py-3 bg-frost-950/60 backdrop-blur-xl border-b border-frost-800/50 shrink-0 z-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-frost-500 text-sm">ARCTIC</span>
        <ChevronRight size={14} className="text-frost-700 shrink-0" />
        <span className="text-frost-100 font-semibold text-sm truncate">{PAGE_LABELS[currentPage] ?? currentPage}</span>
      </div>

      {/* Clock */}
      <div className="hidden lg:flex flex-col items-end shrink-0">
        <span className="text-frost-200 text-sm font-mono font-medium">{timeStr}</span>
        <span className="text-frost-600 text-[10px]">{dateStr}</span>
      </div>

      {/* Search button */}
      <button
        onClick={openSearch}
        className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-frost-900/50 border border-frost-800/50 text-frost-500 hover:text-frost-300 hover:border-frost-700/50 transition-all text-sm group"
      >
        <Search size={14} />
        <span className="hidden md:block">Search...</span>
        <kbd className="hidden md:block text-[10px] bg-frost-800/50 px-1.5 py-0.5 rounded border border-frost-700/50 text-frost-600">
          ⌃K
        </kbd>
      </button>

      {/* Command palette shortcut */}
      <button
        onClick={openCommandPalette}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-frost-900/50 border border-frost-800/50 text-frost-500 hover:text-frost-300 hover:border-frost-700/50 transition-all"
        title="Command Palette (Ctrl+K)"
      >
        <Command size={15} />
      </button>

      {/* Connection status */}
      <button
        onClick={() => setPage('device')}
        className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border transition-all"
        style={{
          background: isConnected ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
          borderColor: isConnected ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)',
        }}
      >
        <div className={cn(
          'w-1.5 h-1.5 rounded-full',
          isConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-amber-400'
        )} />
        <span className={cn('text-xs font-medium', isConnected ? 'text-emerald-400' : 'text-amber-400')}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </button>

      {/* Theme toggle */}
      <motion.button
        onClick={toggleTheme}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2 rounded-xl text-frost-400 hover:text-frost-100 hover:bg-frost-800/50 transition-colors"
        title="Toggle theme"
      >
        <AnimatePresence mode="wait">
          {theme === 'dark' ? (
            <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <Sun size={17} />
            </motion.div>
          ) : (
            <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <Moon size={17} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Notifications */}
      <motion.button
        onClick={toggleNotificationPanel}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative p-2 rounded-xl text-frost-400 hover:text-frost-100 hover:bg-frost-800/50 transition-colors"
      >
        <Bell size={17} />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 w-4 h-4 bg-arctic-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </motion.button>

      {/* Settings */}
      <motion.button
        onClick={() => setPage('settings')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2 rounded-xl text-frost-400 hover:text-frost-100 hover:bg-frost-800/50 transition-colors"
      >
        <Settings size={17} />
      </motion.button>

      {/* Avatar */}
      <div className="flex items-center gap-2 pl-2 border-l border-frost-800/50">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-arctic-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-glow">
          S
        </div>
        <AnimatePresence>
          <div className="hidden lg:block">
            <p className="text-xs font-medium text-frost-200">{adminUsername}</p>
            <p className="text-[10px] text-frost-500">Admin</p>
          </div>
          {onLogout && <button onClick={onLogout} className="ml-2 rounded-lg px-2 py-1 text-[10px] text-frost-500 hover:bg-frost-800/60 hover:text-frost-200">Sign out</button>}
        </AnimatePresence>
      </div>
    </header>
  );
}
