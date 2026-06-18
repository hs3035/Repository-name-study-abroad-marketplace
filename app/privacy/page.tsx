import Link from 'next/link'

export const metadata = { title: '隐私政策 | GoMentorGo' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-8">

        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-black transition">← 返回首页</Link>
          <h1 className="text-2xl font-bold mt-4">隐私政策</h1>
          <p className="text-sm text-gray-400 mt-1">最后更新：2025年1月1日</p>
        </div>

        {[
          {
            title: '1. 我们收集哪些信息',
            body: '注册信息（姓名、邮箱/手机号、密码哈希值）；档案信息（学校、专业、个人介绍、头像）；交易信息（订单记录、支付状态）；使用日志（登录时间、操作记录）。我们不收集支付卡号——所有支付通过 Stripe 处理，平台不接触原始卡片数据。',
          },
          {
            title: '2. 我们如何使用信息',
            body: '提供平台核心功能（预约、支付、评价）；发送邮件验证码和服务通知；防止欺诈和违规行为；改进平台体验（匿名聚合统计）。',
          },
          {
            title: '3. 信息共享',
            body: '我们不出售用户个人信息。以下情况除外：（1）Stripe 支付处理——学生支付信息由 Stripe 处理，受 Stripe 隐私政策约束；（2）法律要求——依法律程序披露；（3）用户授权——用户主动公开的档案信息对其他用户可见。',
          },
          {
            title: '4. 信息存储与安全',
            body: '用户数据存储于服务器本地文件中，密码经 bcrypt 哈希处理后存储，明文密码不落库。会话令牌以 JWT 形式存储于 httpOnly Cookie，防止 XSS 读取。我们采取合理技术措施保护数据安全，但不能保证绝对安全。',
          },
          {
            title: '5. 用户权利',
            body: '您可以随时：登录后在"我的档案"中修改个人信息；通过联系我们请求删除账号及相关数据；要求导出您的个人数据副本。',
          },
          {
            title: '6. Cookie',
            body: '平台仅使用一个必要 Cookie（session）用于保持登录状态，不使用追踪性广告 Cookie。语言偏好通过单独的 locale Cookie 存储。',
          },
          {
            title: '7. 未成年人',
            body: '本平台不面向18周岁以下用户。如发现未成年人账号，我们将予以注销。',
          },
          {
            title: '8. 政策更新',
            body: '隐私政策更新时，我们将通过平台公告通知用户。继续使用平台视为接受更新后的政策。',
          },
          {
            title: '9. 联系我们',
            body: '如有隐私相关问题，请通过"联系我们"页面或发送邮件联系我们，我们将在7个工作日内回复。',
          },
        ].map(s => (
          <section key={s.title} className="bg-white rounded-2xl border p-6 space-y-2">
            <h2 className="font-semibold text-gray-900">{s.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
          </section>
        ))}

        <div className="flex gap-4 text-xs text-gray-400 pt-2">
          <Link href="/terms" className="hover:text-black transition">服务条款</Link>
          <Link href="/contact" className="hover:text-black transition">联系我们</Link>
          <Link href="/" className="hover:text-black transition">返回首页</Link>
        </div>
      </div>
    </div>
  )
}
