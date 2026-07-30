import type { MetadataRoute } from 'next'
import { getAllAdvisers } from '@/app/lib/advisers'
import { PUBLIC_ACADEMICS } from '@/app/lib/public-academics'

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
    {
      url: `${siteUrl}/academics`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  const adviserRoutes: MetadataRoute.Sitemap = getAllAdvisers().map(adviser => ({
    url: `${siteUrl}/advisers/${adviser.id}`,
    lastModified: adviser.updatedAt ? new Date(adviser.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: adviser.bookingReady ? 0.8 : 0.5,
  }))

  const academicRoutes: MetadataRoute.Sitemap = PUBLIC_ACADEMICS.map(person => ({
    url: `${siteUrl}/academics/${person.slug}`,
    lastModified: new Date(person.checkedAt),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...publicRoutes, ...adviserRoutes, ...academicRoutes]
}
