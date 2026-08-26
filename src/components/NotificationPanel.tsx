import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, CheckCheck, Trash2, Info, Monitor, User, ShoppingBag, GitBranch, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import { timeAgo } from '../lib/utils';

const TYPE_ICONS = {
  system: Info,
  device: Monitor,
  profile: User,
  marketplace: ShoppingBag,
  automation: GitBranch,
  macro: Zap,
};

const TYPE_COLORS = {
  system: 'text-arctic-400 bg-arctic-500/10',
  device: 'text-emerald-400 bg-emerald-500/10',
  profile: 'text-violet-400 bg-violet-500/10',
  marketplace: 'text-amber-400 bg-amber-500/10',
  automation: 'text-cyan-400 bg-cyan-500/10',
  macro: 'text-orange-400 bg-orange-500/10',
};

export function NotificationPanel() {
  const { notificationPanelOpen, closeNotificationPanel, notifications, markNotificationRead, markAllNotificationsRead, dismissNotification } = useStore();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <AnimatePresence>
      {notificationPanelOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeNotificationPanel}
            className="fixed inset-0 z-40"
          />
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed top-14 right-4 w-96 z-50 bg-frost-900/95 backdrop-blur-2xl border border-frost-700/50 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-frost-800/50">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-arctic-400" />
                <span className="font-semibold text-frost-100 text-sm">Notifications</span>
                {unread > 0 && (
                  <span className="text-[10px] bg-arctic-500/20 text-arctic-400 px-1.5 py-0.5 rounded-full border border-arctic-500/20">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="p-1.5 rounded-lg text-frost-500 hover:text-frost-200 hover:bg-frost-800/50 transition-colors"
                    title="Mark all read"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                <button
                  onClick={closeNotificationPanel}
                  className="p-1.5 rounded-lg text-frost-500 hover:text-frost-200 hover:bg-frost-800/50 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-frost-600">
                  <Bell size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {notifications.map((n) => {
                    const Icon = TYPE_ICONS[n.type] ?? Info;
                    const colorClass = TYPE_COLORS[n.type] ?? TYPE_COLORS.system;
                    return (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onClick={() => markNotificationRead(n.id)}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors group',
                          n.read ? 'hover:bg-frost-800/30' : 'bg-arctic-500/5 hover:bg-arctic-500/10 border border-arctic-500/10'
                        )}
                      >
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', colorClass)}>
                          <Icon size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn('text-xs font-semibold truncate', n.read ? 'text-frost-300' : 'text-frost-100')}>
                              {n.title}
                            </p>
                            {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-arctic-400 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-frost-500 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-frost-700 mt-1">{timeAgo(new Date(n.timestamp))}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissNotification(n.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-frost-600 hover:text-frost-300 hover:bg-frost-800/50 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-frost-800/50 flex items-center justify-between">
              <button className="text-xs text-arctic-400 hover:text-arctic-300 transition-colors">
                View all
              </button>
              <button
                onClick={() => useStore.getState().notifications.length > 0 && useStore.setState({ notifications: [] })}
                className="flex items-center gap-1.5 text-xs text-frost-600 hover:text-frost-400 transition-colors"
              >
                <Trash2 size={11} />
                Clear all
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
