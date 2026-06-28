import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_URL || 'https://gomentorgo.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api/',
        '/checkout',
        '/dashboard/',
        '/payment/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
