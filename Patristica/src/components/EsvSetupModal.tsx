import React, { useEffect, useMemo, useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, Linking, ActivityIndicator, StatusBar,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import { useEsvKey } from '../context/EsvKeyContext'
import { validateEsvKey, EsvError, ESV_COPYRIGHT, ESV_SIGNUP_URL } from '../lib/esv'
import type { ThemeColors } from '../theme/themes'

const ACCOUNT_URL = 'https://www.esv.org/create-account/'

const STEPS: { title: string; body: string; link?: { label: string; url: string } }[] = [
  {
    title: 'Create a free ESV.org account',
    body: 'Crossway gives the ESV text away for personal, non-commercial reading — but they ask each reader to sign up so usage stays tied to a person, not to an app. It takes about a minute and costs nothing.',
    link: { label: 'Open esv.org sign-up', url: ACCOUNT_URL },
  },
  {
    title: 'Create an API application',
    body: 'Once signed in, open the API page and click "Create an API application". Give it any name you like — "Patristica" works. Crossway will show you an access key: a long string of letters and numbers.',
    link: { label: 'Open the ESV API page', url: ESV_SIGNUP_URL },
  },
  {
    title: 'Copy the key and paste it below',
    body: 'Tap and hold the key on the ESV page to copy it, then come back here and paste it in. Patristica stores it only on this device and sends it only to Crossway.',
  },
]

interface Props {
  visible: boolean
  onClose: () => void
}

export default function EsvSetupModal({ visible, onClose }: Props) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const { esvKey, setEsvKey } = useEsvKey()

  const [draft, setDraft] = useState(esvKey)
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (visible) {
      setDraft(esvKey)
      setStatus(esvKey ? 'ok' : 'idle')
      setMessage(esvKey ? 'A key is saved on this device.' : '')
    }
  }, [visible, esvKey])

  const handleSave = async () => {
    // esv.org shows the key as "Authorization: Token abc123", so that whole line is
    // what most people paste. Strip the header wrapper rather than rejecting it.
    const key = draft.trim().replace(/^Authorization:\s*/i, '').replace(/^Token\s+/i, '').trim()
    if (!key) {
      // Empty means "forget my key" — save it so ESV cleanly reverts to unconfigured.
      setEsvKey('')
      setStatus('idle')
      setMessage('Key removed.')
      return
    }
    setStatus('testing')
    setMessage('')
    try {
      await validateEsvKey(key)
      setEsvKey(key)
      setStatus('ok')
      setMessage('Key works. The ESV is ready to read.')
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof EsvError ? e.message : 'Could not verify that key.')
    }
  }

  const statusColor =
    status === 'ok' ? colors.accent : status === 'error' ? '#e57373' : colors.textMuted

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.headerTitle}>Set up the ESV</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.intro}>
              The ESV is copyrighted, so unlike the other translations it can't be bundled into
              Patristica. Crossway lets you read it through their own service using a free personal
              key. Three steps, done once.
            </Text>

            {STEPS.map((step, i) => (
              <View key={step.title} style={s.step}>
                <View style={s.stepHead}>
                  <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
                  <Text style={s.stepTitle}>{step.title}</Text>
                </View>
                <Text style={s.stepBody}>{step.body}</Text>
                {!!step.link && (
                  <TouchableOpacity
                    style={s.linkBtn}
                    activeOpacity={0.7}
                    onPress={() => Linking.openURL(step.link!.url)}
                  >
                    <Ionicons name="open-outline" size={15} color={colors.accent} />
                    <Text style={s.linkBtnText}>{step.link.label}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TextInput
              style={s.input}
              value={draft}
              onChangeText={t => { setDraft(t); setStatus('idle'); setMessage('') }}
              placeholder="Paste your ESV API key"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />

            <TouchableOpacity
              style={[s.primaryBtn, status === 'testing' && { opacity: 0.6 }]}
              activeOpacity={0.8}
              disabled={status === 'testing'}
              onPress={handleSave}
            >
              {status === 'testing'
                ? <ActivityIndicator color={colors.bgPrimary} size="small" />
                : <Text style={s.primaryBtnText}>{draft.trim() ? 'Save & test key' : 'Remove key'}</Text>}
            </TouchableOpacity>

            {!!message && (
              <View style={s.statusRow}>
                <Ionicons
                  name={status === 'ok' ? 'checkmark-circle' : status === 'error' ? 'alert-circle' : 'information-circle-outline'}
                  size={16}
                  color={statusColor}
                />
                <Text style={[s.statusText, { color: statusColor }]}>{message}</Text>
              </View>
            )}

            <Text style={s.fineprint}>{ESV_COPYRIGHT}</Text>
            <Text style={s.fineprint}>
              Crossway limits each key to 5,000 chapters a day — far more than normal reading. The
              ESV needs an internet connection; every other translation in Patristica works offline.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, height: '88%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: (StatusBar.currentHeight ?? 0) + 48 },
  intro: { fontSize: 14, lineHeight: 21, color: c.textSecondary, marginBottom: 20 },

  step: { marginBottom: 20 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  stepNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: c.accentDim,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 13, fontWeight: '700', color: c.accent },
  stepTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: c.textPrimary },
  stepBody: { fontSize: 13, lineHeight: 20, color: c.textMuted, paddingLeft: 34 },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, marginLeft: 34, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: c.accentDim,
  },
  linkBtnText: { fontSize: 13, fontWeight: '600', color: c.accent },

  input: {
    backgroundColor: c.bgTertiary,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: c.textPrimary, marginTop: 4,
  },
  primaryBtn: {
    marginTop: 12, paddingVertical: 14, borderRadius: 12,
    backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: c.bgPrimary },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  statusText: { flex: 1, fontSize: 13, lineHeight: 18 },

  fineprint: { fontSize: 11, lineHeight: 16, color: c.textMuted, marginTop: 18 },
})
