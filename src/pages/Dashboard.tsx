import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Monitor, Cpu, Zap, Clock, TrendingUp, Grid3x3,
  Settings, Activity,
  ChevronRight, Snowflake,
} from 'lucide-react';
import { useStore } from '../store';
import { cn, formatNumber, timeAgo } from '../lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

function StatCard({ icon: Icon, label, value, sub, color = 'arctic', trend }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  color?: string; trend?: number;
}) {
  const colorMap: Record<string, string> = {
    arctic: 'text-arctic-400 bg-arctic-500/10 border-arctic-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  return (
    <motion.div variants={cardVariants} className="glass-card group">
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', colorMap[color] ?? colorMap.arctic)}>
          <Icon size={18} />
        </div>
        {trend !== undefined && (
          <span className={cn('text-xs font-medium', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-frost-100">{value}</p>
        <p className="text-sm font-medium text-frost-300 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-frost-600 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

const ACTIVITY: Array<{ icon: string; text: string; time: string; color: string }> = [];

export function Dashboard() {
  const { device, analytics, setPage } = useStore();
  const connected = device.status === 'connected';
  const todayUsage = analytics.dailyUsage[analytics.dailyUsage.length - 1]?.count ?? 0;
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-6 space-y-6">
      {/* Hero */}
      <motion.div variants={cardVariants} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-frost-900/80 to-frost-950/80 border border-frost-800/50 p-6">
        {/* BG decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-arctic-500/5 blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full bg-cyan-500/5 blur-2xl" />
          <Snowflake className="absolute top-4 right-4 text-arctic-500/10" size={120} />
        </div>
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-frost-500 text-sm mb-1">Welcome back</p>
            <h1 className="text-3xl font-bold text-frost-50">ARCTIC workspace</h1>
            <p className="text-frost-400 mt-1.5">Live control-plane data only — no demo activity is shown.</p>
            <div className="flex items-center gap-2 mt-3">
              <div className={cn('w-2 h-2 rounded-full', connected ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-amber-400')} />
              <span className={cn('text-sm font-medium', connected ? 'text-emerald-400' : 'text-amber-400')}>{connected ? 'Device connected' : 'No device connected'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setPage('keypanel')}
              className="btn-primary"
            >
              <Grid3x3 size={16} />
              Open Keypanel
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Monitor} label="Device Status" value={connected ? 'Connected' : 'Disconnected'} sub="ARCTIC Keypanel" color={connected ? 'emerald' : 'amber'} />
        <StatCard icon={Zap} label="Total Actions" value={formatNumber(analytics.totalKeyPresses)} sub="Recorded locally" color="violet" />
        <StatCard icon={Activity} label="Today" value={formatNumber(todayUsage)} sub="Recorded locally" color="amber" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Device info */}
        <motion.div variants={cardVariants} className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Monitor size={16} className="text-arctic-400" />
              <span className="font-semibold text-frost-200 text-sm">Device Status</span>
            </div>
            <button onClick={() => setPage('device')} className="text-xs text-arctic-400 hover:text-arctic-300 flex items-center gap-1">
              Details <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Device', value: device.name },
              { label: 'Firmware', value: device.firmware },
              { label: 'Connection', value: device.connection.toUpperCase() },
              { label: 'Polling Rate', value: `${device.pollingRate}Hz` },
              { label: 'Temperature', value: `${device.temperature}°C` },
              { label: 'Storage', value: `${device.storage.used}/${device.storage.total} KB` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-frost-500">{label}</span>
                <span className="text-xs text-frost-200 font-medium font-mono">{value}</span>
              </div>
            ))}
          </div>
          {/* Storage bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-frost-600 mb-1">
              <span>Storage</span>
              <span>{Math.round(device.storage.used / device.storage.total * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-frost-800/50">
              <div
                className="h-full rounded-full bg-arctic-500"
                style={{ width: `${(device.storage.used / device.storage.total) * 100}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Activity feed */}
        <motion.div variants={cardVariants} className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-arctic-400" />
              <span className="font-semibold text-frost-200 text-sm">Recent Activity</span>
            </div>
            <span className="text-xs text-frost-600">Real events only</span>
          </div>
          {ACTIVITY.length === 0 ? (
            <div className="rounded-xl border border-dashed border-frost-700/40 px-4 py-8 text-center text-xs text-frost-600">No activity yet</div>
          ) : (
            <div className="space-y-3">
              {ACTIVITY.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3">
                  <span className="mt-0.5 text-sm">{item.icon}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs text-frost-300">{item.text}</p><p className="mt-0.5 text-[10px] text-frost-600">{item.time}</p></div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

      </div>

      {/* Quick actions */}
      <motion.div variants={cardVariants} className="glass-card">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-arctic-400" />
          <span className="font-semibold text-frost-200 text-sm">Quick Actions</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {[
            { label: 'Open Keypanel', icon: Grid3x3, page: 'keypanel', color: 'bg-arctic-500/10 border-arctic-500/20 hover:bg-arctic-500/20' },
            { label: 'Device Settings', icon: Settings, page: 'device', color: 'bg-frost-800/50 border-frost-700/30 hover:bg-frost-700/50' },
          ].map(({ label, icon: Icon, page, color }) => (
            <motion.button
              key={label}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setPage(page as any)}
              className={cn('flex flex-col items-center gap-2 p-4 rounded-xl border transition-all', color)}
            >
              <Icon size={20} className="text-frost-300" />
              <span className="text-xs text-frost-400 text-center leading-tight">{label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

    </motion.div>
  );
}
