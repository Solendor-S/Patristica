import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { getBookmarks, removeBookmark } from '../db/queries'
import { Colors } from '../theme/colors'
import type { Bookmark, RootTabParamList } from '../types'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Bookmarks'>

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BookmarksScreen() {
  const db = useSQLiteContext()
  const navigation = useNavigation<NavProp>()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  // Reload whenever this tab is focused so changes from the reader are reflected
  useFocusEffect(
    useCallback(() => {
      getBookmarks(db).then(setBookmarks)
    }, [db])
  )

  const handleDelete = (b: Bookmark) => {
    Alert.alert(
      'Remove bookmark',
      `Remove ${b.book} ${b.chapter}:${b.verse}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await removeBookmark(db, b.book, b.chapter, b.verse)
            setBookmarks(prev => prev.filter(
              x => !(x.book === b.book && x.chapter === b.chapter && x.verse === b.verse)
            ))
          },
        },
      ]
    )
  }

  const handleNavigate = (b: Bookmark) => {
    navigation.navigate('Bible' as any, {
      screen: 'Reader',
      params: { book: b.book, chapter: b.chapter, verse: b.verse },
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookmarks</Text>
        {bookmarks.length > 0 && (
          <Text style={styles.count}>{bookmarks.length}</Text>
        )}
      </View>

      <FlatList
        data={bookmarks}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={bookmarks.length === 0 ? styles.emptyContainer : styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => handleNavigate(item)}
          >
            <Ionicons name="bookmark" size={18} color={Colors.accent} style={styles.icon} />
            <View style={styles.rowBody}>
              <Text style={styles.ref}>{item.book} {item.chapter}:{item.verse}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No bookmarks yet</Text>
            <Text style={styles.emptyText}>Tap a verse in the reader then press Bookmark</Text>
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

  list:           { paddingBottom: 40 },
  emptyContainer: { flex: 1 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  icon:    { marginRight: 12 },
  rowBody: { flex: 1 },
  ref:     { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  date:    { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: 4 },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 100, gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary },
  emptyText:  { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
})
