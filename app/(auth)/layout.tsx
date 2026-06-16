import LanguageSwitcher from '@/app/components/LanguageSwitcher'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  )
}
