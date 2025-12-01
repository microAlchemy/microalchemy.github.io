import fs from 'fs'
import { BLOG_DIR, loadBlogPosts, listBlogFiles } from './blog-frontmatter.mjs'

if (!fs.existsSync(BLOG_DIR)) {
  console.log('No blog directory found at src/blog; skipping blog lint.')
  process.exit(0)
}

const files = listBlogFiles()
if (!files.length) {
  console.log('No MDX posts found under src/blog (skipping).')
  process.exit(0)
}

const posts = loadBlogPosts()
const errors = []
const slugs = new Set()

for (const post of posts) {
  if (slugs.has(post.slug)) {
    errors.push(`${post.file}: duplicate slug "${post.slug}"`)
  } else {
    slugs.add(post.slug)
  }

  for (const err of post.errors) {
    errors.push(`${post.file}: ${err}`)
  }
}

if (errors.length) {
  console.error('Blog frontmatter check failed:')
  errors.forEach((message) => console.error(`- ${message}`))
  process.exit(1)
}

console.log(`Blog frontmatter check passed (${files.length} post${files.length === 1 ? '' : 's'})`)
