import { loadMapSync, saveMap } from './persist'

type Entry = { code: string; expiresAt: number }

const FILE = '.data/otps.json'
const g = global as typeof global & { _otps?: Map<string, Entry> }
const loaded = loadMapSync<Entry>(FILE)
const store: Map<string, Entry> = g._otps ?? (g._otps = loaded)

/** Generate and store a 6-digit OTP for the given email (10-min TTL). */
export function generateOtp(email: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  store.set(email.toLowerCase(), { code, expiresAt: Date.now() + 10 * 60 * 1000 })
  // persist (fire-and-forget)
  saveMap(FILE, store).catch(() => {})
  return code
}

/**
 * Verify the OTP. Returns true once and does NOT consume the code so
 * re-submissions work within the 10-minute window.
 */
export function verifyOtp(email: string, code: string): boolean {
  const key = email.toLowerCase()
  const entry = store.get(key)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) { store.delete(key); saveMap(FILE, store).catch(() => {}); return false }
  return entry.code === code
}

/** Call after successful account creation to clean up. */
export function consumeOtp(email: string): void {
  store.delete(email.toLowerCase())
  saveMap(FILE, store).catch(() => {})
}
