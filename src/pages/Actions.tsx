import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Keyboard, Globe, Terminal, Volume2, User, Clock,
  Copy, Layers, GitBranch, FileText, Music, Clipboard, Zap,
  ChevronRight, Plus, Search,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import type { ActionType } from '../types';

interface ActionDef {
  type: ActionType;
  label: string;
  description: string;
  icon: React.ElementType;
  category: string;
  color: string;
  example: string;
}

const ALL_ACTIONS: ActionDef[] = [
  {
    type: 'keyboard_shortcut', label: 'Keyboard Shortcut', icon: Keyboard,
    description: 'Trigger any keyboard shortcut combination', category: 'Input',
    color: 'text-arctic-400 bg-arctic-500/10 border-arctic-500/20',
    example: 'CTRL + SHIFT + M',
  },
  {
    type: 'single_key', label: 'Single Key', icon: Keyboard,
    description: 'Press a single key on the keyboard', category: 'Input',
    color: 'text-arctic-300 bg-arctic-500/10 border-arctic-500/20',
    example: 'F9',
  },
  {
    type: 'macro', label: 'Macro', icon: Zap,
    description: 'Run a saved macro sequence', category: 'Automation',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    example: 'Open Streaming Setup',
  },
  {
    type: 'open_application', label: 'Open Application', icon: Play,
    description: 'Launch any application on your system', category: 'System',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    example: 'OBS Studio, Discord...',
  },
  {
    type: 'open_website', label: 'Open Website', icon: Globe,
    description: 'Open a URL in the default browser', category: 'System',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    example: 'https://twitch.tv',
  },
  {
    type: 'launch_file', label: 'Launch File', icon: FileText,
    description: 'Open any file with its default application', category: 'System',
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    example: 'document.pdf',
  },
  {
    type: 'run_command', label: 'Run Command', icon: Terminal,
    description: 'Execute a terminal or shell command', category: 'System',
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    example: 'npm run dev',
  },
  {
    type: 'media_control', label: 'Media Control', icon: Music,
    description: 'Play, pause, skip tracks in media apps', category: 'Media',
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    example: 'Play / Pause',
  },
  {
    type: 'volume_control', label: 'Volume Control', icon: Volume2,
    description: 'Adjust system or app volume levels', category: 'Media',
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    example: 'Set volume to 70%',
  },
  {
    type: 'profile_switch', label: 'Profile Switch', icon: User,
    description: 'Instantly switch to a different profile', category: 'Profiles',
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    example: 'Switch to Gaming',
  },
  {
    type: 'text_input', label: 'Text Input', icon: FileText,
    description: 'Type a predefined text string', category: 'Input',
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    example: 'Hello, World!',
  },
  {
    type: 'clipboard_action', label: 'Clipboard Action', icon: Clipboard,
    description: 'Copy text to or paste from clipboard', category: 'Input',
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    example: 'Copy current URL',
  },
  {
    type: 'delay', label: 'Delay', icon: Clock,
    description: 'Wait for a specified amount of time', category: 'Flow',
    color: 'text-frost-400 bg-frost-800/30 border-frost-700/30',
    example: '250ms',
  },
  {
    type: 'multi_action', label: 'Multi Action', icon: Layers,
    description: 'Run multiple actions in sequence or parallel', category: 'Flow',
    color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    example: 'Run 5 actions at once',
  },
  {
    type: 'automation', label: 'Trigger Automation', icon: GitBranch,
    description: 'Trigger a saved automation rule', category: 'Automation',
    color: 'text-lime-400 bg-lime-500/10 border-lime-500/20',
    example: 'Evening Gaming Mode',
  },
];

const CATEGORIES = ['All', 'Input', 'System', 'Media', 'Profiles', 'Automation', 'Flow'];

function ActionCard({ action, onTry }: { action: ActionDef; onTry: () => void }) {
  const Icon = action.icon;
  return (
    <motion.div layout whileHover={{ y: -2 }} className="glass-card group cursor-pointer" onClick={onTry}>
      <div className="flex items-start gap-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border shrink-0', action.color)}>
          <Icon size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-frost-100 text-sm">{action.label}</h3>
            <span className="text-[10px] text-frost-600 bg-frost-800/50 border border-frost-700/30 rounded-full px-2 py-0.5">
              {action.category}
            </span>
          </div>
          <p className="text-xs text-frost-500 mt-1">{action.description}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[10px] text-frost-600">Example:</span>
            <code className="text-[10px] text-arctic-400 bg-arctic-500/10 border border-arctic-500/20 rounded px-1.5 py-0.5 font-mono">
              {action.example}
            </code>
          </div>
        </div>
        <ChevronRight size={14} className="text-frost-700 group-hover:text-arctic-500 transition-colors shrink-0 mt-1" />
      </div>
    </motion.div>
  );
}

export function Actions() {
  const { setPage } = useStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = ALL_ACTIONS.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = a.label.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    const matchCat = category === 'All' || a.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-frost-100">Actions</h2>
          <p className="text-sm text-frost-500 mt-0.5">{ALL_ACTIONS.length} available action types</p>
        </div>
        <button onClick={() => setPage('keypanel')} className="btn-primary text-sm gap-1.5">
          <Plus size={14} /> Assign to Key
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-frost-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions..."
            className="input pl-9 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                category === cat
                  ? 'bg-arctic-500/20 border-arctic-500/30 text-arctic-400'
                  : 'bg-frost-900/50 border-frost-800/50 text-frost-500 hover:text-frost-300 hover:border-frost-700/50'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <Play size={48} className="text-frost-700 mx-auto mb-4" />
          <p className="text-frost-400">No actions found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((action) => (
            <ActionCard
              key={action.type}
              action={action}
              onTry={() => setPage('keypanel')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
