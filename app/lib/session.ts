import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { getSessionSecret } from './env'

const encodedKey = new TextEncoder().encode(getSessionSecret())

export type SessionPayload = {
  userId: string
  name: string
  role: 'adviser' | 'applicant'
}

export async function encrypt(payload: SessionPayload, maxAgeDays = 7): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeDays}d`)
    .sign(encodedKey)
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function createSession(
  userId: string,
  name: string,
  role: 'adviser' | 'applicant',
  maxAgeDays = 7,
): Promise<void> {
  const expiresAt = new Date(Date.now() + maxAgeDays * 24 * 60 * 60 * 1000)
  const token = await encrypt({ userId, name, role }, maxAgeDays)
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  return decrypt(token)
}
