import React, { useState, useCallback, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native'
import { useUserDb } from '../db/UserDbProvider'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { getBookmarks, removeBookmark } from '../db/queries'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { Bookmark, RootTabParamList } from '../types'
import { formatDate } from '../utils/formatDate'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Bookmarks'>

export default function BookmarksScreen() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  const db = useUserDb()
  const navigation = useNavigation<NavProp>()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

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
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Bookmarks</Text>
        {bookmarks.length > 0 && (
          <Text style={s.count}>{bookmarks.length}</Text>
        )}
      </View>

      <FlatList
        data={bookmarks}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={bookmarks.length === 0 ? s.emptyContainer : s.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.row}
            activeOpacity={0.7}
            onPress={() => handleNavigate(item)}
          >
            <Ionicons name="bookmark" size={18} color={colors.accent} style={s.icon} />
            <View style={s.rowBody}>
              <Text style={s.ref}>{item.book} {item.chapter}:{item.verse}</Text>
              <Text style={s.date}>{formatDate(item.createdAt)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={s.deleteBtn}
            >
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

  list:           { paddingBottom: 40 },
  emptyContainer: { flex: 1 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  icon:    { marginRight: 12 },
  rowBody: { flex: 1 },
  ref:     { fontSize: 16, fontWeight: '600', color: c.textPrimary },
  date:    { fontSize: 12, color: c.textMuted, marginTop: 2 },
  deleteBtn: { padding: 4 },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 100, gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.textSecondary },
  emptyText:  { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingHorizontal: 40 },
})
