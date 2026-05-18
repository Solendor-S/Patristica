import React, { useCallback, useState, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useUserDb } from '../db/UserDbProvider'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { getAllNotes, deleteNote } from '../db/queries'
import type { NoteWithVerse } from '../db/queries'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { RootTabParamList } from '../types'
import { formatDate } from '../utils/formatDate'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Notes'>

export default function NotesScreen() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  const bibleDb = useSQLiteContext()
  const db = useUserDb()
  const navigation = useNavigation<NavProp>()
  const [notes, setNotes] = useState<NoteWithVerse[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      getAllNotes(db, bibleDb).then(setNotes)
    }, [db, bibleDb])
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
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Notes</Text>
        {notes.length > 0 && (
          <Text style={s.count}>{notes.length}</Text>
        )}
      </View>

      <FlatList
        data={notes}
        keyExtractor={noteKey}
        contentContainerStyle={notes.length === 0 ? s.emptyContainer : s.list}
        renderItem={({ item }) => {
          const key = noteKey(item)
          const isExpanded = expanded === key
          const longNote = item.noteText.length > 160

          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <TouchableOpacity onPress={() => handleNavigate(item)} activeOpacity={0.7}>
                  <Text style={s.ref}>{item.book} {item.chapter}:{item.verse}</Text>
                </TouchableOpacity>
                <View style={s.cardHeaderRight}>
                  <Text style={s.date}>{formatDate(item.updatedAt)}</Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {!!item.verseText && (
                <Text style={s.verseText} numberOfLines={2}>"{item.verseText}"</Text>
              )}

              <Text style={s.noteText} numberOfLines={isExpanded ? undefined : 4}>
                {item.noteText}
              </Text>

              {longNote && (
                <TouchableOpacity onPress={() => toggleExpand(key)} activeOpacity={0.7} style={s.expandBtn}>
                  <Text style={s.expandLabel}>{isExpanded ? 'Show less' : 'Show more'}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color={colors.accent}
                  />
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
            <Text style={s.emptyText}>
              Tap a verse in the reader, go to the Study tab, then open Notes
            </Text>
          </View>
        }
      />
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  count: {
    fontSize: 12, fontWeight: '700', color: c.bgPrimary,
    backgroundColor: c.accent, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },

  list:           { padding: 12, gap: 10, paddingBottom: 40 },
  emptyContainer: { flex: 1 },

  card: {
    backgroundColor: c.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    gap: 8,
  },
  cardHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ref:  { fontSize: 15, fontWeight: '700', color: c.textAccent },
  date: { fontSize: 11, color: c.textMuted },

  verseText: { fontSize: 13, lineHeight: 20, color: c.textMuted, fontStyle: 'italic' },
  noteText:  { fontSize: 15, lineHeight: 24, color: c.textPrimary },

  expandBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  expandLabel: { fontSize: 13, color: c.accent, fontWeight: '600' },

  goBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  goLabel: { fontSize: 12, color: c.accent, fontWeight: '600' },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 100, gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.textSecondary },
  emptyText:  { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingHorizontal: 40 },
})
