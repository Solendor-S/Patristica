import React, { Suspense } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { SQLiteProvider } from 'expo-sqlite'
import { Colors } from '../theme/colors'

function Loading() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.accent} />
      <Text style={styles.text}>Loading Bible database…</Text>
    </View>
  )
}

interface Props {
  children: React.ReactNode
}

export function DatabaseProvider({ children }: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider
        databaseName="bible.db"
        assetSource={{ assetId: require('../../assets/db/bible.db') }}
        useSuspense
      >
        {children}
      </SQLiteProvider>
    </Suspense>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    color: Colors.textMuted,
    fontSize: 14,
  },
})
