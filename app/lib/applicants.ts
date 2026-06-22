import bcrypt from 'bcryptjs'
import { loadMapSync, saveMap } from './persist'

export type ApplicationLevel = 'undergraduate' | 'master' | 'phd'

export type Applicant = {
  id: string
  country?: string
  email?: string
  phone?: string
  password: string
  name: string
  intendedMajor: string
  applicationLevel: ApplicationLevel
  bio: string
  role: 'applicant'
  createdAt?: string
  // Extended profile
  currentSchool?: string        // where they study now
  targetCountries?: string[]    // countries they want to apply to
  applicationYear?: string      // '2025' | '2026' | '2027' | '2028'
  backgroundNotes?: string      // GPA, research, anything relevant
}

const FILE = '.data/applicants.json'
const globalStore = global as typeof global & { _applicants?: Map<string, Applicant> }
const loaded = loadMapSync<Applicant>(FILE)
const applicants: Map<string, Applicant> =
  globalStore._applicants ?? (globalStore._applicants = loaded)

function findByCredential(credential: string): Applicant | undefined {
  return Array.from(applicants.values()).find(
    a => a.email === credential || a.phone === credential,
  )
}

export function getApplicantByCredential(credential: string): Applicant | undefined {
  return findByCredential(credential)
}

export function getApplicantById(id: string): Applicant | undefined {
  return applicants.get(id)
}

export async function createApplicant(data: {
  email?: string
  phone?: string
  password: string
  name: string
  intendedMajor: string
  applicationLevel: ApplicationLevel
  country?: string
}): Promise<Applicant | null> {
  const credential = data.email || data.phone!
  if (findByCredential(credential)) return null
  const applicant: Applicant = {
    id: crypto.randomUUID(),
    ...data,
    bio: '',
    createdAt: new Date().toISOString(),
    password: await bcrypt.hash(data.password, 10),
    role: 'applicant',
  }
  applicants.set(applicant.id, applicant)
  saveMap(FILE, applicants).catch(() => {})
  return applicant
}

export function updateApplicant(
  id: string,
  patch: Partial<Pick<Applicant, 'bio' | 'intendedMajor' | 'applicationLevel' | 'currentSchool' | 'targetCountries' | 'applicationYear' | 'backgroundNotes'>>,
): boolean {
  const applicant = applicants.get(id)
  if (!applicant) return false
  applicants.set(id, { ...applicant, ...patch })
  saveMap(FILE, applicants).catch(() => {})
  return true
}

export type PublicApplicant = Omit<Applicant, 'password'>

export function getAllApplicants(): PublicApplicant[] {
  return Array.from(applicants.values())
    .map(a => {
      const rest = { ...a }
      delete (rest as Partial<Applicant>).password
      return rest
    })
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

export function searchApplicants(filter: {
  name?: string
  country?: string
  intendedMajor?: string
  applicationLevel?: ApplicationLevel | ''
}): PublicApplicant[] {
  const fName = filter.name?.toLowerCase() ?? ''
  const fCountry = filter.country?.toLowerCase() ?? ''
  const fMajor = filter.intendedMajor?.toLowerCase() ?? ''
  const fLevel = filter.applicationLevel ?? ''

  return Array.from(applicants.values())
    .filter(a => {
      if (fName && !a.name.toLowerCase().includes(fName)) return false
      if (fCountry && !(a.country ?? '').toLowerCase().includes(fCountry)) return false
      if (fMajor && !a.intendedMajor.toLowerCase().includes(fMajor)) return false
      if (fLevel && a.applicationLevel !== fLevel) return false
      return true
    })
    .map(a => {
      const rest = { ...a }
      delete (rest as Partial<Applicant>).password
      return rest
    })
}

export async function verifyApplicant(
  credential: string,
  password: string,
): Promise<Applicant | null> {
  const applicant = findByCredential(credential)
  if (!applicant) return null
  return (await bcrypt.compare(password, applicant.password)) ? applicant : null
}
