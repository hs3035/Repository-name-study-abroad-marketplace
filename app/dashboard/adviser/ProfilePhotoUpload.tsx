'use client'

import { useState, useTransition, useRef } from 'react'
import { uploadAdviserPhoto } from '@/app/actions/adviser'

export default function ProfilePhotoUpload({
  currentUrl,
  locale,
}: {
  currentUrl: string
  locale: string
}) {
  const zh = locale === 'zh'
  const [url, setUrl]         = useState(currentUrl)
  const [err, setErr]         = useState('')
  const [uploading, startUp]  = useTransition()
  const ref = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr('')
    startUp(async () => {
      const fd = new FormData()
      fd.set('photo', file)
      const res = await uploadAdviserPhoto(fd)
      if (res.ok && res.url) setUrl(res.url)
      else setErr(res.error ?? (zh ? '上传失败' : 'Upload failed'))
    })
  }

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div
        className="w-20 h-20 rounded-full border-2 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer hover:opacity-80 transition"
        onClick={() => ref.current?.click()}
        title={zh ? '点击上传头像' : 'Click to upload photo'}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl text-gray-300">👤</span>
        )}
      </div>
      <button
        type="button"
        disabled={uploading}
        onClick={() => ref.current?.click()}
        className="text-xs text-gray-500 hover:text-black disabled:opacity-50 transition"
      >
        {uploading ? (zh ? '上传中…' : 'Uploading…') : (zh ? '上传头像' : 'Upload photo')}
      </button>
      {err && <p className="text-xs text-red-500 text-center max-w-[80px]">{err}</p>}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
