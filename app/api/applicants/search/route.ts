import { NextResponse } from 'next/server'
import { searchApplicants } from '@/app/lib/applicants'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const results = searchApplicants(body || {})
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }
}
