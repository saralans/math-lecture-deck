// ─────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────
export const C = {
  bg:           '#0c1120',
  surface:      '#111827',
  surfaceLight: '#1a2438',
  border:       '#243050',
  gold:         '#c9973a',
  goldLight:    '#e0b860',
  text:         '#e4d9c8',
  textDim:      '#a8b4c8',
  muted:        '#6a7a96',
  red:          '#c04040',
  defGreen:     '#3a7a58',
  thmPurple:    '#7a60b0',
  exOrange:     '#b06848',
  recallBlue:   '#4878a8',
}

export const FONT = {
  serif: "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
  sans:  'system-ui, -apple-system, sans-serif',
}

export const S = {
  container: {
    height: '100%',
    padding: '44px 52px',
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
    overflow: 'auto',
    fontFamily: "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
  },
  eyebrow: {
    fontSize: '11px',
    color: '#6a7a96',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: '500',
  },
  heading: {
    fontSize: '30px',
    fontWeight: '500',
    color: '#e0b860',
    lineHeight: 1.2,
    fontFamily: "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
  },
  body: {
    fontSize: '18px',
    color: '#e4d9c8',
    lineHeight: 1.72,
    fontFamily: "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
  },
  label: {
    fontSize: '11px',
    color: '#6a7a96',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: '600',
    marginBottom: '6px',
  },
  box: (bg, borderColor) => ({
    background: bg || '#1a2438',
    border: `1px solid ${borderColor || '#243050'}`,
    borderRadius: '8px',
    padding: '18px 22px',
  }),
  accentBox: (color) => ({
    background: color + '18',
    border: `1px solid ${color}55`,
    borderLeft: `4px solid ${color}`,
    borderRadius: '6px',
    padding: '16px 20px',
  }),
  bullet: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
    fontSize: '17px',
    color: '#e4d9c8',
    lineHeight: 1.65,
    fontFamily: "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
  },
}

export function btn(variant) {
  const base = {
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '7px 16px',
    borderRadius: '6px',
    transition: 'all 0.15s',
  }
  if (variant === 'gold')    return { ...base, background: '#c9973a', border: '1px solid #c9973a',  color: '#0c1120', fontWeight: '700' }
  if (variant === 'outline') return { ...base, background: 'none',    border: '1px solid #c9973a',  color: '#c9973a' }
  return                            { ...base, background: 'none',    border: '1px solid #243050',  color: '#6a7a96' }
}
