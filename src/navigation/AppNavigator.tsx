import React, { useMemo, useRef } from 'react'
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import BibleNavigator from './BibleNavigator'
import SearchScreen from '../screens/SearchScreen'
import StudyScreen from '../screens/StudyScreen'
import LibraryScreen from '../screens/LibraryScreen'
import SettingsScreen from '../screens/SettingsScreen'
import { useTheme } from '../context/ThemeContext'
import { useTabletLayout } from '../context/TabletLayoutContext'
import type { ThemeColors } from '../theme/themes'
import type { RootTabParamList } from '../types'

const StudySidebarStack = createNativeStackNavigator()

const Tab = createBottomTabNavigator<RootTabParamList>()

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const TAB_ICONS: Record<keyof RootTabParamList, { active: IoniconsName; inactive: IoniconsName }> = {
  Bible:    { active: 'book',        inactive: 'book-outline' },
  Search:   { active: 'search',      inactive: 'search-outline' },
  Study:    { active: 'library',     inactive: 'library-outline' },
  Library:  { active: 'folder-open', inactive: 'folder-open-outline' },
  Settings: { active: 'settings',    inactive: 'settings-outline' },
}

function TabNavigator({ hideStudyTab }: { hideStudyTab?: boolean }) {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  return (
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
      <Tab.Screen name="Study"    component={StudyScreen}
        options={hideStudyTab ? { tabBarButton: () => null } : undefined}
      />
      <Tab.Screen name="Library"  component={LibraryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const { colors } = useTheme()
  const { tabletLayout } = useTabletLayout()
  const { width, height } = useWindowDimensions()
  const showSplit = tabletLayout && width > height

  // Mount sidebar once it first becomes visible; keep it mounted so StudyScreen
  // doesn't remount (and re-fire DB queries) on every orientation flip.
  const sidebarEverMounted = useRef(false)
  if (showSplit) sidebarEverMounted.current = true

  return (
    <NavigationContainer>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: showSplit ? 0.55 : 1 }}>
          <TabNavigator hideStudyTab={showSplit} />
        </View>
        {sidebarEverMounted.current && (
          <View style={{ flex: 0.45, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border, display: showSplit ? 'flex' : 'none' }}>
            <NavigationIndependentTree>
              <NavigationContainer>
                <StudySidebarStack.Navigator screenOptions={{ headerShown: false }}>
                  <StudySidebarStack.Screen name="StudySidebar" component={StudyScreen} />
                </StudySidebarStack.Navigator>
              </NavigationContainer>
            </NavigationIndependentTree>
          </View>
        )}
      </View>
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
