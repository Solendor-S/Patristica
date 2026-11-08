import React, { useEffect, useMemo, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { useChapterText } from '../context/PackContext'
import { useTranslation } from '../context/TranslationContext'
import { useCanon } from '../context/CanonContext'
import { textSource } from '../data/books'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { BibleStackParamList } from '../types'
import { StackActions } from '@react-navigation/native'
import { pendingNav } from '../navigation/pendingNav'

type Props = {
  navigation: NativeStackNavigationProp<BibleStackParamList, 'VersePicker'>
  route: RouteProp<BibleStackParamList, 'VersePicker'>
}

const COLS = 5

export default function VersePickerScreen({ navigation, route }: Props) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const loadChapter = useChapterText()
  const { translation } = useTranslation()
  const { deuteroText } = useCanon()

  const { book, chapter, apocrypha } = route.params
  const [verseCount, setVerseCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    loadChapter(book, chapter, textSource(translation, book, chapter, deuteroText))
      .then(rows => { if (!cancelled) setVerseCount(rows.reduce((max, v) => Math.max(max, v.verse), 0)) })
      .catch(console.error)
    return () => { cancelled = true }
  }, [loadChapter, book, chapter, translation, deuteroText])

  const verses = verseCount ? Array.from({ length: verseCount }, (_, i) => i + 1) : []
  const remainder = verses.length % COLS
  const data: (number | null)[] = remainder === 0 || verses.length === 0
    ? verses
    : [...verses, ...Array<null>(COLS - remainder).fill(null)]

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.title}>{book} {chapter}</Text>
      </View>

      {verseCount === null
        ? <ActivityIndicator style={s.loader} color={colors.accent} />
        : (
          <FlatList
            data={data}
            keyExtractor={(item, i) => item?.toString() ?? `spacer-${i}`}
            numColumns={COLS}
            contentContainerStyle={s.grid}
            renderItem={({ item }) =>
              item === null
                ? <View style={[s.cell, s.cellSpacer]} />
                : (
                  <TouchableOpacity
                    style={s.cell}
                    activeOpacity={0.7}
                    onPress={() => {
                      pendingNav.current = { book, chapter, verse: item, apocrypha, earlyText: false }
                      navigation.dispatch(StackActions.popToTop())
                    }}
                  >
                    <Text style={s.cellText}>{item}</Text>
                  </TouchableOpacity>
                )
            }
          />
        )
      }
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 18, color: c.textMuted },
  title:    { fontSize: 17, fontWeight: '700', color: c.textPrimary },

  loader: { flex: 1 },
  grid:   { padding: 12 },

  cell: {
    flex: 1,
    margin: 5,
    aspectRatio: 1,
    backgroundColor: c.bgTertiary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  cellSpacer: { backgroundColor: 'transparent', borderColor: 'transparent' },
  cellText:   { fontSize: 16, fontWeight: '600', color: c.textPrimary },
})
