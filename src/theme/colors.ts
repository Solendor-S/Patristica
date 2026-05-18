// Static fallback (dark theme values) — used only in App.tsx splash and provider.tsx loading states
// that render before the SQLiteProvider/ThemeProvider are available.
// All other components should use useTheme() from ThemeContext.
export { darkTheme as Colors } from './themes'
export type { ThemeColors } from './themes'
