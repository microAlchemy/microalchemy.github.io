import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export const BLOG_DIR = path.join(process.cwd(), 'src', 'blog')

export const listBlogFiles = () => (fs.existsSync(BLOG_DIR)
  ? fs.readdirSync(BLOG_DIR).filter((file) => file.endsWith('.mdx'))
  : [])

const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '')

const coerceDateString = (value) => {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value.trim()
  return ''
}

const normalizeTags = (value) => {
  if (value === undefined) return []
  if (!Array.isArray(value)) return null
  const tags = value.map((tag) => asTrimmedString(tag)).filter(Boolean)
  return tags
}

export const validateFrontmatter = (slug, data) => {
  const errors = []

  if (data.slug && data.slug !== slug) {
    errors.push(`frontmatter "slug" should match the filename (${slug})`)
  }

  const title = asTrimmedString(data.title)
  if (!title) errors.push('missing required frontmatter "title"')

  const author = asTrimmedString(data.author)
  if (!author) errors.push('missing required frontmatter "author"')

  const summary = asTrimmedString(data.summary)
  if (!summary) errors.push('missing required frontmatter "summary"')

  const date = coerceDateString(data.date)
  if (!date) {
    errors.push('missing required frontmatter "date"')
  } else if (Number.isNaN(Date.parse(date))) {
    errors.push('"date" is not a valid date')
  }

  const tags = normalizeTags(data.tags)
  if (tags === null) errors.push('"tags" must be an array of strings when provided')

  return {
    frontmatter: {
      title,
      author,
      summary,
      date,
      tags: Array.isArray(tags) ? tags : [],
    },
    errors,
  }
}

export const loadBlogPosts = () => {
  const files = listBlogFiles()
  return files.map((file) => {
    const fullPath = path.join(BLOG_DIR, file)
    const content = fs.readFileSync(fullPath, 'utf8')
    const { data, content: body } = matter(content)
    const slug = file.replace(/\.mdx$/, '')
    const { frontmatter, errors } = validateFrontmatter(slug, data || {})
    return { file, slug, fullPath, frontmatter, errors, body }
  })
}
