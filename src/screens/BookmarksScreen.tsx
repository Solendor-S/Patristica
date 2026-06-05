import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  View, Text, TouchableOpacity,
  StyleSheet, StatusBar, Alert, ScrollView, PanResponder,
} from 'react-native'
import { useUserDb } from '../db/UserDbProvider'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { getBookmarks, removeBookmark, updateBookmarkPositions } from '../db/queries'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { Bookmark, RootTabParamList } from '../types'
import { formatDate } from '../utils/formatDate'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Bookmarks'>

const ITEM_HEIGHT = 62

export default function BookmarksScreen() {
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

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Bookmarks</Text>
        {bookmarks.length > 0 && (
          <Text style={s.count}>{bookmarks.length}</Text>
        )}
      </View>

      {bookmarks.length === 0 ? (
        <View style={s.emptyContainer}>
          <View style={s.empty}>
            <Ionicons name="bookmark-outline" size={48} color={colors.border} />
            <Text style={s.emptyTitle}>No bookmarks yet</Text>
            <Text style={s.emptyText}>Tap a verse in the reader then press Bookmark</Text>
          </View>
        </View>
      ) : (
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
                <Ionicons name="bookmark" size={18} color={colors.accent} style={s.icon} />
                <View style={s.rowBody}>
                  <Text style={s.ref}>{item.book} {item.chapter}:{item.verse}</Text>
                  <Text style={s.date}>{formatDate(item.createdAt)}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={s.deleteBtn}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
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
    backgroundColor: c.bgPrimary,
  },
  rowActive: { backgroundColor: c.bgCard, opacity: 0.6 },
  rowDropTarget: { borderTopWidth: 2, borderTopColor: c.accent },
  dragHandle: { marginRight: 8, paddingHorizontal: 4 },
  rowPressable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
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
