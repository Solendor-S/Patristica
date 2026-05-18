import React, { useMemo } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import BibleNavigator from './BibleNavigator'
import SearchScreen from '../screens/SearchScreen'
import StudyScreen from '../screens/StudyScreen'
import LibraryScreen from '../screens/LibraryScreen'
import SettingsScreen from '../screens/SettingsScreen'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { RootTabParamList } from '../types'

const Tab = createBottomTabNavigator<RootTabParamList>()

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const TAB_ICONS: Record<keyof RootTabParamList, { active: IoniconsName; inactive: IoniconsName }> = {
  Bible:    { active: 'book',        inactive: 'book-outline' },
  Search:   { active: 'search',      inactive: 'search-outline' },
  Study:    { active: 'library',     inactive: 'library-outline' },
  Library:  { active: 'folder-open', inactive: 'folder-open-outline' },
  Settings: { active: 'settings',    inactive: 'settings-outline' },
}

export default function AppNavigator() {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: [s.tabBar, { paddingBottom: 8 + insets.bottom, height: 60 + insets.bottom }],
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: s.tabLabel,
          tabBarIcon: ({ focused, color, size }) => {
            const icons = TAB_ICONS[route.name as keyof RootTabParamList]
            const name = focused ? icons.active : icons.inactive
            return <Ionicons name={name} size={size} color={color} />
          },
        })}
      >
        <Tab.Screen name="Bible"    component={BibleNavigator} />
        <Tab.Screen name="Search"   component={SearchScreen} />
        <Tab.Screen name="Study"    component={StudyScreen} />
        <Tab.Screen name="Library"  component={LibraryScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  tabBar: {
    backgroundColor: c.bgSecondary,
    borderTopColor: c.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
})
