'use server'

import { getAdviserById } from '@/app/lib/advisers'

export type MeetingLinks = {
  zoom?: string
  tencent?: string
  lark?: string
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
