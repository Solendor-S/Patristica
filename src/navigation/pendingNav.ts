/**
 * Module-level inbox used by BookPicker / ChapterPicker / VersePicker to hand
 * off a navigation target to Reader without calling navigate('Reader', params).
 *
 * Why: when those pickers call navigation.navigate('Reader', params) React
 * Navigation pops the pickers and returns focus to the existing Reader screen,
 * but the params update isn't always processed as a fresh render (the screen
 * was suspended while off-screen). Reader reads this ref on its 'focus' event
 * and calls navigation.setParams() itself — the same path cross-refs use and
 * which reliably triggers the reading-history logic.
 */

export type PendingNav = {
  book:      string
  chapter:   number
  verse?:    number
  apocrypha: boolean
  earlyText: boolean
}

export const pendingNav: { current: PendingNav | null } = { current: null }
