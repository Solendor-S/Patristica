import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  StyleSheet, StatusBar, Alert, ScrollView, PanResponder, SectionList,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useUserDb } from '../db/UserDbProvider'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import {
  getBookmarks, removeBookmark, updateBookmarkPositions,
  getAllNotes, deleteNote,
  getAllHighlights, removeHighlight,
  getHistory, clearHistory,
} from '../db/queries'
import type { NoteWithVerse, HistoryEntry } from '../db/queries'
import { useTheme } from '../context/ThemeContext'
import { usePacks } from '../context/PackContext'
import type { PackMeta } from '../lib/PackManager'
import type { ThemeColors } from '../theme/themes'
import type { Bookmark, Highlight, RootTabParamList } from '../types'

import ReadingPlanScreen from './ReadingPlanScreen'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Library'>
type LibraryTab = 'bookmarks' | 'highlights' | 'notes' | 'history' | 'downloads' | 'plans'

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

const ITEM_HEIGHT = 62

function BookmarksTab() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const db = useUserDb()
  const navigation = useNavigation<NavProp>()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragTo, setDragTo] = useState<number | null>(null)
  const dragFromRef = useRef<number | null>(null)
  const dragToRef = useRef<number | null>(null)
  const bookmarksRef = useRef<Bookmark[]>([])

  useEffect(() => { bookmarksRef.current = bookmarks }, [bookmarks])
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

  const panResponders = useMemo(() =>
    bookmarks.map((_, i) => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragFromRef.current = i
        dragToRef.current = i
        setDragFrom(i)
        setDragTo(i)
      },
      onPanResponderMove: (_, gs) => {
        const bm = bookmarksRef.current
        const newTo = Math.max(0, Math.min(bm.length - 1, i + Math.round(gs.dy / ITEM_HEIGHT)))
        if (newTo !== dragToRef.current) {
          dragToRef.current = newTo
          setDragTo(newTo)
        }
      },
      onPanResponderRelease: (_, gs) => {
        const from = dragFromRef.current
        const to = dragToRef.current
        if (from !== null && to !== null && from !== to) {
          const newBM = [...bookmarksRef.current]
          const [item] = newBM.splice(from, 1)
          newBM.splice(to, 0, item)
          setBookmarks(newBM)
          updateBookmarkPositions(db, newBM)
        }
        dragFromRef.current = null
        dragToRef.current = null
        setDragFrom(null)
        setDragTo(null)
      },
      onPanResponderTerminate: () => {
        dragFromRef.current = null
        dragToRef.current = null
        setDragFrom(null)
        setDragTo(null)
      },
    })),
  [bookmarks, db])

  if (bookmarks.length === 0) {
    return (
      <View style={s.emptyContainer}>
        <View style={s.empty}>
          <Ionicons name="bookmark-outline" size={48} color={colors.border} />
          <Text style={s.emptyTitle}>No bookmarks yet</Text>
          <Text style={s.emptyText}>Tap a verse in the reader then press Bookmark</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView scrollEnabled={dragFrom === null} contentContainerStyle={s.list}>
      {bookmarks.map((item, index) => (
        <View
          key={`${item.book}-${item.chapter}-${item.verse}`}
          style={[
            s.row,
            index === dragFrom && s.rowActive,
            index === dragTo && dragFrom !== null && dragFrom !== dragTo && s.rowDropTarget,
          ]}
        >
          <View {...panResponders[index].panHandlers} style={s.dragHandle}>
            <Ionicons name="reorder-three-outline" size={22} color={colors.textMuted} />
          </View>
          <TouchableOpacity
            style={s.rowPressable}
            activeOpacity={0.7}
            onPress={() => handleNavigate(item)}
          >
            <Ionicons name="bookmark" size={18} color={colors.accent} style={s.rowIcon} />
            <View style={s.rowBody}>
              <Text style={s.rowRef}>{item.book} {item.chapter}:{item.verse}</Text>
              <Text style={s.rowDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
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

// ── Sub-tab: Downloads ────────────────────────────────────

const PACK_TYPE_LABEL: Record<string, string> = {
  commentary:     'Commentary',
  translation:    'Translations',
  greek_source:   'Greek NT Sources',
  hebrew_source:  'Hebrew OT Sources',
  apocrypha:      'Apocrypha',
  early_text:     'Early Christian Texts',
}

function PackRow({ pack, isInstalled: packInstalled, colors, downloading, download, uninstall, hasUpdate }: {
  pack: PackMeta
  isInstalled: boolean
  colors: ReturnType<typeof useTheme>['colors']
  downloading: Map<string, number>
  download: (slug: string) => void
  uninstall: (slug: string) => void
  hasUpdate: (slug: string) => boolean
}) {
  const isLoading = downloading.has(pack.slug)
  const progress = downloading.get(pack.slug) ?? 0
  const sizeLabel = pack.sizeMB < 1 ? `${Math.round(pack.sizeMB * 1000)} KB` : `${pack.sizeMB} MB`
  return (
    <View style={dl.row}>
      <View style={{ flex: 1 }}>
        <Text style={dl.packName}>{pack.name}</Text>
        <Text style={{ fontSize: 11, color: isLoading ? colors.accent : colors.textMuted, marginTop: 2 }}>
          {isLoading ? `Downloading… ${Math.round(progress * 100)}%` : sizeLabel}
        </Text>
      </View>
      {isLoading && <ActivityIndicator size="small" color={colors.accent} />}
      {!isLoading && packInstalled && (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {hasUpdate(pack.slug) && (
            <TouchableOpacity style={dl.updateBtn} onPress={() => download(pack.slug)} activeOpacity={0.7}>
              <Ionicons name="arrow-up-circle-outline" size={14} color="#fff" />
              <Text style={dl.updateLabel}>Update</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={dl.uninstallBtn}
            onPress={() => Alert.alert(
              'Remove pack',
              `Remove "${pack.name}"? You can re-download it anytime.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => uninstall(pack.slug) },
              ]
            )}
            activeOpacity={0.7}
          >
            <Text style={dl.uninstallLabel}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
      {!isLoading && !packInstalled && (
        <TouchableOpacity style={dl.downloadBtn} onPress={() => download(pack.slug)} activeOpacity={0.7}>
          <Ionicons name="cloud-download-outline" size={18} color={colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  )
}

function DownloadsTab() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const { allPacks, installed, downloading, download, uninstall, hasUpdate, manifestReady } = usePacks()

  const installedPacks = useMemo(() => allPacks.filter(p => installed.has(p.slug)), [allPacks, installed])
  const uninstalledPacks = useMemo(() => allPacks.filter(p => !installed.has(p.slug)), [allPacks, installed])
  const totalInstalledMB = useMemo(() => installedPacks.reduce((sum, p) => sum + (p.sizeMB ?? 0), 0), [installedPacks])

  // All packs grouped in manifest order — installed and available mixed per group
  const sections = useMemo(() => {
    const grouped = allPacks.reduce<Record<string, PackMeta[]>>((acc, p) => {
      const key = PACK_TYPE_LABEL[p.type] ?? p.type
      ;(acc[key] ??= []).push(p)
      return acc
    }, {})
    return Object.entries(grouped).map(([title, data]) => ({ title, data }))
  }, [allPacks])

  const rowProps = { colors, downloading, download, uninstall, hasUpdate }

  if (!manifestReady) {
    return (
      <View style={[s.content, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: 13 }}>Loading pack catalog…</Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Global action bar */}
      <View style={dl.sectionHeader}>
        {installedPacks.length > 0 ? (
          <Text style={[dl.sectionMeta, { flex: 1 }]}>{installedPacks.length} packs · {totalInstalledMB.toFixed(1)} MB</Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {installedPacks.length > 0 && (
          <TouchableOpacity
            style={dl.removeAllBtn}
            onPress={() => installedPacks.forEach(p => uninstall(p.slug))}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={12} color={colors.accent} />
            <Text style={dl.downloadAllLabel}>Remove All</Text>
          </TouchableOpacity>
        )}
        {uninstalledPacks.length > 0 && (
          <TouchableOpacity
            style={dl.downloadAllBtn}
            onPress={() => uninstalledPacks.filter(p => !downloading.has(p.slug)).forEach(p => download(p.slug))}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-download-outline" size={12} color={colors.accent} />
            <Text style={dl.downloadAllLabel}>Download All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* All groups — installed and available together in manifest order */}
      {sections.map(({ title, data }) => {
        const groupInstalled = data.filter(p => installed.has(p.slug))
        const groupAvailable = data.filter(p => !installed.has(p.slug) && !downloading.has(p.slug))
        return (
          <View key={title}>
            <View style={dl.sectionHeader}>
              <Text style={[dl.sectionTitle, { flex: 1 }]}>{title.toUpperCase()}</Text>
              {groupInstalled.length > 0 && (
                <TouchableOpacity
                  style={dl.removeAllBtn}
                  onPress={() => groupInstalled.forEach(p => uninstall(p.slug))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={12} color={colors.accent} />
                  <Text style={dl.downloadAllLabel}>Remove</Text>
                </TouchableOpacity>
              )}
              {groupAvailable.length > 0 && (
                <TouchableOpacity
                  style={dl.downloadAllBtn}
                  onPress={() => groupAvailable.forEach(p => download(p.slug))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cloud-download-outline" size={12} color={colors.accent} />
                  <Text style={dl.downloadAllLabel}>All</Text>
                </TouchableOpacity>
              )}
            </View>
            {data.map(p => (
              <PackRow key={p.slug} pack={p} isInstalled={installed.has(p.slug)} {...rowProps} />
            ))}
          </View>
        )
      })}

      {installedPacks.length === allPacks.length && (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>All packs installed</Text>
        </View>
      )}
    </ScrollView>
  )
}

// Styles for downloads tab (inline to avoid makeStyles clutter)
const dl = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.8 },
  sectionMeta:   { fontSize: 11, color: '#888' },
  row:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' },
  packName:      { fontSize: 14, fontWeight: '600', color: '#fff' },
  downloadBtn:   { padding: 4 },
  downloadAllBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(184,134,11,0.5)' },
  removeAllBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(184,134,11,0.3)', marginRight: 6 },
  downloadAllLabel: { fontSize: 11, color: '#b8860b', fontWeight: '600' },
  updateBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#b8860b' },
  updateLabel:   { fontSize: 12, color: '#fff', fontWeight: '600' },
  uninstallBtn:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  uninstallLabel:{ fontSize: 12, color: '#888' },
})

// ── Main screen ───────────────────────────────────────────

const TABS: { key: LibraryTab; label: string }[] = [
  { key: 'plans', label: 'Plans' },
  { key: 'bookmarks', label: 'Bookmarks' },
  { key: 'highlights', label: 'Highlights' },
  { key: 'notes', label: 'Notes' },
  { key: 'history', label: 'History' },
  { key: 'downloads', label: 'Downloads' },
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabBar}
        contentContainerStyle={{ flexDirection: 'row' }}
        alwaysBounceVertical={false}
      >
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
      </ScrollView>

      {/* Content */}
      <View style={s.content}>
        {activeTab === 'plans'      && <ReadingPlanScreen />}
        {activeTab === 'bookmarks'  && <BookmarksTab />}
        {activeTab === 'highlights' && <HighlightsTab />}
        {activeTab === 'notes'      && <NotesTab />}
        {activeTab === 'history'    && <HistoryTab />}
        {activeTab === 'downloads'  && <DownloadsTab />}
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
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: c.bgSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  tab: {
    paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
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
    backgroundColor: c.bgPrimary,
  },
  rowActive: { backgroundColor: c.bgCard, opacity: 0.6 },
  rowDropTarget: { borderTopWidth: 2, borderTopColor: c.accent },
  dragHandle: { marginRight: 8, paddingHorizontal: 4 },
  rowPressable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
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
