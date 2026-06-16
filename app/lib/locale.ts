import { cookies } from 'next/headers'
import type { Locale } from '@/app/lib/i18n'

export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies()
    return store.get('locale')?.value === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}
