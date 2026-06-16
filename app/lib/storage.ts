import path from 'path'

export function getUploadRoot(): string {
  const configured = process.env.UPLOAD_DIR
  if (configured) {
    if (path.isAbsolute(configured)) return configured
    return path.join(process.cwd(), configured)
  }
  return path.join(process.cwd(), '.data', 'uploads')
}

export function getUploadPath(...segments: string[]): string {
  return path.join(getUploadRoot(), ...segments)
}

export function getUploadPublicUrl(...segments: string[]): string {
  return `/uploads/${segments.map(encodeURIComponent).join('/')}`
}

export function resolveUploadRequestPath(segments: string[]): string | null {
  const root = path.join(process.cwd(), '.data', 'uploads')
  const target = path.join(process.cwd(), '.data', 'uploads', ...segments)
  const relative = path.relative(root, target)
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null
  return target
}
