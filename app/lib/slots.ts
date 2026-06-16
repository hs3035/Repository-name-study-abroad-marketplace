import { zonedToUTC, utcToZoned } from './timezone'
import { loadMapSync, saveMap } from './persist'

// ── Time slot grid constants (used as labels in adviser's local timezone) ─────

export const TIME_SLOTS: string[] = Array.from({ length: 28 }, (_, i) => {
  const h = Math.floor(i / 2) + 8
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})
// ['08:00', '08:30', … '21:30']

// ── Types ─────────────────────────────────────────────────────────────────────

export type SlotStatus = 'available' | 'booked'

export type Slot = {
  id: string
  adviserId: string
  utcStart: string      // ISO 8601, e.g. "2025-10-07T13:00:00.000Z"
  price: number
  status: SlotStatus
  bookedBy?: string
  bookedByName?: string
  bookedAt?: string
}

export type SlotPublic = Omit<Slot, 'bookedBy'>

export const AVAILABILITY_GENERATION_DAYS = 365

// ── Store ─────────────────────────────────────────────────────────────────────

const SLOTS_FILE = '.data/slots.json'
const g = global as typeof global & { _slots?: Map<string, Slot> }
if (!g._slots) {
  const loaded = loadMapSync<Slot>(SLOTS_FILE)
  g._slots = loaded.size ? loaded : new Map()
}
const slots: Map<string, Slot> = g._slots

// ── Normalise UTC key ─────────────────────────────────────────────────────────

function norm(utcStart: string | undefined | null): string {
  if (!utcStart) throw new Error(`norm() received empty value: ${JSON.stringify(utcStart)}`)
  const ms = new Date(utcStart).getTime()
  if (isNaN(ms)) throw new Error(`norm() could not parse date: ${JSON.stringify(utcStart)}`)
  return new Date(Math.round(ms / 60000) * 60000).toISOString()
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function getAdviserSlots(adviserId: string, fromUTC: string, toUTC: string): Slot[] {
  const from = new Date(fromUTC).getTime()
  const to   = new Date(toUTC).getTime()
  return Array.from(slots.values())
    .filter(s => {
      const t = new Date(s.utcStart).getTime()
      return s.adviserId === adviserId && t >= from && t <= to
    })
    .sort((a, b) => a.utcStart.localeCompare(b.utcStart))
}

export function getAvailableSlots(adviserId: string): SlotPublic[] {
  const now = Date.now()
  return Array.from(slots.values())
    .filter(s => s.adviserId === adviserId && s.status === 'available' && new Date(s.utcStart).getTime() > now)
    .map(s => {
      const rest = { ...s }
      delete (rest as Partial<Slot>).bookedBy
      return rest
    })
    .sort((a, b) => a.utcStart.localeCompare(b.utcStart))
}

export function getApplicantBookings(applicantId: string): Slot[] {
  return Array.from(slots.values())
    .filter(s => s.bookedBy === applicantId)
    .sort((a, b) => a.utcStart.localeCompare(b.utcStart))
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export type ToggleResult = 'created' | 'removed' | 'booked'

export function toggleSlot(
  adviserId: string,
  utcStart: string,
  price: number,
): ToggleResult {
  const key = norm(utcStart)
  const existing = Array.from(slots.values()).find(
    s => s.adviserId === adviserId && norm(s.utcStart) === key,
  )
  if (existing) {
    if (existing.status === 'booked') return 'booked'
    slots.delete(existing.id)
    saveMap(SLOTS_FILE, slots).catch(() => {})
    return 'removed'
  }
  const slot: Slot = {
    id: crypto.randomUUID(),
    adviserId,
    utcStart: key,
    price,
    status: 'available',
  }
  slots.set(slot.id, slot)
  saveMap(SLOTS_FILE, slots).catch(() => {})
  return 'created'
}

/** Batch: open multiple slots at once. Skips ones that already exist. */
export function createSlots(adviserId: string, utcStarts: string[], price: number): void {
  for (const utcStart of utcStarts) {
    const key = norm(utcStart)
    const exists = Array.from(slots.values()).some(
      s => s.adviserId === adviserId && norm(s.utcStart) === key,
    )
    if (!exists) {
      const slot: Slot = { id: crypto.randomUUID(), adviserId, utcStart: key, price, status: 'available' }
      slots.set(slot.id, slot)
    }
  }
  saveMap(SLOTS_FILE, slots).catch(() => {})
}

/** Batch: close multiple slots. Returns list of UTC keys that were booked (skipped). */
export function removeSlots(adviserId: string, utcStarts: string[]): string[] {
  const booked: string[] = []
  for (const utcStart of utcStarts) {
    const key = norm(utcStart)
    const existing = Array.from(slots.values()).find(
      s => s.adviserId === adviserId && norm(s.utcStart) === key,
    )
    if (!existing) continue
    if (existing.status === 'booked') { booked.push(key); continue }
    slots.delete(existing.id)
  }
  saveMap(SLOTS_FILE, slots).catch(() => {})
  return booked
}

export function bookSlot(
  slotId: string,
  applicantId: string,
  applicantName: string,
): boolean {
  const slot = slots.get(slotId)
  if (!slot || slot.status !== 'available') return false
  slots.set(slotId, {
    ...slot,
    status: 'booked',
    bookedBy: applicantId,
    bookedByName: applicantName,
    bookedAt: new Date().toISOString(),
  })
  saveMap(SLOTS_FILE, slots).catch(() => {})
  return true
}

export function getSlotById(id: string): Slot | undefined {
  return slots.get(id)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ── Weekly availability rules ─────────────────────────────────────────────────

export type WeeklyRule = {
  id: string
  adviserId: string
  dayOfWeek: number            // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  startTime: string            // 'HH:MM' in this rule's timezone
  endTime: string              // 'HH:MM' exclusive upper bound
  slotDurationMinutes: number  // 30 or 60
  timezone: string             // IANA timezone for this rule
  isActive: boolean
  createdAt: string
}

/** Shape sent by the client — server auto-fills id, adviserId, createdAt */
export type RuleInput = Omit<WeeklyRule, 'id' | 'adviserId' | 'createdAt'>

const RULES_FILE = '.data/weekly-rules.json'
const gr = global as typeof global & { _weeklyRules?: Map<string, WeeklyRule> }
if (!gr._weeklyRules) {
  const loaded = loadMapSync<WeeklyRule>(RULES_FILE)
  gr._weeklyRules = loaded.size ? loaded : new Map()
}
const weeklyRules: Map<string, WeeklyRule> = gr._weeklyRules

export function getWeeklyRules(adviserId: string): WeeklyRule[] {
  return Array.from(weeklyRules.values())
    .filter(r => r.adviserId === adviserId)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
}

export function setWeeklyRules(adviserId: string, rules: RuleInput[]): void {
  for (const [k, r] of weeklyRules.entries()) {
    if (r.adviserId === adviserId) weeklyRules.delete(k)
  }
  const createdAt = new Date().toISOString()
  for (const rule of rules) {
    const id = crypto.randomUUID()
    weeklyRules.set(id, { ...rule, id, adviserId, createdAt })
  }
  saveMap(RULES_FILE, weeklyRules).catch(() => {})
}

/** Returns true if two rules' time windows overlap on the same day. */
export function rulesOverlap(a: RuleInput, b: RuleInput): boolean {
  return a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && a.endTime > b.startTime
}

function dowInZone(ms: number, timezone: string): number {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(new Date(ms))
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[label] ?? 0
}

/**
 * Removes all future unbooked slots for an adviser, then regenerates from
 * their active weekly rules (each rule carries its own timezone + duration).
 * Returns the number of slots created.
 */
export function generateSlotsFromRules(adviserId: string, price: number): number {
  const rules = getWeeklyRules(adviserId).filter(r => r.isActive)
  console.log(`[slots] generateSlotsFromRules: adviser=${adviserId} activeRules=${rules.length} price=${price}`)

  const nowMs = Date.now()
  const endMs = nowMs + AVAILABILITY_GENERATION_DAYS * 24 * 60 * 60 * 1000

  // Wipe all future unbooked slots for this adviser
  let wiped = 0
  for (const [k, s] of slots.entries()) {
    if (
      s.adviserId === adviserId &&
      s.status === 'available' &&
      new Date(s.utcStart).getTime() > nowMs
    ) {
      slots.delete(k)
      wiped++
    }
  }
  console.log(`[slots] generateSlotsFromRules: wiped ${wiped} old slots`)

  if (rules.length === 0) {
    saveMap(SLOTS_FILE, slots).catch(() => {})
    return 0
  }

  const toAdd: string[] = []

  for (let day = 0; day < AVAILABILITY_GENERATION_DAYS; day++) {
    const checkMs = nowMs + day * 24 * 60 * 60 * 1000
    for (const rule of rules) {
      if (dowInZone(checkMs, rule.timezone) !== rule.dayOfWeek) continue
      const { date: localDate } = utcToZoned(new Date(checkMs), rule.timezone)
      const [sh, sm] = rule.startTime.split(':').map(Number)
      const [eh, em] = rule.endTime.split(':').map(Number)
      const step = rule.slotDurationMinutes
      for (let m = sh * 60 + sm; m < eh * 60 + em; m += step) {
        const timeStr = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
        const utcDate = zonedToUTC(localDate, timeStr, rule.timezone)
        const utcMs  = utcDate.getTime()
        if (utcMs > nowMs && utcMs <= endMs) {
          toAdd.push(norm(utcDate.toISOString()))
        }
      }
    }
  }

  console.log(`[slots] generateSlotsFromRules: generating ${toAdd.length} slots (next ${AVAILABILITY_GENERATION_DAYS} days)`)
  createSlots(adviserId, toAdd, price)  // also persists
  return toAdd.length
}
