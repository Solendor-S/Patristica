import React, { useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { BOOK_MAP, APOCRYPHA_BOOKS } from '../data/books'
import { useTheme } from '../context/ThemeContext'
import { useNavDepth } from '../context/NavDepthContext'
import type { ThemeColors } from '../theme/themes'
import type { BibleStackParamList } from '../types'

type Props = {
  navigation: NativeStackNavigationProp<BibleStackParamList, 'ChapterPicker'>
  route: RouteProp<BibleStackParamList, 'ChapterPicker'>
}

const COLS = 5

export default function ChapterPickerScreen({ navigation, route }: Props) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const { navDepth } = useNavDepth()

  const { book, apocrypha } = route.params
  const chapterCount = apocrypha
    ? (APOCRYPHA_BOOKS.find(b => b.name === book)?.chapters ?? 1)
    : (BOOK_MAP[book]?.chapters ?? 1)
  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1)
  const remainder = chapters.length % COLS
  const data: (number | null)[] = remainder === 0
    ? chapters
    : [...chapters, ...Array<null>(COLS - remainder).fill(null)]

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.title}>{book}</Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item, i) => item?.toString() ?? `spacer-${i}`}
        numColumns={COLS}
        contentContainerStyle={s.grid}
        renderItem={({ item }) =>
          item === null
            ? <View style={[s.cell, s.cellSpacer]} />
            : (
              <TouchableOpacity
                style={s.cell}
                activeOpacity={0.7}
                onPress={() =>
                  navDepth === 'verse'
                    ? navigation.navigate('VersePicker', { book, chapter: item, apocrypha })
                    : navigation.navigate('Reader', { book, chapter: item, apocrypha })
                }
              >
                <Text style={s.cellText}>{item}</Text>
              </TouchableOpacity>
            )
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
    backgroundColor: c.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 18, color: c.textMuted },
  title: { fontSize: 17, fontWeight: '700', color: c.textPrimary },

  grid: { padding: 12 },
  cell: {
    flex: 1,
    margin: 5,
    aspectRatio: 1,
    backgroundColor: c.bgTertiary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  cellSpacer: { backgroundColor: 'transparent', borderColor: 'transparent' },
  cellText: { fontSize: 16, fontWeight: '600', color: c.textPrimary },
})
