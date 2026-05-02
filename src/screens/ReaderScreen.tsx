import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Share, Modal, ScrollView,
  StyleSheet, ActivityIndicator, StatusBar, Animated,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { getChapter, isBookmarked, addBookmark, removeBookmark } from '../db/queries'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { Colors } from '../theme/colors'
import type { BibleVerse, BibleStackParamList } from '../types'

type Props = {
  navigation: NativeStackNavigationProp<BibleStackParamList, 'Reader'>
  route: RouteProp<BibleStackParamList, 'Reader'>
}

// ── Share range modal ─────────────────────────────────────

function ShareModal({
  visible, onClose, book, chapter, verses, anchorVerse,
}: {
  visible: boolean
  onClose: () => void
  book: string
  chapter: number
  verses: BibleVerse[]
  anchorVerse: number
}) {
  const [fromVerse, setFromVerse] = useState(anchorVerse)
  const [toVerse, setToVerse]     = useState(anchorVerse)

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setFromVerse(anchorVerse)
      setToVerse(anchorVerse)
    }
  }, [visible, anchorVerse])

  const maxVerse = verses.length > 0 ? verses[verses.length - 1].verse : 1

  const adjustFrom = (delta: number) => {
    setFromVerse(v => {
      const next = Math.max(1, Math.min(toVerse, v + delta))
      return next
    })
  }

  const adjustTo = (delta: number) => {
    setToVerse(v => {
      const next = Math.max(fromVerse, Math.min(maxVerse, v + delta))
      return next
    })
  }

  const rangeVerses = verses.filter(v => v.verse >= fromVerse && v.verse <= toVerse)

  const buildShareText = () => {
    const ref = fromVerse === toVerse
      ? `${book} ${chapter}:${fromVerse}`
      : `${book} ${chapter}:${fromVerse}–${toVerse}`
    const body = rangeVerses
      .map(v => (fromVerse === toVerse ? v.text : `[${v.verse}] ${v.text}`))
      .join(' ')
    return `${ref} — ${body}`
  }

  const doShare = async () => {
    onClose()
    await Share.share({ message: buildShareText() })
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>Share Verse Range</Text>

          {/* From row */}
          <View style={modal.row}>
            <Text style={modal.rowLabel}>From</Text>
            <View style={modal.stepper}>
              <TouchableOpacity onPress={() => adjustFrom(-1)} style={modal.stepBtn} activeOpacity={0.7}>
                <Ionicons name="remove" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={modal.stepValue}>{fromVerse}</Text>
              <TouchableOpacity onPress={() => adjustFrom(1)} style={modal.stepBtn} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* To row */}
          <View style={modal.row}>
            <Text style={modal.rowLabel}>To</Text>
            <View style={modal.stepper}>
              <TouchableOpacity onPress={() => adjustTo(-1)} style={modal.stepBtn} activeOpacity={0.7}>
                <Ionicons name="remove" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={modal.stepValue}>{toVerse}</Text>
              <TouchableOpacity onPress={() => adjustTo(1)} style={modal.stepBtn} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Preview */}
          <ScrollView style={modal.preview} contentContainerStyle={{ padding: 12 }}>
            <Text style={modal.previewRef}>
              {fromVerse === toVerse
                ? `${book} ${chapter}:${fromVerse}`
                : `${book} ${chapter}:${fromVerse}–${toVerse}`}
            </Text>
            {rangeVerses.map(v => (
              <Text key={v.verse} style={modal.previewText}>
                {fromVerse !== toVerse && (
                  <Text style={modal.previewNum}>[{v.verse}] </Text>
                )}
                {v.text}
                {' '}
              </Text>
            ))}
          </ScrollView>

          {/* Buttons */}
          <View style={modal.btnRow}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={modal.cancelLabel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modal.shareBtn} onPress={doShare} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={16} color={Colors.bgPrimary} />
              <Text style={modal.shareLabel}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Reader screen ─────────────────────────────────────────

export default function ReaderScreen({ navigation, route }: Props) {
  const db = useSQLiteContext()
  const { setSelected } = useSelectedVerse()
  const [verses, setVerses] = useState<BibleVerse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const actionBarHeight = useRef(new Animated.Value(0)).current

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
        selectVerse(route.params.verse)
      }
    }
  }, [verses])

  useEffect(() => {
    Animated.spring(actionBarHeight, {
      toValue: selectedVerse !== null ? 1 : 0,
      useNativeDriver: false,
      bounciness: 0,
    }).start()

    if (selectedVerse !== null) {
      isBookmarked(db, book, chapter, selectedVerse).then(setBookmarked)
    }
  }, [selectedVerse])

  const selectVerse = (verse: number) => {
    const next = selectedVerse === verse ? null : verse
    setSelectedVerse(next)
    setSelected(next !== null ? { book, chapter, verse: next } : null)
  }

  const toggleBookmark = async () => {
    if (selectedVerse === null) return
    if (bookmarked) {
      await removeBookmark(db, book, chapter, selectedVerse)
      setBookmarked(false)
    } else {
      await addBookmark(db, book, chapter, selectedVerse)
      setBookmarked(true)
    }
  }

  const goChapter = useCallback((delta: number) => {
    navigation.setParams({ book, chapter: chapter + delta, verse: undefined })
  }, [book, chapter])

  const canGoPrev = chapter > 1

  const actionBarMaxHeight = actionBarHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52],
  })

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
              onPress={() => selectVerse(item.verse)}
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

      {/* Action bar */}
      <Animated.View style={[styles.actionBar, { height: actionBarMaxHeight, overflow: 'hidden' }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleBookmark} activeOpacity={0.7}>
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={bookmarked ? Colors.accent : Colors.textSecondary}
          />
          <Text style={[styles.actionLabel, bookmarked && styles.actionLabelActive]}>
            {bookmarked ? 'Bookmarked' : 'Bookmark'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShareModalOpen(true)} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={22} color={Colors.textSecondary} />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setSelectedVerse(null)} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={Colors.textMuted} />
          <Text style={styles.actionLabel}>Dismiss</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, !canGoPrev && styles.footerBtnDisabled]}
          onPress={() => canGoPrev && goChapter(-1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={canGoPrev ? Colors.textSecondary : Colors.textMuted} />
          <Text style={[styles.footerLabel, !canGoPrev && styles.footerLabelDisabled]}>Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerBtn} onPress={() => goChapter(1)} activeOpacity={0.7}>
          <Text style={styles.footerLabel}>Next</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Share range modal */}
      {selectedVerse !== null && (
        <ShareModal
          visible={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          book={book}
          chapter={chapter}
          verses={verses}
          anchorVerse={selectedVerse}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

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
  headerTitle: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bookName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.2 },
  chapterBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: Colors.accentDim, borderRadius: 8, marginLeft: 12,
  },
  chapterNum: { fontSize: 16, fontWeight: '700', color: Colors.accent },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 },
  verseRow: {
    flexDirection: 'row', paddingVertical: 8,
    paddingHorizontal: 10, borderRadius: 6, marginVertical: 1,
  },
  verseRowSelected: { backgroundColor: Colors.accentDim },
  verseNum: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    minWidth: 24, marginTop: 3, marginRight: 8,
  },
  verseText: { flex: 1, fontSize: 17, lineHeight: 28, color: Colors.textPrimary },
  verseTextSelected: { color: Colors.textAccent },

  actionBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgTertiary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  actionBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 8, gap: 2 },
  actionLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  actionLabelActive: { color: Colors.accent },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: Colors.bgSecondary,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  footerBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  footerBtnDisabled:   { opacity: 0.3 },
  footerLabel:         { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  footerLabelDisabled: { color: Colors.textMuted },
})

const modal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 32,
    gap: 16,
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },

  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 0,
    backgroundColor: Colors.bgTertiary, borderRadius: 10,
    overflow: 'hidden',
  },
  stepBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  stepValue: {
    fontSize: 17, fontWeight: '700', color: Colors.textPrimary,
    minWidth: 36, textAlign: 'center',
  },

  preview: {
    backgroundColor: Colors.bgCard, borderRadius: 10,
    maxHeight: 180,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border,
  },
  previewRef:  { fontSize: 13, fontWeight: '700', color: Colors.accent, marginBottom: 6 },
  previewText: { fontSize: 14, lineHeight: 22, color: Colors.textPrimary },
  previewNum:  { fontWeight: '700', color: Colors.textMuted },

  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.bgTertiary, alignItems: 'center',
  },
  cancelLabel: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  shareBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.accent, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  shareLabel: { fontSize: 15, fontWeight: '700', color: Colors.bgPrimary },
})
