import React from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { BOOK_MAP } from '../data/books'
import { Colors } from '../theme/colors'
import type { BibleStackParamList } from '../types'

type Props = {
  navigation: NativeStackNavigationProp<BibleStackParamList, 'ChapterPicker'>
  route: RouteProp<BibleStackParamList, 'ChapterPicker'>
}

export default function ChapterPickerScreen({ navigation, route }: Props) {
  const { book } = route.params
  const chapterCount = BOOK_MAP[book]?.chapters ?? 1
  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{book}</Text>
      </View>

      <FlatList
        data={chapters}
        keyExtractor={n => n.toString()}
        numColumns={5}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.cell}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Reader', { book, chapter: item })}
          >
            <Text style={styles.cellText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 18, color: Colors.textMuted },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  grid: { padding: 12 },
  cell: {
    flex: 1,
    margin: 5,
    aspectRatio: 1,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  cellText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
})
