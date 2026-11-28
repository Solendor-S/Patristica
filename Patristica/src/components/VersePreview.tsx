import React, { useCallback, useState } from 'react'
import { useSQLiteContext } from 'expo-sqlite'
import { useNavigation } from '@react-navigation/native'
import { ScripturePreviewModal } from '../screens/ScripturePreviewModal'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { useTranslation } from '../context/TranslationContext'
import { useTheme } from '../context/ThemeContext'
import { APOCRYPHA_BOOK_NAMES } from '../data/books'

type Ref = { book: string; chapter: number; verse: number }

/** Scripture preview popup (same as Doctrine/Heresies) — returns [modal element, open(ref)]. */
export function useVersePreview(): [React.ReactNode, (r: Ref) => void] {
  const db = useSQLiteContext()
  const navigation = useNavigation()
  const { setSelected } = useSelectedVerse()
  const { translation } = useTranslation()
  const { colors } = useTheme()
  const [ref, setRef] = useState<Ref | null>(null)

  const navigate = useCallback((book: string, chapter: number, verse: number) => {
    setRef(null)
    setSelected({ book, chapter, verse })
    ;(navigation as unknown as { navigate: (n: string, p: object) => void }).navigate('Bible', {
      screen: 'Reader',
      params: { book, chapter, verse, earlyText: false, apocrypha: APOCRYPHA_BOOK_NAMES.has(book) },
    })
  }, [navigation, setSelected])

  const modal = ref ? (
    <ScripturePreviewModal
      db={db}
      book={ref.book}
      chapter={ref.chapter}
      verse={ref.verse}
      translation={translation}
      colors={colors}
      onClose={() => setRef(null)}
      onNavigate={navigate}
    />
  ) : null
  return [modal, setRef]
}
