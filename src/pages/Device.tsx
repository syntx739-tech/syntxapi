import React from 'react';
import { motion } from 'framer-motion';
import {
  Monitor, Cpu, Thermometer, HardDrive, Wifi, Zap,
  RefreshCw, RotateCcw, Settings, AlertTriangle, Check,
  Download, Activity,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store';

export function Device() {
  const { device, simulateFirmwareUpdate } = useStore();
  const isConnected = device.status === 'connected';
  const isUpdating = device.status === 'updating';
  const hasFirmwareUpdate = device.firmware !== '2.5.0';
  const storagePct = (device.storage.used / device.storage.total) * 100;

  return (
    <div className="p-6 overflow-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-frost-100">Device Manager</h2>
        <p className="text-sm text-frost-500 mt-0.5">ARCTIC hardware status and controls</p>
      </div>

      {/* Device hero card */}
      <div className="glass-card relative overflow-hidden">
        <div className="absolute right-0 top-0 w-56 h-56 rounded-full bg-arctic-500/5 blur-3xl -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className={cn(
            'w-20 h-20 rounded-2xl flex items-center justify-center border-2 shadow-lg',
            isConnected ? 'bg-arctic-500/10 border-arctic-500/30 shadow-arctic-500/20' :
            isUpdating ? 'bg-amber-500/10 border-amber-500/30' :
            'bg-frost-800/30 border-frost-700/30'
          )}>
            <Monitor size={36} className={isConnected ? 'text-arctic-400' : 'text-frost-500'} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-frost-50">{device.name}</h2>
              <span className={cn(
                'badge text-xs',
                isConnected ? 'badge-success' :
                isUpdating ? 'badge-warning' :
                'badge-danger'
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full mr-1.5 inline-block',
                  isConnected ? 'bg-emerald-400 animate-pulse' :
                  isUpdating ? 'bg-amber-400 animate-pulse' :
                  'bg-red-400'
                )} />
                {isUpdating ? 'Updating...' : isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <p className="text-frost-400 text-sm mt-1 font-mono">{device.serial}</p>
            <div className="flex flex-wrap gap-4 mt-3">
              {[
                { label: 'Connection', value: device.connection.toUpperCase() },
                { label: 'Polling Rate', value: `${device.pollingRate}Hz` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-frost-600 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-frost-200">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button className="btn-secondary text-xs gap-1.5">
              <RefreshCw size={12} /> Restart
            </button>
            <button className="btn-secondary text-xs gap-1.5">
              <RotateCcw size={12} /> Reset
            </button>
            <button className="btn-secondary text-xs gap-1.5">
              <Settings size={12} /> Settings
            </button>
          </div>
        </div>
      </div>

      {/* Firmware update */}
      {hasFirmwareUpdate && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-amber-500/20 bg-amber-500/5"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Download size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-frost-100">Firmware Update Available</p>
                <p className="text-xs text-frost-500 mt-0.5">
                  Current: <span className="font-mono text-frost-300">{device.firmware}</span> →
                  Latest: <span className="font-mono text-emerald-400">2.5.0</span>
                </p>
              </div>
            </div>
            <button
              onClick={simulateFirmwareUpdate}
              disabled={isUpdating}
              className="btn-primary text-sm gap-2"
            >
              {isUpdating ? (
                <><RefreshCw size={14} className="animate-spin" /> Updating...</>
              ) : (
                <><Download size={14} /> Update Firmware</>
              )}
            </button>
          </div>
          {isUpdating && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-frost-500 mb-1">
                <span>Installing firmware 2.5.0...</span>
                <span>Do not disconnect</span>
              </div>
              <div className="h-1.5 rounded-full bg-frost-800/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-amber-500"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 4 }}
                />
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Cpu, label: 'Firmware', value: device.firmware, sub: hasFirmwareUpdate ? 'Update available' : 'Up to date', color: hasFirmwareUpdate ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { icon: Thermometer, label: 'Temperature', value: `${device.temperature}°C`, sub: device.temperature > 60 ? 'High' : 'Normal', color: device.temperature > 60 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-arctic-400 bg-arctic-500/10 border-arctic-500/20' },
          { icon: HardDrive, label: 'Storage', value: `${device.storage.used}KB`, sub: `${Math.round(storagePct)}% used`, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
          { icon: Activity, label: 'Polling Rate', value: `${device.pollingRate}Hz`, sub: 'USB 2.0', color: 'text-arctic-400 bg-arctic-500/10 border-arctic-500/20' },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <motion.div key={label} whileHover={{ y: -2 }} className="glass-card">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border mb-3', color)}>
              <Icon size={15} />
            </div>
            <p className="font-bold text-frost-100 text-xl">{value}</p>
            <p className="text-xs text-frost-400 mt-0.5">{label}</p>
            <p className="text-[10px] text-frost-600 mt-0.5">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Storage bar */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive size={14} className="text-arctic-400" />
            <span className="font-semibold text-frost-200 text-sm">Storage</span>
          </div>
          <span className="text-xs text-frost-500 font-mono">{device.storage.used} / {device.storage.total} KB</span>
        </div>
        <div className="h-2 rounded-full bg-frost-800/50">
          <motion.div
            className={cn('h-full rounded-full', storagePct > 80 ? 'bg-amber-500' : 'bg-arctic-500')}
            initial={{ width: 0 }}
            animate={{ width: `${storagePct}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-frost-600 mt-1.5">
          <span>{device.storage.used} KB used</span>
          <span>{device.storage.total - device.storage.used} KB free</span>
        </div>
      </div>

      {/* Actions */}
      <div className="glass-card">
        <p className="font-semibold text-frost-200 text-sm mb-4">Device Controls</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Firmware Update', icon: Download, action: simulateFirmwareUpdate, primary: hasFirmwareUpdate },
            { label: 'Restart Device', icon: RefreshCw, action: () => {}, primary: false },
            { label: 'Factory Reset', icon: RotateCcw, action: () => {}, primary: false, danger: true },
            { label: 'Calibrate Keys', icon: Settings, action: () => {}, primary: false },
          ].map(({ label, icon: Icon, action, primary, danger }) => (
            <button
              key={label}
              onClick={action}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-sm',
                primary ? 'bg-arctic-500/10 border-arctic-500/20 text-arctic-400 hover:bg-arctic-500/20' :
                danger ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' :
                'bg-frost-800/30 border-frost-700/30 text-frost-400 hover:bg-frost-800/50'
              )}
            >
              <Icon size={18} />
              <span className="text-xs text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
