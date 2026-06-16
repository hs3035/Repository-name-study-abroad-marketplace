import fs from 'fs/promises'
import { resolveUploadRequestPath } from '@/app/lib/storage'

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const filePath = resolveUploadRequestPath(path)
  if (!filePath) return new Response('Not found', { status: 404 })

  try {
    const bytes = await fs.readFile(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
    return new Response(bytes, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
