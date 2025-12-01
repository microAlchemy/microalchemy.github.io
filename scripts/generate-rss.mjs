import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BLOG_DIR = path.join(process.cwd(), 'src', 'blog')
const PUBLIC_DIR = path.join(process.cwd(), 'public')
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'rss.xml')

const siteUrl = (pkg => {
  if (pkg && pkg.homepage) return pkg.homepage.replace(/\/+$/, '')
  return 'https://microalchemy.xyz'
})(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')))

if (!fs.existsSync(BLOG_DIR)) {
  console.warn('No blog directory found at src/blog; skipping RSS generation.')
  process.exit(0)
}

const files = fs.readdirSync(BLOG_DIR).filter((file) => file.endsWith('.mdx'))

const posts = files.flatMap((file) => {
  const fullPath = path.join(BLOG_DIR, file)
  const { data } = matter(fs.readFileSync(fullPath, 'utf8'))
  const slug = file.replace(/\.mdx$/, '')
  const date = data.date && !Number.isNaN(Date.parse(data.date)) ? new Date(data.date) : null

  if (!data.title || !data.summary) return []

  return [{
    title: String(data.title),
    link: `${siteUrl}/blog/${slug}`,
    guid: `${siteUrl}/blog/${slug}`,
    description: String(data.summary),
    pubDate: date ? date.toUTCString() : new Date().toUTCString(),
  }]
}).sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))

const escape = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>MicroAlchemy Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Build logs, architecture notes, and experiments from the MicroAlchemy team.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${posts.map((post) => `
    <item>
      <title>${escape(post.title)}</title>
      <link>${post.link}</link>
      <guid>${post.guid}</guid>
      <description>${escape(post.description)}</description>
      <pubDate>${post.pubDate}</pubDate>
    </item>`).join('')}
  </channel>
</rss>
`

if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true })
fs.writeFileSync(OUTPUT_PATH, rss.trim() + '\n', 'utf8')
console.log(`RSS feed written to ${OUTPUT_PATH} (${posts.length} item${posts.length === 1 ? '' : 's'})`)
