import type { ComponentType } from 'react'

export type BlogFrontmatter = {
  title: string
  date: string
  summary?: string
  author?: string
  tags?: string[]
}

type MdxModule = {
  default: ComponentType
}

const eagerFrontmatter = import.meta.glob('./*.mdx', { eager: true, import: 'frontmatter' }) as Record<string, BlogFrontmatter | undefined>
const lazyPosts = import.meta.glob('./*.mdx')

export type BlogPostEntry = {
  slug: string
  frontmatter: BlogFrontmatter
  import: () => Promise<MdxModule>
}

const normalizeFrontmatter = (slug: string, frontmatter?: BlogFrontmatter): BlogFrontmatter => ({
  title: frontmatter?.title ?? slug,
  date: frontmatter?.date ?? '',
  summary: frontmatter?.summary ?? '',
  author: frontmatter?.author ?? 'Microalchemy Team',
  tags: Array.isArray(frontmatter?.tags) ? [...frontmatter.tags] : [],
})

export const posts: BlogPostEntry[] = Object.entries(eagerFrontmatter)
  .map(([path]) => {
    const slug = path.replace('./', '').replace(/\.mdx$/, '')
    const importer = (lazyPosts[path] ?? lazyPosts[`./${slug}.mdx`]) as () => Promise<MdxModule>
    const fm = eagerFrontmatter[path]
    if (!fm) throw new Error(`Missing frontmatter export for blog post at ${path} (slug ${slug})`)
    return {
      slug,
      import: importer,
      frontmatter: normalizeFrontmatter(slug, fm),
    }
  })
  .sort((a, b) => {
    const da = Date.parse(a.frontmatter.date || '')
    const db = Date.parse(b.frontmatter.date || '')
    if (!Number.isNaN(db) && !Number.isNaN(da)) return db - da
    if (!Number.isNaN(db)) return 1
    if (!Number.isNaN(da)) return -1
    return a.slug.localeCompare(b.slug)
  })

export const findPost = (slug: string) => posts.find((post) => post.slug === slug)
