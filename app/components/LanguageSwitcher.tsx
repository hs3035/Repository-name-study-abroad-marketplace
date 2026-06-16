'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setLanguage } from '@/app/actions/language'
import { useLanguage } from '@/app/context/language-context'

export default function LanguageSwitcher() {
  const { locale } = useLanguage()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = locale === 'zh' ? 'en' : 'zh'
    startTransition(async () => {
      await setLanguage(next)
      router.refresh()
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-black hover:text-black disabled:opacity-50 transition"
    >
      {isPending ? '…' : locale === 'zh' ? 'EN' : '中文'}
    </button>
  )
}
