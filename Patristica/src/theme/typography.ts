import { StyleSheet } from 'react-native'
import { Colors } from './colors'

export const Typography = StyleSheet.create({
  heading1: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  heading2: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  heading3: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  accent: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textAccent,
  },
})
