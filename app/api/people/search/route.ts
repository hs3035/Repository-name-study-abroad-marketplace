import { NextResponse } from 'next/server'
import { searchAdvisers } from '@/app/lib/advisers'
import { searchApplicants } from '@/app/lib/applicants'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const advisers = searchAdvisers(body || {})
    const applicants = searchApplicants(body || {})
    return NextResponse.json({ advisers, applicants })
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }
}
