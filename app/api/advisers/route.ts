import { NextResponse } from 'next/server'
import { getAllAdvisers } from '@/app/lib/advisers'

export async function GET() {
  const advisers = getAllAdvisers()
  return NextResponse.json({ advisers })
}
