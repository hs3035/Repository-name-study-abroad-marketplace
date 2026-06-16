'use client'

import { useState } from 'react'

type Person = {
  id: string
  name: string
  email?: string
  phone?: string
  country?: string
  intendedMajor?: string
  applicationLevel?: string
  school?: string
  major?: string
  chatPrice?: number
  role?: 'adviser' | 'applicant'
}

export default function SearchPeopleClient() {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [major, setMajor] = useState('')
  const [level, setLevel] = useState('')
  const [results, setResults] = useState<{ advisers: Person[]; applicants: Person[] } | null>(null)
  const [loading, setLoading] = useState(false)

  async function doSearch(ev?: React.FormEvent) {
    ev?.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/people/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, country, intendedMajor: major, applicationLevel: level, major }),
      })
      const data = await res.json()
      setResults({ advisers: data.advisers ?? [], applicants: data.applicants ?? [] })
    } catch {
      setResults({ advisers: [], applicants: [] })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={doSearch} className="grid grid-cols-4 gap-2 mb-4">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="姓名" className="col-span-1 rounded-xl border px-3 py-2 text-sm" />
        <input value={country} onChange={e => setCountry(e.target.value)} placeholder="国家" className="col-span-1 rounded-xl border px-3 py-2 text-sm" />
        <input value={major} onChange={e => setMajor(e.target.value)} placeholder="专业/服务" className="col-span-1 rounded-xl border px-3 py-2 text-sm" />
        <select value={level} onChange={e => setLevel(e.target.value)} className="col-span-1 rounded-xl border px-3 py-2 text-sm">
          <option value="">所有学位</option>
          <option value="undergraduate">本科</option>
          <option value="master">硕士</option>
          <option value="phd">博士</option>
        </select>
        <div className="col-span-4 flex gap-2 mt-2">
          <button type="submit" className="rounded-xl bg-black text-white px-4 py-2 text-sm" disabled={loading}>{loading ? '搜索中...' : '搜索'}</button>
          <button type="button" onClick={() => { setName(''); setCountry(''); setMajor(''); setLevel(''); setResults(null) }} className="rounded-xl border px-4 py-2 text-sm">重置</button>
        </div>
      </form>

      <div>
        {results === null ? (
          <p className="text-sm text-gray-500">请输入条件并点击“搜索”</p>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">导师 ({results.advisers.length})</h3>
              {results.advisers.length === 0 ? <p className="text-sm text-gray-500">未找到导师</p> : (
                <ul className="space-y-2">
                  {results.advisers.map(a => (
                    <li key={a.id} className="p-3 border rounded-xl">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{a.name}</div>
                          <div className="text-xs text-gray-500">{a.school ?? ''} · {a.major ?? ''}</div>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <div>{a.country ?? ''}</div>
                          <div>面谈价: ¥{a.chatPrice ?? ''}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-2">学生 ({results.applicants.length})</h3>
              {results.applicants.length === 0 ? <p className="text-sm text-gray-500">未找到学生</p> : (
                <ul className="space-y-2">
                  {results.applicants.map(s => (
                    <li key={s.id} className="p-3 border rounded-xl">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-gray-500">{s.intendedMajor ?? ''} · {s.applicationLevel ?? ''}</div>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <div>{s.country ?? ''}</div>
                          <div>{s.email ?? s.phone ?? ''}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
