import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, Plus, Trash2, ChevronRight, Play,
  Clock, Wifi, Monitor, Keyboard, User, Globe,
  Volume2, Zap, X, Power, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import type { Automation } from '../types';

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  app_started: Play, app_closed: X, time: Clock, device_connected: Wifi,
  device_disconnected: Wifi, keyboard_shortcut: Keyboard,
  profile_activated: User, system_event: Monitor,
};

const TRIGGER_LABELS: Record<string, string> = {
  app_started: 'Application Started', app_closed: 'Application Closed',
  time: 'At Specific Time', device_connected: 'Device Connected',
  device_disconnected: 'Device Disconnected', keyboard_shortcut: 'Keyboard Shortcut',
  profile_activated: 'Profile Activated', system_event: 'System Event',
};

const ACTION_LABELS: Record<string, string> = {
  switch_profile: 'Switch Profile', launch_app: 'Launch Application',
  execute_macro: 'Execute Macro', send_shortcut: 'Send Shortcut',
  change_volume: 'Change Volume', show_notification: 'Show Notification',
  open_website: 'Open Website',
};

function AutomationCard({ automation }: { automation: Automation }) {
  const { toggleAutomation, deleteAutomation } = useStore();
  const TriggerIcon = TRIGGER_ICONS[automation.trigger.type] ?? Monitor;

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className={cn(
        'glass-card transition-all',
        automation.enabled ? '' : 'opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
            automation.enabled
              ? 'bg-arctic-500/10 border-arctic-500/20 text-arctic-400'
              : 'bg-frost-800/30 border-frost-700/30 text-frost-500'
          )}>
            <TriggerIcon size={16} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-frost-100 text-sm truncate">{automation.name}</p>
            <p className="text-xs text-frost-500 mt-0.5 truncate">{automation.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => toggleAutomation(automation.id)}
            className="transition-colors"
            title={automation.enabled ? 'Disable' : 'Enable'}
          >
            {automation.enabled
              ? <ToggleRight size={22} className="text-arctic-400" />
              : <ToggleLeft size={22} className="text-frost-600" />
            }
          </button>
          <button
            onClick={() => deleteAutomation(automation.id)}
            className="p-1.5 rounded-lg text-frost-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Flow */}
      <div className="mt-4 flex items-center gap-2">
        {/* Trigger */}
        <div className="flex-1 p-2.5 rounded-xl bg-frost-800/30 border border-frost-700/30">
          <p className="text-[10px] text-frost-600 uppercase tracking-widest font-semibold mb-1">Trigger</p>
          <p className="text-xs text-frost-200 font-medium">{TRIGGER_LABELS[automation.trigger.type]}</p>
          {automation.trigger.config.app && (
            <p className="text-[11px] text-frost-500 mt-0.5">{automation.trigger.config.app}</p>
          )}
          {automation.trigger.config.time && (
            <p className="text-[11px] text-frost-500 mt-0.5">{automation.trigger.config.time}</p>
          )}
        </div>

        <ChevronRight size={14} className="text-arctic-500/60 shrink-0" />

        {/* Actions */}
        <div className="flex-1 p-2.5 rounded-xl bg-frost-800/30 border border-frost-700/30">
          <p className="text-[10px] text-frost-600 uppercase tracking-widest font-semibold mb-1">
            {automation.actions.length} Action{automation.actions.length !== 1 ? 's' : ''}
          </p>
          {automation.actions.slice(0, 2).map((action, i) => (
            <p key={i} className="text-xs text-frost-200 font-medium truncate">
              {ACTION_LABELS[action.type] ?? action.type}
            </p>
          ))}
          {automation.actions.length > 2 && (
            <p className="text-[11px] text-frost-600">+{automation.actions.length - 2} more</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function Automations() {
  const { automations, addAutomation } = useStore();
  const enabled = automations.filter((a) => a.enabled);
  const disabled = automations.filter((a) => !a.enabled);

  const handleCreate = () => {
    addAutomation({
      name: 'New Automation',
      description: 'Configure trigger and actions',
      enabled: true,
      trigger: { type: 'app_started', config: { app: 'App Name' } },
      actions: [{ type: 'switch_profile', config: { profileId: '' } }],
    });
  };

  return (
    <div className="p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-frost-100">Automations</h2>
          <p className="text-sm text-frost-500 mt-0.5">{automations.length} rules — {enabled.length} active</p>
        </div>
        <button onClick={handleCreate} className="btn-primary text-sm gap-1.5">
          <Plus size={14} /> New Automation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Rules', value: automations.length, icon: GitBranch, color: 'text-arctic-400 bg-arctic-500/10 border-arctic-500/20' },
          { label: 'Active', value: enabled.length, icon: Power, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Disabled', value: disabled.length, icon: X, color: 'text-frost-400 bg-frost-800/30 border-frost-700/30' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-panel flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border', color)}>
              <Icon size={15} />
            </div>
            <div>
              <p className="text-xl font-bold text-frost-100">{value}</p>
              <p className="text-xs text-frost-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {automations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <GitBranch size={48} className="text-frost-700 mb-4" />
          <p className="text-frost-400 font-medium text-lg">No automations yet</p>
          <p className="text-frost-600 text-sm mt-1">Create rules to automate your workflow</p>
          <button onClick={handleCreate} className="btn-primary mt-6">
            <Plus size={14} /> Create Automation
          </button>
        </div>
      ) : (
        <>
          {enabled.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-frost-600 uppercase tracking-widest font-semibold mb-3">Active</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enabled.map((a) => <AutomationCard key={a.id} automation={a} />)}
              </div>
            </div>
          )}
          {disabled.length > 0 && (
            <div>
              <p className="text-xs text-frost-600 uppercase tracking-widest font-semibold mb-3">Disabled</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {disabled.map((a) => <AutomationCard key={a.id} automation={a} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Example triggers reference */}
      <div className="mt-8 glass-card">
        <p className="font-semibold text-frost-200 text-sm mb-4">Available Triggers</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(TRIGGER_LABELS).map(([key, label]) => {
            const Icon = TRIGGER_ICONS[key];
            return (
              <div key={key} className="flex items-center gap-2 p-2.5 rounded-xl bg-frost-800/30 border border-frost-700/30">
                <Icon size={14} className="text-arctic-400 shrink-0" />
                <span className="text-xs text-frost-400">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
