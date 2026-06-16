'use server'

import { getSession } from '@/app/lib/session'
import { getAdviserById, updateAdviser } from '@/app/lib/advisers'
import {
  toggleSlot,
  bookSlot,
  createSlots,
  removeSlots,
  getAvailableSlots,
  getAdviserSlots,
  getWeeklyRules,
  setWeeklyRules,
  generateSlotsFromRules,
  type SlotPublic,
  type Slot,
  type RuleInput,
} from '@/app/lib/slots'
import { zonedToUTC } from '@/app/lib/timezone'
import type { TZValue } from '@/app/lib/timezone'

export type SlotActionResult = { ok: boolean; error?: string; result?: string }

/** Adviser: toggle a slot open/closed. Receives a UTC ISO string. */
export async function toggleAdviserSlot(utcStart: string): Promise<SlotActionResult> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return { ok: false, error: '未登录' }

  const adviser = getAdviserById(session.userId)
  if (!adviser) return { ok: false, error: '导师不存在' }

  const result = toggleSlot(session.userId, utcStart, adviser.chatPrice)
  if (result === 'booked') return { ok: false, error: '该时段已被预约，无法取消' }
  return { ok: true, result }
}

/** Adviser: update chat price + timezone together */
export async function updateCalendarSettings(
  price: number,
  timezone: TZValue,
): Promise<SlotActionResult> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return { ok: false, error: '未登录' }
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: '请输入有效价格' }
  updateAdviser(session.userId, { chatPrice: price, timezone })
  return { ok: true }
}

/** Student: fetch available slots for an adviser */
export async function fetchAdviserAvailableSlots(adviserId: string): Promise<SlotPublic[]> {
  return getAvailableSlots(adviserId)
}

/** Student: book a slot */
export async function bookAdviserSlot(slotId: string): Promise<SlotActionResult> {
  const session = await getSession()
  if (!session || session.role !== 'applicant') return { ok: false, error: '请先登录学生账号' }
  const ok = bookSlot(slotId, session.userId, session.name)
  if (!ok) return { ok: false, error: '该时段已被预约，请选择其他时间' }
  return { ok: true }
}

/** Adviser: batch-save slot changes (open toAdd, close toRemove). */
export async function saveAdviserSlots(
  toAdd: string[],
  toRemove: string[],
): Promise<SlotActionResult & { bookedConflicts?: string[] }> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return { ok: false, error: '未登录' }
  const adviser = getAdviserById(session.userId)
  if (!adviser) return { ok: false, error: '导师不存在' }

  const bookedConflicts = removeSlots(session.userId, toRemove)
  createSlots(session.userId, toAdd, adviser.chatPrice)
  return { ok: true, bookedConflicts: bookedConflicts.length > 0 ? bookedConflicts : undefined }
}

/** Adviser: fetch slots that fall on one local calendar date in the given timezone. */
export async function fetchMySlotsForLocalDate(
  localDate: string,
  timezone: TZValue,
): Promise<Slot[]> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return []

  const from = zonedToUTC(localDate, '00:00', timezone)
  const next = new Date(localDate + 'T00:00:00Z')
  next.setUTCDate(next.getUTCDate() + 1)
  const to = zonedToUTC(next.toISOString().slice(0, 10), '00:00', timezone)

  return getAdviserSlots(session.userId, from.toISOString(), to.toISOString())
}

/** Adviser: replace one local date's unbooked availability with selected times. */
export async function saveAdviserDateSlots(
  localDate: string,
  selectedTimes: string[],
  timezone: TZValue,
): Promise<SlotActionResult & { bookedConflicts?: string[] }> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return { ok: false, error: '未登录' }
  const adviser = getAdviserById(session.userId)
  if (!adviser) return { ok: false, error: '导师不存在' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return { ok: false, error: '日期格式无效' }

  const uniqueTimes = Array.from(new Set(selectedTimes)).sort()
  for (const time of uniqueTimes) {
    if (!/^\d{2}:\d{2}$/.test(time)) return { ok: false, error: '时间格式无效' }
  }

  const existing = await fetchMySlotsForLocalDate(localDate, timezone)
  const wantedUTC = uniqueTimes.map(time => zonedToUTC(localDate, time, timezone).toISOString())
  const wantedSet = new Set(wantedUTC)

  const toRemove = existing
    .filter(slot => slot.status === 'available' && !wantedSet.has(slot.utcStart))
    .map(slot => slot.utcStart)

  const existingSet = new Set(existing.map(slot => slot.utcStart))
  const toAdd = wantedUTC.filter(utc => !existingSet.has(utc) && new Date(utc).getTime() > Date.now())

  const bookedConflicts = removeSlots(session.userId, toRemove)
  createSlots(session.userId, toAdd, adviser.chatPrice)

  console.log(`[slots] saveAdviserDateSlots: adviser=${session.userId} date=${localDate} timezone=${timezone} add=${toAdd.length} remove=${toRemove.length}`)

  return { ok: true, bookedConflicts: bookedConflicts.length > 0 ? bookedConflicts : undefined }
}

/** Adviser: fetch their stored weekly availability rules. */
export async function fetchWeeklyRules(): Promise<RuleInput[]> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return []
  return getWeeklyRules(session.userId).map(r => ({
    dayOfWeek:           r.dayOfWeek,
    startTime:           r.startTime,
    endTime:             r.endTime,
    slotDurationMinutes: r.slotDurationMinutes,
    timezone:            r.timezone,
    isActive:            r.isActive,
  }))
}

/** Adviser: save weekly rules and regenerate slots for the next year. */
export async function saveWeeklyRulesAndGenerate(
  rules: RuleInput[],
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return { ok: false, error: '未登录' }
  const adviser = getAdviserById(session.userId)
  if (!adviser) return { ok: false, error: '导师不存在' }

  for (const rule of rules) {
    if (rule.dayOfWeek < 0 || rule.dayOfWeek > 6)
      return { ok: false, error: '无效的星期值' }
    if (rule.startTime >= rule.endTime)
      return { ok: false, error: '开始时间必须早于结束时间' }
    if (![30, 60].includes(rule.slotDurationMinutes))
      return { ok: false, error: '时间段长度必须为 30 或 60 分钟' }
    const [sh, sm] = rule.startTime.split(':').map(Number)
    const [eh, em] = rule.endTime.split(':').map(Number)
    if ((eh * 60 + em) - (sh * 60 + sm) < rule.slotDurationMinutes)
      return { ok: false, error: '时间范围不足一个时间段' }
  }

  // Overlap check — only among active rules
  const active = rules.filter(r => r.isActive)
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j]
      if (a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && a.endTime > b.startTime)
        return { ok: false, error: '存在重叠的规则，请修改后再保存' }
    }
  }

  setWeeklyRules(session.userId, rules)
  const count = generateSlotsFromRules(session.userId, adviser.chatPrice)
  return { ok: true, count }
}

/** Adviser dashboard helper: fetch nearby slots for summary cards. */
export async function fetchMySlots(): Promise<Slot[]> {
  const session = await getSession()
  if (!session || session.role !== 'adviser') return []
  const now = new Date()
  const from = now.toISOString()
  const to = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString()
  return getAdviserSlots(session.userId, from, to)
}
