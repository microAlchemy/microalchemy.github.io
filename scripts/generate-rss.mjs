import fs from 'fs'
import path from 'path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { compile, run } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'
import matter from 'gray-matter'

const BLOG_DIR = path.join(process.cwd(), 'src', 'blog')
const PUBLIC_DIR = path.join(process.cwd(), 'public')
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'rss.xml')

const siteUrl = 'https://microalchemy.xyz'

if (!fs.existsSync(BLOG_DIR)) {
  console.warn('No blog directory found at src/blog; skipping RSS generation.')
  process.exit(0)
}

const files = fs.readdirSync(BLOG_DIR).filter((file) => file.endsWith('.mdx'))

const stripImports = (mdxSource, filePath) => {
  const lines = mdxSource.split('\n')
  const imports = lines.filter((line) => /^\s*import\s.+/.test(line))
  const unsupported = imports.filter((line) => !/\bCallout\b/.test(line))
  if (unsupported.length) {
    const list = unsupported.map((line) => line.trim()).join('; ')
    throw new Error(`Unsupported MDX imports in ${filePath}: ${list}. Use absolute URLs or inline components instead.`)
  }
  return lines.filter((line) => !/^\s*import\s.+/.test(line)).join('\n').trim()
}

const calloutTitles = {
  info: 'Note',
  warning: 'Heads up',
  success: 'Win',
}

const mdxComponents = {
  Callout: ({ title, tone = 'info', children }) => React.createElement(
    'div',
    { className: `callout callout-${tone}` },
    [
      React.createElement('div', { className: 'callout-header', key: 'header' }, title || calloutTitles[tone] || 'Note'),
      React.createElement('div', { className: 'callout-body', key: 'body' }, children),
    ],
  ),
}

const renderMdxToHtml = async (content, filePath) => {
  const compiled = await compile(stripImports(content, filePath), {
    development: false,
    outputFormat: 'function-body',
  })

  const { default: MDXContent } = await run(compiled, {
    ...runtime,
    useMDXComponents: () => mdxComponents,
  })

  return renderToStaticMarkup(React.createElement(MDXContent, { components: mdxComponents }))
}

const escape = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

async function buildRss() {
  const posts = (await Promise.all(files.map(async (file) => {
    const fullPath = path.join(BLOG_DIR, file)
    const { data, content } = matter(fs.readFileSync(fullPath, 'utf8'))
    const slug = file.replace(/\.mdx$/, '')
    const date = data.date && !Number.isNaN(Date.parse(data.date)) ? new Date(data.date) : null

    if (!data.title || !data.summary) return null

    const contentHtml = await renderMdxToHtml(content, file)

    return {
      title: String(data.title),
      link: `${siteUrl}/blog/${slug}`,
      guid: `${siteUrl}/blog/${slug}`,
      description: String(data.summary),
      content: contentHtml,
      pubDate: date ? date.toUTCString() : new Date().toUTCString(),
    }
  }))).filter(Boolean).sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
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
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
      <pubDate>${post.pubDate}</pubDate>
    </item>`).join('')}
  </channel>
</rss>
`

  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, rss.trim() + '\n', 'utf8')
  console.log(`RSS feed written to ${OUTPUT_PATH} (${posts.length} item${posts.length === 1 ? '' : 's'})`)
}

buildRss().catch((err) => {
  console.error('Failed to generate RSS feed:', err)
  process.exit(1)
})
