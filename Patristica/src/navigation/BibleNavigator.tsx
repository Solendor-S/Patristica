import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import ReaderScreen from '../screens/ReaderScreen'
import BookPickerScreen from '../screens/BookPickerScreen'
import ChapterPickerScreen from '../screens/ChapterPickerScreen'
import VersePickerScreen from '../screens/VersePickerScreen'
import { useStartupMode } from '../context/StartupModeContext'
import type { BibleStackParamList } from '../types'

const Stack = createNativeStackNavigator<BibleStackParamList>()

export default function BibleNavigator() {
  const { resolved, startBook, startChapter } = useStartupMode()

  if (!resolved) return null

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Reader"        component={ReaderScreen} initialParams={{ book: startBook, chapter: startChapter }} />
      <Stack.Screen name="BookPicker"    component={BookPickerScreen}    options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ChapterPicker" component={ChapterPickerScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="VersePicker"   component={VersePickerScreen}   options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  )
}
