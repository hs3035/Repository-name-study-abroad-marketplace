'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  saveWeeklyRulesAndGenerate,
  fetchWeeklyRules,
  updateCalendarSettings,
  fetchMySlotsForLocalDate,
  saveAdviserDateSlots,
} from '@/app/actions/slots'
import { TIMEZONE_OPTIONS, utcToZoned, zonedToUTC, type TZValue } from '@/app/lib/timezone'
import type { Locale } from '@/app/lib/i18n'
import type { Slot } from '@/app/lib/slots'

// ── Types ─────────────────────────────────────────────────────────────────────

type RuleInput = {
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDurationMinutes: number
  timezone: string
  isActive: boolean
}

type Props = {
  locale: Locale
  initialChatPrice: number
  initialTimezone: TZValue
}

// ── Constants ─────────────────────────────────────────────────────────────────

// 06:00–23:30 in 30-min steps
const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const h = Math.floor(i / 2) + 6
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

const DAY_OPTIONS = [
  { v: 1, zh: '周一', en: 'Monday' },
  { v: 2, zh: '周二', en: 'Tuesday' },
  { v: 3, zh: '周三', en: 'Wednesday' },
  { v: 4, zh: '周四', en: 'Thursday' },
  { v: 5, zh: '周五', en: 'Friday' },
  { v: 6, zh: '周六', en: 'Saturday' },
  { v: 0, zh: '周日', en: 'Sunday' },
]

const DURATION_OPTIONS = [
  { v: 30, zh: '30 分钟', en: '30 min' },
  { v: 60, zh: '60 分钟', en: '60 min' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function dayLabel(dow: number, zh: boolean): string {
  return DAY_OPTIONS.find(d => d.v === dow)?.[zh ? 'zh' : 'en'] ?? String(dow)
}

function slotsPerWindow(start: string, end: string, duration: number): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, Math.floor((eh * 60 + em - sh * 60 - sm) / duration))
}

function overlaps(a: RuleInput, b: RuleInput): boolean {
  return a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && a.endTime > b.startTime
}

function getOverlapSet(rules: RuleInput[]): Set<number> {
  const set = new Set<number>()
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      if (rules[i].isActive && rules[j].isActive && overlaps(rules[i], rules[j])) {
        set.add(i)
        set.add(j)
      }
    }
  }
  return set
}

// ── Default form state ────────────────────────────────────────────────────────

type FormState = {
  day: number; start: string; end: string
  duration: number; timezone: TZValue; isActive: boolean
}

function emptyForm(tz: TZValue): FormState {
  return { day: 1, start: '09:00', end: '11:00', duration: 30, timezone: tz, isActive: true }
}

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdviserCalendar({ locale, initialChatPrice, initialTimezone }: Props) {
  const zh = locale === 'zh'

  // settings
  const [chatPrice, setChatPrice]         = useState(initialChatPrice)
  const [timezone, setTimezone]           = useState<TZValue>(initialTimezone)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // rules
  const [rules, setRules]                   = useState<RuleInput[]>([])
  const [editIdx, setEditIdx]               = useState<number | null>(null)
  const [form, setForm]                     = useState<FormState>(() => emptyForm(initialTimezone))
  const [generatedCount, setGeneratedCount] = useState<number | null>(null)
  const [saveError, setSaveError]           = useState('')

  // single-date override
  const todayInTz = utcToZoned(new Date(), initialTimezone).date
  const [customDate, setCustomDate]       = useState(todayInTz)
  const [dateSlots, setDateSlots]         = useState<Slot[]>([])
  const [customTimes, setCustomTimes]     = useState<Set<string>>(new Set())
  const [dateSaveMsg, setDateSaveMsg]     = useState('')
  const [dateSaveError, setDateSaveError] = useState('')
  const [dateLoading, setDateLoading]     = useState(false)

  const [isSavingRules,    startSaveRules]    = useTransition()
  const [isSavingSettings, startSaveSettings] = useTransition()
  const [isSavingDate,     startSaveDate]     = useTransition()

  useEffect(() => { fetchWeeklyRules().then(setRules) }, [])
  useEffect(() => {
    setDateLoading(true)
    setDateSaveMsg('')
    setDateSaveError('')
    fetchMySlotsForLocalDate(customDate, timezone).then(slots => {
      setDateSlots(slots)
      setCustomTimes(new Set(slots.map(slot => utcToZoned(new Date(slot.utcStart), timezone).time)))
      setDateLoading(false)
    })
  }, [customDate, timezone])

  // ── Derived ───────────────────────────────────────────────────────
  const overlapSet   = getOverlapSet(rules)
  const hasOverlaps  = overlapSet.size > 0
  const endOpts      = TIME_OPTIONS.filter(t => t > form.start)
  const effectiveEnd = endOpts.includes(form.end) ? form.end : (endOpts[0] ?? '23:30')
  const previewCount = slotsPerWindow(form.start, effectiveEnd, form.duration)
  const minCustomDate = utcToZoned(new Date(), timezone).date
  const maxCustomDate = addDays(minCustomDate, 365)
  const dateSlotByTime = new Map(dateSlots.map(slot => [utcToZoned(new Date(slot.utcStart), timezone).time, slot]))

  // ── Rule CRUD ─────────────────────────────────────────────────────
  function startEdit(i: number) {
    const r = rules[i]
    setForm({
      day: r.dayOfWeek, start: r.startTime, end: r.endTime,
      duration: r.slotDurationMinutes, timezone: r.timezone as TZValue, isActive: r.isActive,
    })
    setEditIdx(i)
  }

  function cancelEdit() {
    setEditIdx(null)
    setForm(emptyForm(timezone))
  }

  function submitForm() {
    const newRule: RuleInput = {
      dayOfWeek: form.day,
      startTime: form.start,
      endTime: effectiveEnd,
      slotDurationMinutes: form.duration,
      timezone: form.timezone,
      isActive: form.isActive,
    }
    if (editIdx !== null) {
      setRules(prev => prev.map((r, i) => i === editIdx ? newRule : r))
      setEditIdx(null)
    } else {
      setRules(prev => [...prev, newRule])
    }
    setForm(emptyForm(timezone))
    setGeneratedCount(null)
    setSaveError('')
  }

  function deleteRule(i: number) {
    setRules(prev => prev.filter((_, j) => j !== i))
    if (editIdx === i) { setEditIdx(null); setForm(emptyForm(timezone)) }
    setGeneratedCount(null)
  }

  function toggleActive(i: number) {
    setRules(prev => prev.map((r, j) => j === i ? { ...r, isActive: !r.isActive } : r))
    setGeneratedCount(null)
  }

  // ── Save handlers ─────────────────────────────────────────────────
  function handleSaveSettings() {
    setSettingsSaved(false)
    startSaveSettings(async () => {
      const res = await updateCalendarSettings(chatPrice, timezone)
      if (res.ok) setSettingsSaved(true)
    })
  }

  function handleSaveRules() {
    if (hasOverlaps) return
    setSaveError('')
    setGeneratedCount(null)
    startSaveRules(async () => {
      const res = await saveWeeklyRulesAndGenerate(rules)
      if (res.ok) setGeneratedCount(res.count ?? 0)
      else setSaveError(res.error ?? (zh ? '保存失败' : 'Save failed'))
    })
  }

  function toggleCustomTime(time: string) {
    const slot = dateSlotByTime.get(time)
    if (slot?.status === 'booked') return
    if (zonedToUTC(customDate, time, timezone).getTime() <= Date.now()) return
    setCustomTimes(prev => {
      const next = new Set(prev)
      if (next.has(time)) next.delete(time)
      else next.add(time)
      return next
    })
    setDateSaveMsg('')
    setDateSaveError('')
  }

  function handleSaveDateSlots() {
    setDateSaveMsg('')
    setDateSaveError('')
    startSaveDate(async () => {
      const res = await saveAdviserDateSlots(customDate, Array.from(customTimes), timezone)
      if (!res.ok) {
        setDateSaveError(res.error ?? (zh ? '保存失败' : 'Save failed'))
        return
      }
      const refreshed = await fetchMySlotsForLocalDate(customDate, timezone)
      setDateSlots(refreshed)
      setCustomTimes(new Set(refreshed.map(slot => utcToZoned(new Date(slot.utcStart), timezone).time)))
      setDateSaveMsg(zh ? '已保存当天可预约时间' : 'Saved availability for this date')
    })
  }

  const tzLabel  = TIMEZONE_OPTIONS.find(o => o.value === timezone)?.[zh ? 'zh' : 'en'] ?? timezone
  const sel      = 'rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition bg-white'

  return (
    <div className="space-y-6">

      {/* ── Settings ─────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-50 border p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {zh ? '每次咨询价格' : 'Price per session'}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">¥</span>
              <input
                type="number" min={1} value={chatPrice}
                onChange={e => { setChatPrice(Number(e.target.value)); setSettingsSaved(false) }}
                className="w-24 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition"
              />
              <span className="text-sm text-gray-400">{zh ? '元 / 次' : '/ session'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {zh ? '我的时区' : 'My Timezone'}
            </label>
            <select value={timezone}
              onChange={e => { setTimezone(e.target.value as TZValue); setSettingsSaved(false) }}
              className={sel}>
              {TIMEZONE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{zh ? o.zh : o.en}</option>
              ))}
            </select>
          </div>

          <button onClick={handleSaveSettings} disabled={isSavingSettings}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition">
            {isSavingSettings ? (zh ? '保存中…' : 'Saving…') : (zh ? '保存设置' : 'Save Settings')}
          </button>
          {settingsSaved && (
            <span className="text-xs text-green-600">✓ {zh ? '已保存' : 'Saved'}</span>
          )}
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
          🕐 {zh
            ? `你设置的是你所在时区的时间：${timezone}（${tzLabel}）`
            : `You are setting times in your timezone: ${timezone} (${tzLabel})`}
        </div>
      </div>

      {/* ── Date-specific slots ─────────────────────────────────── */}
      <div className="rounded-xl border bg-white p-4 space-y-4">
        <div>
          <h3 className="font-medium text-sm">
            {zh ? '单日时间调整' : 'Date-specific availability'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {zh
              ? '如果某一天和每周规则不同，可以在这里单独添加或关闭时间段。已被预约的时间会锁定，不能取消。'
              : 'Use this when one date differs from your weekly rules. Booked times are locked and cannot be removed.'}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {zh ? '选择日期' : 'Choose date'}
            </label>
            <input
              type="date"
              min={minCustomDate}
              max={maxCustomDate}
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className={sel}
            />
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
            {zh ? `当天时间按你的时区显示：${timezone}` : `Times shown in your timezone: ${timezone}`}
          </div>
        </div>

        {dateLoading ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {TIME_OPTIONS.slice(0, 12).map(t => <div key={t} className="h-10 rounded-xl bg-gray-50 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {TIME_OPTIONS.map(time => {
              const slot = dateSlotByTime.get(time)
              const booked = slot?.status === 'booked'
              const selected = customTimes.has(time)
              const past = zonedToUTC(customDate, time, timezone).getTime() <= Date.now()
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => toggleCustomTime(time)}
                  disabled={booked || past}
                  className={`rounded-xl border px-2 py-2 text-xs font-medium transition
                    ${booked
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : past
                        ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                        : selected
                          ? 'bg-black border-black text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}
                >
                  <div>{time}</div>
                  {booked && <div className="text-[10px] mt-0.5">{zh ? '已预约' : 'Booked'}</div>}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSaveDateSlots}
            disabled={isSavingDate || dateLoading}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition"
          >
            {isSavingDate ? (zh ? '保存中…' : 'Saving…') : (zh ? '保存当天时间' : 'Save this date')}
          </button>
          <span className="text-xs text-gray-400">
            {zh
              ? `已选择 ${Array.from(customTimes).filter(t => !dateSlotByTime.get(t) || dateSlotByTime.get(t)?.status !== 'booked').length} 个可编辑时间段`
              : `${Array.from(customTimes).filter(t => !dateSlotByTime.get(t) || dateSlotByTime.get(t)?.status !== 'booked').length} editable slot(s) selected`}
          </span>
          {dateSaveMsg && <span className="text-sm text-green-600 font-medium">✓ {dateSaveMsg}</span>}
          {dateSaveError && <span className="text-sm text-red-500">{dateSaveError}</span>}
        </div>
      </div>

      {/* ── Weekly rules ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-sm">
            {zh ? '每周开放时间规则' : 'Weekly Availability Rules'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {zh
              ? '系统根据以下规则，自动为接下来 1 年生成可预约时间段。夏令时（如美国 DST）自动处理，无需手动换算。'
              : 'Slots for the next year are auto-generated from these rules. Daylight saving time is handled automatically.'}
          </p>
        </div>

        {/* Overlap warning */}
        {hasOverlaps && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ {zh
              ? '有启用的规则存在时间重叠，请先修改冲突的规则再保存。'
              : 'Some active rules overlap — fix conflicts before saving.'}
          </div>
        )}

        {/* Rule cards */}
        <div className="space-y-2">
          {rules.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">
              {zh ? '暂无规则，请在下方添加' : 'No rules yet — add one below'}
            </p>
          ) : (
            rules.map((rule, i) => {
              const isEditing  = editIdx === i
              const isOverlap  = overlapSet.has(i)
              const count      = slotsPerWindow(rule.startTime, rule.endTime, rule.slotDurationMinutes)
              const dur        = DURATION_OPTIONS.find(d => d.v === rule.slotDurationMinutes)?.[zh ? 'zh' : 'en'] ?? `${rule.slotDurationMinutes} min`
              return (
                <div key={i}
                  className={`rounded-xl border px-4 py-3 text-sm transition
                    ${!rule.isActive     ? 'bg-gray-50 border-gray-200 opacity-60'
                    : isOverlap          ? 'bg-amber-50 border-amber-300'
                    : isEditing          ? 'bg-blue-50 border-blue-300'
                    :                      'bg-white border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: info */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>{rule.isActive ? '🟢' : '⭕'}</span>
                        <span className="font-semibold">{dayLabel(rule.dayOfWeek, zh)}</span>
                        <span className="text-gray-700">{rule.startTime} – {rule.endTime}</span>
                        {!rule.isActive && (
                          <span className="text-xs bg-gray-200 text-gray-500 rounded-full px-2 py-0.5">
                            {zh ? '已暂停' : 'Paused'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 pl-5 flex flex-wrap gap-x-2">
                        <span>{dur}</span>
                        <span>·</span>
                        <span>{rule.timezone}</span>
                        <span>·</span>
                        <span>{count} {zh ? '个时间段/次' : `slot${count !== 1 ? 's' : ''}/week`}</span>
                      </div>
                      {isOverlap && (
                        <p className="text-xs text-amber-600 pl-5">
                          ⚠ {zh ? '与同天其他规则时间重叠' : 'Overlaps with another rule on this day'}
                        </p>
                      )}
                      {isEditing && (
                        <p className="text-xs text-blue-600 pl-5">
                          ✏️ {zh ? '正在编辑此规则…' : 'Editing this rule…'}
                        </p>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleActive(i)}
                        className="rounded-lg border px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 transition">
                        {rule.isActive ? (zh ? '暂停' : 'Pause') : (zh ? '启用' : 'Enable')}
                      </button>
                      <button onClick={() => startEdit(i)} disabled={isEditing}
                        className="rounded-lg border px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition">
                        {zh ? '编辑' : 'Edit'}
                      </button>
                      <button onClick={() => deleteRule(i)}
                        className="rounded-lg border border-red-100 px-2.5 py-1 text-xs text-red-400 hover:bg-red-50 transition">
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Add / Edit rule form ──────────────────────────────── */}
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <p className="text-xs font-medium text-gray-600">
            {editIdx !== null
              ? (zh ? '✏️ 编辑规则' : '✏️ Edit Rule')
              : (zh ? '➕ 添加规则' : '➕ Add Rule')}
          </p>

          {/* Row 1: day + start – end */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={form.day}
              onChange={e => setForm(f => ({ ...f, day: Number(e.target.value) }))}
              className={sel}>
              {DAY_OPTIONS.map(d => <option key={d.v} value={d.v}>{zh ? d.zh : d.en}</option>)}
            </select>

            <select value={form.start}
              onChange={e => {
                const v = e.target.value
                setForm(f => ({
                  ...f,
                  start: v,
                  end: f.end <= v ? (TIME_OPTIONS.find(t => t > v) ?? '23:30') : f.end,
                }))
              }}
              className={sel}>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <span className="text-gray-400 text-sm">—</span>

            <select value={effectiveEnd}
              onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
              className={sel}>
              {endOpts.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Row 2: duration + timezone */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
              className={sel}>
              {DURATION_OPTIONS.map(d => <option key={d.v} value={d.v}>{zh ? d.zh : d.en}</option>)}
            </select>

            <select value={form.timezone}
              onChange={e => setForm(f => ({ ...f, timezone: e.target.value as TZValue }))}
              className={sel}>
              {TIMEZONE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{zh ? o.zh : o.en}</option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <p className="text-xs text-gray-400">
            {zh
              ? `预览：每${dayLabel(form.day, zh)} ${form.start}–${effectiveEnd}（${form.timezone}）→ ${previewCount} 个时间段 / 次`
              : `Preview: every ${DAY_OPTIONS.find(d => d.v === form.day)?.en} ${form.start}–${effectiveEnd} (${form.timezone}) → ${previewCount} slot${previewCount !== 1 ? 's' : ''} per week`}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={submitForm}
              className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 transition">
              {editIdx !== null
                ? (zh ? '更新规则' : 'Update Rule')
                : (zh ? '+ 添加规则' : '+ Add Rule')}
            </button>
            {editIdx !== null && (
              <button onClick={cancelEdit}
                className="rounded-xl border px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition">
                {zh ? '取消' : 'Cancel'}
              </button>
            )}
          </div>
        </div>

        {/* ── Save & Generate ───────────────────────────────────── */}
        <div className="flex items-center gap-4 flex-wrap pt-1">
          <button
            onClick={handleSaveRules}
            disabled={isSavingRules || hasOverlaps}
            className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition"
          >
            {isSavingRules
              ? (zh ? '生成中…' : 'Generating…')
              : (zh ? '保存规则并生成未来 1 年时间段' : 'Save Rules & Generate Next Year')}
          </button>

          {generatedCount !== null && !hasOverlaps && (
            <span className="text-sm text-green-600 font-medium">
              ✓ {zh
                ? `已生成 ${generatedCount} 个可预约时间段`
                : `${generatedCount} bookable slot${generatedCount !== 1 ? 's' : ''} generated`}
            </span>
          )}
          {saveError && <span className="text-sm text-red-500">{saveError}</span>}
        </div>

        {generatedCount !== null && !hasOverlaps && (
          <p className="text-xs text-gray-400">
            {zh
              ? '学生现在可以预约这些时间段了。已预约的时段不受影响。'
              : 'Students can now book these slots. Already-booked slots are not affected.'}
          </p>
        )}
      </div>
    </div>
  )
}
