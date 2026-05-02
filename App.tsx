import 'react-native-gesture-handler'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet } from 'react-native'
import AppNavigator from './src/navigation/AppNavigator'
import { DatabaseProvider } from './src/db/provider'
import { SelectedVerseProvider } from './src/context/SelectedVerseContext'
import { Colors } from './src/theme/colors'

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" backgroundColor={Colors.bgSecondary} />
      <DatabaseProvider>
        <SelectedVerseProvider>
          <AppNavigator />
        </SelectedVerseProvider>
      </DatabaseProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
})
