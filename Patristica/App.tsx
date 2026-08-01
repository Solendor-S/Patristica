import 'react-native-gesture-handler'
import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
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
import { FontFamilyProvider } from './src/context/FontFamilyContext'
import { NavDepthProvider } from './src/context/NavDepthContext'
import { StartupModeProvider } from './src/context/StartupModeContext'
import { SelectedVerseProvider } from './src/context/SelectedVerseContext'
import { TranslationProvider } from './src/context/TranslationContext'
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext'
import { RedLetterProvider } from './src/context/RedLetterContext'
import { StrongsInSearchProvider } from './src/context/StrongsInSearchContext'
import { FocusModeProvider } from './src/context/FocusModeContext'
import { ReadingModeProvider } from './src/context/ReadingModeContext'
import { OtQuoteCapsProvider } from './src/context/OtQuoteCapsContext'
import { ReadingPlanProvider } from './src/context/ReadingPlanContext'
import { WordFocusProvider } from './src/context/WordFocusContext'
import { PackProvider } from './src/context/PackContext'
import { TabletLayoutProvider } from './src/context/TabletLayoutContext'
import { ParallelTranslationProvider } from './src/context/ParallelTranslationContext'
import { SpaceSaverProvider } from './src/context/SpaceSaverContext'
import { SearchOrderProvider } from './src/context/SearchOrderContext'
import { CrossRefOrderProvider } from './src/context/CrossRefOrderContext'
import { NotificationProvider } from './src/context/NotificationContext'
import { EsvKeyProvider } from './src/context/EsvKeyContext'
import { openPassage } from './src/navigation/navigationRef'
import TutorialModal from './src/components/TutorialModal'
import { Colors } from './src/theme/colors'

// A notification tap opens the reader at the passage carried in its data.
function useNotificationTap() {
  useEffect(() => {
    function open(data: unknown) {
      const d = data as { book?: string; chapter?: number; verse?: number } | undefined
      if (d?.book && typeof d.chapter === 'number') openPassage(d.book, d.chapter, d.verse)
    }
    // App already running / backgrounded:
    const sub = Notifications.addNotificationResponseReceivedListener(r =>
      open(r.notification.request.content.data)
    )
    // Cold start from a notification tap:
    Notifications.getLastNotificationResponseAsync()
      .then(r => { if (r) open(r.notification.request.content.data) })
      .catch(() => {})
    return () => sub.remove()
  }, [])
}

function AppShell() {
  const { colors } = useTheme()
  const { showTutorial, onTourComplete, onTourDecline } = useOnboarding()
  useNotificationTap()
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
          <FontFamilyProvider>
          <NavDepthProvider>
          <StartupModeProvider>
          <SelectedVerseProvider>
          <TranslationProvider>
          <RedLetterProvider>
          <StrongsInSearchProvider>
          <FocusModeProvider>
          <ReadingModeProvider>
          <OtQuoteCapsProvider>
          <PackProvider>
          <WordFocusProvider>
          <TabletLayoutProvider>
          <ParallelTranslationProvider>
          <SearchOrderProvider>
          <CrossRefOrderProvider>
          <SpaceSaverProvider>
          <ReadingPlanProvider>
          <NotificationProvider>
          <EsvKeyProvider>
          <OnboardingProvider>
            <DatabaseProvider>
              <AppShell />
            </DatabaseProvider>
          </OnboardingProvider>
          </EsvKeyProvider>
          </NotificationProvider>
          </ReadingPlanProvider>
          </SpaceSaverProvider>
          </CrossRefOrderProvider>
          </SearchOrderProvider>
          </ParallelTranslationProvider>
          </TabletLayoutProvider>
          </WordFocusProvider>
          </PackProvider>
          </OtQuoteCapsProvider>
          </ReadingModeProvider>
          </FocusModeProvider>
          </StrongsInSearchProvider>
          </RedLetterProvider>
          </TranslationProvider>
          </SelectedVerseProvider>
          </StartupModeProvider>
          </NavDepthProvider>
          </FontFamilyProvider>
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
