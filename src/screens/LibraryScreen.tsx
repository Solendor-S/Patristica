import React, { useState, useCallback, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Alert, ScrollView,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useUserDb } from '../db/UserDbProvider'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import {
  getBookmarks, removeBookmark,
  getAllNotes, deleteNote,
  getAllHighlights, removeHighlight,
  getHistory, clearHistory,
} from '../db/queries'
import type { NoteWithVerse, HistoryEntry } from '../db/queries'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { Bookmark, Highlight, RootTabParamList } from '../types'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Library'>
type LibraryTab = 'bookmarks' | 'highlights' | 'notes' | 'history'

import { HIGHLIGHT_COLORS, getHighlightBg, getSwatchColor } from '../theme/highlightColors'
import { EARLY_TEXT_MAP, APOCRYPHA_BOOK_MAP } from '../data/books'
import { formatDate, formatRelative } from '../utils/formatDate'

function navigateToReader(
  navigation: NavProp,
  book: string, chapter: number, verse?: number,
) {
  const earlyText = !!EARLY_TEXT_MAP[book]
  const apocrypha = !earlyText && !!APOCRYPHA_BOOK_MAP[book]
  navigation.navigate('Bible' as any, { screen: 'Reader', params: { book, chapter, verse, earlyText, apocrypha } })
}

// ── Sub-tab: Bookmarks ────────────────────────────────────

function BookmarksTab() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const db = useUserDb()
  const navigation = useNavigation<NavProp>()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  useFocusEffect(useCallback(() => { getBookmarks(db).then(setBookmarks) }, [db]))

  const handleDelete = (b: Bookmark) => {
    Alert.alert('Remove bookmark', `Remove ${b.book} ${b.chapter}:${b.verse}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await removeBookmark(db, b.book, b.chapter, b.verse)
          setBookmarks(prev => prev.filter(x => !(x.book === b.book && x.chapter === b.chapter && x.verse === b.verse)))
        },
      },
    ])
  }

  const handleNavigate = (b: Bookmark) => navigateToReader(navigation, b.book, b.chapter, b.verse)

  return (
    <FlatList
      data={bookmarks}
      keyExtractor={(_, i) => i.toString()}
      contentContainerStyle={bookmarks.length === 0 ? s.emptyContainer : s.list}
      renderItem={({ item }) => (
        <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={() => handleNavigate(item)}>
          <Ionicons name="bookmark" size={18} color={colors.accent} style={s.rowIcon} />
          <View style={s.rowBody}>
            <Text style={s.rowRef}>{item.book} {item.chapter}:{item.verse}</Text>
            <Text style={s.rowDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={s.empty}>
          <Ionicons name="bookmark-outline" size={48} color={colors.border} />
          <Text style={s.emptyTitle}>No bookmarks yet</Text>
          <Text style={s.emptyText}>Tap a verse in the reader then press Bookmark</Text>
        </View>
      }
    />
  )
}

// ── Sub-tab: Highlights ───────────────────────────────────

function HighlightsTab() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const db = useUserDb()
  const navigation = useNavigation<NavProp>()
  const [highlights, setHighlights] = useState<Highlight[]>([])

  useFocusEffect(useCallback(() => { getAllHighlights(db).then(setHighlights) }, [db]))

  const handleDelete = (h: Highlight) => {
    Alert.alert('Remove highlight', `Remove highlight from ${h.book} ${h.chapter}:${h.verse}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await removeHighlight(db, h.book, h.chapter, h.verse)
          setHighlights(prev => prev.filter(x => !(x.book === h.book && x.chapter === h.chapter && x.verse === h.verse)))
        },
      },
    ])
  }

  const handleNavigate = (h: Highlight) => navigateToReader(navigation, h.book, h.chapter, h.verse)

  return (
    <FlatList
      data={highlights}
      keyExtractor={(_, i) => i.toString()}
      contentContainerStyle={highlights.length === 0 ? s.emptyContainer : s.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[s.row, { borderLeftWidth: 3, borderLeftColor: getSwatchColor(item.color, colors.accent), backgroundColor: getHighlightBg(item.color) }]}
          activeOpacity={0.7}
          onPress={() => handleNavigate(item)}
        >
          <View style={[s.colorDot, { backgroundColor: getSwatchColor(item.color, colors.accent) }]} />
          <View style={s.rowBody}>
            <Text style={s.rowRef}>{item.book} {item.chapter}:{item.verse}</Text>
            <Text style={s.rowDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={s.empty}>
          <Ionicons name="color-fill-outline" size={48} color={colors.border} />
          <Text style={s.emptyTitle}>No highlights yet</Text>
          <Text style={s.emptyText}>Tap a verse in the reader then press Highlight</Text>
        </View>
      }
    />
  )
}

// ── Sub-tab: Notes ────────────────────────────────────────

function NotesTab() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const db = useUserDb()
  const bibleDb = useSQLiteContext()
  const navigation = useNavigation<NavProp>()
  const [notes, setNotes] = useState<NoteWithVerse[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useFocusEffect(useCallback(() => { getAllNotes(db, bibleDb).then(setNotes) }, [db, bibleDb]))

  const noteKey = (n: NoteWithVerse) => `${n.book}-${n.chapter}-${n.verse}`

  const handleDelete = (n: NoteWithVerse) => {
    Alert.alert('Delete note', `Delete note for ${n.book} ${n.chapter}:${n.verse}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteNote(db, n.book, n.chapter, n.verse)
          setNotes(prev => prev.filter(x => noteKey(x) !== noteKey(n)))
        },
      },
    ])
  }

  const handleNavigate = (n: NoteWithVerse) => navigateToReader(navigation, n.book, n.chapter, n.verse)

  return (
    <FlatList
      data={notes}
      keyExtractor={noteKey}
      contentContainerStyle={notes.length === 0 ? s.emptyContainer : s.notesList}
      renderItem={({ item }) => {
        const key = noteKey(item)
        const isExpanded = expanded === key
        const longNote = item.noteText.length > 160
        return (
          <View style={s.noteCard}>
            <View style={s.noteHeader}>
              <TouchableOpacity onPress={() => handleNavigate(item)} activeOpacity={0.7}>
                <Text style={s.rowRef}>{item.book} {item.chapter}:{item.verse}</Text>
              </TouchableOpacity>
              <View style={s.noteHeaderRight}>
                <Text style={s.rowDate}>{formatDate(item.updatedAt)}</Text>
                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            {!!item.verseText && (
              <Text style={s.verseText} numberOfLines={2}>"{item.verseText}"</Text>
            )}
            <Text style={s.noteText} numberOfLines={isExpanded ? undefined : 4}>{item.noteText}</Text>
            {longNote && (
              <TouchableOpacity onPress={() => setExpanded(p => p === key ? null : key)} activeOpacity={0.7} style={s.expandBtn}>
                <Text style={s.expandLabel}>{isExpanded ? 'Show less' : 'Show more'}</Text>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={colors.accent} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleNavigate(item)} activeOpacity={0.7} style={s.goBtn}>
              <Ionicons name="arrow-forward" size={13} color={colors.accent} />
              <Text style={s.goLabel}>Go to verse</Text>
            </TouchableOpacity>
          </View>
        )
      }}
      ListEmptyComponent={
        <View style={s.empty}>
          <Ionicons name="pencil-outline" size={48} color={colors.border} />
          <Text style={s.emptyTitle}>No notes yet</Text>
          <Text style={s.emptyText}>Tap a verse in the reader, go to the Study tab, then open Notes</Text>
        </View>
      }
    />
  )
}

// ── Sub-tab: History ──────────────────────────────────────

function HistoryTab() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const db = useUserDb()
  const navigation = useNavigation<NavProp>()
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useFocusEffect(useCallback(() => { getHistory(db).then(setEntries) }, [db]))

  const handleNavigate = (e: HistoryEntry) => navigateToReader(navigation, e.book, e.chapter)

  const handleClear = () => {
    Alert.alert('Clear history', 'Remove all reading history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await clearHistory(db); setEntries([]) } },
    ])
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={e => `${e.book}-${e.chapter}`}
      contentContainerStyle={entries.length === 0 ? s.emptyContainer : s.list}
      ListHeaderComponent={entries.length > 0 ? (
        <TouchableOpacity onPress={handleClear} style={s.histClearRow} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          <Text style={s.histClearLabel}>Clear history</Text>
        </TouchableOpacity>
      ) : null}
      renderItem={({ item, index }) => {
        const prev    = entries[index - 1]
        const thisDay = new Date(item.visitedAt).toDateString()
        const prevDay = prev ? new Date(prev.visitedAt).toDateString() : null
        return (
          <>
            {thisDay !== prevDay && (
              <Text style={s.histDayHeader}>
                {new Date(item.visitedAt).toLocaleDateString('en-AU', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </Text>
            )}
            <TouchableOpacity style={s.row} onPress={() => handleNavigate(item)} activeOpacity={0.7}>
              <View style={s.histIconWrap}>
                <Ionicons name="book-outline" size={18} color={colors.accent} />
              </View>
              <View style={s.rowBody}>
                <Text style={s.rowRef}>{item.book} {item.chapter}</Text>
              </View>
              <Text style={s.rowDate}>{formatRelative(item.visitedAt)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </>
        )
      }}
      ListEmptyComponent={
        <View style={s.empty}>
          <Ionicons name="time-outline" size={48} color={colors.border} />
          <Text style={s.emptyTitle}>No history yet</Text>
          <Text style={s.emptyText}>Chapters you read will appear here</Text>
        </View>
      }
    />
  )
}

// ── Main screen ───────────────────────────────────────────

const TABS: { key: LibraryTab; label: string }[] = [
  { key: 'bookmarks', label: 'Bookmarks' },
  { key: 'highlights', label: 'Highlights' },
  { key: 'notes', label: 'Notes' },
  { key: 'history', label: 'History' },
]

export default function LibraryScreen() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const [activeTab, setActiveTab] = useState<LibraryTab>('bookmarks')

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Library</Text>
      </View>

      {/* Sub-tabs */}
      <View style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, activeTab === t.key && s.tabActive]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabLabel, activeTab === t.key && s.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={s.content}>
        {activeTab === 'bookmarks'  && <BookmarksTab />}
        {activeTab === 'highlights' && <HighlightsTab />}
        {activeTab === 'notes'      && <NotesTab />}
        {activeTab === 'history'    && <HistoryTab />}
      </View>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },

  header: {
    backgroundColor: c.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: c.textPrimary },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: c.bgSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: c.accent },
  tabLabel: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  tabLabelActive: { color: c.accent },

  content: { flex: 1 },

  list:      { paddingBottom: 40 },
  notesList: { padding: 12, gap: 10, paddingBottom: 40 },
  emptyContainer: { flex: 1 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  rowIcon: { marginRight: 12 },
  colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  rowBody: { flex: 1 },
  rowRef:  { fontSize: 16, fontWeight: '600', color: c.textPrimary },
  rowDate: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  noteCard: {
    backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, gap: 8,
  },
  noteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noteHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verseText: { fontSize: 13, lineHeight: 20, color: c.textMuted, fontStyle: 'italic' },
  noteText:  { fontSize: 15, lineHeight: 24, color: c.textPrimary },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  expandLabel: { fontSize: 13, color: c.accent, fontWeight: '600' },
  goBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  goLabel: { fontSize: 12, color: c.accent, fontWeight: '600' },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 100, gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.textSecondary },
  emptyText:  { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingHorizontal: 40 },

  histClearRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  histClearLabel: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
  histDayHeader: {
    fontSize: 12, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6,
  },
  histIconWrap: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: c.accentDim,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
})
