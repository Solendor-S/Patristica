import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../theme/colors'
import { Typography } from '../theme/typography'

export default function BibleScreen() {
  return (
    <View style={styles.container}>
      <Text style={Typography.heading2}>Bible Reader</Text>
      <Text style={[Typography.bodySmall, { marginTop: 8 }]}>Coming soon</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
