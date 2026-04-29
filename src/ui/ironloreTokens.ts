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
} as const;

