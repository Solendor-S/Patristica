import React, { useEffect, useMemo, useState } from 'react'
import {
  Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import { useUserDb } from '../db/UserDbProvider'
import Constants from 'expo-constants'
import { loadChangelog, releasesFor } from '../lib/Changelog'
import type { Release } from '../lib/Changelog'

interface Props {
  visible: boolean
  onClose: () => void
  /** Show only this release id — used by the one-time "What's new" notice. */
  onlyVersion?: string
  /** Preloaded release, so the notice doesn't refetch what the gate already has. */
  release?: Release
}

export default function ChangelogModal({ visible, onClose, onlyVersion, release }: Props) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const db = useUserDb()

  const [releases, setReleases] = useState<Release[] | null>(release ? [release] : null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!visible || release) return
    let cancelled = false
    setLoading(true)
    setFailed(false)
    loadChangelog(db)
      .then(log => {
        if (cancelled) return
        if (!log) { setFailed(true); setReleases(null) }
        else {
          // never show notes for a release this install doesn't have
          const mine = releasesFor(log.releases, Constants.expoConfig?.version ?? '')
          setReleases(onlyVersion ? mine.filter(r => r.id === onlyVersion) : mine)
        }
        setLoading(false)
      })
      .catch(() => { if (!cancelled) { setFailed(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [visible, db, onlyVersion, release])

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>{onlyVersion ? "What's new" : 'Changelog'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.center}><ActivityIndicator color={colors.accent} /></View>
          ) : failed || !releases?.length ? (
            <View style={s.center}>
              <Ionicons name="cloud-offline-outline" size={44} color={colors.border} />
              <Text style={s.emptyText}>
                Release notes could not be loaded. Reconnect and try again.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={s.body}>
              {releases.map(r => (
                <View key={r.id} style={s.release}>
                  <View style={s.releaseHead}>
                    <Text style={s.version}>Version {r.version}</Text>
                    {!!r.label && <Text style={s.label}>{r.label}</Text>}
                    <Text style={s.date}>{r.date}</Text>
                  </View>
                  {!!r.title && <Text style={s.releaseTitle}>{r.title}</Text>}
                  {r.changes.map((c, i) => (
                    <View key={i} style={s.bulletRow}>
                      <Text style={s.bullet}>•</Text>
                      <Text style={s.change}>{c}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.bgSecondary,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      maxHeight: '85%',
      paddingBottom: 28,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    center: { padding: 40, alignItems: 'center', gap: 12 },
    emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
    body: { padding: 20, gap: 22 },
    release: { gap: 6 },
    releaseHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
    version: { fontSize: 16, fontWeight: '700', color: colors.accent },
    date: { fontSize: 12, color: colors.textMuted },
    label: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.bgPrimary,
      backgroundColor: colors.accent,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      overflow: 'hidden',
    },
    releaseTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    bulletRow: { flexDirection: 'row', gap: 8, paddingRight: 6 },
    bullet: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    change: { flex: 1, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  })
}
