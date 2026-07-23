import * as StoreReview from 'expo-store-review'
import type { SQLiteDatabase } from 'expo-sqlite'

// In-app rating prompt. Fired at a success moment (after reading a few chapters),
// never on exit — Google's In-App Review API has no reliable exit hook and
// throttles the dialog anyway. We ask at most once (a settings flag), only once
// the user is genuinely engaged.
//
// Note: requestReview() is a *request*. Google decides whether to actually show
// the sheet (quota-limited) — there's no callback and no guarantee it appears.

const CHAPTERS_BEFORE_PROMPT = 10
const PROMPTED_KEY = 'review_prompted'

export async function maybeRequestReview(db: SQLiteDatabase): Promise<void> {
  try {
    // Cheapest gate first: already asked?
    const flag = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = '${PROMPTED_KEY}'`
    )
    if (flag?.value === '1') return

    const engaged = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM history'
    )
    if ((engaged?.n ?? 0) < CHAPTERS_BEFORE_PROMPT) return

    if (!(await StoreReview.isAvailableAsync())) return

    // Mark before requesting so a race can't double-prompt.
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('review_prompted', '1')"
    )
    await StoreReview.requestReview()
  } catch {
    /* never let a rating prompt break reading */
  }
}
