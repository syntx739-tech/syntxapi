import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Plus, Trash2, Copy, Edit3, Play, Clock, Keyboard,
  Terminal, Volume2, Globe, User, X, Check, GripVertical,
  ChevronRight, MoreHorizontal, Save, ArrowDown,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import type { Macro, MacroStep, ActionType } from '../types';

const STEP_ICONS: Partial<Record<ActionType, React.ElementType>> = {
  keyboard_shortcut: Keyboard,
  single_key: Keyboard,
  delay: Clock,
  open_application: Play,
  open_website: Globe,
  run_command: Terminal,
  volume_control: Volume2,
  profile_switch: User,
};

const STEP_COLORS: Partial<Record<ActionType, string>> = {
  keyboard_shortcut: 'text-arctic-400 bg-arctic-500/10 border-arctic-500/20',
  single_key: 'text-arctic-300 bg-arctic-500/10 border-arctic-500/20',
  delay: 'text-frost-400 bg-frost-800/30 border-frost-700/30',
  open_application: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  open_website: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  run_command: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  volume_control: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  profile_switch: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
};

function MacroCard({ macro, isSelected, onClick }: { macro: Macro; isSelected: boolean; onClick: () => void }) {
  const { deleteMacro, duplicateMacro } = useStore();
  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        'glass-card cursor-pointer transition-all',
        isSelected ? 'ring-2 ring-arctic-500/50 bg-arctic-500/5' : 'hover:bg-frost-800/10'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border border-white/10"
          style={{ background: `${macro.color}20` }}
        >
          {macro.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-frost-100 text-sm truncate">{macro.name}</p>
          <p className="text-xs text-frost-500 mt-0.5 truncate">{macro.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-frost-600">{macro.steps.length} steps</span>
            <span className="text-[10px] text-frost-600">{macro.usageCount} uses</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); duplicateMacro(macro.id); }}
            className="p-1.5 rounded-lg text-frost-600 hover:text-frost-300 hover:bg-frost-800/50 transition-colors"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteMacro(macro.id); }}
            className="p-1.5 rounded-lg text-frost-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function StepCard({ step, index, total }: { step: MacroStep; index: number; total: number }) {
  const Icon = STEP_ICONS[step.type] ?? Zap;
  const colorClass = STEP_COLORS[step.type] ?? 'text-frost-400 bg-frost-800/30 border-frost-700/30';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      {/* Timeline */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 32 }}>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center border text-xs font-bold', colorClass)}>
          <Icon size={13} />
        </div>
        {index < total - 1 && (
          <div className="w-px flex-1 bg-frost-800/50 mt-1" style={{ minHeight: 16 }} />
        )}
      </div>
      {/* Card */}
      <div className={cn('flex-1 flex items-center justify-between p-3 rounded-xl border mb-3', step.enabled ? '' : 'opacity-40')}>
        <div>
          <p className="text-sm font-semibold text-frost-200">{step.label}</p>
          {step.delay > 0 && (
            <p className="text-xs text-frost-500 mt-0.5">
              <Clock size={10} className="inline mr-1" />
              Delay: {step.delay}ms
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button className="p-1.5 rounded-lg text-frost-600 hover:text-frost-300 hover:bg-frost-800/50 transition-colors">
            <Edit3 size={12} />
          </button>
          <button className="p-1.5 rounded-lg text-frost-600 hover:text-frost-300 hover:bg-frost-800/50 transition-colors">
            <GripVertical size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function MacroBuilder({ macro }: { macro: Macro }) {
  const { updateMacro } = useStore();
  const [name, setName] = useState(macro.name);
  const [desc, setDesc] = useState(macro.description);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-frost-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{macro.icon}</span>
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-bold text-frost-100 bg-transparent border-none outline-none focus:ring-0 p-0"
            />
            <p className="text-xs text-frost-500">{macro.steps.length} steps • {macro.usageCount} uses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateMacro(macro.id, { name, description: desc })}
            className="btn-primary text-xs"
          >
            <Save size={13} /> Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-xl mx-auto">
          {/* Description */}
          <div className="mb-6">
            <label className="label">Description</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="input text-sm"
              placeholder="What does this macro do?"
            />
          </div>

          {/* Steps */}
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold text-frost-200 text-sm">Action Steps</p>
            <span className="text-xs text-frost-600">{macro.steps.length} total</span>
          </div>

          {macro.steps.length === 0 ? (
            <div className="text-center py-12 glass-panel">
              <Zap size={28} className="text-frost-700 mx-auto mb-2" />
              <p className="text-frost-500 text-sm">No steps yet</p>
              <p className="text-frost-700 text-xs mt-1">Add your first action below</p>
            </div>
          ) : (
            <div>
              {macro.steps.map((step, i) => (
                <StepCard key={step.id} step={step} index={i} total={macro.steps.length} />
              ))}
            </div>
          )}

          {/* Add action */}
          <button className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-frost-700/50 text-frost-500 hover:text-frost-300 hover:border-arctic-500/50 hover:bg-arctic-500/5 transition-all text-sm">
            <Plus size={15} />
            Add Action
          </button>
        </div>
      </div>
    </div>
  );
}

export function Macros() {
  const { macros, addMacro } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(macros[0]?.id ?? null);
  const selectedMacro = macros.find((m) => m.id === selectedId);

  const handleCreate = () => {
    addMacro({
      name: 'New Macro',
      description: 'Configure this macro',
      icon: '⚡',
      color: '#0ea5e9',
      steps: [],
    });
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 flex flex-col border-r border-frost-800/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4 border-b border-frost-800/50">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-arctic-400" />
            <span className="font-semibold text-frost-100 text-sm">Macros</span>
            <span className="text-[10px] bg-frost-800/50 text-frost-500 px-1.5 py-0.5 rounded-full border border-frost-700/30">
              {macros.length}
            </span>
          </div>
          <button onClick={handleCreate} className="btn-primary text-xs py-1.5 px-2.5">
            <Plus size={13} /> New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {macros.length === 0 ? (
            <div className="text-center py-12">
              <Zap size={28} className="text-frost-700 mx-auto mb-2" />
              <p className="text-frost-500 text-sm">No macros yet</p>
              <button onClick={handleCreate} className="btn-primary text-xs mt-4">
                <Plus size={13} /> Create Macro
              </button>
            </div>
          ) : (
            macros.map((m) => (
              <MacroCard
                key={m.id}
                macro={m}
                isSelected={selectedId === m.id}
                onClick={() => setSelectedId(m.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Builder */}
      {selectedMacro ? (
        <MacroBuilder macro={selectedMacro} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Zap size={48} className="text-frost-700 mx-auto mb-3" />
            <p className="text-frost-400 font-medium">Select a macro to edit</p>
            <p className="text-frost-600 text-sm mt-1">or create a new one</p>
          </div>
        </div>
      )}
    </div>
  );
}
