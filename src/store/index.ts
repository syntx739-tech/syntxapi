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

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

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
    id: 'cyber-ice',
    name: 'Cyber Ice',
    description: 'High contrast neon cyan on near-black',
    isDefault: false,
    colors: { primary: '#00ffff', accent: '#00e5ff', background: '#010b0f', surface: '#020f16', border: 'rgba(0,255,255,0.2)', text: '#e0ffff', textMuted: '#7ecfcf', success: '#00ff88', warning: '#ffcc00', danger: '#ff3366' },
    effects: { glowIntensity: 0.7, borderRadius: 4, transparency: 0.05, blur: 8, animationIntensity: 1.2 },
  },
];

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

const DEFAULT_DEVICE: DeviceInfo = {
  name: 'ARCTIC Keypanel',
  serial: '',
  firmware: '2.5.0',
  connection: 'usb',
  pollingRate: 1000,
  temperature: 0,
  storage: { used: 0, total: 512 },
  status: 'disconnected',
};

const DEFAULT_MEDIA: MediaState = {
  isPlaying: false,
  title: '',
  artist: '',
  albumArt: '',
  progress: 0,
  duration: 0,
  volume: 0,
  isMuted: false,
  source: null,
};

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
  | 'analytics' | 'settings' | 'device' | 'staff-info';

interface AppStore {
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
  macros: Macro[];
  automations: Automation[];
  integrations: Integration[];
  marketplaceItems: MarketplaceItem[];
  themes: Theme[];
  device: DeviceInfo;
  media: MediaState;
  analytics: AnalyticsData;
  notifications: Notification[];
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

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
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
      macros: [],
      automations: [],
      integrations: [],
      marketplaceItems: [],
      themes: DEFAULT_THEMES,
      device: DEFAULT_DEVICE,
      media: DEFAULT_MEDIA,
      analytics: makeEmptyAnalytics(),
      notifications: [],
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
      addMacro: (macro) => {
        const newMacro: Macro = { ...macro, id: `macro-${generateId()}`, createdAt: new Date(), updatedAt: new Date(), usageCount: 0 };
        set((s) => ({ macros: [...s.macros, newMacro] }));
      },
      updateMacro: (id, updates) => set((s) => ({ macros: s.macros.map((m) => m.id !== id ? m : { ...m, ...updates, updatedAt: new Date() }) })),
      deleteMacro: (id) => set((s) => ({ macros: s.macros.filter((m) => m.id !== id) })),
      duplicateMacro: (id) => {
        const macro = get().macros.find((m) => m.id === id);
        if (!macro) return;
        const dup: Macro = { ...macro, id: `macro-${generateId()}`, name: `${macro.name} (copy)`, createdAt: new Date(), updatedAt: new Date(), usageCount: 0 };
        set((s) => ({ macros: [...s.macros, dup] }));
      },
      addAutomation: (auto) => {
        const newAuto: Automation = { ...auto, id: `auto-${generateId()}`, createdAt: new Date(), updatedAt: new Date() };
        set((s) => ({ automations: [...s.automations, newAuto] }));
      },
      updateAutomation: (id, updates) => set((s) => ({ automations: s.automations.map((a) => a.id !== id ? a : { ...a, ...updates, updatedAt: new Date() }) })),
      deleteAutomation: (id) => set((s) => ({ automations: s.automations.filter((a) => a.id !== id) })),
      toggleAutomation: (id) => set((s) => ({ automations: s.automations.map((a) => a.id !== id ? a : { ...a, enabled: !a.enabled }) })),
      updateMedia: (updates) => set((s) => ({ media: { ...s.media, ...updates } })),
      togglePlayPause: () => set((s) => ({ media: { ...s.media, isPlaying: !s.media.isPlaying } })),
      connectIntegration: (id) => set((s) => ({ integrations: s.integrations.map((i) => i.id !== id ? i : { ...i, status: 'connected' as const }) })),
      disconnectIntegration: (id) => set((s) => ({ integrations: s.integrations.map((i) => i.id !== id ? i : { ...i, status: 'disconnected' as const }) })),
      installMarketplaceItem: (id) => set((s) => ({ marketplaceItems: s.marketplaceItems.map((i) => i.id !== id ? i : { ...i, isInstalled: true }) })),
      uninstallMarketplaceItem: (id) => set((s) => ({ marketplaceItems: s.marketplaceItems.map((i) => i.id !== id ? i : { ...i, isInstalled: false }) })),
      markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => n.id !== id ? n : { ...n, read: true }) })),
      markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      dismissNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
      addNotification: (n) => {
        const newN: Notification = { ...n, id: `n-${generateId()}`, timestamp: new Date(), read: false };
        set((s) => ({ notifications: [newN, ...s.notifications] }));
      },
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
      version: 3,
      migrate: (persistedState, version) => {
        const state = persistedState as PersistedAppState;
        if (version < 3) {
          return {
            ...state,
            macros: [],
            automations: [],
            integrations: [],
            marketplaceItems: [],
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
