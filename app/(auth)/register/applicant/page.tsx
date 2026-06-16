'use client'

import { useActionState, useState, useTransition } from 'react'
import Link from 'next/link'
import { registerApplicant, sendPhoneVerification, sendApplicantEmailVerification } from '@/app/actions/auth'
import { useLanguage } from '@/app/context/language-context'

const STORAGE_KEY = 'applicant-draft'
const PHONE_RE = /^1[3-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Level = 'undergraduate' | 'master' | 'phd' | ''
type Draft = { name: string; credential: string; intendedMajor: string; applicationLevel: Level }
const EMPTY: Draft = { name: '', credential: '', intendedMajor: '', applicationLevel: '' }

export default function ApplicantRegisterPage() {
  const [state, action, pending] = useActionState(registerApplicant, undefined)
  const { d, locale } = useLanguage()
  const t = d.applicantReg
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
  const [smsCode, setSmsCode] = useState('')
  const [smsSent, setSmsSent] = useState(false)
  const [smsError, setSmsError] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [devCode, setDevCode] = useState('')
  const [isSending, startSending] = useTransition()

  function update(field: keyof Draft) {
    return (ev: React.ChangeEvent<HTMLInputElement>) => {
      const next = { ...draft, [field]: ev.target.value }
      setDraft(next)
      if (field === 'credential') {
        setSmsSent(false)
        setSmsError('')
        setSmsCode('')
        setEmailSent(false)
        setEmailError('')
        setEmailCode('')
        setDevCode('')
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
    }
  }

  function setLevel(level: Level) {
    const next = { ...draft, applicationLevel: level }
    setDraft(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  const isPhone = PHONE_RE.test(draft.credential)
  const isEmail = EMAIL_RE.test(draft.credential) && !isPhone

  function handleSendSms() {
    setSmsError('')
    startSending(async () => {
      const res = await sendPhoneVerification(draft.credential)
      if (res.sent) {
        setSmsSent(true)
        if (res.devCode) setDevCode(res.devCode)
      } else {
        setSmsError(res.error ?? (locale === 'zh' ? '发送失败，请稍后重试' : 'Failed to send, please try again'))
      }
    })
  }

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

  const levels: { value: Level & string; label: string }[] = [
    { value: 'undergraduate', label: t.levelUndergraduate },
    { value: 'master',        label: t.levelMaster },
    { value: 'phd',           label: t.levelPhd },
  ]

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="mt-2 text-gray-500 text-sm">{t.subtitle}</p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-8">
        <form action={action} className="space-y-5">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">{t.name}</label>
            <input name="name" type="text" placeholder={t.namePh}
              value={draft.name} onChange={update('name')}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
            {e.name && <p className="mt-1 text-xs text-red-500">{e.name[0]}</p>}
          </div>

          {/* Credential + phone OTP */}
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t.credential}</label>
              <input name="credential" type="text" placeholder={t.credentialPh}
                autoComplete="username"
                value={draft.credential} onChange={update('credential')}
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
              {e.credential && <p className="mt-1 text-xs text-red-500">{e.credential[0]}</p>}
            </div>

            {isPhone && (
              <div className="rounded-xl border bg-blue-50/60 p-4 space-y-3">
                <p className="text-xs text-blue-700 font-medium">{t.phoneVerify}</p>
                <div className="flex gap-2">
                  <input name="smsCode" type="text" inputMode="numeric" maxLength={6}
                    placeholder={t.smsPh} value={smsCode}
                    onChange={ev => setSmsCode(ev.target.value)}
                    className="flex-1 rounded-xl border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition" />
                  <button type="button" onClick={handleSendSms} disabled={isSending}
                    className="whitespace-nowrap rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50 transition">
                    {isSending ? t.smsSending : smsSent ? t.resendSms : t.sendSms}
                  </button>
                </div>
                {smsSent && !smsError && (
                  <p className="text-xs text-green-600">{t.smsSent}</p>
                )}
                {devCode && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 flex items-center gap-2">
                    <span className="text-xs text-yellow-700">🛠 Dev:</span>
                    <span className="font-mono font-bold text-yellow-900 tracking-widest">{devCode}</span>
                  </div>
                )}
                {smsError && <p className="text-xs text-red-500">{smsError}</p>}
                {e.smsCode && <p className="text-xs text-red-500">{e.smsCode[0]}</p>}
              </div>
            )}

            {isEmail && (
              <div className="rounded-xl border bg-blue-50/60 p-4 space-y-3">
                <p className="text-xs text-blue-700 font-medium">{t.emailVerify}</p>
                <div className="flex gap-2">
                  <input name="emailCode" type="text" inputMode="numeric" maxLength={6}
                    placeholder={t.emailPh} value={emailCode}
                    onChange={ev => setEmailCode(ev.target.value)}
                    className="flex-1 rounded-xl border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black transition" />
                  <button type="button" onClick={handleSendEmailCode} disabled={isSending}
                    className="whitespace-nowrap rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50 transition">
                    {isSending ? t.emailSending : emailSent ? t.resendEmailCode : t.sendEmailCode}
                  </button>
                </div>
                {emailSent && !emailError && (
                  <p className="text-xs text-green-600">{t.emailSent}</p>
                )}
                {emailSent && (
                  <p className="text-xs text-gray-400">{t.emailSpamHint}</p>
                )}
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
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5">{t.password}</label>
            <input name="password" type="password" placeholder={t.passwordPh}
              autoComplete="new-password"
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
            {e.password && <p className="mt-1 text-xs text-red-500">{e.password[0]}</p>}
          </div>

          {/* Application level */}
          <div>
            <label className="block text-sm font-medium mb-2">{t.applicationLevel}</label>
            <div className="grid grid-cols-3 gap-2">
              {levels.map(({ value, label }) => (
                <label key={value} className="cursor-pointer">
                  <input type="radio" name="applicationLevel" value={value}
                    checked={draft.applicationLevel === value}
                    onChange={() => setLevel(value)}
                    className="sr-only" />
                  <div className={`rounded-xl border py-2 text-center text-sm font-medium transition
                    ${draft.applicationLevel === value
                      ? 'bg-black text-white border-black'
                      : 'text-gray-600 hover:border-gray-400'}`}>
                    {label}
                  </div>
                </label>
              ))}
            </div>
            {e.applicationLevel && (
              <p className="mt-1 text-xs text-red-500">{e.applicationLevel[0]}</p>
            )}
          </div>

          {/* Intended major */}
          <div>
            <label className="block text-sm font-medium mb-1.5">{t.intendedMajor}</label>
            <input name="intendedMajor" type="text" placeholder={t.intendedMajorPh}
              value={draft.intendedMajor} onChange={update('intendedMajor')}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
            {e.intendedMajor && (
              <p className="mt-1 text-xs text-red-500">{e.intendedMajor[0]}</p>
            )}
          </div>

          {state?.message && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {state.message}
            </p>
          )}

          <button type="submit" disabled={pending}
            className="w-full rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50 transition">
            {pending ? t.registering : t.registerBtn}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        {d.common.hasAccount}{' '}
        <Link href="/login" className="font-medium text-black underline">{d.common.directLogin}</Link>
        {' '}·{' '}
        <Link href="/register/adviser" className="font-medium text-black underline">{d.common.adviserRegister}</Link>
      </p>
    </div>
  )
}
