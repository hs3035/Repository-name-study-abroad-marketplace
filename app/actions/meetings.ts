'use server'

import { getAdviserById } from '@/app/lib/advisers'
import type { AdviserContactInfo } from '@/app/lib/advisers'

export type MeetingLinks = {
  zoom?: string
  tencent?: string
  lark?: string
}

export type AdviserMeetingDetails = {
  meetingLinks?: MeetingLinks
  contactInfo?: AdviserContactInfo
}

export async function fetchMeetingLinksForAdvisers(
  adviserIds: string[],
): Promise<Record<string, MeetingLinks>> {
  const result: Record<string, MeetingLinks> = {}
  for (const id of adviserIds) {
    const adviser = getAdviserById(id)
    if (adviser?.meetingLinks) result[id] = adviser.meetingLinks
  }
  return result
}

export async function fetchMeetingDetailsForAdvisers(
  adviserIds: string[],
): Promise<Record<string, AdviserMeetingDetails>> {
  const result: Record<string, AdviserMeetingDetails> = {}
  for (const id of adviserIds) {
    const adviser = getAdviserById(id)
    if (!adviser) continue
    result[id] = {
      meetingLinks: adviser.meetingLinks,
      contactInfo: adviser.contactInfo,
    }
  }
  return result
}
