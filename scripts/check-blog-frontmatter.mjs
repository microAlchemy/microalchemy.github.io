import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const BLOG_DIR = path.join(process.cwd(), 'src', 'blog')

if (!fs.existsSync(BLOG_DIR)) {
  console.log('No blog directory found at src/blog; skipping blog lint.')
  process.exit(0)
}

const files = fs.readdirSync(BLOG_DIR).filter((file) => file.endsWith('.mdx'))
const errors = []

for (const file of files) {
  const fullPath = path.join(BLOG_DIR, file)
  const content = fs.readFileSync(fullPath, 'utf8')
  const { data } = matter(content)
  const slug = file.replace(/\.mdx$/, '')

  if (!data.title) errors.push(`${file}: missing required frontmatter "title"`)
  if (!data.author) errors.push(`${file}: missing required frontmatter "author"`)
  if (!data.date) {
    errors.push(`${file}: missing required frontmatter "date"`)
  } else if (Number.isNaN(Date.parse(data.date))) {
    errors.push(`${file}: "date" is not a valid date`)
  }

  if (data.slug && data.slug !== slug) {
    errors.push(`${file}: frontmatter "slug" should match the filename (${slug})`)
  }

  if (data.tags && !Array.isArray(data.tags)) {
    errors.push(`${file}: "tags" must be an array when provided`)
  }

  if (!data.summary) {
    errors.push(`${file}: missing required frontmatter "summary"`)
  } else if (typeof data.summary !== 'string') {
    errors.push(`${file}: "summary" must be a string when provided`)
  }
}

if (!files.length) {
  console.log('No MDX posts found under src/blog (skipping).')
  process.exit(0)
}

if (errors.length) {
  console.error('Blog frontmatter check failed:')
  errors.forEach((message) => console.error(`- ${message}`))
  process.exit(1)
}

console.log(`Blog frontmatter check passed (${files.length} post${files.length === 1 ? '' : 's'})`)
