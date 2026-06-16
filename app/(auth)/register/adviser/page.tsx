'use client'

import { useActionState, useState, useTransition } from 'react'
import Link from 'next/link'
import { registerAdviser, sendVerificationEmail } from '@/app/actions/auth'
import { useLanguage } from '@/app/context/language-context'
import { COUNTRY_OPTIONS } from '@/app/lib/i18n'

const CURRENT_YEAR = new Date().getFullYear()
const STORAGE_KEY = 'adviser-draft'

type Draft = {
  name: string; email: string; school: string; major: string
  country: string; region: string; phdStartYear: string
  educationBackground: string; bio: string
}
const EMPTY: Draft = {
  name: '', email: '', school: '', major: '',
  country: '', region: '', phdStartYear: '',
  educationBackground: '', bio: '',
}

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}{hint && <span className="text-gray-400 font-normal"> {hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function AdviserRegisterPage() {
  const [state, action, pending] = useActionState(registerAdviser, undefined)
  const { d, locale } = useLanguage()
  const t = d.adviserReg
  const e = state?.errors ?? {}

  const [draft, setDraft] = useState<Draft>(() => {
    if (typeof window === 'undefined') return EMPTY
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...EMPTY, ...JSON.parse(saved) } : EMPTY
    } catch {
      return EMPTY
    }
  })
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sendError, setSendError] = useState('')
  const [devCode, setDevCode] = useState('')
  const [diplomaFile, setDiplomaFile] = useState<File | null>(null)
  const [isSending, startSending] = useTransition()

  function update(field: keyof Draft) {
    return (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const next = { ...draft, [field]: ev.target.value }
      setDraft(next)
      if (field === 'email') {
        setOtpSent(false)
        setSendError('')
        setOtpCode('')
        setDevCode('')
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
    }
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)
  const isEdu = draft.email.toLowerCase().includes('.edu')

  function handleSendCode() {
    setSendError('')
    startSending(async () => {
      const res = await sendVerificationEmail(draft.email)
      if (res.sent) {
        setOtpSent(true)
        if (res.devCode) setDevCode(res.devCode)
      } else {
        setSendError(res.error ?? (locale === 'zh' ? '发送失败，请稍后重试' : 'Failed to send, please try again'))
      }
    })
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="mt-2 text-gray-500 text-sm">{t.subtitle}</p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-8">
        <form action={action} className="space-y-5">

          <Field label={t.name} error={e.name?.[0]}>
            <input name="name" type="text" placeholder={t.namePh}
              value={draft.name} onChange={update('name')}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
          </Field>

          {/* Email + verification */}
          <div className="space-y-2">
            <Field label={t.email} error={e.email?.[0]}>
              <input name="email" type="email" placeholder={t.emailPh}
                autoComplete="username"
                value={draft.email} onChange={update('email')}
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
            </Field>

            {isValidEmail && isEdu && (
              <div className="rounded-xl border bg-blue-50/60 p-4 space-y-3">
                <p className="text-xs text-blue-700 font-medium">{t.eduNote}</p>
                <div className="flex gap-2">
                  <input name="otpCode" type="text" inputMode="numeric" maxLength={6}
                    placeholder={t.otpPh} value={otpCode}
                    onChange={ev => setOtpCode(ev.target.value)}
                    className="flex-1 rounded-xl border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition" />
                  <button type="button" onClick={handleSendCode} disabled={isSending}
                    className="whitespace-nowrap rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50 transition">
                    {isSending ? t.sending : otpSent ? t.resendCode : t.sendCode}
                  </button>
                </div>
                {otpSent && !sendError && (
                  <p className="text-xs text-green-600">{t.codeSent}</p>
                )}
                {otpSent && (
                  <p className="text-xs text-gray-400">{t.emailSpamHint}</p>
                )}
                {devCode && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 flex items-center gap-2">
                    <span className="text-xs text-yellow-700">🛠 Dev:</span>
                    <span className="font-mono font-bold text-yellow-900 tracking-widest">{devCode}</span>
                  </div>
                )}
                {sendError && <p className="text-xs text-red-500">{sendError}</p>}
                {e.otpCode && <p className="text-xs text-red-500">{e.otpCode[0]}</p>}
              </div>
            )}

            {isValidEmail && !isEdu && (
              <div className="rounded-xl border bg-amber-50/60 p-4 space-y-3">
                <p className="text-xs text-amber-700 font-medium">{t.diplomaNote}</p>
                <label className="block">
                  <div className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer transition
                    ${diplomaFile ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'}`}>
                    <span className="text-lg">{diplomaFile ? '📄' : '📎'}</span>
                    <div className="flex-1 min-w-0">
                      {diplomaFile
                        ? <p className="text-sm font-medium truncate">{diplomaFile.name}</p>
                        : <p className="text-sm text-gray-500">{t.uploadPh}</p>
                      }
                    </div>
                    {diplomaFile && (
                      <button type="button"
                        onClick={ev => { ev.preventDefault(); setDiplomaFile(null) }}
                        className="text-xs text-gray-400 hover:text-red-500">
                        {d.common.delete}
                      </button>
                    )}
                  </div>
                  <input type="file" name="diploma" accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="sr-only"
                    onChange={ev => setDiplomaFile(ev.target.files?.[0] ?? null)} />
                </label>
                <p className="text-xs text-amber-600">{t.pendingNote}</p>
                {e.diploma && <p className="text-xs text-red-500">{e.diploma[0]}</p>}
              </div>
            )}
          </div>

          <Field label={t.password} error={e.password?.[0]}>
            <input name="password" type="password" placeholder={t.passwordPh}
              autoComplete="new-password"
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t.school} error={e.school?.[0]}>
              <input name="school" type="text" placeholder={t.schoolPh}
                value={draft.school} onChange={update('school')}
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
            </Field>
            <Field label={t.major} error={e.major?.[0]}>
              <input name="major" type="text" placeholder={t.majorPh}
                value={draft.major} onChange={update('major')}
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t.country} error={e.country?.[0]}>
              <select name="country" value={draft.country} onChange={update('country')}
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition bg-white">
                <option value="" disabled>{t.countryPh}</option>
                {COUNTRY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c[locale]}</option>
                ))}
              </select>
            </Field>
            <Field label={t.region} error={e.region?.[0]}>
              <input name="region" type="text" placeholder={t.regionPh}
                value={draft.region} onChange={update('region')}
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
            </Field>
          </div>

          <Field label={t.phdYear} error={e.phdStartYear?.[0]}>
            <input name="phdStartYear" type="number" min={2000} max={CURRENT_YEAR}
              placeholder={String(CURRENT_YEAR)}
              value={draft.phdStartYear} onChange={update('phdStartYear')}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
          </Field>

          <Field label={t.education} error={e.educationBackground?.[0]}>
            <textarea name="educationBackground" rows={2} placeholder={t.educationPh}
              value={draft.educationBackground} onChange={update('educationBackground')}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition resize-none" />
          </Field>

          <Field label={t.bio} error={e.bio?.[0]}>
            <textarea name="bio" rows={3} placeholder={t.bioPh}
              value={draft.bio} onChange={update('bio')}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition resize-none" />
          </Field>

          {state?.message && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {state.message}
            </p>
          )}

          <button type="submit" disabled={pending}
            className="w-full rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50 transition">
            {pending ? d.common.submitting : t.registerBtn}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        {d.common.hasAccount}{' '}
        <Link href="/login" className="font-medium text-black underline">{d.common.directLogin}</Link>
        {' '}·{' '}
        <Link href="/register/applicant" className="font-medium text-black underline">{d.common.studentRegister}</Link>
      </p>
    </div>
  )
}
