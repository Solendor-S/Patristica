import React, { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Share, Modal, ScrollView,
  StyleSheet, ActivityIndicator, StatusBar, Animated, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import {
  getChapter, isBookmarked, addBookmark, removeBookmark, recordHistory,
  getChapterHighlights, setHighlight, removeHighlight,
  getNote, saveNote, deleteNote,
} from '../db/queries'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { useTranslation, TRANSLATIONS } from '../context/TranslationContext'
import { Colors } from '../theme/colors'
import type { BibleVerse, BibleStackParamList } from '../types'

type Props = {
  navigation: NativeStackNavigationProp<BibleStackParamList, 'Reader'>
  route: RouteProp<BibleStackParamList, 'Reader'>
}

const HIGHLIGHT_COLORS = [
  { key: 'yellow', swatch: '#FFD93D', bg: 'rgba(255,217,61,0.22)' },
  { key: 'green',  swatch: '#6BCB77', bg: 'rgba(107,203,119,0.20)' },
  { key: 'blue',   swatch: '#4D96FF', bg: 'rgba(77,150,255,0.20)' },
  { key: 'pink',   swatch: '#FF6B6B', bg: 'rgba(255,107,107,0.18)' },
  { key: 'purple', swatch: '#C77DFF', bg: 'rgba(199,125,255,0.18)' },
] as const

type ColorKey = typeof HIGHLIGHT_COLORS[number]['key']

function getHighlightBg(key: string): string {
  return HIGHLIGHT_COLORS.find(c => c.key === key)?.bg ?? 'transparent'
}

const VerseRow = memo(function VerseRow({
  verse, text, isSelected, hlColor, onPress,
}: {
  verse: number
  text: string
  isSelected: boolean
  hlColor: string | undefined
  onPress: (v: number) => void
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(verse)}
      style={[
        styles.verseRow,
        isSelected && styles.verseRowSelected,
        hlColor ? { backgroundColor: getHighlightBg(hlColor) } : null,
      ]}
    >
      <Text style={styles.verseNum}>{verse}</Text>
      <Text style={[styles.verseText, isSelected && styles.verseTextSelected]}>{text}</Text>
    </TouchableOpacity>
  )
})

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

  useEffect(() => {
    if (visible) { setFromVerse(anchorVerse); setToVerse(anchorVerse) }
  }, [visible, anchorVerse])

  const maxVerse = verses.length > 0 ? verses[verses.length - 1].verse : 1
  const adjustFrom = (d: number) => setFromVerse(v => Math.max(1, Math.min(toVerse, v + d)))
  const adjustTo   = (d: number) => setToVerse(v => Math.max(fromVerse, Math.min(maxVerse, v + d)))

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

  const doShare = async () => { onClose(); await Share.share({ message: buildShareText() }) }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>Share Verse Range</Text>
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
          <ScrollView style={modal.preview} contentContainerStyle={{ padding: 12 }}>
            <Text style={modal.previewRef}>
              {fromVerse === toVerse
                ? `${book} ${chapter}:${fromVerse}`
                : `${book} ${chapter}:${fromVerse}–${toVerse}`}
            </Text>
            {rangeVerses.map(v => (
              <Text key={v.verse} style={modal.previewText}>
                {fromVerse !== toVerse && <Text style={modal.previewNum}>[{v.verse}] </Text>}
                {v.text}{' '}
              </Text>
            ))}
          </ScrollView>
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
  const { translation, setTranslation } = useTranslation()
  const [verses, setVerses] = useState<BibleVerse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [translationPickerOpen, setTranslationPickerOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteSaved, setNoteSaved] = useState('')
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Highlights: verse number → color key
  const [highlights, setHighlights] = useState<Record<number, string>>({})
  const [showColorPicker, setShowColorPicker] = useState(false)

  const actionBarAnim   = useRef(new Animated.Value(0)).current
  const colorPickerAnim = useRef(new Animated.Value(0)).current

  const book    = route.params?.book    ?? 'Genesis'
  const chapter = route.params?.chapter ?? 1
  const listRef = useRef<FlatList>(null)

  const totalBarHeight = useMemo(
    () => Animated.add(
      actionBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 56] }),
      colorPickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 56] }),
    ),
    [], // actionBarAnim and colorPickerAnim are stable refs
  )

  useEffect(() => {
    setLoading(true)
    setSelectedVerse(null)
    setShowColorPicker(false)
    Animated.spring(actionBarAnim, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
    Animated.spring(colorPickerAnim, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
    Promise.all([
      getChapter(db, book, chapter, translation),
      getChapterHighlights(db, book, chapter),
    ]).then(([rows, hl]) => {
      setVerses(rows)
      const map: Record<number, string> = {}
      hl.forEach(h => { map[h.verse] = h.color })
      setHighlights(map)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [book, chapter, translation])

  useEffect(() => {
    recordHistory(db, book, chapter)
  }, [book, chapter])

  useEffect(() => {
    if (route.params?.verse && verses.length > 0) {
      const idx = verses.findIndex(v => v.verse === route.params.verse)
      if (idx >= 0) {
        const t = setTimeout(() => listRef.current?.scrollToIndex({ index: idx, animated: true }), 300)
        selectVerse(route.params.verse)
        return () => clearTimeout(t)
      }
    }
  }, [verses])

  useEffect(() => {
    const open = selectedVerse !== null
    Animated.spring(actionBarAnim, { toValue: open ? 1 : 0, useNativeDriver: false, bounciness: 0 }).start()
    if (!open) {
      setShowColorPicker(false)
      Animated.spring(colorPickerAnim, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
    }
    if (open && selectedVerse !== null) {
      isBookmarked(db, book, chapter, selectedVerse).then(setBookmarked)
      getNote(db, book, chapter, selectedVerse).then(n => {
        const t = n?.text ?? ''
        setNoteText(t)
        setNoteSaved(t)
      })
    }
  }, [selectedVerse, book, chapter])

  useEffect(() => {
    Animated.spring(colorPickerAnim, {
      toValue: showColorPicker ? 1 : 0,
      useNativeDriver: false,
      bounciness: 0,
    }).start()
  }, [showColorPicker])

  useEffect(() => () => { if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current) }, [])

  const selectVerse = useCallback((verse: number) => {
    const next = selectedVerse === verse ? null : verse
    setSelectedVerse(next)
    setShowColorPicker(false)
    setSelected(next !== null ? { book, chapter, verse: next } : null)
  }, [selectedVerse, book, chapter, setSelected])

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

  const pickColor = async (colorKey: ColorKey) => {
    if (selectedVerse === null) return
    const current = highlights[selectedVerse]
    if (current === colorKey) {
      // Tapping same color removes it
      await removeHighlight(db, book, chapter, selectedVerse)
      setHighlights(prev => { const next = { ...prev }; delete next[selectedVerse]; return next })
    } else {
      await setHighlight(db, book, chapter, selectedVerse, colorKey)
      setHighlights(prev => ({ ...prev, [selectedVerse]: colorKey }))
    }
    setShowColorPicker(false)
  }

  const handleNoteChange = (val: string) => {
    setNoteText(val)
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current)
    noteSaveTimer.current = setTimeout(async () => {
      if (selectedVerse === null) return
      if (val.trim()) {
        await saveNote(db, book, chapter, selectedVerse, val)
      } else {
        await deleteNote(db, book, chapter, selectedVerse)
      }
      setNoteSaved(val)
    }, 800)
  }

  const handleNoteDelete = () => {
    if (!noteSaved.trim()) return
    Alert.alert('Delete note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (selectedVerse === null) return
          await deleteNote(db, book, chapter, selectedVerse)
          setNoteText('')
          setNoteSaved('')
        },
      },
    ])
  }

  const goChapter = useCallback((delta: number) => {
    navigation.setParams({ book, chapter: chapter + delta, verse: undefined })
  }, [book, chapter])

  const canGoPrev = chapter > 1
  const currentHighlightColor = selectedVerse !== null ? highlights[selectedVerse] : undefined
  const currentSwatch = currentHighlightColor
    ? HIGHLIGHT_COLORS.find(c => c.key === currentHighlightColor)?.swatch
    : undefined

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
          style={styles.translationBtn}
          onPress={() => setTranslationPickerOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.translationLabel}>{translation}</Text>
          <Ionicons name="chevron-down" size={11} color={Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chapterBtn}
          onPress={() => navigation.navigate('ChapterPicker', { book })}
          activeOpacity={0.7}
        >
          <Text style={styles.chapterNum}>{chapter}</Text>
        </TouchableOpacity>
      </View>

      {/* Translation picker modal */}
      <Modal visible={translationPickerOpen} transparent animationType="fade" onRequestClose={() => setTranslationPickerOpen(false)}>
        <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setTranslationPickerOpen(false)}>
          <View style={modal.sheet}>
            <Text style={modal.title}>Bible Translation</Text>
            {TRANSLATIONS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={modal.translationRow}
                activeOpacity={0.7}
                onPress={() => { setTranslation(t.key); setTranslationPickerOpen(false) }}
              >
                <View style={modal.translationInfo}>
                  <Text style={[modal.translationKey, translation === t.key && modal.translationKeyActive]}>{t.label}</Text>
                  <Text style={modal.translationFull}>{t.full}</Text>
                </View>
                {translation === t.key && (
                  <Ionicons name="checkmark" size={18} color={Colors.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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
            <VerseRow
              verse={item.verse}
              text={item.text}
              isSelected={selectedVerse === item.verse}
              hlColor={highlights[item.verse]}
              onPress={selectVerse}
            />
          )}
        />
      )}

      {/* Action bar */}
      <Animated.View style={[styles.actionBar, { height: totalBarHeight, overflow: 'hidden' }]}>
        {/* Main button row */}
        <View style={styles.actionRow}>
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

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowColorPicker(p => !p)}
            activeOpacity={0.7}
          >
            <View style={styles.highlightIconWrap}>
              <Ionicons name="color-fill-outline" size={22} color={currentSwatch ?? Colors.textSecondary} />
              {currentSwatch && (
                <View style={[styles.highlightDot, { backgroundColor: currentSwatch }]} />
              )}
            </View>
            <Text style={[styles.actionLabel, !!currentHighlightColor && styles.actionLabelActive]}>
              Highlight
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setShareModalOpen(true)} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={22} color={Colors.textSecondary} />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setNotesOpen(true)} activeOpacity={0.7}>
            <Ionicons
              name={noteSaved.trim() ? 'pencil' : 'pencil-outline'}
              size={22}
              color={noteSaved.trim() ? Colors.accent : Colors.textSecondary}
            />
            <Text style={[styles.actionLabel, noteSaved.trim() && styles.actionLabelActive]}>Notes</Text>
          </TouchableOpacity>
        </View>

        {/* Color picker row */}
        <View style={styles.colorRow}>
          {HIGHLIGHT_COLORS.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.colorSwatch,
                { backgroundColor: c.swatch },
                currentHighlightColor === c.key && styles.colorSwatchActive,
              ]}
              onPress={() => pickColor(c.key)}
              activeOpacity={0.75}
            />
          ))}
          {currentHighlightColor && (
            <TouchableOpacity
              style={styles.colorRemove}
              onPress={async () => {
                if (selectedVerse === null) return
                await removeHighlight(db, book, chapter, selectedVerse)
                setHighlights(prev => { const next = { ...prev }; delete next[selectedVerse]; return next })
                setShowColorPicker(false)
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={20} color={Colors.textMuted} />
              <Text style={styles.colorRemoveLabel}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
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

      {/* Notes modal */}
      <Modal visible={notesOpen} transparent animationType="slide" onRequestClose={() => setNotesOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setNotesOpen(false)} />
          <View style={noteModal.sheet}>
            <View style={noteModal.header}>
              <Text style={noteModal.title}>
                Note — {book} {chapter}:{selectedVerse}
              </Text>
              <View style={noteModal.headerRight}>
                {!!noteSaved.trim() && (
                  <TouchableOpacity onPress={handleNoteDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setNotesOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={noteModal.hint}>
              {noteText !== noteSaved ? 'Saving…' : noteSaved.trim() ? 'Saved' : 'Start typing to add a note'}
            </Text>
            <TextInput
              style={noteModal.input}
              value={noteText}
              onChangeText={handleNoteChange}
              multiline
              placeholder="Your notes on this verse…"
              placeholderTextColor={Colors.textMuted}
              textAlignVertical="top"
              autoCorrect
              autoFocus
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  translationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: Colors.bgTertiary, borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border,
    marginLeft: 10,
  },
  translationLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5 },

  chapterBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: Colors.accentDim, borderRadius: 8, marginLeft: 8,
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
    backgroundColor: Colors.bgTertiary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  actionRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  actionBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 6, gap: 2 },
  actionLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  actionLabelActive: { color: Colors.accent },

  highlightIconWrap: { position: 'relative' },
  highlightDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 1, borderColor: Colors.bgTertiary,
  },

  colorRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  colorSwatch: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: Colors.textPrimary,
    transform: [{ scale: 1.15 }],
  },
  colorRemove: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginLeft: 8, paddingLeft: 12,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Colors.border,
  },
  colorRemoveLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },

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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 32, gap: 16,
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgTertiary, borderRadius: 10, overflow: 'hidden',
  },
  stepBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  stepValue: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, minWidth: 36, textAlign: 'center' },
  preview: {
    backgroundColor: Colors.bgCard, borderRadius: 10, maxHeight: 180,
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

  translationRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },

  translationInfo: { gap: 2 },
  translationKey: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  translationKeyActive: { color: Colors.accent },
  translationFull: { fontSize: 12, color: Colors.textMuted },
})

const noteModal = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 16, paddingHorizontal: 16, paddingBottom: 32,
    gap: 10, minHeight: 320,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  hint:  { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  input: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 16,
    lineHeight: 26,
    color: Colors.textPrimary,
    minHeight: 200,
  },
})

