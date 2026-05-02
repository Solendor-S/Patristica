import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'

import BibleNavigator from './BibleNavigator'
import SearchScreen from '../screens/SearchScreen'
import StudyScreen from '../screens/StudyScreen'
import BookmarksScreen from '../screens/BookmarksScreen'
import { Colors } from '../theme/colors'
import type { RootTabParamList } from '../types'

const Tab = createBottomTabNavigator<RootTabParamList>()

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const TAB_ICONS: Record<keyof RootTabParamList, { active: IoniconsName; inactive: IoniconsName }> = {
  Bible:     { active: 'book',          inactive: 'book-outline' },
  Search:    { active: 'search',        inactive: 'search-outline' },
  Study:     { active: 'library',       inactive: 'library-outline' },
  Bookmarks: { active: 'bookmark',      inactive: 'bookmark-outline' },
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ focused, color, size }) => {
            const icons = TAB_ICONS[route.name as keyof RootTabParamList]
            const name = focused ? icons.active : icons.inactive
            return <Ionicons name={name} size={size} color={color} />
          },
        })}
      >
        <Tab.Screen name="Bible"     component={BibleNavigator} />
        <Tab.Screen name="Search"    component={SearchScreen} />
        <Tab.Screen name="Study"     component={StudyScreen} />
        <Tab.Screen name="Bookmarks" component={BookmarksScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bgSecondary,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 60,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
})
