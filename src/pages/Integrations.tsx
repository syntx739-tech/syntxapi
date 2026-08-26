import React from 'react';
import { motion } from 'framer-motion';
import { Puzzle, Plus, ExternalLink, Settings, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import type { Integration } from '../types';

const STATUS_CONFIG = {
  connected: { label: 'Connected', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  disconnected: { label: 'Disconnected', color: 'text-frost-500 bg-frost-800/30 border-frost-700/30', dot: 'bg-frost-600' },
  error: { label: 'Error', color: 'text-red-400 bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
  pending: { label: 'Connecting...', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
};

function IntegrationCard({ integration }: { integration: Integration }) {
  const { connectIntegration, disconnectIntegration } = useStore();
  const status = STATUS_CONFIG[integration.status];
  const isConnected = integration.status === 'connected';

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="glass-card"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-frost-800/50 border border-frost-700/30 flex items-center justify-center text-2xl shrink-0">
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-frost-100 text-sm">{integration.name}</h3>
            <span className={cn('badge text-[10px]', status.color)}>
              <span className={cn('w-1.5 h-1.5 rounded-full mr-1 inline-block', status.dot)} />
              {status.label}
            </span>
          </div>
          <p className="text-xs text-frost-500 mt-0.5 line-clamp-2">{integration.description}</p>

          {integration.permissions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {integration.permissions.map((perm) => (
                <span key={perm} className="text-[10px] px-1.5 py-0.5 rounded-md bg-frost-800/50 text-frost-500 border border-frost-700/30">
                  {perm}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-frost-800/30">
        {isConnected ? (
          <>
            <button className="btn-secondary text-xs flex-1 gap-1.5">
              <Settings size={12} /> Manage
            </button>
            <button
              onClick={() => disconnectIntegration(integration.id)}
              className="btn-danger text-xs px-3"
            >
              <X size={12} /> Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={() => connectIntegration(integration.id)}
            className="btn-primary text-xs flex-1"
          >
            <Plus size={12} /> Connect
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function Integrations() {
  const { integrations } = useStore();
  const connected = integrations.filter((i) => i.status === 'connected');
  const available = integrations.filter((i) => i.status !== 'connected');

  return (
    <div className="p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-frost-100">Integrations</h2>
          <p className="text-sm text-frost-500 mt-0.5">{connected.length} connected — {integrations.length} available</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Connected', value: connected.length, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Available', value: available.length, color: 'text-frost-400 bg-frost-800/30 border-frost-700/30' },
          { label: 'With Errors', value: integrations.filter((i) => i.status === 'error').length, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn('glass-panel flex items-center gap-3 border', color.split(' ')[1], color.split(' ')[2])}>
            <span className={cn('text-2xl font-bold', color.split(' ')[0])}>{value}</span>
            <span className="text-sm text-frost-500">{label}</span>
          </div>
        ))}
      </div>

      {connected.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-frost-600 uppercase tracking-widest font-semibold mb-3">Connected</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {connected.map((i) => <IntegrationCard key={i.id} integration={i} />)}
          </div>
        </div>
      )}

      {available.length > 0 && (
        <div>
          <p className="text-xs text-frost-600 uppercase tracking-widest font-semibold mb-3">Available</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {available.map((i) => <IntegrationCard key={i.id} integration={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}
