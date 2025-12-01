import type { ComponentType } from 'react'

export type BlogFrontmatter = {
  title: string
  date: string
  summary: string
  author: string
  tags: string[]
}

type MdxModule = {
  default: ComponentType
}

type RawFrontmatter = Partial<BlogFrontmatter> & { slug?: string }

const frontmatterImports = import.meta.glob<{ frontmatter?: RawFrontmatter }>('./*.mdx', { import: 'frontmatter' })
const componentImports = import.meta.glob<MdxModule>('./*.mdx')

export type BlogPostEntry = {
  slug: string
  frontmatter: BlogFrontmatter
  import: () => Promise<MdxModule>
}

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
  if (Number.isNaN(parsed)) throw new Error(`Invalid "date" in frontmatter for ${slug}`)
  return value
}

const normalizeTags = (value: unknown, slug: string) => {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error(`"tags" must be an array for ${slug} when provided`)
  return value.map((tag) => requireString(tag, 'tags', slug))
}

const normalizeFrontmatter = (slug: string, frontmatter?: RawFrontmatter): BlogFrontmatter => {
  if (!frontmatter) throw new Error(`Missing frontmatter export for blog post at ${slug}`)
  if (frontmatter.slug && frontmatter.slug !== slug) {
    throw new Error(`Frontmatter "slug" should match the filename (${slug})`)
  }

  const title = requireString(frontmatter.title, 'title', slug)
  const author = requireString(frontmatter.author, 'author', slug)
  const summary = requireString(frontmatter.summary, 'summary', slug)
  const date = parseDate(requireString(frontmatter.date, 'date', slug, true), slug)
  const tags = normalizeTags(frontmatter.tags, slug)

  return { title, author, summary, date, tags }
}

const seenSlugs = new Set<string>()

const loadPosts = async (): Promise<BlogPostEntry[]> => {
  const entries = await Promise.all(
    Object.entries(frontmatterImports).map(async ([path, loader]) => {
      const slug = path.replace('./', '').replace(/\.mdx$/, '')
      const fmModule = await loader()
      const fm = fmModule?.frontmatter
      const importer = (componentImports[path] ?? componentImports[`./${slug}.mdx`]) as () => Promise<MdxModule>
      return { slug, frontmatter: normalizeFrontmatter(slug, fm), import: importer }
    }),
  )

  const posts = entries.sort((a, b) => {
    const da = Date.parse(a.frontmatter.date)
    const db = Date.parse(b.frontmatter.date)
    if (!Number.isNaN(db) && !Number.isNaN(da)) return db - da
    if (!Number.isNaN(db)) return 1
    if (!Number.isNaN(da)) return -1
    return a.slug.localeCompare(b.slug)
  })

  posts.forEach((post) => {
    if (seenSlugs.has(post.slug)) throw new Error(`Duplicate blog slug detected: ${post.slug}`)
    seenSlugs.add(post.slug)
  })

  return posts
}

export const posts: BlogPostEntry[] = await loadPosts()

export const findPost = (slug: string) => posts.find((post) => post.slug === slug)
