'use client'

import { createContext, useContext } from 'react'
import { getDict, type Dict, type Locale } from '@/app/lib/i18n'

type LanguageContextValue = { locale: Locale; d: Dict }

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'zh',
  d: getDict('zh'),
})

export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  return (
    <LanguageContext.Provider value={{ locale, d: getDict(locale) }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext)
}
