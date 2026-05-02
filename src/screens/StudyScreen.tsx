import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Alert,
  StyleSheet, ActivityIndicator, StatusBar, LayoutAnimation, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { getCommentary, getCrossRefs, getNote, saveNote, deleteNote } from '../db/queries'
import { getFatherInfo } from '../data/fatherDates'
import { Colors } from '../theme/colors'
import type { CommentaryEntry, CrossRef, Note, RootTabParamList } from '../types'

type StudyTab = 'fathers' | 'crossrefs' | 'notes'
type NavProp = BottomTabNavigationProp<RootTabParamList, 'Study'>

// ── Entry card ────────────────────────────────────────────

function EntryCard({ entry }: { entry: CommentaryEntry }) {
  const [expanded, setExpanded] = useState(false)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(e => !e)
  }

  const hasMore = entry.full_text.length > entry.excerpt.length
  const body = expanded ? entry.full_text : entry.excerpt
  const info = getFatherInfo(entry.father_name)
  const dateLabel = info?.dates ?? entry.father_era

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.fatherInfo}>
          <Text style={styles.fatherName}>{entry.father_name}</Text>
          {!!dateLabel && <Text style={styles.fatherEra}>{dateLabel}</Text>}
        </View>
      </View>

      <Text style={styles.cardText}>{body}</Text>

      {!!entry.source && <Text style={styles.source}>{entry.source}</Text>}

      {hasMore && (
        <TouchableOpacity style={styles.expandBtn} onPress={toggle} activeOpacity={0.7}>
          <Text style={styles.expandLabel}>{expanded ? 'Show less' : 'Show more'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Cross-ref card ────────────────────────────────────────

function CrossRefCard({ item, onPress }: { item: CrossRef; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.crossRefLabel}>
        {item.ref_book} {item.ref_chapter}:{item.ref_verse}
      </Text>
      {!!item.text && <Text style={styles.crossRefText}>{item.text}</Text>}
      <View style={styles.crossRefArrow}>
        <Ionicons name="arrow-forward" size={13} color={Colors.accent} />
        <Text style={styles.crossRefGo}>Go to verse</Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Notes panel ───────────────────────────────────────────

function NotesPanel({ book, chapter, verse }: { book: string; chapter: number; verse: number }) {
  const db = useSQLiteContext()
  const [text, setText] = useState('')
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoading(true)
    getNote(db, book, chapter, verse).then(note => {
      const t = note?.text ?? ''
      setText(t)
      setSaved(t)
      setLoading(false)
    })
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [book, chapter, verse])

  const handleChange = (val: string) => {
    setText(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (val.trim()) {
        await saveNote(db, book, chapter, verse, val)
      } else {
        await deleteNote(db, book, chapter, verse)
      }
      setSaved(val)
    }, 800)
  }

  const handleDelete = () => {
    if (!saved.trim()) return
    Alert.alert('Delete note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteNote(db, book, chapter, verse)
          setText('')
          setSaved('')
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={noteStyles.center}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    )
  }

  const isDirty = text !== saved

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={120}
    >
      <View style={noteStyles.container}>
        <View style={noteStyles.toolbar}>
          <Text style={noteStyles.hint}>
            {isDirty ? 'Saving…' : saved.trim() ? 'Saved' : 'Start typing to add a note'}
          </Text>
          {!!saved.trim() && (
            <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={noteStyles.input}
          value={text}
          onChangeText={handleChange}
          multiline
          placeholder="Your notes on this verse…"
          placeholderTextColor={Colors.textMuted}
          textAlignVertical="top"
          autoCorrect
        />
      </View>
    </KeyboardAvoidingView>
  )
}

// ── Main screen ───────────────────────────────────────────

export default function StudyScreen() {
  const db = useSQLiteContext()
  const { selected } = useSelectedVerse()
  const navigation = useNavigation<NavProp>()

  const [activeTab, setActiveTab] = useState<StudyTab>('fathers')
  const [entries, setEntries] = useState<CommentaryEntry[]>([])
  const [crossRefs, setCrossRefs] = useState<CrossRef[]>([])
  const [hasNote, setHasNote] = useState(false)
  const [loadingFathers, setLoadingFathers] = useState(false)
  const [loadingRefs, setLoadingRefs] = useState(false)

  useEffect(() => {
    if (!selected) { setEntries([]); setCrossRefs([]); return }

    setLoadingFathers(true)
    getCommentary(db, selected.book, selected.chapter, selected.verse)
      .then(rows => {
        const sorted = [...rows].sort((a, b) => {
          const aSort = getFatherInfo(a.father_name)?.sort ?? 9999
          const bSort = getFatherInfo(b.father_name)?.sort ?? 9999
          return aSort - bSort
        })
        setEntries(sorted)
        setLoadingFathers(false)
      })
      .catch(() => setLoadingFathers(false))

    setLoadingRefs(true)
    getCrossRefs(db, selected.book, selected.chapter, selected.verse)
      .then(rows => { setCrossRefs(rows); setLoadingRefs(false) })
      .catch(() => setLoadingRefs(false))

    getNote(db, selected.book, selected.chapter, selected.verse)
      .then(note => setHasNote(!!note?.text?.trim()))
  }, [selected])

  const verseRef = selected
    ? `${selected.book} ${selected.chapter}:${selected.verse}`
    : null

  const goToVerse = (ref: CrossRef) => {
    navigation.navigate('Bible' as any, {
      screen: 'Reader',
      params: { book: ref.ref_book, chapter: ref.ref_chapter, verse: ref.ref_verse },
    })
  }

  const loading = activeTab === 'fathers' ? loadingFathers : loadingRefs
  const count = activeTab === 'fathers' ? entries.length : crossRefs.length

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Study</Text>
          {verseRef && <Text style={styles.verseRef}>{verseRef}</Text>}
        </View>
        {!loading && count > 0 && (
          <Text style={styles.entryCount}>{count} {count === 1 ? 'entry' : 'entries'}</Text>
        )}
      </View>

      {/* No verse selected */}
      {!selected && (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={52} color={Colors.border} />
          <Text style={styles.emptyTitle}>No verse selected</Text>
          <Text style={styles.emptyText}>Tap a verse in the Bible tab to study it</Text>
        </View>
      )}

      {selected && (
        <>
          {/* Tab bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'fathers' && styles.tabActive]}
              onPress={() => setActiveTab('fathers')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, activeTab === 'fathers' && styles.tabLabelActive]}>
                Church Fathers
              </Text>
              {entries.length > 0 && (
                <View style={[styles.tabBadge, activeTab === 'fathers' && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'fathers' && styles.tabBadgeTextActive]}>
                    {entries.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'crossrefs' && styles.tabActive]}
              onPress={() => setActiveTab('crossrefs')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, activeTab === 'crossrefs' && styles.tabLabelActive]}>
                Cross-Refs
              </Text>
              {crossRefs.length > 0 && (
                <View style={[styles.tabBadge, activeTab === 'crossrefs' && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'crossrefs' && styles.tabBadgeTextActive]}>
                    {crossRefs.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
              onPress={() => setActiveTab('notes')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, activeTab === 'notes' && styles.tabLabelActive]}>
                Notes
              </Text>
              {hasNote && (
                <View style={[styles.tabBadge, activeTab === 'notes' && styles.tabBadgeActive]}>
                  <Ionicons name="pencil" size={10} color={activeTab === 'notes' ? Colors.accent : Colors.textMuted} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Loading */}
          {loading && (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.accent} size="large" />
            </View>
          )}

          {/* Fathers list */}
          {!loading && activeTab === 'fathers' && (
            entries.length === 0 ? (
              <View style={styles.center}>
                <Ionicons name="chatbubble-ellipses-outline" size={52} color={Colors.border} />
                <Text style={styles.emptyTitle}>No commentary found</Text>
                <Text style={styles.emptyText}>No patristic commentary recorded for {verseRef}</Text>
              </View>
            ) : (
              <FlatList
                data={entries}
                keyExtractor={e => e.id.toString()}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => <EntryCard entry={item} />}
              />
            )
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
            <NotesPanel
              book={selected.book}
              chapter={selected.chapter}
              verse={selected.verse}
            />
          )}

          {/* Cross-refs list */}
          {!loading && activeTab === 'crossrefs' && (
            crossRefs.length === 0 ? (
              <View style={styles.center}>
                <Ionicons name="git-branch-outline" size={52} color={Colors.border} />
                <Text style={styles.emptyTitle}>No cross-references</Text>
                <Text style={styles.emptyText}>No cross-references recorded for {verseRef}</Text>
              </View>
            ) : (
              <FlatList
                data={crossRefs}
                keyExtractor={r => `${r.ref_book}-${r.ref_chapter}-${r.ref_verse}`}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                  <CrossRefCard item={item} onPress={() => goToVerse(item)} />
                )}
              />
            )
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title:      { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  verseRef:   { fontSize: 13, color: Colors.accent, fontWeight: '600', marginTop: 2 },
  entryCount: {
    fontSize: 12, color: Colors.textMuted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 6,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: Colors.accent },
  tabLabel:      { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabLabelActive:{ color: Colors.accent },
  tabBadge: {
    backgroundColor: Colors.bgTertiary, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  tabBadgeActive:    { backgroundColor: Colors.accentDim },
  tabBadgeText:      { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  tabBadgeTextActive:{ color: Colors.accent },

  list: { padding: 12, paddingBottom: 40, gap: 10 },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  fatherInfo: { flex: 1 },
  fatherName: { fontSize: 15, fontWeight: '700', color: Colors.textAccent },
  fatherEra:  { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  cardText: { fontSize: 15, lineHeight: 24, color: Colors.textPrimary },
  source:   { fontSize: 12, color: Colors.textMuted, marginTop: 8, fontStyle: 'italic' },

  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, alignSelf: 'flex-start',
  },
  expandLabel: { fontSize: 13, color: Colors.accent, fontWeight: '600' },

  crossRefLabel: { fontSize: 15, fontWeight: '700', color: Colors.textAccent, marginBottom: 6 },
  crossRefText:  { fontSize: 14, lineHeight: 22, color: Colors.textPrimary },
  crossRefArrow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, alignSelf: 'flex-end',
  },
  crossRefGo: { fontSize: 12, color: Colors.accent, fontWeight: '600' },

  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  emptyText:  { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
})

const noteStyles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: 12, gap: 8 },
  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 4,
  },
  hint: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
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
  },
})
