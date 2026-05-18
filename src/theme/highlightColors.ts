export const HIGHLIGHT_COLORS = [
  { key: 'yellow', swatch: '#FFD93D', bg: 'rgba(255,217,61,0.22)' },
  { key: 'green',  swatch: '#6BCB77', bg: 'rgba(107,203,119,0.20)' },
  { key: 'blue',   swatch: '#4D96FF', bg: 'rgba(77,150,255,0.20)' },
  { key: 'pink',   swatch: '#FF6B6B', bg: 'rgba(255,107,107,0.18)' },
  { key: 'purple', swatch: '#C77DFF', bg: 'rgba(199,125,255,0.18)' },
] as const

export type ColorKey = typeof HIGHLIGHT_COLORS[number]['key']

export function getHighlightBg(key: string): string {
  return HIGHLIGHT_COLORS.find(c => c.key === key)?.bg ?? 'transparent'
}

export function getSwatchColor(key: string, accentFallback: string): string {
  return HIGHLIGHT_COLORS.find(c => c.key === key)?.swatch ?? accentFallback
}
