'use client'

import { useState, useTransition } from 'react'
import { saveApplicantProfile } from '@/app/actions/applicant'
import type { ApplicationLevel } from '@/app/lib/applicants'
import type { Locale } from '@/app/lib/i18n'
import { getDict, COUNTRY_OPTIONS } from '@/app/lib/i18n'

type Props = {
  locale: Locale
  initial: {
    bio: string
    intendedMajor: string
    applicationLevel: ApplicationLevel
    currentSchool: string
    targetCountries: string[]
    applicationYear: string
    backgroundNotes: string
  }
}

const LEVELS: ApplicationLevel[] = ['undergraduate', 'master', 'phd']
const YEARS = ['2025', '2026', '2027', '2028']

export default function ApplicantProfile({ locale, initial }: Props) {
  const t = getDict(locale).applicantProfile
  const zh = locale === 'zh'

  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(initial.bio)
  const [intendedMajor, setIntendedMajor] = useState(initial.intendedMajor)
  const [applicationLevel, setApplicationLevel] = useState<ApplicationLevel>(initial.applicationLevel)
  const [currentSchool, setCurrentSchool] = useState(initial.currentSchool)
  const [targetCountries, setTargetCountries] = useState<string[]>(initial.targetCountries)
  const [applicationYear, setApplicationYear] = useState(initial.applicationYear)
  const [backgroundNotes, setBackgroundNotes] = useState(initial.backgroundNotes)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const levelLabel = (lv: ApplicationLevel) => ({
    undergraduate: t.levelUndergraduate,
    master: t.levelMaster,
    phd: t.levelPhd,
  }[lv])

  function toggleCountry(val: string) {
    setTargetCountries(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    )
  }

  function handleSave() {
    setError('')
    setSaved(false)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('bio', bio)
      fd.set('intendedMajor', intendedMajor)
      fd.set('applicationLevel', applicationLevel)
      fd.set('currentSchool', currentSchool)
      fd.set('applicationYear', applicationYear)
      fd.set('backgroundNotes', backgroundNotes)
      targetCountries.forEach(c => fd.append('targetCountries', c))
      const res = await saveApplicantProfile(fd)
      if (res.ok) { setSaved(true); setEditing(false) }
      else setError(res.error ?? (zh ? '保存失败' : 'Save failed'))
    })
  }

  const countryLabel = (val: string) => {
    const opt = COUNTRY_OPTIONS.find(o => o.value === val)
    return opt ? (locale === 'zh' ? opt.zh : opt.en) : val
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs">{t.applicationLevel}</p>
            <p className="font-medium mt-0.5">{levelLabel(applicationLevel)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">{t.intendedMajor}</p>
            <p className="font-medium mt-0.5">{intendedMajor || <span className="text-gray-400">{t.notSet}</span>}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">{t.currentSchool}</p>
            <p className="font-medium mt-0.5">{currentSchool || <span className="text-gray-400">{t.notSet}</span>}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">{t.applicationYear}</p>
            <p className="font-medium mt-0.5">{applicationYear || <span className="text-gray-400">{t.notSet}</span>}</p>
          </div>
          {targetCountries.length > 0 && (
            <div className="col-span-2">
              <p className="text-gray-500 text-xs">{t.targetCountries}</p>
              <p className="font-medium mt-0.5">{targetCountries.map(countryLabel).join('、')}</p>
            </div>
          )}
          {backgroundNotes && (
            <div className="col-span-2">
              <p className="text-gray-500 text-xs">{t.backgroundNotes}</p>
              <p className="font-medium mt-0.5 leading-relaxed whitespace-pre-wrap">{backgroundNotes}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-gray-500 text-xs">{t.bio}</p>
            <p className="font-medium mt-0.5 leading-relaxed whitespace-pre-wrap">
              {bio || <span className="text-gray-400">{t.notSet}</span>}
            </p>
          </div>
        </div>
        {saved && <p className="text-xs text-green-600">{t.saved}</p>}
        <button onClick={() => setEditing(true)}
          className="rounded-xl border px-5 py-2 text-sm font-medium hover:bg-gray-50 transition">
          {t.edit}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Application level */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">{t.applicationLevel}</label>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map(lv => (
            <button key={lv} type="button" onClick={() => setApplicationLevel(lv)}
              className={`rounded-xl border py-2 text-sm font-medium transition
                ${applicationLevel === lv ? 'bg-black text-white border-black' : 'text-gray-600 hover:border-gray-400'}`}>
              {levelLabel(lv)}
            </button>
          ))}
        </div>
      </div>

      {/* Intended major */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t.intendedMajor}</label>
        <input type="text" placeholder={t.intendedMajorPh} value={intendedMajor}
          onChange={e => setIntendedMajor(e.target.value)}
          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
      </div>

      {/* Current school */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t.currentSchool}</label>
        <input type="text" placeholder={t.currentSchoolPh} value={currentSchool}
          onChange={e => setCurrentSchool(e.target.value)}
          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
      </div>

      {/* Application year */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t.applicationYear}</label>
        <select value={applicationYear} onChange={e => setApplicationYear(e.target.value)}
          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition bg-white">
          <option value="">{t.applicationYearPh}</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Target countries */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">{t.targetCountries}</label>
        <div className="flex flex-wrap gap-2">
          {COUNTRY_OPTIONS.map(opt => {
            const selected = targetCountries.includes(opt.value)
            return (
              <button key={opt.value} type="button" onClick={() => toggleCountry(opt.value)}
                className={`rounded-xl border px-3 py-1.5 text-sm transition
                  ${selected ? 'bg-black text-white border-black' : 'text-gray-600 hover:border-gray-400'}`}>
                {locale === 'zh' ? opt.zh : opt.en}
              </button>
            )
          })}
        </div>
      </div>

      {/* Background notes */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t.backgroundNotes}</label>
        <textarea rows={3} placeholder={t.backgroundNotesPh} value={backgroundNotes}
          onChange={e => setBackgroundNotes(e.target.value)}
          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition resize-none" />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t.bio}</label>
        <textarea rows={4} placeholder={t.bioPh} value={bio}
          onChange={e => setBio(e.target.value)}
          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition resize-none" />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={isPending}
          className="rounded-xl bg-black px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition">
          {isPending ? t.saving : t.save}
        </button>
        <button onClick={() => { setEditing(false); setError('') }}
          className="rounded-xl border px-6 py-2.5 text-sm font-medium hover:bg-gray-50 transition">
          {t.cancel}
        </button>
      </div>
    </div>
  )
}
