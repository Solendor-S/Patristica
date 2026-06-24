import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import { Typography } from '../theme/typography'

export default function BibleScreen() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  return (
    <View style={s.container}>
      <Text style={Typography.heading2}>Bible Reader</Text>
      <Text style={[Typography.bodySmall, { marginTop: 8 }]}>Coming soon</Text>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
