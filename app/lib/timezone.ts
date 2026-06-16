// ── Timezone options ──────────────────────────────────────────────────────────

export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York',    zh: '美国东部 (ET)',      en: 'US Eastern (ET)'         },
  { value: 'America/Chicago',     zh: '美国中部 (CT)',      en: 'US Central (CT)'         },
  { value: 'America/Denver',      zh: '美国山地 (MT)',      en: 'US Mountain (MT)'        },
  { value: 'America/Los_Angeles', zh: '美国西部 (PT)',      en: 'US Pacific (PT)'         },
  { value: 'America/Toronto',     zh: '加拿大东部 (ET)',    en: 'Canada Eastern (ET)'     },
  { value: 'America/Vancouver',   zh: '加拿大西部 (PT)',    en: 'Canada Pacific (PT)'     },
  { value: 'Europe/London',       zh: '英国 (GMT/BST)',     en: 'UK (GMT/BST)'            },
  { value: 'Europe/Paris',        zh: '法国 (CET)',         en: 'France (CET)'            },
  { value: 'Europe/Berlin',       zh: '德国 (CET)',         en: 'Germany (CET)'           },
  { value: 'Europe/Amsterdam',    zh: '荷兰 (CET)',         en: 'Netherlands (CET)'       },
  { value: 'Australia/Sydney',    zh: '澳大利亚东部 (AEST)',en: 'Australia Eastern (AEST)'},
  { value: 'Australia/Melbourne', zh: '澳大利亚维多利亚',   en: 'Australia Victoria'      },
  { value: 'Asia/Tokyo',          zh: '日本 (JST)',         en: 'Japan (JST)'             },
  { value: 'Asia/Seoul',          zh: '韩国 (KST)',         en: 'Korea (KST)'             },
  { value: 'Asia/Singapore',      zh: '新加坡 (SGT)',       en: 'Singapore (SGT)'         },
  { value: 'Asia/Shanghai',       zh: '中国 (CST)',         en: 'China (CST)'             },
  { value: 'Asia/Hong_Kong',      zh: '香港 (HKT)',         en: 'Hong Kong (HKT)'         },
] as const

export type TZValue = typeof TIMEZONE_OPTIONS[number]['value']

// ── Conversion utilities ──────────────────────────────────────────────────────

/**
 * Convert a local date+time in a given timezone to a UTC ISO string.
 * Uses the Intl offset-trick (no external dependencies).
 */
export function zonedToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  // Step 1: treat the input as if it were UTC to get a reference timestamp
  const estimate = new Date(`${dateStr}T${timeStr}:00Z`)

  // Step 2: see what that UTC moment looks like in the target timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(estimate)

  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0')
  const tzH = get('hour') === 24 ? 0 : get('hour')
  const offset = estimate.getTime() - Date.UTC(get('year'), get('month') - 1, get('day'), tzH, get('minute'), 0)

  // Step 3: apply offset to get the true UTC for our desired local time
  const [h, m] = timeStr.split(':').map(Number)
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h, m, 0) + offset)
}

/**
 * Convert a UTC Date to { date, time, tzLabel } in a given timezone.
 */
export function utcToZoned(utcDate: Date, timezone: string): { date: string; time: string; tzLabel: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).formatToParts(utcDate)

  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  const h = get('hour') === '24' ? '00' : get('hour')
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${h}:${get('minute')}`,
    tzLabel: get('timeZoneName'),
  }
}

/** Format a UTC date for display in a timezone, locale-aware. */
export function formatSlotDisplay(utcDate: Date, timezone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(utcDate)
}

/** Round a Date to the nearest minute (strip sub-minute precision). */
export function roundToMinute(d: Date): Date {
  return new Date(Math.round(d.getTime() / 60000) * 60000)
}

/** Get the UTC ISO string for a slot key (rounded to minute). */
export function slotKey(utcDate: Date): string {
  return roundToMinute(utcDate).toISOString()
}
