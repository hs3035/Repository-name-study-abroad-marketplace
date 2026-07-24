'use client'

import { useActionState, useState, useTransition } from 'react'
import Link from 'next/link'
import { registerAdviser, sendApplicantEmailVerification } from '@/app/actions/auth'
import { useLanguage } from '@/app/context/language-context'
import { COUNTRY_OPTIONS } from '@/app/lib/i18n'

const CURRENT_YEAR = new Date().getFullYear()
const STORAGE_KEY = 'adviser-draft'

type Draft = {
  name: string; credential: string; school: string; major: string
  country: string; region: string; phdStartYear: string
  educationBackground: string; bio: string
}
const EMPTY: Draft = {
  name: '', credential: '', school: '', major: '',
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
      if (!saved) return EMPTY
      const parsed = JSON.parse(saved)
      return {
        ...EMPTY,
        ...parsed,
        credential: parsed.credential ?? parsed.email ?? '',
      }
    } catch {
      return EMPTY
    }
  })
  const [emailCode, setEmailCode] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [devCode, setDevCode] = useState('')
  const [isSending, startSending] = useTransition()

  function update(field: keyof Draft) {
    return (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const next = { ...draft, [field]: ev.target.value }
      setDraft(next)
      if (field === 'credential') {
        setEmailSent(false)
        setEmailError('')
        setEmailCode('')
        setDevCode('')
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
    }
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.credential)

  function handleSendEmailCode() {
    setEmailError('')
    startSending(async () => {
      const res = await sendApplicantEmailVerification(draft.credential)
      if (res.sent) {
        setEmailSent(true)
        if (res.devCode) setDevCode(res.devCode)
      } else {
        setEmailError(res.error ?? (locale === 'zh' ? '发送失败，请稍后重试' : 'Failed to send, please try again'))
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

          <Field label={t.credential} error={e.credential?.[0]}>
            <input name="credential" type="email" placeholder={t.credentialPh}
              autoComplete="username"
              value={draft.credential} onChange={update('credential')}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
          </Field>

          {isValidEmail && (
            <div className="rounded-xl border bg-blue-50/60 p-4 space-y-3">
              <p className="text-xs text-blue-700 font-medium">{t.emailVerify}</p>
              <div className="flex gap-2">
                <input name="emailCode" type="text" inputMode="numeric" maxLength={6}
                  placeholder={t.otpPh} value={emailCode}
                  onChange={ev => setEmailCode(ev.target.value)}
                  className="flex-1 rounded-xl border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition" />
                <button type="button" onClick={handleSendEmailCode} disabled={isSending}
                  className="whitespace-nowrap rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50 transition">
                  {isSending ? t.sending : emailSent ? t.resendCode : t.sendCode}
                </button>
              </div>
              {emailSent && !emailError && <p className="text-xs text-green-600">{t.codeSent}</p>}
              {emailSent && <p className="text-xs text-gray-400">{t.emailSpamHint}</p>}
              {devCode && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 flex items-center gap-2">
                  <span className="text-xs text-yellow-700">🛠 Dev:</span>
                  <span className="font-mono font-bold text-yellow-900 tracking-widest">{devCode}</span>
                </div>
              )}
              {emailError && <p className="text-xs text-red-500">{emailError}</p>}
              {e.emailCode && <p className="text-xs text-red-500">{e.emailCode[0]}</p>}
            </div>
          )}

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
