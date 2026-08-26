export type ActionType = 
  | 'keyboard_shortcut'
  | 'single_key'
  | 'macro'
  | 'open_application'
  | 'open_website'
  | 'launch_file'
  | 'run_command'
  | 'media_control'
  | 'volume_control'
  | 'profile_switch'
  | 'text_input'
  | 'clipboard_action'
  | 'delay'
  | 'multi_action'
  | 'automation';

export type KeySize = 'small' | 'medium' | 'large' | 'xlarge';

export type KeyState = 'default' | 'hover' | 'pressed' | 'active' | 'disabled' | 'recording' | 'error';

export interface KeyAction {
  id: string;
  type: ActionType;
  label: string;
  config: Record<string, any>;
  delay?: number;
  order: number;
}

export interface KeyConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  image?: string;
  color: string;
  background: string;
  textColor: string;
  fontSize: number;
  size: KeySize;
  actions: KeyAction[];
  state: KeyState;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface MacroStep {
  id: string;
  type: ActionType;
  label: string;
  config: Record<string, any>;
  delay: number;
  enabled: boolean;
}

export interface Macro {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  steps: MacroStep[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  keyLayout: KeyConfig[];
  macros: string[];
  automations: string[];
  theme: string;
  connectedApps: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationTrigger {
  type: 'app_started' | 'app_closed' | 'time' | 'device_connected' | 'device_disconnected' | 'keyboard_shortcut' | 'profile_activated' | 'system_event';
  config: Record<string, any>;
}

export interface AutomationAction {
  type: 'switch_profile' | 'launch_app' | 'execute_macro' | 'send_shortcut' | 'change_volume' | 'show_notification' | 'open_website';
  config: Record<string, any>;
}

export interface MediaState {
  isPlaying: boolean;
  title: string;
  artist: string;
  albumArt: string;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  source: 'spotify' | 'youtube_music' | 'apple_music' | 'media_player' | 'browser' | null;
}

export interface Integration {
  id: string;
  name: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  description: string;
  permissions: string[];
  config: Record<string, any>;
}

export interface MarketplaceItem {
  id: string;
  type: 'layout' | 'macro_pack' | 'theme' | 'icons' | 'backgrounds' | 'profile' | 'plugin_pack';
  name: string;
  description: string;
  preview: string;
  creator: string;
  downloads: number;
  rating: number;
  version: string;
  tags: string[];
  price: number;
  isInstalled: boolean;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    border: string;
    text: string;
    textMuted: string;
    success: string;
    warning: string;
    danger: string;
  };
  effects: {
    glowIntensity: number;
    borderRadius: number;
    transparency: number;
    blur: number;
    animationIntensity: number;
  };
}

export interface DeviceInfo {
  name: string;
  serial: string;
  firmware: string;
  connection: 'usb' | 'bluetooth' | 'wifi';
  pollingRate: number;
  temperature: number;
  storage: { used: number; total: number };
  status: 'connected' | 'disconnected' | 'updating' | 'error';
}

export interface AnalyticsData {
  totalKeyPresses: number;
  mostUsedKeys: { keyId: string; count: number }[];
  mostUsedMacros: { macroId: string; count: number }[];
  dailyUsage: { date: string; count: number }[];
  weeklyUsage: { week: string; count: number }[];
  monthlyUsage: { month: string; count: number }[];
}

export interface Notification {
  id: string;
  type: 'system' | 'device' | 'profile' | 'marketplace' | 'automation' | 'macro';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: { label: string; callback: () => void };
}

export interface SearchResult {
  type: 'key' | 'macro' | 'profile' | 'integration' | 'automation' | 'marketplace';
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  action: () => void;
}

export interface Shortcut {
  key: string;
  description: string;
  category: string;
}