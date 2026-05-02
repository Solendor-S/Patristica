import React, { useCallback, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { getHistory, clearHistory } from '../db/queries'
import type { HistoryEntry } from '../db/queries'
import { Colors } from '../theme/colors'
import type { RootTabParamList } from '../types'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'History'>

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7)   return `${days} days ago`
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function HistoryScreen() {
  const db = useSQLiteContext()
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        {entries.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.clearLabel}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={entries}
        keyExtractor={e => `${e.book}-${e.chapter}`}
        contentContainerStyle={entries.length === 0 ? styles.emptyContainer : styles.list}
        renderItem={({ item, index }) => {
          const prevEntry = entries[index - 1]
          const thisDay  = new Date(item.visitedAt).toDateString()
          const prevDay  = prevEntry ? new Date(prevEntry.visitedAt).toDateString() : null
          const showDay  = thisDay !== prevDay

          return (
            <>
              {showDay && (
                <Text style={styles.dayHeader}>
                  {new Date(item.visitedAt).toLocaleDateString('en-AU', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </Text>
              )}
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleNavigate(item)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="book-outline" size={18} color={Colors.accent} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.ref}>{item.book} {item.chapter}</Text>
                </View>
                <Text style={styles.time}>{formatRelative(item.visitedAt)}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>Chapters you read will appear here</Text>
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
    justifyContent: 'space-between',
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title:    { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clearLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },

  list:           { paddingBottom: 40 },
  emptyContainer: { flex: 1 },

  dayHeader: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: Colors.accentDim,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  rowBody: { flex: 1 },
  ref:     { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  time:    { fontSize: 12, color: Colors.textMuted },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 100, gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary },
  emptyText:  { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
})
