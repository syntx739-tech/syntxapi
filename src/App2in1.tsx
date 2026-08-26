import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Snowflake, ArrowLeft } from 'lucide-react';
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
import { StaffLogin } from './staff/StaffLogin';
import { StaffPanel } from './staff/StaffPanel';
import { arcticApi } from './lib/api';
import { staffApi } from './staff/api';
import { useStore } from './store';
import { applyThemeColors } from './lib/themeColors';

const PAGE_COMPONENTS = {
  dashboard: Dashboard,
  keypanel: Keypanel,
  analytics: Analytics,
  settings: SettingsPage,
  device: Device,
} as const;

type View = 'landing' | 'admin' | 'staff';

function LandingPage({ onSelect }: { onSelect: (view: View) => void }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-frost-950 px-4 py-8">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(14,165,233,0.08),transparent_65%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(14,165,233,0.05),transparent_60%)]" />

      <div className="relative z-10 w-full max-w-3xl">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-arctic-500/30 bg-arctic-500/10 shadow-[0_0_60px_rgba(14,165,233,0.2)]">
            <Snowflake size={36} className="text-arctic-400" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-arctic-400">ARCTIC</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-frost-50 sm:text-4xl">Control Everything</h1>
          <p className="mt-3 text-sm text-frost-500">Choose your access level to continue</p>
        </motion.div>

        {/* Two cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Staff / Reseller */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('staff')}
            className="group glass-card relative flex flex-col items-center gap-4 border border-frost-800/60 p-8 text-center transition-all hover:border-emerald-500/30 hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 transition-all group-hover:border-emerald-500/40 group-hover:bg-emerald-500/20 group-hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]">
              <Users size={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-frost-100">Staff / Reseller</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-frost-500">Generate license keys and place restock orders</p>
            </div>
            <div className="mt-2 w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-400 transition-all group-hover:border-emerald-500/40 group-hover:bg-emerald-500/20">
              Sign in as Staff
            </div>
          </motion.button>

          {/* Admin / Owner */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('admin')}
            className="group glass-card relative flex flex-col items-center gap-4 border border-frost-800/60 p-8 text-center transition-all hover:border-arctic-500/30 hover:shadow-[0_0_40px_rgba(14,165,233,0.08)]"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-arctic-500/20 bg-arctic-500/10 text-arctic-400 transition-all group-hover:border-arctic-500/40 group-hover:bg-arctic-500/20 group-hover:shadow-[0_0_25px_rgba(14,165,233,0.15)]">
              <Shield size={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-frost-100">Admin / Owner</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-frost-500">Full access to keypanel, staff management and orders</p>
            </div>
            <div className="mt-2 w-full rounded-xl border border-arctic-500/20 bg-arctic-500/10 py-2.5 text-sm font-semibold text-arctic-400 transition-all group-hover:border-arctic-500/40 group-hover:bg-arctic-500/20">
              Sign in as Owner
            </div>
          </motion.button>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-10 text-center text-[11px] text-frost-600"
        >
          Powered by ARCTIC
        </motion.p>
      </div>
    </div>
  );
}

function AdminFlow({ onBack }: { onBack: () => void }) {
  const { currentPage, theme, activeThemeId, themes, openCommandPalette, openSearch } = useStore();
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');

  useEffect(() => {
    const restore = async () => {
      if (!arcticApi.getStoredSessionToken()) { setAuthChecked(true); return; }
      try {
        const session = await arcticApi.getAdminSession();
        setAdminUsername(session.username);
        setAuthenticated(true);
      } catch { setAuthenticated(false); }
      finally { setAuthChecked(true); }
    };
    void restore();
    const h = () => { setAuthenticated(false); setAdminUsername(''); };
    window.addEventListener('arctic-auth-expired', h);
    return () => window.removeEventListener('arctic-auth-expired', h);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme === 'light' ? 'light' : 'dark');
  }, [theme]);

  useEffect(() => {
    const active = themes.find((t) => t.id === activeThemeId) ?? themes.find((t) => t.isDefault) ?? themes[0];
    applyThemeColors(active, theme === 'light');
  }, [activeThemeId, theme, themes]);

  useEffect(() => {
    if (!authenticated) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') { event.preventDefault(); openCommandPalette(); }
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') { event.preventDefault(); openSearch(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [authenticated, openCommandPalette, openSearch]);

  if (!authChecked) return <div className="flex min-h-screen items-center justify-center bg-frost-950 text-sm text-frost-500">Checking admin session...</div>;

  if (!authenticated) {
    return (
      <div>
        <button onClick={onBack} className="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-xl border border-frost-800/60 bg-frost-950/80 px-3 py-2 text-xs text-frost-400 backdrop-blur-xl transition-colors hover:border-frost-700 hover:text-frost-200">
          <ArrowLeft size={14} /> Back
        </button>
        <AdminLogin onAuthenticated={(username) => { setAdminUsername(username); setAuthenticated(true); }} />
      </div>
    );
  }

  const PageComponent = PAGE_COMPONENTS[currentPage] ?? Dashboard;

  return (
    <div className="flex h-screen overflow-hidden">
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

function StaffFlow({ onBack }: { onBack: () => void }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');

  useEffect(() => {
    const restore = async () => {
      if (!staffApi.getStoredSessionToken()) { setAuthChecked(true); return; }
      try {
        const me = await staffApi.getMe();
        setStaffUsername(me.username);
        setAuthenticated(true);
      } catch { setAuthenticated(false); }
      finally { setAuthChecked(true); }
    };
    void restore();
    const h = () => { setAuthenticated(false); setStaffUsername(''); };
    window.addEventListener('arctic-staff-expired', h);
    return () => window.removeEventListener('arctic-staff-expired', h);
  }, []);

  if (!authChecked) return <div className="flex min-h-screen items-center justify-center bg-frost-950 text-sm text-frost-500">Checking staff session...</div>;

  if (!authenticated) {
    return (
      <div>
        <button onClick={onBack} className="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-xl border border-frost-800/60 bg-frost-950/80 px-3 py-2 text-xs text-frost-400 backdrop-blur-xl transition-colors hover:border-frost-700 hover:text-frost-200">
          <ArrowLeft size={14} /> Back
        </button>
        <StaffLogin onAuthenticated={(username) => { setStaffUsername(username); setAuthenticated(true); }} />
      </div>
    );
  }

  return (
    <StaffPanel
      staffUsername={staffUsername}
      onLogout={async () => {
        try { await staffApi.logout(); } finally { setAuthenticated(false); setStaffUsername(''); }
      }}
    />
  );
}

export function App2in1() {
  const [view, setView] = useState<View>('landing');

  return (
    <AnimatePresence mode="wait">
      {view === 'landing' && (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <LandingPage onSelect={setView} />
        </motion.div>
      )}
      {view === 'admin' && (
        <motion.div key="admin" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
          <AdminFlow onBack={() => setView('landing')} />
        </motion.div>
      )}
      {view === 'staff' && (
        <motion.div key="staff" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.3 }}>
          <StaffFlow onBack={() => setView('landing')} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
