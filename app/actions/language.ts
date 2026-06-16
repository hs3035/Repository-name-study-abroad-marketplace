'use server'

import { cookies } from 'next/headers'
import type { Locale } from '@/app/lib/i18n'

export async function setLanguage(locale: Locale): Promise<void> {
  const store = await cookies()
  store.set('locale', locale, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  })
}
