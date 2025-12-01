import fs from 'fs'
import path from 'path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { compile, run } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'
import { loadBlogPosts } from './blog-frontmatter.mjs'

const BLOG_DIR = path.join(process.cwd(), 'src', 'blog')
const PUBLIC_DIR = path.join(process.cwd(), 'public')
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'rss.xml')

const siteUrl = 'https://microalchemy.xyz'

if (!fs.existsSync(BLOG_DIR)) {
  console.warn('No blog directory found at src/blog; skipping RSS generation.')
  process.exit(0)
}

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
  const posts = loadBlogPosts()
  if (!posts.length) {
    console.warn('No MDX posts found under src/blog; skipping RSS generation.')
    return
  }

  const errors = posts.flatMap((post) => post.errors.map((error) => `${post.file}: ${error}`))
  if (errors.length) {
    throw new Error(`Frontmatter validation failed:\n- ${errors.join('\n- ')}`)
  }

  const slugs = new Set()
  for (const post of posts) {
    if (slugs.has(post.slug)) throw new Error(`Duplicate blog slug detected: ${post.slug}`)
    slugs.add(post.slug)
  }

  const rendered = (await Promise.all(posts.map(async (post) => {
    const contentHtml = await renderMdxToHtml(post.body, post.file)
    const date = new Date(post.frontmatter.date)
    return {
      slug: post.slug,
      title: String(post.frontmatter.title),
      author: String(post.frontmatter.author),
      tags: Array.isArray(post.frontmatter.tags) ? post.frontmatter.tags : [],
      link: `${siteUrl}/blog/${post.slug}`,
      guid: `${siteUrl}/blog/${post.slug}`,
      description: String(post.frontmatter.summary),
      content: contentHtml,
      pubDate: Number.isNaN(date.getTime()) ? new Date() : date,
    }
  }))).sort((a, b) => Number(b.pubDate) - Number(a.pubDate))

  const lastBuildDate = rendered.length
    ? new Date(Math.max(...rendered.map((post) => Number(post.pubDate))))
    : new Date(0)

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>MicroAlchemy Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Build logs, architecture notes, and experiments from the MicroAlchemy team.</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>
    ${rendered.map((post) => `
    <item>
      <title>${escape(post.title)}</title>
      <link>${post.link}</link>
      <guid isPermaLink="true">${post.guid}</guid>
      <author>${escape(post.author)}</author>
      ${post.tags.map((tag) => `<category>${escape(tag)}</category>`).join('')}
      <description>${escape(post.description)}</description>
      <content:encoded><![CDATA[${post.content}]]></content:encoded>
      <pubDate>${post.pubDate.toUTCString()}</pubDate>
    </item>`).join('')}
  </channel>
</rss>
`

  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, rss.trim() + '\n', 'utf8')
  console.log(`RSS feed written to ${OUTPUT_PATH} (${rendered.length} item${rendered.length === 1 ? '' : 's'})`)
}

buildRss().catch((err) => {
  console.error('Failed to generate RSS feed:', err)
  process.exit(1)
})
