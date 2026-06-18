import nodemailer from 'nodemailer'

type EmailPayload = {
  to: string
  subject: string
  html: string
}

// ── SMTP transporter (shared instance) ───────────────────────────────────────

function createTransporter() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const host = process.env.SMTP_HOST ?? 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT ?? 587)

  if (!user || !pass) return null

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms)
    }),
  ])
}

function getEmailHtml(code: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="margin-bottom:8px">邮箱验证码</h2>
      <p style="color:#555;margin-bottom:24px">请在注册页面填入以下验证码，有效期 10 分钟。</p>
      <div style="background:#f4f4f5;border-radius:12px;padding:24px;text-align:center">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111">${code}</span>
      </div>
      <p style="color:#999;font-size:12px;margin-top:24px">请勿将验证码告知他人。</p>
    </div>
  `
}

async function sendWithResend(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const from = process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? process.env.SMTP_USER
  if (!from) throw new Error('EMAIL_FROM is not configured')

  console.log('[email] Sending OTP email via Resend', { to: payload.to, from })

  const res = await withTimeout(
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `"留学导师平台" <${from}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    }),
    15_000,
    'Resend send timeout',
  )

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend email failed (${res.status}): ${body}`)
  }
}

async function sendWithSmtp(payload: EmailPayload): Promise<void> {
  const transporter = createTransporter()
  if (!transporter) throw new Error('SMTP is not configured')

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER
  console.log('[email] Sending OTP email via SMTP', {
    to: payload.to,
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: process.env.SMTP_PORT ?? '587',
    from,
  })
  await withTimeout(
    transporter.sendMail({
      from: `"留学导师平台" <${from}>`,
      ...payload,
    }),
    15_000,
    'SMTP send timeout',
  )
}

// ── Email ─────────────────────────────────────────────────────────────────────

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const payload = {
    to,
    subject: '【留学导师平台】邮箱验证码',
    html: getEmailHtml(code),
  }

  if (process.env.RESEND_API_KEY) {
    await sendWithResend(payload)
    return
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email provider is not configured')
    }
    // Dev fallback — code shown in terminal and on-screen Dev badge
    console.log('\n──────────────────────────────────────')
    console.log('📧  邮箱验证码（未配置 SMTP）')
    console.log(`    收件人: ${to}`)
    console.log(`    验证码: ${code}`)
    console.log('    有效期: 10 分钟')
    console.log('──────────────────────────────────────\n')
    return
  }

  await sendWithSmtp(payload)
}

// ── SMS (stub) ────────────────────────────────────────────────────────────────

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SMS provider is not configured')
  }

  // Dev fallback — code shown on-screen via Dev badge
  console.log('\n──────────────────────────────────────')
  console.log('📱  短信验证码（未配置短信服务）')
  console.log(`    手机号: ${phone}`)
  console.log(`    验证码: ${code}`)
  console.log('    有效期: 10 分钟')
  console.log('──────────────────────────────────────\n')

  // TODO: 接入短信服务商（阿里云/腾讯云/Twilio），在 .env.local 配置密钥后取消注释
  // import twilio from 'twilio'
  // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
  // await client.messages.create({
  //   body: `【留学导师平台】验证码：${code}，10分钟内有效，请勿泄露。`,
  //   from: process.env.TWILIO_PHONE,
  //   to: `+86${phone}`,
  // })
}
