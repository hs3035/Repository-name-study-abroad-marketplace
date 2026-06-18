import Link from 'next/link'
import { getSupportEmail } from '@/app/lib/env'

export const metadata = { title: '联系我们 | GoMentorGo' }

export default function ContactPage() {
  const supportEmail = getSupportEmail()

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-6">

        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-black transition">← 返回首页</Link>
          <h1 className="text-2xl font-bold mt-4">联系我们</h1>
          <p className="text-sm text-gray-500 mt-1">我们会在 1–3 个工作日内回复。</p>
        </div>

        {/* Contact channels */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-white rounded-2xl border p-6 space-y-2">
            <p className="text-lg">📧</p>
            <p className="font-semibold text-sm">邮件咨询</p>
            <p className="text-sm text-gray-500">适合：退款、账号、支付问题</p>
            <a
              href={`mailto:${supportEmail}`}
              className="inline-block mt-2 text-sm text-blue-600 hover:underline"
            >
              {supportEmail}
            </a>
          </div>

          <div className="bg-white rounded-2xl border p-6 space-y-2">
            <p className="text-lg">🐛</p>
            <p className="font-semibold text-sm">问题反馈</p>
            <p className="text-sm text-gray-500">适合：功能问题、页面报错</p>
            <p className="text-sm text-gray-400 mt-2">请截图并发送邮件说明情况</p>
          </div>
        </div>

        {/* FAQ quick links */}
        <div className="bg-white rounded-2xl border p-6 space-y-4">
          <h2 className="font-semibold">常见问题</h2>

          {[
            {
              q: '付款后导师没有回应怎么办？',
              a: '请在订单页面通过"申请退款"提交申请，平台将介入处理，通常在 3 个工作日内解决。',
            },
            {
              q: '如何成为平台导师？',
              a: '点击首页"成为导师"，完成注册并上传学籍证明即可。审核通过后即可发布服务。',
            },
            {
              q: '平台收取多少手续费？',
              a: '平台向导师收取 15% 服务费，学生无需额外支付手续费。',
            },
            {
              q: '付款安全吗？',
              a: '所有支付通过 Stripe 处理，平台不接触你的银行卡信息。资金由平台托管，服务确认后才会释放给导师。',
            },
            {
              q: '如何修改或取消预约？',
              a: '目前预约一经支付即锁定，请在 48 小时确认窗口内通过"申请退款"处理。如有特殊情况请联系平台客服。',
            },
          ].map(item => (
            <details key={item.q} className="group border-b last:border-0 pb-3 last:pb-0">
              <summary className="text-sm font-medium cursor-pointer list-none flex justify-between items-center">
                {item.q}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="flex gap-4 text-xs text-gray-400 pt-2">
          <Link href="/terms" className="hover:text-black transition">服务条款</Link>
          <Link href="/privacy" className="hover:text-black transition">隐私政策</Link>
          <Link href="/" className="hover:text-black transition">返回首页</Link>
        </div>

      </div>
    </div>
  )
}
