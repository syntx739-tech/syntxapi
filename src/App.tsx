import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store';
import { AdminLogin } from './components/AdminLogin';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { CommandPalette } from './components/CommandPalette';
import { NotificationPanel } from './components/NotificationPanel';
import { SearchOverlay } from './components/SearchOverlay';
import { Dashboard } from './pages/Dashboard';
import { Keypanel } from './pages/Keypanel';
import { Analytics } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';
import { Device } from './pages/Device';
import { arcticApi } from './lib/api';
import { applyThemeColors } from './lib/themeColors';

const PAGE_COMPONENTS = {
  dashboard: Dashboard,
  keypanel: Keypanel,
  analytics: Analytics,
  settings: SettingsPage,
  device: Device,
} as const;

export default function App() {
  const { currentPage, theme, activeThemeId, themes, openCommandPalette, openSearch } = useStore();
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');

  useEffect(() => {
    const restoreSession = async () => {
      if (!arcticApi.getStoredSessionToken()) {
        setAuthChecked(true);
        return;
      }
      try {
        const session = await arcticApi.getAdminSession();
        setAdminUsername(session.username);
        setAuthenticated(true);
      } catch {
        setAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };
    void restoreSession();

    const handleExpired = () => {
      setAuthenticated(false);
      setAdminUsername('');
    };
    window.addEventListener('arctic-auth-expired', handleExpired);
    return () => window.removeEventListener('arctic-auth-expired', handleExpired);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  useEffect(() => {
    const active = themes.find((t) => t.id === activeThemeId) ?? themes.find((t) => t.isDefault) ?? themes[0];
    applyThemeColors(active, theme === 'light');
  }, [activeThemeId, theme, themes]);

  useEffect(() => {
    if (!authenticated) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        openCommandPalette();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [authenticated, openCommandPalette, openSearch]);

  if (!authChecked) {
    return <div className="flex min-h-screen items-center justify-center bg-frost-950 text-sm text-frost-500">Checking admin session...</div>;
  }

  if (!authenticated) {
    return <AdminLogin onAuthenticated={(username) => { setAdminUsername(username); setAuthenticated(true); }} />;
  }

  const PageComponent = PAGE_COMPONENTS[currentPage] ?? Dashboard;

  return (
    <div className={cn('flex h-screen overflow-hidden', theme === 'light' ? 'light' : 'dark')}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Topbar adminUsername={adminUsername} onLogout={async () => { try { await arcticApi.logout(); } finally { setAuthenticated(false); setAdminUsername(''); } }} />
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div key={currentPage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="absolute inset-0 overflow-auto">
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette />
      <NotificationPanel />
      <SearchOverlay />
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
