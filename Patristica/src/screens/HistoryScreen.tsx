import React, { useCallback, useMemo, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native'
import { useUserDb } from '../db/UserDbProvider'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { getHistory, clearHistory } from '../db/queries'
import type { HistoryEntry } from '../db/queries'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { RootTabParamList } from '../types'
import { formatRelative } from '../utils/formatDate'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Library'>

export default function HistoryScreen() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  const db = useUserDb()
  const navigation = useNavigation<NavProp>()
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useFocusEffect(
    useCallback(() => {
      getHistory(db).then(setEntries)
    }, [db])
  )

  const handleNavigate = (e: HistoryEntry) => {
    navigation.navigate('Bible' as any, {
      screen: 'Reader',
      params: { book: e.book, chapter: e.chapter },
    })
  }

  const handleClear = () => {
    Alert.alert(
      'Clear history',
      'Remove all reading history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive',
          onPress: async () => {
            await clearHistory(db)
            setEntries([])
          },
        },
      ]
    )
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>History</Text>
        {entries.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={s.clearBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            <Text style={s.clearLabel}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={entries}
        keyExtractor={e => `${e.book}-${e.chapter}`}
        contentContainerStyle={entries.length === 0 ? s.emptyContainer : s.list}
        renderItem={({ item, index }) => {
          const prevEntry = entries[index - 1]
          const thisDay  = new Date(item.visitedAt).toDateString()
          const prevDay  = prevEntry ? new Date(prevEntry.visitedAt).toDateString() : null
          const showDay  = thisDay !== prevDay

          return (
            <>
              {showDay && (
                <Text style={s.dayHeader}>
                  {new Date(item.visitedAt).toLocaleDateString('en-AU', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </Text>
              )}
              <TouchableOpacity
                style={s.row}
                onPress={() => handleNavigate(item)}
                activeOpacity={0.7}
              >
                <View style={s.iconWrap}>
                  <Ionicons name="book-outline" size={18} color={colors.accent} />
                </View>
                <View style={s.rowBody}>
                  <Text style={s.ref}>{item.book} {item.chapter}</Text>
                </View>
                <Text style={s.time}>{formatRelative(item.visitedAt)}</Text>
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
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  title:    { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clearLabel: { fontSize: 13, color: c.textMuted, fontWeight: '600' },

  list:           { paddingBottom: 40 },
  emptyContainer: { flex: 1 },

  dayHeader: {
    fontSize: 12, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: c.accentDim,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  rowBody: { flex: 1 },
  ref:     { fontSize: 16, fontWeight: '600', color: c.textPrimary },
  time:    { fontSize: 12, color: c.textMuted },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 100, gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.textSecondary },
  emptyText:  { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingHorizontal: 40 },
})
