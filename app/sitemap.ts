import type { MetadataRoute } from 'next'
import { getAllAdvisers } from '@/app/lib/advisers'

const siteUrl = process.env.NEXT_PUBLIC_URL || 'https://gomentorgo.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const publicRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/register/applicant`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/register/adviser`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const adviserRoutes: MetadataRoute.Sitemap = getAllAdvisers().map(adviser => ({
    url: `${siteUrl}/advisers/${adviser.id}`,
    lastModified: adviser.updatedAt ? new Date(adviser.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: adviser.bookingReady ? 0.8 : 0.5,
  }))

  return [...publicRoutes, ...adviserRoutes]
}
