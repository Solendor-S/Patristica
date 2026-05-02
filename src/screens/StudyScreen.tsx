import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar, LayoutAnimation,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { getCommentary } from '../db/queries'
import { Colors } from '../theme/colors'
import type { CommentaryEntry } from '../types'

const PREVIEW_LEN = 320

function EntryCard({ entry }: { entry: CommentaryEntry }) {
  const [expanded, setExpanded] = useState(false)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(e => !e)
  }

  const hasMore = entry.full_text.length > entry.excerpt.length
  const body = expanded ? entry.full_text : entry.excerpt

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.fatherInfo}>
          <Text style={styles.fatherName}>{entry.father_name}</Text>
          {!!entry.father_era && (
            <Text style={styles.fatherEra}>{entry.father_era}</Text>
          )}
        </View>
      </View>

      <Text style={styles.cardText}>{body}</Text>

      {!!entry.source && (
        <Text style={styles.source}>{entry.source}</Text>
      )}

      {hasMore && (
        <TouchableOpacity style={styles.expandBtn} onPress={toggle} activeOpacity={0.7}>
          <Text style={styles.expandLabel}>{expanded ? 'Show less' : 'Show more'}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={Colors.accent}
          />
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function StudyScreen() {
  const db = useSQLiteContext()
  const { selected } = useSelectedVerse()
  const [entries, setEntries] = useState<CommentaryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selected) { setEntries([]); return }
    setLoading(true)
    getCommentary(db, selected.book, selected.chapter, selected.verse)
      .then(rows => { setEntries(rows); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selected])

  const verseRef = selected
    ? `${selected.book} ${selected.chapter}:${selected.verse}`
    : null

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Church Fathers</Text>
          {verseRef && <Text style={styles.verseRef}>{verseRef}</Text>}
        </View>
        {!loading && entries.length > 0 && (
          <Text style={styles.entryCount}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text>
        )}
      </View>

      {/* No verse selected */}
      {!selected && (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={52} color={Colors.border} />
          <Text style={styles.emptyTitle}>No verse selected</Text>
          <Text style={styles.emptyText}>Tap a verse in the Bible tab to see what the Church Fathers wrote about it</Text>
        </View>
      )}

      {/* Loading */}
      {selected && loading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      )}

      {/* No commentary */}
      {selected && !loading && entries.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="chatbubble-ellipses-outline" size={52} color={Colors.border} />
          <Text style={styles.emptyTitle}>No commentary found</Text>
          <Text style={styles.emptyText}>No patristic commentary is recorded for {verseRef}</Text>
        </View>
      )}

      {/* Commentary list */}
      {!loading && entries.length > 0 && (
        <FlatList
          data={entries}
          keyExtractor={e => e.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <EntryCard entry={item} />}
        />
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
  entryCount: { fontSize: 12, color: Colors.textMuted, fontWeight: '600',
                textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },

  list: { padding: 12, paddingBottom: 40, gap: 10 },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  fatherInfo: { flex: 1 },
  fatherName: { fontSize: 15, fontWeight: '700', color: Colors.textAccent },
  fatherEra:  { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  cardText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  source: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },

  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  expandLabel: { fontSize: 13, color: Colors.accent, fontWeight: '600' },

  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  emptyText:  { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
})
