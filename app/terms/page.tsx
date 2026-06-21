import Link from 'next/link'

export const metadata = { title: '服务条款 | GoMentorGo' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-8">

        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-black transition">← 返回首页</Link>
          <h1 className="text-2xl font-bold mt-4">服务条款</h1>
          <p className="text-sm text-gray-400 mt-1">最后更新：2025年1月1日</p>
        </div>

        {[
          {
            title: '1. 平台性质',
            body: '本平台（以下简称"平台"）是一个连接留学申请者与在读博士/博士后导师的信息撮合平台。平台本身不提供留学申请服务，所有咨询服务由注册导师独立提供。',
          },
          {
            title: '2. 用户资格',
            body: '注册用户须年满18周岁，并提供真实有效的个人信息。导师注册须持有有效的高校学籍或工作证明。平台有权对虚假信息进行封号处理。',
          },
          {
            title: '3. 服务与付款',
            body: '学生通过平台向导师付款，资金由平台托管。导师完成服务并由学生确认后，平台扣除10%服务费，将剩余90%结算给导师。学生在导师标记完成后24小时内可申请退款；超时自动确认，款项释放给导师。',
          },
          {
            title: '4. 退款政策',
            body: '导师标记服务完成后24小时内，学生可提交退款申请。平台将介入审核，根据实际情况决定退款比例。一旦款项已释放给导师，原则上不予退款，特殊情况由平台协调处理。详见《退款政策》。',
          },
          {
            title: '5. 禁止行为',
            body: '禁止绕过平台私下交易；禁止发布虚假评价；禁止上传违法、侵权内容；禁止冒充他人身份注册。违者将被永久封号，并保留追究法律责任的权利。',
          },
          {
            title: '6. 免责声明',
            body: '平台不对导师提供的留学建议的准确性或最终申请结果作任何保证。用户应自行判断咨询内容的适用性。平台对因不可抗力、网络故障或第三方服务中断导致的损失不承担责任。',
          },
          {
            title: '7. 隐私保护',
            body: '平台收集的个人信息仅用于提供服务，不会出售给第三方。详见《隐私政策》。',
          },
          {
            title: '8. 条款变更',
            body: '平台有权随时修改本条款，修改后的条款在平台公告后生效。继续使用平台即视为接受最新条款。',
          },
          {
            title: '9. 联系我们',
            body: '如有疑问，请通过"联系我们"页面提交，或发送邮件至平台客服邮箱。',
          },
        ].map(s => (
          <section key={s.title} className="bg-white rounded-2xl border p-6 space-y-2">
            <h2 className="font-semibold text-gray-900">{s.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
          </section>
        ))}

        <div className="flex gap-4 text-xs text-gray-400 pt-2">
          <Link href="/privacy" className="hover:text-black transition">隐私政策</Link>
          <Link href="/contact" className="hover:text-black transition">联系我们</Link>
          <Link href="/" className="hover:text-black transition">返回首页</Link>
        </div>
      </div>
    </div>
  )
}
