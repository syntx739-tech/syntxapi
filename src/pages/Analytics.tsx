import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Activity, Zap, Calendar,
  Grid3x3, ArrowUp,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { cn, formatNumber } from '../lib/utils';
import { useStore } from '../store';

const CHART_COLORS = ['#0ea5e9', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-frost-900/95 border border-frost-700/50 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-frost-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{formatNumber(p.value)}</p>
      ))}
    </div>
  );
};

export function Analytics() {
  const { analytics, macros } = useStore();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const usageData = period === 'daily' ? analytics.dailyUsage.map((d) => ({ name: d.date, value: d.count }))
    : period === 'weekly' ? analytics.weeklyUsage.map((d) => ({ name: d.week, value: d.count }))
    : analytics.monthlyUsage.map((d) => ({ name: d.month, value: d.count }));

  const keyUsageData = analytics.mostUsedKeys.slice(0, 5).map((k, i) => ({
    name: `Key ${k.keyId.replace('key-', '')}`,
    value: k.count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const today = analytics.dailyUsage[analytics.dailyUsage.length - 1]?.count ?? 0;
  const yesterday = analytics.dailyUsage[analytics.dailyUsage.length - 2]?.count ?? 0;
  const trend = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : 0;

  return (
    <div className="p-6 overflow-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-frost-100">Analytics</h2>
        <p className="text-sm text-frost-500 mt-0.5">Usage statistics and insights</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Actions', value: formatNumber(analytics.totalKeyPresses), icon: Activity, trend: 0, color: 'arctic' },
          { label: 'Today', value: formatNumber(today), icon: Calendar, trend, color: trend >= 0 ? 'emerald' : 'red' },
          { label: 'This Week', value: formatNumber(analytics.weeklyUsage.slice(-1)[0]?.count ?? 0), icon: TrendingUp, trend: 0, color: 'violet' },
        ].map(({ label, value, icon: Icon, trend: t, color }) => (
          <motion.div key={label} whileHover={{ y: -2 }} className="glass-card">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center border mb-3',
              color === 'arctic' ? 'text-arctic-400 bg-arctic-500/10 border-arctic-500/20' :
              color === 'emerald' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
              color === 'violet' ? 'text-violet-400 bg-violet-500/10 border-violet-500/20' :
              color === 'amber' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
              'text-red-400 bg-red-500/10 border-red-500/20'
            )}>
              <Icon size={16} />
            </div>
            <p className="font-bold text-frost-100 text-2xl">{value}</p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xs text-frost-500">{label}</p>
              {t !== undefined && t !== 0 && (
                <span className={cn('text-xs font-medium flex items-center gap-0.5', t >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  <ArrowUp size={10} className={t < 0 ? 'rotate-180' : ''} />
                  {Math.abs(t)}%
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Usage chart */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-arctic-400" />
            <span className="font-semibold text-frost-200 text-sm">Usage Over Time</span>
          </div>
          <div className="flex gap-1">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all',
                  period === p ? 'bg-arctic-500/20 text-arctic-400' : 'text-frost-600 hover:text-frost-400'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={usageData}>
            <defs>
              <linearGradient id="arcticGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} fill="url(#arcticGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Most used keys bar chart */}
        <div className="glass-card">
          <div className="flex items-center gap-2 mb-4">
            <Grid3x3 size={16} className="text-arctic-400" />
            <span className="font-semibold text-frost-200 text-sm">Most Used Keys</span>
          </div>
          {keyUsageData.length === 0 ? (
            <div className="rounded-xl border border-dashed border-frost-700/40 px-4 py-10 text-center text-xs text-frost-600">No key usage yet — counters start at 0.</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={keyUsageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={4}>
                  {keyUsageData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Most used macros */}
        <div className="glass-card">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-arctic-400" />
            <span className="font-semibold text-frost-200 text-sm">Most Used Macros</span>
          </div>
          {analytics.mostUsedMacros.length === 0 ? (
            <div className="rounded-xl border border-dashed border-frost-700/40 px-4 py-10 text-center text-xs text-frost-600">No macro usage yet — counters start at 0.</div>
          ) : (
          <div className="space-y-3">
            {analytics.mostUsedMacros.map((item, i) => {
              const macro = macros.find((m) => m.id === item.macroId);
              const max = analytics.mostUsedMacros[0]?.count ?? 1;
              const pct = (item.count / max) * 100;
              return (
                <div key={item.macroId}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span>{macro?.icon ?? '⚡'}</span>
                      <span className="text-frost-300 font-medium">{macro?.name ?? item.macroId}</span>
                    </div>
                    <span className="text-frost-500 font-mono">{formatNumber(item.count)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-frost-800/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: CHART_COLORS[i] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
