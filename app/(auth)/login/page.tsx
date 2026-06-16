'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login } from '@/app/actions/auth'
import { useLanguage } from '@/app/context/language-context'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)
  const { d } = useLanguage()
  const t = d.login

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="mt-2 text-gray-500 text-sm">{t.subtitle}</p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-8">
        <form action={action} className="space-y-5">
          <div>
            <label htmlFor="credential" className="block text-sm font-medium mb-1.5">
              {t.credential}
            </label>
            <input id="credential" name="credential" type="text"
              placeholder={t.credentialPlaceholder} autoComplete="username"
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
            {state?.errors?.credential && (
              <p className="mt-1 text-xs text-red-500">{state.errors.credential[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">
              {t.password}
            </label>
            <input id="password" name="password" type="password"
              placeholder={t.passwordPlaceholder} autoComplete="current-password"
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
            {state?.errors?.password && (
              <p className="mt-1 text-xs text-red-500">{state.errors.password[0]}</p>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              name="rememberMe"
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span>
              <span className="font-medium text-gray-700">{t.rememberMe}</span>
              <span className="block text-xs text-gray-400 mt-0.5">{t.rememberMeHint}</span>
            </span>
          </label>

          {state?.message && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {state.message}
            </p>
          )}

          <button type="submit" disabled={pending}
            className="w-full rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50 transition">
            {pending ? t.loggingIn : t.loginBtn}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t.noAccount}{' '}
        <Link href="/register/applicant" className="font-medium text-black underline">
          {d.common.studentRegister}
        </Link>
        {' '}{d.common.or}{' '}
        <Link href="/register/adviser" className="font-medium text-black underline">
          {d.common.adviserRegister}
        </Link>
      </p>
    </div>
  )
}
