import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, User, Palette, Shield, ChevronRight, Check,
  LogOut, Key, RefreshCw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import { toast } from 'sonner';
import { arcticApi } from '../lib/api';

const SETTING_TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'security', label: 'Security', icon: Shield },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
        checked ? 'bg-arctic-500' : 'bg-frost-700'
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-frost-800/30 last:border-0">
      <div className="mr-4">
        <p className="text-sm font-medium text-frost-200">{label}</p>
        {description && <p className="text-xs text-frost-500 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function signOut() {
  void arcticApi.logout().finally(() => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('arctic-auth-expired'));
  });
}

function GeneralSettings() {
  const { resetAnalytics } = useStore();
  const [settings, setSettings] = useState({
    language: 'English',
    autoSave: true,
    notifications: true,
    minimizeToTray: true,
    checkUpdates: true,
  });
  const [confirmReset, setConfirmReset] = useState(false);

  const handleResetAnalytics = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    resetAnalytics();
    setConfirmReset(false);
    toast.success('Analytics reset — all counters back to 0');
  };

  return (
    <div className="space-y-6">
      <div className="glass-card">
        <h3 className="font-semibold text-frost-200 text-sm mb-2">General</h3>
        <SettingRow label="Language" description="Interface language">
          <span className="text-sm text-frost-400">English</span>
        </SettingRow>
        <SettingRow label="Auto Save" description="Automatically save changes">
          <Toggle checked={settings.autoSave} onChange={(v) => setSettings({ ...settings, autoSave: v })} />
        </SettingRow>
        <SettingRow label="Notifications" description="Show system notifications">
          <Toggle checked={settings.notifications} onChange={(v) => setSettings({ ...settings, notifications: v })} />
        </SettingRow>
        <SettingRow label="Minimize to Tray" description="Keep running in background">
          <Toggle checked={settings.minimizeToTray} onChange={(v) => setSettings({ ...settings, minimizeToTray: v })} />
        </SettingRow>
        <SettingRow label="Check for Updates" description="Automatically check for updates">
          <Toggle checked={settings.checkUpdates} onChange={(v) => setSettings({ ...settings, checkUpdates: v })} />
        </SettingRow>
      </div>

      <div className="glass-card">
        <h3 className="font-semibold text-frost-200 text-sm mb-2">Analytics</h3>
        <SettingRow
          label="Reset Analytics"
          description="Zero all usage counters. They only go up with real usage."
        >
          <button
            onClick={handleResetAnalytics}
            className={cn(
              'btn-danger text-xs gap-1.5',
              confirmReset && 'bg-red-500 text-white'
            )}
          >
            <RefreshCw size={13} className={confirmReset ? '' : ''} />
            {confirmReset ? 'Click again to confirm' : 'Reset'}
          </button>
        </SettingRow>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const { theme, toggleTheme, activeThemeId, setActiveTheme, themes } = useStore();

  return (
    <div className="space-y-6">
      <div className="glass-card">
        <h3 className="font-semibold text-frost-200 text-sm mb-4">Theme</h3>
        <SettingRow label="Color Mode" description="Dark or light interface">
          <div className="flex items-center gap-1 bg-frost-800/50 rounded-xl p-1 border border-frost-700/30">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                onClick={() => theme !== t && toggleTheme()}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                  theme === t ? 'bg-arctic-500/20 text-arctic-400' : 'text-frost-500 hover:text-frost-300'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </SettingRow>
      </div>

      <div className="glass-card">
        <h3 className="font-semibold text-frost-200 text-sm mb-4">Color Theme</h3>
        <p className="mb-4 text-xs text-frost-500">Choose a color scheme — it applies immediately across the whole panel.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTheme(t.id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                activeThemeId === t.id
                  ? 'bg-arctic-500/10 border-arctic-500/30'
                  : 'bg-frost-800/20 border-frost-700/20 hover:bg-frost-800/40'
              )}
            >
              <div
                className="w-8 h-8 rounded-lg border border-white/10 shrink-0"
                style={{ background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.accent})` }}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-frost-200">{t.name}</p>
                <p className="text-xs text-frost-500 truncate">{t.description}</p>
              </div>
              {activeThemeId === t.id && <Check size={14} className="text-arctic-400 ml-auto shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountSettings() {
  const [session, setSession] = useState<{ username: string; expiresAt: string } | null>(null);

  useEffect(() => {
    arcticApi.getAdminSession().then(setSession).catch(() => setSession(null));
  }, []);

  const displayName = session?.username || 'Admin';
  const expiresLabel = session
    ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(session.expiresAt))
    : '—';

  return (
    <div className="space-y-4">
      <div className="glass-card">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-arctic-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-glow">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-frost-100 text-lg">{displayName}</p>
            <p className="text-sm text-frost-500">Signed in · session valid until {expiresLabel}</p>
            <span className="badge-info text-[10px] mt-1">Owner</span>
          </div>
        </div>
      </div>
      <div className="glass-card">
        <h3 className="font-semibold text-frost-200 text-sm mb-4">Danger Zone</h3>
        <div className="space-y-2">
          <button onClick={signOut} className="btn-danger text-sm w-full justify-start gap-2">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const [session, setSession] = useState<{ username: string; expiresAt: string } | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    arcticApi.getAdminSession().then(setSession).catch(() => setSession(null));
  }, []);

  const revokeSession = async () => {
    setRevoking(true);
    setError('');
    try {
      await arcticApi.logout();
      setSession(null);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('arctic-auth-expired'));
    } catch {
      setError('Could not revoke the session. Check the API connection and try again.');
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card">
        <h3 className="font-semibold text-frost-200 text-sm mb-4">Active Sessions</h3>
        {session ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-frost-800/30 border border-frost-700/30">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-frost-200">{session.username}</p>
                <span className="badge-success text-[10px]">Current</span>
              </div>
              <p className="text-xs text-frost-500">This browser · session valid until {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(session.expiresAt))}</p>
            </div>
            <button
              onClick={revokeSession}
              disabled={revoking}
              className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              {revoking ? 'Revoking...' : 'Revoke'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-frost-500">No active session found.</p>
        )}
        {error && <p className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">{error}</p>}
        <p className="mt-3 text-xs text-frost-600">Revoking the current session signs this browser out immediately. The next login binds it again as the authorized device.</p>
      </div>
      <div className="glass-card">
        <h3 className="font-semibold text-frost-200 text-sm mb-4">Access</h3>
        <div className="p-3 rounded-xl bg-frost-800/30 border border-frost-700/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-arctic-500/20 bg-arctic-500/10 text-arctic-400"><Key size={15} /></div>
            <div>
              <p className="text-sm font-medium text-frost-200">Device-bound login</p>
              <p className="text-xs text-frost-500">This browser is the authorized device for the keypanel.</p>
            </div>
          </div>
          <ChevronRight size={15} className="text-frost-600" />
        </div>
      </div>
    </div>
  );
}

const PANEL_MAP: Record<string, React.FC> = {
  account: AccountSettings,
  general: GeneralSettings,
  appearance: AppearanceSettings,
  security: SecuritySettings,
};

export function SettingsPage() {
  const { settingsTab, setSettingsTab } = useStore();
  const ActivePanel = PANEL_MAP[settingsTab] ?? AccountSettings;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-frost-800/50 p-3 overflow-y-auto">
        <p className="text-[10px] text-frost-600 uppercase tracking-widest font-semibold px-3 py-2">Settings</p>
        {SETTING_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSettingsTab(id)}
            className={cn(
              'sidebar-link w-full text-left mb-0.5',
              settingsTab === id && 'sidebar-link-active'
            )}
          >
            <Icon size={15} className={cn('shrink-0', settingsTab === id ? 'text-arctic-400' : 'text-frost-500')} />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={settingsTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <ActivePanel />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
