# Production Deployment Guide

## ⚠️ Critical: Hosting Requirements

This app stores all data in `.data/*.json` files and user uploads in `.data/uploads` on the server filesystem.
**Vercel serverless functions have a read-only filesystem — data will be lost between requests.**

✅ **Recommended hosts** (persistent filesystem):
| Host | Free tier | How to persist `.data/` |
|------|-----------|------------------------|
| [Railway](https://railway.app) | $5 credit/mo | Add a Volume → mount at `/app/.data` |
| [Render](https://render.com) | 750 hrs/mo | Add a Disk → mount at `/app/.data` |
| [Fly.io](https://fly.io) | 3 free VMs | Add a Fly Volume → mount at `/app/.data` |
| Any VPS (DigitalOcean, etc.) | ~$6/mo | Run `npm start` directly |

❌ **Vercel**: Works for demos (seed data loads), but new registrations/orders are lost between cold starts.

---

## Step-by-step: Railway (recommended)

### 1. Push code to GitHub
Do **not** commit `.env.local` or `.data/`. `.data/` contains local users, orders, reviews, slots, and OTPs.

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

### 2. Create Railway project
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select your repository
3. Railway auto-detects Next.js and sets `npm run build` + `npm start`

### 3. Add a persistent Volume
1. In your Railway service → **Volumes** → Add Volume
2. Mount path: `/app/.data`
3. This ensures `.data/*.json` files and uploaded adviser materials survive deployments and restarts
4. The app will create the needed JSON files automatically when users register or create data

### 4. Set environment variables
In Railway → Variables, add every variable from `.env.example`:

```
NEXT_PUBLIC_URL=https://YOUR-APP.up.railway.app
SUPPORT_EMAIL=support@YOUR-DOMAIN.com
DATA_DIR=.data
UPLOAD_DIR=.data/uploads
SESSION_SECRET=<256-char hex — generate below>
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PAYMENT_METHODS=card
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@YOUR-DOMAIN.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=you@gmail.com
```

For production email, prefer `RESEND_API_KEY` + `EMAIL_FROM`. Gmail SMTP can
timeout on cloud hosts, so keep it only as a fallback.

Generate SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(128).toString('hex'))"
```

### 5. Deploy
Railway redeploys automatically on every `git push`.

---

## Stripe Setup for Live Mode

### Switch from test → live keys
1. Stripe Dashboard → toggle "Test mode" off (top-right)
2. Developers → API keys → copy `sk_live_...` and `pk_live_...`
3. Update `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Railway

### Create live webhook endpoint
1. Stripe Dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://YOUR-DOMAIN.com/api/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the **Signing secret** (`whsec_...`) → update `STRIPE_WEBHOOK_SECRET`

### Stripe Connect (adviser payouts)
- Ensure your Stripe account has **Connect** enabled (Platform settings)
- Advisers will go through Express onboarding when they click "Connect Stripe"
- Commission: 15% platform fee is hardcoded in `app/lib/stripe.ts` (`PLATFORM_RATE`)

### Enable Alipay / WeChat Pay
1. Stripe Dashboard → Settings → Payment methods
2. Enable **Alipay** and **WeChat Pay** for Checkout, if Stripe allows them for
   your account/country.
3. Railway → Variables → set:
   ```env
   STRIPE_PAYMENT_METHODS=card,alipay,wechat_pay
   ```
4. Redeploy Railway. If Stripe rejects either method, temporarily set it back to
   `STRIPE_PAYMENT_METHODS=card` until the payment method is fully approved.

---

## Custom Domain (optional)
1. Railway → Settings → Custom Domains → Add domain
2. Point your DNS CNAME to the Railway-provided value
3. Update `NEXT_PUBLIC_URL` to your custom domain
4. Update Stripe webhook URL to use your custom domain

---

## Launch Checklist

### Before going live:
- [ ] Generate a new `SESSION_SECRET` (never reuse dev secret in production)
- [ ] Switch Stripe to **live mode** keys
- [ ] Add live Stripe webhook endpoint and update `STRIPE_WEBHOOK_SECRET`
- [ ] Set `NEXT_PUBLIC_URL` to your production URL
- [ ] Configure SMTP (Gmail App Password) for OTP emails
- [ ] Use email registration for launch, or wire a real SMS provider before enabling phone registration in production
- [ ] Add Railway volume at `/app/.data` for data and upload persistence
- [ ] Set all env vars in Railway (or your chosen host)
- [ ] Visit `/api/health` — it should return `ok: true`
- [ ] Deploy and visit `/` — confirm the app loads
- [ ] Register a test adviser account and a test student account
- [ ] Adviser: connect Stripe (live), set availability, set service prices
- [ ] Student: book a slot, pay ¥1 (cheapest slot) with a real card
- [ ] Verify the order appears in adviser dashboard
- [ ] Adviser: mark service complete
- [ ] Student: confirm (or wait 48h for auto-release)
- [ ] Verify payout appears in adviser's Stripe dashboard
- [ ] Check that OTP emails arrive in your inbox
- [ ] Review `/terms`, `/privacy`, `/contact` pages — update contact email

### After launch:
- [ ] Monitor Stripe webhook events for failures
- [ ] Set up Railway health checks (or uptime monitoring)
- [ ] Back up `.data/*.json` regularly (Railway volumes are persistent but not backed up automatically)
- [ ] Consider migrating to a real database (PostgreSQL via Neon/Supabase) for production scale

---

## Build & Start Commands

| Command | What it does |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Compile for production |
| `npm start` | Start production server (port 3000) |
| `npm run dev` | Local development (port 3000, hot reload) |

No database migrations needed — the app uses JSON file persistence.
