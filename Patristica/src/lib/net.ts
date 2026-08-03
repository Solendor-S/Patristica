/**
 * fetch with a timeout.
 *
 * Uses AbortController + setTimeout deliberately: React Native's Hermes runtime
 * polyfills AbortController but NOT the static `AbortSignal.timeout()` helper, so
 * calling that throws a TypeError which a surrounding try/catch silently turns
 * into "offline". Do not "modernise" this back to AbortSignal.timeout().
 */
export async function fetchWithTimeout(url: string, ms = 8000): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { signal: controller.signal })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
