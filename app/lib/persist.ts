// Persist helpers must be server-only. Avoid importing Node builtin modules
// at module top-level so Next can safely bundle client code. Use runtime
// `require` (via eval) only on the server.

function isServer(): boolean {
  return typeof window === 'undefined' && typeof process !== 'undefined' && !!process.versions?.node
}

function nodeRequire(name: string): unknown {
  try {
    // use eval('require') to avoid bundlers statically analysing require
    // and including Node modules into client bundles.
    const req = eval('require') as (moduleName: string) => unknown
    return req(name)
  } catch {
    return null
  }
}

function resolveDataPath(relPath: string, path: typeof import('path')): string {
  const dataDir = process.env.DATA_DIR
  if (dataDir && (relPath === '.data' || relPath.startsWith('.data/'))) {
    const root = path.isAbsolute(dataDir) ? dataDir : path.join(process.cwd(), dataDir)
    return path.join(root, relPath.slice('.data/'.length))
  }
  return path.join(process.cwd(), relPath)
}

export function loadMapSync<T>(relPath: string): Map<string, T> {
  if (!isServer()) return new Map()
  const fs = nodeRequire('fs') as typeof import('fs') | null
  const path = nodeRequire('path') as typeof import('path') | null
  if (!fs || !path) return new Map()
  const p = resolveDataPath(relPath, path)
  if (!fs.existsSync(p)) return new Map()
  try {
    const raw = fs.readFileSync(p, 'utf8')
    const obj = JSON.parse(raw || '{}') as Record<string, T>
    return new Map(Object.entries(obj) as [string, T][])
  } catch {
    return new Map()
  }
}

export async function saveMap(relPath: string, map: Map<string, unknown>): Promise<void> {
  if (!isServer()) return
  const req = nodeRequire('fs') as typeof import('fs') | null
  const path = nodeRequire('path') as typeof import('path') | null
  if (!req || !path) return
  const fsPromises = req.promises
  const p = resolveDataPath(relPath, path)
  await fsPromises.mkdir(path.dirname(p), { recursive: true })
  await fsPromises.writeFile(p, JSON.stringify(Object.fromEntries(map), null, 2), 'utf8')
}
