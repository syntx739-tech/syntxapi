import type { Theme } from '../types';

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

function hexToRgb(hex: string): [number, number, number] {
  let value = String(hex || '').trim().replace('#', '');
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return [14, 165, 233];
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function mix(hexA: string, hexB: string, ratioB: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const channel = (index: number) =>
    Math.max(0, Math.min(255, Math.round(a[index] + (b[index] - a[index]) * ratioB)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

function toTriplet(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

// Full accent scale derived from one base color (used for --arctic-* and --cyan-*).
function deriveAccent(base: string): Record<number, string> {
  const lightMix: Record<number, number> = { 50: 0.92, 100: 0.84, 200: 0.68, 300: 0.48, 400: 0.22 };
  const darkMix: Record<number, number> = { 600: 0.14, 700: 0.3, 800: 0.45, 900: 0.6, 950: 0.75 };
  const out: Record<number, string> = {};
  for (const step of STEPS) {
    if (step < 500) out[step] = mix('#ffffff', base, lightMix[step]);
    else if (step === 500) out[step] = base;
    else out[step] = mix('#000000', base, darkMix[step]);
  }
  return out;
}

// Neutral scale (--frost-*) derived from the theme's background/surface/text colors.
function deriveFrost(bg: string, surface: string, text: string, textMuted: string): Record<number, string> {
  return {
    50: text,
    100: mix(textMuted, text, 0.85),
    200: mix(textMuted, text, 0.7),
    300: mix(textMuted, text, 0.55),
    400: mix(textMuted, text, 0.35),
    500: textMuted,
    600: mix(surface, text, 0.4),
    700: mix(surface, text, 0.25),
    800: mix(surface, text, 0.12),
    900: surface,
    950: bg,
  };
}

/**
 * Applies the active color theme to the document root as CSS variables.
 * Accent colors (arctic/cyan) always follow the theme. Neutrals (frost) and
 * the base background follow the theme in dark mode; light mode keeps its
 * dedicated light palette and only picks up the accent.
 */
export function applyThemeColors(theme: Theme | undefined, isLight: boolean): void {
  if (typeof document === 'undefined' || !theme) return;
  const root = document.documentElement;
  const primary = theme.colors.primary;
  const accent = theme.colors.accent;

  const arctic = deriveAccent(primary);
  const cyan = deriveAccent(accent);
  for (const step of STEPS) {
    root.style.setProperty(`--arctic-${step}`, toTriplet(arctic[step]));
    root.style.setProperty(`--cyan-${step}`, toTriplet(cyan[step]));
  }

  if (isLight) {
    // Let the dedicated light palette (`.light` in index.css) take over.
    // Clear any neutrals a previous dark theme applied inline.
    const colorVars = ['--color-bg', '--color-surface', '--color-border', '--color-text', '--color-text-muted', '--color-accent', '--color-accent-glow'];
    for (const name of colorVars) root.style.removeProperty(name);
    for (const step of STEPS) root.style.removeProperty(`--frost-${step}`);
    return;
  }

  const frost = deriveFrost(theme.colors.background, theme.colors.surface, theme.colors.text, theme.colors.textMuted);
  for (const step of STEPS) {
    root.style.setProperty(`--frost-${step}`, toTriplet(frost[step]));
  }
  root.style.setProperty('--color-bg', theme.colors.background);
  root.style.setProperty('--color-surface', theme.colors.surface);
  root.style.setProperty('--color-border', theme.colors.border);
  root.style.setProperty('--color-text', theme.colors.text);
  root.style.setProperty('--color-text-muted', theme.colors.textMuted);
  root.style.setProperty('--color-accent', primary);
  root.style.setProperty('--color-accent-glow', theme.colors.border);
}
