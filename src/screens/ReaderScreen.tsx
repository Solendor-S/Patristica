import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { getChapter } from '../db/queries'
import { Colors } from '../theme/colors'
import type { BibleVerse, BibleStackParamList } from '../types'

type Props = {
  navigation: NativeStackNavigationProp<BibleStackParamList, 'Reader'>
  route: RouteProp<BibleStackParamList, 'Reader'>
}

export default function ReaderScreen({ navigation, route }: Props) {
  const db = useSQLiteContext()
  const [verses, setVerses] = useState<BibleVerse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null)

  const book    = route.params?.book    ?? 'Genesis'
  const chapter = route.params?.chapter ?? 1

  const listRef = useRef<FlatList>(null)

  useEffect(() => {
    setLoading(true)
    setSelectedVerse(null)
    getChapter(db, book, chapter)
      .then(rows => { setVerses(rows); setLoading(false) })
      .catch(() => setLoading(false))
  }, [book, chapter])

  useEffect(() => {
    if (route.params?.verse && verses.length > 0) {
      const idx = verses.findIndex(v => v.verse === route.params.verse)
      if (idx >= 0) {
        setTimeout(() => listRef.current?.scrollToIndex({ index: idx, animated: true }), 300)
        setSelectedVerse(route.params.verse)
      }
    }
  }, [verses])

  const goChapter = useCallback((delta: number) => {
    navigation.setParams({ book, chapter: chapter + delta, verse: undefined })
  }, [book, chapter])

  const canGoPrev = chapter > 1
  const canGoNext = chapter < (verses.length > 0 ? 999 : 1)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerTitle}
          onPress={() => navigation.navigate('BookPicker')}
          activeOpacity={0.7}
        >
          <Text style={styles.bookName}>{book}</Text>
          <Ionicons name="chevron-down" size={14} color={Colors.textMuted} style={{ marginLeft: 4, marginTop: 2 }} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chapterBtn}
          onPress={() => navigation.navigate('ChapterPicker', { book })}
          activeOpacity={0.7}
        >
          <Text style={styles.chapterNum}>{chapter}</Text>
        </TouchableOpacity>
      </View>

      {/* Verses */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={verses}
          keyExtractor={v => `${v.verse}`}
          contentContainerStyle={styles.list}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedVerse(n => n === item.verse ? null : item.verse)}
              style={[styles.verseRow, selectedVerse === item.verse && styles.verseRowSelected]}
            >
              <Text style={styles.verseNum}>{item.verse}</Text>
              <Text style={[styles.verseText, selectedVerse === item.verse && styles.verseTextSelected]}>
                {item.text}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Chapter prev/next */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, !canGoPrev && styles.footerBtnDisabled]}
          onPress={() => canGoPrev && goChapter(-1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={canGoPrev ? Colors.textSecondary : Colors.textMuted} />
          <Text style={[styles.footerLabel, !canGoPrev && styles.footerLabelDisabled]}>Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => goChapter(1)}
          activeOpacity={0.7}
        >
          <Text style={styles.footerLabel}>Next</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bgPrimary },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bookName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  chapterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.accentDim,
    borderRadius: 8,
    marginLeft: 12,
  },
  chapterNum: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accent,
  },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 },
  verseRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginVertical: 1,
  },
  verseRowSelected: {
    backgroundColor: Colors.accentDim,
  },
  verseNum: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    minWidth: 24,
    marginTop: 3,
    marginRight: 8,
  },
  verseText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 28,
    color: Colors.textPrimary,
  },
  verseTextSelected: {
    color: Colors.textAccent,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgSecondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  footerBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  footerBtnDisabled:  { opacity: 0.3 },
  footerLabel:        { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  footerLabelDisabled:{ color: Colors.textMuted },
})
