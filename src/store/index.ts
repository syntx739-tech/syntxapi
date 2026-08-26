import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Macro,
  Automation,
  MediaState,
  Integration,
  MarketplaceItem,
  Theme,
  DeviceInfo,
  AnalyticsData,
  Notification,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function now(): Date {
  return new Date();
}

// ─── Default data ────────────────────────────────────────────────────────────

const DEFAULT_MACROS: Macro[] = [
  {
    id: 'macro-1',
    name: 'Open Streaming Setup',
    description: 'Launch OBS, Discord and switch profile',
    icon: '🎬',
    color: '#9333ea',
    steps: [
      { id: 's1', type: 'keyboard_shortcut', label: 'CTRL+SHIFT+S', config: { keys: ['ctrl', 'shift', 's'] }, delay: 0, enabled: true },
      { id: 's2', type: 'delay', label: 'Wait 250ms', config: {}, delay: 250, enabled: true },
      { id: 's3', type: 'open_application', label: 'Open OBS', config: { app: 'OBS Studio' }, delay: 0, enabled: true },
      { id: 's4', type: 'delay', label: 'Wait 1s', config: {}, delay: 1000, enabled: true },
      { id: 's5', type: 'keyboard_shortcut', label: 'Press F9', config: { keys: ['F9'] }, delay: 0, enabled: true },
      { id: 's6', type: 'volume_control', label: 'Mic Volume 70%', config: { device: 'microphone', level: 70 }, delay: 0, enabled: true },
    ],
    createdAt: now(),
    updatedAt: now(),
    usageCount: 0,
  },
  {
    id: 'macro-2',
    name: 'Gaming Mode',
    description: 'Close background apps, boost performance',
    icon: '🎮',
    color: '#6366f1',
    steps: [
      { id: 's1', type: 'profile_switch', label: 'Switch to Gaming', config: { profileId: 'profile-gaming' }, delay: 0, enabled: true },
      { id: 's2', type: 'volume_control', label: 'System Volume 60%', config: { device: 'system', level: 60 }, delay: 0, enabled: true },
      { id: 's3', type: 'open_application', label: 'Open Discord', config: { app: 'Discord' }, delay: 250, enabled: true },
    ],
    createdAt: now(),
    updatedAt: now(),
    usageCount: 0,
  },
  {
    id: 'macro-3',
    name: 'Work Focus',
    description: 'DND mode, close distractions',
    icon: '🎯',
    color: '#0ea5e9',
    steps: [
      { id: 's1', type: 'profile_switch', label: 'Switch to Work', config: { profileId: 'profile-work' }, delay: 0, enabled: true },
      { id: 's2', type: 'open_application', label: 'Open VS Code', config: { app: 'VS Code' }, delay: 500, enabled: true },
      { id: 's3', type: 'text_input', label: 'Type status', config: { text: 'In focus mode 🎯' }, delay: 0, enabled: false },
    ],
    createdAt: now(),
    updatedAt: now(),
    usageCount: 0,
  },
];

const DEFAULT_AUTOMATIONS: Automation[] = [
  {
    id: 'auto-1',
    name: 'Discord Auto-Switch',
    description: 'Switch to Discord profile when Discord starts',
    enabled: true,
    trigger: { type: 'app_started', config: { app: 'Discord' } },
    actions: [{ type: 'switch_profile', config: { profileId: 'profile-gaming' } }],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'auto-2',
    name: 'Evening Gaming Mode',
    description: 'Activate gaming profile at 18:00',
    enabled: true,
    trigger: { type: 'time', config: { time: '18:00' } },
    actions: [
      { type: 'switch_profile', config: { profileId: 'profile-gaming' } },
      { type: 'show_notification', config: { message: 'Evening gaming mode activated' } },
    ],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'auto-3',
    name: 'OBS Streaming Setup',
    description: 'Switch to streaming profile when OBS opens',
    enabled: false,
    trigger: { type: 'app_started', config: { app: 'OBS Studio' } },
    actions: [{ type: 'switch_profile', config: { profileId: 'profile-streaming' } }],
    createdAt: now(),
    updatedAt: now(),
  },
];

const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: 'discord', name: 'Discord', icon: '💬', status: 'connected', description: 'Control Discord, check status, manage channels', permissions: ['Status', 'Voice', 'Messages'], config: {} },
  { id: 'spotify', name: 'Spotify', icon: '🎵', status: 'connected', description: 'Full playback control, now playing info', permissions: ['Playback', 'Library'], config: {} },
  { id: 'obs', name: 'OBS Studio', icon: '🔴', status: 'disconnected', description: 'Scene switching, recording, streaming control', permissions: ['Scenes', 'Recording', 'Streaming'], config: {} },
  { id: 'twitch', name: 'Twitch', icon: '📺', status: 'disconnected', description: 'Stream status, chat, channel points', permissions: ['Stream', 'Chat'], config: {} },
  { id: 'youtube', name: 'YouTube', icon: '▶️', status: 'disconnected', description: 'Video playback and channel management', permissions: ['Playback'], config: {} },
  { id: 'steam', name: 'Steam', icon: '🎮', status: 'connected', description: 'Game launch, overlay control', permissions: ['Games', 'Overlay'], config: {} },
  { id: 'teams', name: 'Microsoft Teams', icon: '👥', status: 'disconnected', description: 'Meeting controls, status management', permissions: ['Meetings', 'Status'], config: {} },
  { id: 'vscode', name: 'VS Code', icon: '💻', status: 'connected', description: 'Editor controls, workspace switching', permissions: ['Editor', 'Terminal'], config: {} },
  { id: 'chrome', name: 'Chrome', icon: '🌐', status: 'disconnected', description: 'Tab control, bookmarks, media', permissions: ['Tabs', 'Media'], config: {} },
];

const DEFAULT_THEMES: Theme[] = [
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    description: 'The default ARCTIC theme — cold, dark, precise',
    isDefault: true,
    colors: { primary: '#0ea5e9', accent: '#06b6d4', background: '#020617', surface: '#0f172a', border: 'rgba(14,165,233,0.15)', text: '#f8fafc', textMuted: '#94a3b8', success: '#10b981', warning: '#f59e0b', danger: '#ef4444' },
    effects: { glowIntensity: 0.4, borderRadius: 12, transparency: 0.05, blur: 20, animationIntensity: 0.8 },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep black with subtle purple accents',
    isDefault: false,
    colors: { primary: '#8b5cf6', accent: '#a78bfa', background: '#000000', surface: '#0a0a0a', border: 'rgba(139,92,246,0.15)', text: '#f8fafc', textMuted: '#94a3b8', success: '#10b981', warning: '#f59e0b', danger: '#ef4444' },
    effects: { glowIntensity: 0.5, borderRadius: 8, transparency: 0.03, blur: 16, animationIntensity: 0.6 },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern lights — green and teal tones',
    isDefault: false,
    colors: { primary: '#10b981', accent: '#06b6d4', background: '#021a12', surface: '#071f12', border: 'rgba(16,185,129,0.15)', text: '#f8fafc', textMuted: '#94a3b8', success: '#10b981', warning: '#f59e0b', danger: '#ef4444' },
    effects: { glowIntensity: 0.45, borderRadius: 16, transparency: 0.06, blur: 24, animationIntensity: 1.0 },
  },
  {
    id: 'glacier',
    name: 'Glacier',
    description: 'Bright, icy — light mode ARCTIC feel',
    isDefault: false,
    colors: { primary: '#0284c7', accent: '#0891b2', background: '#f0f9ff', surface: '#ffffff', border: 'rgba(2,132,199,0.2)', text: '#0f172a', textMuted: '#64748b', success: '#10b981', warning: '#f59e0b', danger: '#ef4444' },
    effects: { glowIntensity: 0.2, borderRadius: 12, transparency: 0.5, blur: 12, animationIntensity: 0.7 },
  },
  {
    id: 'cyber-ice',
    name: 'Cyber Ice',
    description: 'High contrast neon cyan on near-black',
    isDefault: false,
    colors: { primary: '#00ffff', accent: '#00e5ff', background: '#010b0f', surface: '#020f16', border: 'rgba(0,255,255,0.2)', text: '#e0ffff', textMuted: '#7ecfcf', success: '#00ff88', warning: '#ffcc00', danger: '#ff3366' },
    effects: { glowIntensity: 0.7, borderRadius: 4, transparency: 0.05, blur: 8, animationIntensity: 1.2 },
  },
];

const DEFAULT_DEVICE: DeviceInfo = {
  name: 'ARCTIC Keypanel',
  serial: 'ARC-2024-X15-7843',
  firmware: '2.4.1',
  connection: 'usb',
  pollingRate: 1000,
  temperature: 42,
  storage: { used: 284, total: 512 },
  status: 'connected',
};

const DEFAULT_MEDIA: MediaState = {
  isPlaying: true,
  title: 'Midnight Pulse',
  artist: 'Neon Drift',
  albumArt: '',
  progress: 142,
  duration: 247,
  volume: 72,
  isMuted: false,
  source: 'spotify',
};

const DEFAULT_MARKETPLACE: MarketplaceItem[] = [
  { id: 'mp-1', type: 'profile', name: 'Ultimate Streaming Pack', description: 'Complete streaming setup with OBS, Twitch, Discord', preview: '📡', creator: 'ArcticOfficial', downloads: 12400, rating: 4.9, version: '2.1.0', tags: ['streaming', 'obs', 'twitch'], price: 0, isInstalled: false },
  { id: 'mp-2', type: 'macro_pack', name: 'Gaming Essentials', description: '20 ready-to-use gaming macros', preview: '🎮', creator: 'GamersHub', downloads: 8700, rating: 4.7, version: '1.4.0', tags: ['gaming', 'macros'], price: 0, isInstalled: true },
  { id: 'mp-3', type: 'theme', name: 'Neon Dreams', description: 'Vibrant neon color scheme', preview: '🌈', creator: 'DesignLab', downloads: 5200, rating: 4.5, version: '1.0.0', tags: ['theme', 'neon'], price: 0, isInstalled: false },
  { id: 'mp-4', type: 'icons', name: 'Dev Icon Pack', description: '150+ development icons', preview: '⚡', creator: 'DevIcons', downloads: 9100, rating: 4.8, version: '3.0.0', tags: ['icons', 'dev'], price: 0, isInstalled: false },
  { id: 'mp-5', type: 'layout', name: 'Music Studio', description: 'Perfect layout for audio producers', preview: '🎹', creator: 'StudioKits', downloads: 3400, rating: 4.6, version: '1.2.0', tags: ['music', 'audio'], price: 0, isInstalled: false },
  { id: 'mp-6', type: 'macro_pack', name: 'Productivity Suite', description: '30 productivity macros for work', preview: '💼', creator: 'WorkflowPro', downloads: 6800, rating: 4.7, version: '2.0.0', tags: ['productivity', 'work'], price: 0, isInstalled: false },
  { id: 'mp-7', type: 'theme', name: 'Polar Night', description: 'Deep dark — inspired by Nordic nights', preview: '🌑', creator: 'ArcticOfficial', downloads: 7300, rating: 4.8, version: '1.1.0', tags: ['theme', 'dark'], price: 0, isInstalled: false },
  { id: 'mp-8', type: 'profile', name: 'Video Editor Pack', description: 'DaVinci, Premiere, After Effects shortcuts', preview: '🎬', creator: 'EditMaster', downloads: 4200, rating: 4.5, version: '1.0.0', tags: ['editing', 'video'], price: 0, isInstalled: false },
];

// Analytics always starts empty — counters only increase with real usage.
function makeEmptyAnalytics(): AnalyticsData {
  return {
    totalKeyPresses: 0,
    mostUsedKeys: [],
    mostUsedMacros: [],
    dailyUsage: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en', { weekday: 'short' }),
      count: 0,
    })),
    weeklyUsage: Array.from({ length: 8 }, (_, i) => ({
      week: `W${i + 1}`,
      count: 0,
    })),
    monthlyUsage: Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      return { month: d.toLocaleDateString('en', { month: 'short' }), count: 0 };
    }),
  };
}

const DEFAULT_ANALYTICS: AnalyticsData = makeEmptyAnalytics();

const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'device', title: 'Device Connected', message: 'ARCTIC Keypanel connected via USB', timestamp: new Date(Date.now() - 2 * 60000), read: false },
  { id: 'n2', type: 'profile', title: 'Profile Switched', message: 'Switched to Gaming profile', timestamp: new Date(Date.now() - 15 * 60000), read: false },
  { id: 'n3', type: 'system', title: 'Firmware Update Available', message: 'Version 2.5.0 is available for download', timestamp: new Date(Date.now() - 60 * 60000), read: false },
  { id: 'n4', type: 'marketplace', title: 'New Pack Available', message: 'Ultimate Streaming Pack v2.1 released', timestamp: new Date(Date.now() - 3 * 3600000), read: true },
  { id: 'n5', type: 'automation', title: 'Automation Triggered', message: 'Evening Gaming Mode activated at 18:00', timestamp: new Date(Date.now() - 5 * 3600000), read: true },
];

// ─── Store interface ──────────────────────────────────────────────────────────

// Shape of the data persisted to localStorage (mirrors the partialize return).
type PersistedAppState = {
  currentPage: AppPage;
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  activeThemeId: string;
  macros: Macro[];
  automations: Automation[];
  integrations: Integration[];
  themes: Theme[];
  settingsTab: string;
};

export type AppPage =
  | 'dashboard' | 'keypanel' | 'downloads'
  | 'analytics' | 'settings' | 'device';

interface AppStore {
  // UI State
  currentPage: AppPage;
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  activeThemeId: string;
  commandPaletteOpen: boolean;
  notificationPanelOpen: boolean;
  searchOpen: boolean;
  editMode: boolean;
  selectedKeyId: string | null;
  settingsTab: string;

  // Data
  macros: Macro[];
  automations: Automation[];
  integrations: Integration[];
  marketplaceItems: MarketplaceItem[];
  themes: Theme[];
  device: DeviceInfo;
  media: MediaState;
  analytics: AnalyticsData;
  notifications: Notification[];

  // Actions — UI
  setPage: (page: AppPage) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setActiveTheme: (id: string) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  toggleNotificationPanel: () => void;
  closeNotificationPanel: () => void;
  toggleEditMode: () => void;
  selectKey: (id: string | null) => void;
  setSettingsTab: (tab: string) => void;

  // Actions — data
  addMacro: (macro: Omit<Macro, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
  updateMacro: (id: string, updates: Partial<Macro>) => void;
  deleteMacro: (id: string) => void;
  duplicateMacro: (id: string) => void;

  addAutomation: (auto: Omit<Automation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAutomation: (id: string, updates: Partial<Automation>) => void;
  deleteAutomation: (id: string) => void;
  toggleAutomation: (id: string) => void;

  updateMedia: (updates: Partial<MediaState>) => void;
  togglePlayPause: () => void;

  connectIntegration: (id: string) => void;
  disconnectIntegration: (id: string) => void;

  installMarketplaceItem: (id: string) => void;
  uninstallMarketplaceItem: (id: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  dismissNotification: (id: string) => void;

  resetAnalytics: () => void;

  simulateFirmwareUpdate: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── UI State ──
      currentPage: 'dashboard',
      sidebarCollapsed: false,
      theme: 'dark',
      activeThemeId: 'arctic-frost',
      commandPaletteOpen: false,
      notificationPanelOpen: false,
      searchOpen: false,
      editMode: false,
      selectedKeyId: null,
      settingsTab: 'general',

      // ── Data ──
      macros: DEFAULT_MACROS,
      automations: DEFAULT_AUTOMATIONS,
      integrations: DEFAULT_INTEGRATIONS,
      marketplaceItems: DEFAULT_MARKETPLACE,
      themes: DEFAULT_THEMES,
      device: DEFAULT_DEVICE,
      media: DEFAULT_MEDIA,
      analytics: DEFAULT_ANALYTICS,
      notifications: DEFAULT_NOTIFICATIONS,

      // ── UI actions ──
      setPage: (page) => set({ currentPage: page, selectedKeyId: null }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setActiveTheme: (id) => set({ activeThemeId: id }),
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      openSearch: () => set({ searchOpen: true }),
      closeSearch: () => set({ searchOpen: false }),
      toggleNotificationPanel: () => set((s) => ({ notificationPanelOpen: !s.notificationPanelOpen })),
      closeNotificationPanel: () => set({ notificationPanelOpen: false }),
      toggleEditMode: () => set((s) => ({ editMode: !s.editMode, selectedKeyId: null })),
      selectKey: (id) => set({ selectedKeyId: id }),
      setSettingsTab: (tab) => set({ settingsTab: tab }),

      // ── Macro actions ──
      addMacro: (macro) => {
        const newMacro: Macro = { ...macro, id: `macro-${generateId()}`, createdAt: now(), updatedAt: now(), usageCount: 0 };
        set((s) => ({ macros: [...s.macros, newMacro] }));
      },

      updateMacro: (id, updates) =>
        set((s) => ({
          macros: s.macros.map((m) => m.id !== id ? m : { ...m, ...updates, updatedAt: now() }),
        })),

      deleteMacro: (id) => set((s) => ({ macros: s.macros.filter((m) => m.id !== id) })),

      duplicateMacro: (id) => {
        const macro = get().macros.find((m) => m.id === id);
        if (!macro) return;
        const dup: Macro = { ...macro, id: `macro-${generateId()}`, name: `${macro.name} (copy)`, createdAt: now(), updatedAt: now(), usageCount: 0 };
        set((s) => ({ macros: [...s.macros, dup] }));
      },

      // ── Automation actions ──
      addAutomation: (auto) => {
        const newAuto: Automation = { ...auto, id: `auto-${generateId()}`, createdAt: now(), updatedAt: now() };
        set((s) => ({ automations: [...s.automations, newAuto] }));
      },

      updateAutomation: (id, updates) =>
        set((s) => ({
          automations: s.automations.map((a) => a.id !== id ? a : { ...a, ...updates, updatedAt: now() }),
        })),

      deleteAutomation: (id) => set((s) => ({ automations: s.automations.filter((a) => a.id !== id) })),

      toggleAutomation: (id) =>
        set((s) => ({
          automations: s.automations.map((a) => a.id !== id ? a : { ...a, enabled: !a.enabled }),
        })),

      // ── Media actions ──
      updateMedia: (updates) => set((s) => ({ media: { ...s.media, ...updates } })),
      togglePlayPause: () => set((s) => ({ media: { ...s.media, isPlaying: !s.media.isPlaying } })),

      // ── Integration actions ──
      connectIntegration: (id) =>
        set((s) => ({
          integrations: s.integrations.map((i) => i.id !== id ? i : { ...i, status: 'connected' as const }),
        })),

      disconnectIntegration: (id) =>
        set((s) => ({
          integrations: s.integrations.map((i) => i.id !== id ? i : { ...i, status: 'disconnected' as const }),
        })),

      // ── Marketplace actions ──
      installMarketplaceItem: (id) =>
        set((s) => ({
          marketplaceItems: s.marketplaceItems.map((i) => i.id !== id ? i : { ...i, isInstalled: true }),
        })),

      uninstallMarketplaceItem: (id) =>
        set((s) => ({
          marketplaceItems: s.marketplaceItems.map((i) => i.id !== id ? i : { ...i, isInstalled: false }),
        })),

      // ── Notification actions ──
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => n.id !== id ? n : { ...n, read: true }),
        })),

      markAllNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      dismissNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

      addNotification: (n) => {
        const newN: Notification = { ...n, id: `n-${generateId()}`, timestamp: now(), read: false };
        set((s) => ({ notifications: [newN, ...s.notifications] }));
      },

      // ── Device actions ──
      resetAnalytics: () => set({ analytics: makeEmptyAnalytics() }),

      simulateFirmwareUpdate: () => {
        set((s) => ({ device: { ...s.device, status: 'updating' } }));
        setTimeout(() => {
          set((s) => ({ device: { ...s.device, status: 'connected', firmware: '2.5.0' } }));
        }, 4000);
      },
    }),
    {
      name: 'arctic-store',
      version: 2,
      migrate: (persistedState, version) => {
        const state = persistedState as PersistedAppState;
        if (version < 2 && state.macros) {
          // Drop fake usage counts persisted by older builds — start at 0.
          return {
            ...state,
            macros: state.macros.map((m) => ({ ...m, usageCount: 0 })),
          };
        }
        return state;
      },
      partialize: (state) => ({
        currentPage: state.currentPage,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        activeThemeId: state.activeThemeId,
        macros: state.macros,
        automations: state.automations,
        integrations: state.integrations,
        themes: state.themes,
        settingsTab: state.settingsTab,
      }),
    }
  )
);
