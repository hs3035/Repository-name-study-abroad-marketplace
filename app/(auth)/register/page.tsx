'use client'

import Link from 'next/link'
import { useLanguage } from '@/app/context/language-context'

export default function RegisterPage() {
  const { d } = useLanguage()
  const t = d.registerSelect

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="mt-2 text-gray-500 text-sm">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/register/applicant"
          className="flex flex-col items-center rounded-2xl border bg-white p-8 shadow-sm hover:border-black hover:shadow-md transition">
          <span className="text-4xl mb-4">🎓</span>
          <span className="text-lg font-semibold">{t.studentRole}</span>
          <span className="mt-2 text-xs text-gray-500 text-center">{t.studentDesc}</span>
        </Link>

        <Link href="/register/adviser"
          className="flex flex-col items-center rounded-2xl border bg-white p-8 shadow-sm hover:border-black hover:shadow-md transition">
          <span className="text-4xl mb-4">🔬</span>
          <span className="text-lg font-semibold">{t.adviserRole}</span>
          <span className="mt-2 text-xs text-gray-500 text-center">{t.adviserDesc}</span>
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        {d.common.hasAccount}{' '}
        <Link href="/login" className="font-medium text-black underline">
          {d.common.directLogin}
        </Link>
      </p>
    </div>
  )
}
