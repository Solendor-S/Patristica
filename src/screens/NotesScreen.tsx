import React, { useCallback, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { getAllNotes, deleteNote } from '../db/queries'
import type { NoteWithVerse } from '../db/queries'
import { Colors } from '../theme/colors'
import type { RootTabParamList } from '../types'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Notes'>

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NotesScreen() {
  const db = useSQLiteContext()
  const navigation = useNavigation<NavProp>()
  const [notes, setNotes] = useState<NoteWithVerse[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      getAllNotes(db).then(setNotes)
    }, [db])
  )

  const noteKey = (n: NoteWithVerse) => `${n.book}-${n.chapter}-${n.verse}`

  const handleDelete = (n: NoteWithVerse) => {
    Alert.alert(
      'Delete note',
      `Delete note for ${n.book} ${n.chapter}:${n.verse}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteNote(db, n.book, n.chapter, n.verse)
            setNotes(prev => prev.filter(x => noteKey(x) !== noteKey(n)))
          },
        },
      ]
    )
  }

  const handleNavigate = (n: NoteWithVerse) => {
    navigation.navigate('Bible' as any, {
      screen: 'Reader',
      params: { book: n.book, chapter: n.chapter, verse: n.verse },
    })
  }

  const toggleExpand = (key: string) => {
    setExpanded(prev => (prev === key ? null : key))
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notes</Text>
        {notes.length > 0 && (
          <Text style={styles.count}>{notes.length}</Text>
        )}
      </View>

      <FlatList
        data={notes}
        keyExtractor={noteKey}
        contentContainerStyle={notes.length === 0 ? styles.emptyContainer : styles.list}
        renderItem={({ item }) => {
          const key = noteKey(item)
          const isExpanded = expanded === key
          const longNote = item.noteText.length > 160

          return (
            <View style={styles.card}>
              {/* Card header: ref + date + delete */}
              <View style={styles.cardHeader}>
                <TouchableOpacity onPress={() => handleNavigate(item)} activeOpacity={0.7}>
                  <Text style={styles.ref}>{item.book} {item.chapter}:{item.verse}</Text>
                </TouchableOpacity>
                <View style={styles.cardHeaderRight}>
                  <Text style={styles.date}>{formatDate(item.updatedAt)}</Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Verse text */}
              {!!item.verseText && (
                <Text style={styles.verseText} numberOfLines={2}>"{item.verseText}"</Text>
              )}

              {/* Note text */}
              <Text
                style={styles.noteText}
                numberOfLines={isExpanded ? undefined : 4}
              >
                {item.noteText}
              </Text>

              {/* Expand / collapse if long */}
              {longNote && (
                <TouchableOpacity onPress={() => toggleExpand(key)} activeOpacity={0.7} style={styles.expandBtn}>
                  <Text style={styles.expandLabel}>{isExpanded ? 'Show less' : 'Show more'}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color={Colors.accent}
                  />
                </TouchableOpacity>
              )}

              {/* Navigate arrow */}
              <TouchableOpacity onPress={() => handleNavigate(item)} activeOpacity={0.7} style={styles.goBtn}>
                <Ionicons name="arrow-forward" size={13} color={Colors.accent} />
                <Text style={styles.goLabel}>Go to verse</Text>
              </TouchableOpacity>
            </View>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pencil-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptyText}>
              Tap a verse in the reader, go to the Study tab, then open Notes
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  count: {
    fontSize: 12, fontWeight: '700', color: Colors.bgPrimary,
    backgroundColor: Colors.accent, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },

  list:           { padding: 12, gap: 10, paddingBottom: 40 },
  emptyContainer: { flex: 1 },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ref:  { fontSize: 15, fontWeight: '700', color: Colors.textAccent },
  date: { fontSize: 11, color: Colors.textMuted },

  verseText: {
    fontSize: 13, lineHeight: 20,
    color: Colors.textMuted, fontStyle: 'italic',
  },
  noteText: {
    fontSize: 15, lineHeight: 24,
    color: Colors.textPrimary,
  },

  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  expandLabel: { fontSize: 13, color: Colors.accent, fontWeight: '600' },

  goBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  goLabel: { fontSize: 12, color: Colors.accent, fontWeight: '600' },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 100, gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary },
  emptyText:  { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
})
