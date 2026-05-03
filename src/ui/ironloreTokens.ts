export const IronLore = {
  colors: {
    bg: '#0a0a0f',
    panel: '#12121a',
    panel2: '#1a1a26',
    border: '#2a2a3a',
    text: '#e8e8f0',
    muted: '#888899',
    subtle: '#444',
    gold: '#c9a84c',
    green: '#4cc97a',
    red: '#ef4444',
  },
  radii: {
    sm: 10,
    md: 14,
    lg: 16,
    xl: 20,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 16,
    xl: 24,
  },
  type: {
    title: { fontSize: 28, fontWeight: '900' as const, letterSpacing: 4 },
    section: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1 },
    body: { fontSize: 13, lineHeight: 20 },
    button: { fontSize: 15, fontWeight: '900' as const, letterSpacing: 2 },
  },
  /** Palette for Clean Mode home — light/minimal, no gamification chrome. */
  cleanHome: {
    bg: '#f5f5f7',
    surface: '#ffffff',
    surface2: '#f0f0f3',
    border: '#e0e0e8',
    text: '#111118',
    muted: '#6b6b7a',
    subtle: '#aaaabc',
    accent: '#3b6bda',
    accentMuted: 'rgba(59,107,218,0.12)',
    green: '#16a34a',
    bar: '#3b6bda',
  },
} as const;

