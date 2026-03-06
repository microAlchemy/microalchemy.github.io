import type { ComponentType } from 'react'

export const JOB_CATEGORIES = [
  'Engineering',
  'Engineering > Hardware',
  'Engineering > Process',
  'Engineering > Software',
  'Other',
  'Internships',
  'Admin/HR/Legal',
] as const

export const JOB_SORT_OPTIONS = ['newest', 'oldest', 'title', 'category'] as const
export const JOB_WORK_MODES = ['Remote', 'Onsite'] as const

export type JobCategory = (typeof JOB_CATEGORIES)[number]
export type JobSortOption = (typeof JOB_SORT_OPTIONS)[number]
export type JobWorkMode = (typeof JOB_WORK_MODES)[number]

export type JobFrontmatter = {
  title: string
  summary: string
  postedAt: string
  category: JobCategory
  location?: string
  employmentType?: string
  workMode?: JobWorkMode
  formUrl: string
}

type MdxModule = {
  default: ComponentType
}

type RawFrontmatter = Partial<JobFrontmatter> & { slug?: string }

const frontmatterImports = import.meta.glob<RawFrontmatter>('./*.mdx', { import: 'frontmatter', eager: true })
const componentImports = import.meta.glob<MdxModule>('./*.mdx')

export type JobEntry = {
  slug: string
  frontmatter: JobFrontmatter
  import: () => Promise<MdxModule>
}

export const isEngineeringCategory = (category: JobCategory) => category.startsWith('Engineering >')

const requireString = (value: unknown, field: string, slug: string, allowDate = false) => {
  if (allowDate && value instanceof Date) {
    const iso = value.toISOString()
    if (iso) return iso
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required "${field}" in frontmatter for ${slug}`)
  }
  return value.trim()
}

const parseDate = (value: string, slug: string) => {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) throw new Error(`Invalid "postedAt" in frontmatter for ${slug}`)
  return value
}

const normalizeCategory = (value: unknown, slug: string): JobCategory => {
  const category = requireString(value, 'category', slug)
  if (!JOB_CATEGORIES.includes(category as JobCategory)) {
    throw new Error(`Invalid "category" in frontmatter for ${slug}: ${category}`)
  }
  return category as JobCategory
}

const normalizeOptionalString = (value: unknown, field: string, slug: string) => {
  if (value === undefined) return undefined
  return requireString(value, field, slug)
}

const normalizeWorkMode = (value: unknown, slug: string) => {
  if (value === undefined) return undefined
  const workMode = requireString(value, 'workMode', slug)
  if (!JOB_WORK_MODES.includes(workMode as JobWorkMode)) {
    throw new Error(`Invalid "workMode" in frontmatter for ${slug}: ${workMode}`)
  }
  return workMode as JobWorkMode
}

const normalizeFormUrl = (value: unknown, slug: string) => {
  const url = requireString(value, 'formUrl', slug)
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('protocol')
    }
  } catch {
    throw new Error(`Invalid "formUrl" in frontmatter for ${slug}`)
  }
  return url
}

const normalizeFrontmatter = (slug: string, frontmatter?: RawFrontmatter): JobFrontmatter => {
  if (!frontmatter) throw new Error(`Missing frontmatter export for job at ${slug}`)
  if (frontmatter.slug && frontmatter.slug !== slug) {
    throw new Error(`Frontmatter "slug" should match the filename (${slug})`)
  }

  return {
    title: requireString(frontmatter.title, 'title', slug),
    summary: requireString(frontmatter.summary, 'summary', slug),
    postedAt: parseDate(requireString(frontmatter.postedAt, 'postedAt', slug, true), slug),
    category: normalizeCategory(frontmatter.category, slug),
    location: normalizeOptionalString(frontmatter.location, 'location', slug),
    employmentType: normalizeOptionalString(frontmatter.employmentType, 'employmentType', slug),
    workMode: normalizeWorkMode(frontmatter.workMode, slug),
    formUrl: normalizeFormUrl(frontmatter.formUrl, slug),
  }
}

const seenSlugs = new Set<string>()

export const jobs: JobEntry[] = Object.entries(frontmatterImports)
  .map(([path, fm]) => {
    const slug = path.replace('./', '').replace(/\.mdx$/, '')
    const importer = (componentImports[path] ?? componentImports[`./${slug}.mdx`]) as () => Promise<MdxModule>
    return { slug, frontmatter: normalizeFrontmatter(slug, fm), import: importer }
  })
  .sort((a, b) => {
    const da = Date.parse(a.frontmatter.postedAt)
    const db = Date.parse(b.frontmatter.postedAt)
    if (!Number.isNaN(db) && !Number.isNaN(da)) return db - da
    if (!Number.isNaN(db)) return 1
    if (!Number.isNaN(da)) return -1
    return a.slug.localeCompare(b.slug)
  })

jobs.forEach((job) => {
  if (seenSlugs.has(job.slug)) throw new Error(`Duplicate job slug detected: ${job.slug}`)
  seenSlugs.add(job.slug)
})

export const findJob = (slug: string) => jobs.find((job) => job.slug === slug)
