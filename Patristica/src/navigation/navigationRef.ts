import { createNavigationContainerRef } from '@react-navigation/native'
import type { RootTabParamList } from '../types'
import { pendingNav } from './pendingNav'

export const navigationRef = createNavigationContainerRef<RootTabParamList>()

// Open the reader at a passage from outside navigation (e.g. a notification tap).
// Reuses the pendingNav inbox that ReaderScreen consumes on 'focus'.
export function openPassage(book: string, chapter: number, verse?: number) {
  pendingNav.current = { book, chapter, verse, apocrypha: false, earlyText: false }
  if (navigationRef.isReady()) {
    navigationRef.navigate('Bible')
  }
  // On cold start navigationRef isn't ready yet; pendingNav is already set, so
  // ReaderScreen picks it up on its first focus once the tree mounts.
  // ponytail: if the cold-start response resolves *after* Reader's first focus,
  // the app opens at the startup passage instead of the exact verse (verse still
  // shown in the notification body). Warm/background taps always land correctly.
  // Upgrade path: consume pendingNav in ReaderScreen's mount effect too.
}
