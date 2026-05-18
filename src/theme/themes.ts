export type ThemeKey = 'dark' | 'light' | 'highContrast'

export interface ThemeColors {
  bgPrimary:     string
  bgSecondary:   string
  bgTertiary:    string
  bgCard:        string
  border:        string
  borderLight:   string
  textPrimary:   string
  textSecondary: string
  textMuted:     string
  textAccent:    string
  accent:        string
  accentDim:     string
  accentPress:   string
  success:       string
  info:          string
  overlay:       string
  statusBarStyle: 'dark' | 'light'
}

export const darkTheme: ThemeColors = {
  bgPrimary:     '#1a1a1a',
  bgSecondary:   '#222222',
  bgTertiary:    '#2a2a2a',
  bgCard:        '#252525',
  border:        '#333333',
  borderLight:   '#3a3a3a',
  textPrimary:   '#e8e0d0',
  textSecondary: '#b0a898',
  textMuted:     '#6b6560',
  textAccent:    '#c9a45a',
  accent:        '#c9a45a',
  accentDim:     'rgba(201,164,90,0.15)',
  accentPress:   '#b8943a',
  success:       '#5bac8a',
  info:          '#7a9fd4',
  overlay:       'rgba(0,0,0,0.6)',
  statusBarStyle: 'light',
}

export const lightTheme: ThemeColors = {
  bgPrimary:     '#f5f0e8',
  bgSecondary:   '#ede8de',
  bgTertiary:    '#e4ddd2',
  bgCard:        '#f0ebe2',
  border:        '#d4cfc6',
  borderLight:   '#ccc7be',
  textPrimary:   '#2a2218',
  textSecondary: '#5a5040',
  textMuted:     '#8a8070',
  textAccent:    '#9a6a20',
  accent:        '#9a6a20',
  accentDim:     'rgba(154,106,32,0.12)',
  accentPress:   '#8a5a10',
  success:       '#3a8a6a',
  info:          '#4a7ab4',
  overlay:       'rgba(0,0,0,0.45)',
  statusBarStyle: 'dark',
}

export const highContrastTheme: ThemeColors = {
  bgPrimary:     '#000000',
  bgSecondary:   '#0a0a0a',
  bgTertiary:    '#141414',
  bgCard:        '#0f0f0f',
  border:        '#555555',
  borderLight:   '#666666',
  textPrimary:   '#ffffff',
  textSecondary: '#dddddd',
  textMuted:     '#aaaaaa',
  textAccent:    '#ffd700',
  accent:        '#ffd700',
  accentDim:     'rgba(255,215,0,0.15)',
  accentPress:   '#e6c200',
  success:       '#00e676',
  info:          '#40c4ff',
  overlay:       'rgba(0,0,0,0.75)',
  statusBarStyle: 'light',
}

export const THEMES: Record<ThemeKey, ThemeColors> = {
  dark:          darkTheme,
  light:         lightTheme,
  highContrast:  highContrastTheme,
}
