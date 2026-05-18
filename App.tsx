import 'react-native-gesture-handler'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StyleSheet, View, ActivityIndicator } from 'react-native'
import { useFonts } from 'expo-font'
import { Ionicons } from '@expo/vector-icons'
import AppNavigator from './src/navigation/AppNavigator'
import { DatabaseProvider } from './src/db/provider'
import { UserDbProvider } from './src/db/UserDbProvider'
import { ThemeProvider, useTheme } from './src/context/ThemeContext'
import { LineSpacingProvider } from './src/context/LineSpacingContext'
import { FontSizeProvider } from './src/context/FontSizeContext'
import { NavDepthProvider } from './src/context/NavDepthContext'
import { StartupModeProvider } from './src/context/StartupModeContext'
import { SelectedVerseProvider } from './src/context/SelectedVerseContext'
import { TranslationProvider } from './src/context/TranslationContext'
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext'
import { RedLetterProvider } from './src/context/RedLetterContext'
import TutorialModal from './src/components/TutorialModal'
import { Colors } from './src/theme/colors'

function AppShell() {
  const { colors } = useTheme()
  const { showTutorial, onTourComplete, onTourDecline } = useOnboarding()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <StatusBar
        style={colors.statusBarStyle}
        backgroundColor={colors.bgSecondary}
      />
      <AppNavigator />
      <TutorialModal
        visible={showTutorial}
        onComplete={onTourComplete}
        onDecline={onTourDecline}
      />
    </View>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts(Ionicons.font)

  if (!fontsLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <UserDbProvider>
          <ThemeProvider>
          <LineSpacingProvider>
          <FontSizeProvider>
          <NavDepthProvider>
          <StartupModeProvider>
          <SelectedVerseProvider>
          <TranslationProvider>
          <RedLetterProvider>
          <OnboardingProvider>
            <DatabaseProvider>
              <AppShell />
            </DatabaseProvider>
          </OnboardingProvider>
          </RedLetterProvider>
          </TranslationProvider>
          </SelectedVerseProvider>
          </StartupModeProvider>
          </NavDepthProvider>
          </FontSizeProvider>
          </LineSpacingProvider>
          </ThemeProvider>
        </UserDbProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bgPrimary },
  splash: { flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
})
