import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Grid3x3, BarChart3, Settings,
  ChevronLeft, ChevronRight, Snowflake, Wifi, HelpCircle,
  Circle, AlertTriangle, Download,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore, type AppPage } from '../store';

interface NavItem {
  id: AppPage;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'keypanel', label: 'Keypanel', icon: Grid3x3 },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { currentPage, sidebarCollapsed, toggleSidebar, setPage, device, notifications } = useStore();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const isConnected = device.status === 'connected';

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ type: 'spring', stiffness: 300, damping: 35 }}
      className="relative flex flex-col h-full bg-frost-950/80 backdrop-blur-xl border-r border-frost-800/50 shrink-0 z-20 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-frost-800/50">
        <motion.div
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-arctic-500/20 border border-arctic-500/30 shrink-0"
          animate={{ rotate: sidebarCollapsed ? 0 : 0 }}
          whileHover={{ scale: 1.05 }}
        >
          <Snowflake size={18} className="text-arctic-400" />
        </motion.div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="min-w-0"
            >
              <span className="text-gradient font-bold text-lg leading-none tracking-widest">ARCTIC</span>
              <p className="text-frost-500 text-[9px] tracking-widest mt-0.5 uppercase">Control Everything</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              onClick={() => setPage(item.id)}
              whileHover={{ x: sidebarCollapsed ? 0 : 2 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'sidebar-link w-full text-left',
                isActive && 'sidebar-link-active',
                sidebarCollapsed && 'justify-center px-0'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon
                size={18}
                className={cn(
                  'shrink-0 transition-colors duration-200',
                  isActive ? 'text-arctic-400' : 'text-frost-500 group-hover:text-frost-300'
                )}
              />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: 0.12 }}
                    className={cn('text-sm font-medium truncate', isActive ? 'text-arctic-300' : '')}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 space-y-2 border-t border-frost-800/50 pt-3">
        {/* Connection status */}
        <div
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-xl',
            sidebarCollapsed && 'justify-center px-0'
          )}
          title={sidebarCollapsed ? (isConnected ? 'Device Connected' : 'Device Disconnected') : undefined}
        >
          <div className={cn(
            'w-2 h-2 rounded-full shrink-0',
            isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400'
          )}>
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="min-w-0"
              >
                <p className={cn('text-xs font-medium truncate', isConnected ? 'text-emerald-400' : 'text-amber-400')}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </p>
                <p className="text-frost-600 text-[10px] truncate">ARCTIC Keypanel</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Help */}
        <button
          className={cn('sidebar-link w-full', sidebarCollapsed && 'justify-center px-0')}
          title={sidebarCollapsed ? 'Help' : undefined}
        >
          <HelpCircle size={18} className="text-frost-500 shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm">
                Help
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Version */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-frost-700 px-3 py-1 font-mono"
            >
              ARCTIC v2.5.0
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse toggle */}
      <motion.button
        onClick={toggleSidebar}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-frost-800 border border-frost-700/50 flex items-center justify-center text-frost-400 hover:text-frost-100 hover:bg-frost-700 transition-colors z-30 shadow-lg"
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </motion.button>
    </motion.aside>
  );
}
