import React from 'react'
import { View, Text, type TextStyle } from 'react-native'

/**
 * Renders the light markup used by the lexicons pack (scripts/lexicons/):
 *   lines split on "\n", leading "\t"s = indent level, ⟪bold⟫, ⟦Book C:V|label⟧ verse links.
 * The delimiters never occur in the sources (Abbott-Smith uses * and [ ] itself).
 */

export interface MarkupRef { book: string; chapter: number; verse: number }

const TOKEN_RE = /(⟪[^⟫]*⟫|⟦[^|⟧]+\|[^⟧]*⟧)/
const LINK_RE = /^⟦(.+) (\d+):(\d+)\|([^⟧]*)⟧$/

function parseLink(tok: string): (MarkupRef & { label: string }) | null {
  const m = tok.match(LINK_RE)
  return m ? { book: m[1], chapter: +m[2], verse: +m[3], label: m[4] } : null
}

const same = (a: MarkupRef, b: MarkupRef | null | undefined) =>
  !!b && a.book === b.book && a.chapter === b.chapter && a.verse === b.verse

/** Does the markup link to this verse? (drives the "jump to verse" button) */
export function markupMentions(text: string, ref: MarkupRef | null): boolean {
  if (!ref) return false
  return text.split(TOKEN_RE).some(tok => { const l = parseLink(tok); return !!l && same(l, ref) })
}

interface Props {
  text: string
  styles: { body: TextStyle; bold: TextStyle; link: TextStyle; current: TextStyle; selected: TextStyle }
  current?: MarkupRef | null        // highlighted (the verse being studied)
  selected?: MarkupRef | null       // last tapped link
  onRefPress?: (ref: MarkupRef) => void
  /** Attached to the line holding the first link to `current`, for scroll-to. */
  firstMatchRef?: React.RefObject<View | null>
  indent?: number
}

export default function LexiconMarkup({ text, styles, current, selected, onRefPress, firstMatchRef, indent = 14 }: Props) {
  let matched = false
  return (
    <>
      {text.split('\n').map((raw, li) => {
        const level = raw.match(/^\t*/)![0].length
        const line = raw.slice(level)
        let lineHasMatch = false
        const parts = line.split(TOKEN_RE).filter(Boolean).map((tok, i) => {
          if (tok.startsWith('⟪')) return <Text key={i} style={styles.bold}>{tok.slice(1, -1)}</Text>
          const link = parseLink(tok)
          if (!link) return tok
          const isCurrent = same(link, current)
          if (isCurrent && !matched) { matched = true; lineHasMatch = true }
          return (
            <Text
              key={i}
              style={[styles.link, isCurrent && styles.current, same(link, selected) && styles.selected]}
              onPress={onRefPress ? () => onRefPress(link) : undefined}
            >
              {link.label}
            </Text>
          )
        })
        return (
          <View key={li} ref={lineHasMatch ? firstMatchRef : undefined} style={{ paddingLeft: level * indent }}>
            <Text style={styles.body}>{parts}</Text>
          </View>
        )
      })}
    </>
  )
}
