import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MDXProvider } from '@mdx-js/react'
import { findPost } from '../blog/posts'
import './blog.css'

type LazyModule = { default: React.ComponentType }

const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const mdxComponents = {
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isExternal = props.href?.startsWith('http')
    return (
      <a
        {...props}
        target={isExternal ? '_blank' : props.target}
        rel={isExternal ? 'noopener noreferrer' : props.rel}
      />
    )
  },
}

const BlogPost: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>()
  const post = slug ? findPost(slug) : undefined

  if (!post) {
    return (
      <div className="blog-shell">
        <div className="blog-container">
          <div className="blog-not-found">
            <h2>Post not found</h2>
            <p>We could not find that entry. Check the URL or head back to the index.</p>
            <div className="blog-nav" style={{ marginTop: '1rem' }}>
              <Link to="/blog" className="ghost-link">
                Blog index
              </Link>
              <Link to="/" className="ghost-link">
                Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const LazyPost = useMemo(
    () => React.lazy(post.import as () => Promise<LazyModule>),
    [post],
  )

  const formattedDate = formatDate(post.frontmatter.date) || post.frontmatter.date
  const tags = post.frontmatter.tags ?? []
  const author = post.frontmatter.author ?? 'Microalchemy Team'

  return (
    <div className="blog-shell">
      <div className="blog-container">
        <div className="blog-header blog-post-header">
          <div>
            <div className="blog-eyebrow">Microalchemy blog</div>
            <h1 className="blog-title">{post.frontmatter.title}</h1>
            <div className="blog-meta">
              <span>{author}</span>
              {formattedDate && <span>{formattedDate}</span>}
              {tags.map((tag) => (
                <span key={tag} className="blog-tag">
                  {tag}
                </span>
              ))}
            </div>
            {post.frontmatter.summary && <p className="blog-lede">{post.frontmatter.summary}</p>}
          </div>
          <div className="blog-nav">
            <Link to="/blog" className="ghost-link">
              All posts
            </Link>
            <Link to="/" className="ghost-link">
              Home
            </Link>
            <a href="/rss.xml" className="ghost-link">
              RSS
            </a>
          </div>
        </div>

        <React.Suspense fallback={<div className="blog-loading">Loading post…</div>}>
          <MDXProvider components={mdxComponents}>
            <article className="blog-article">
              <LazyPost />
            </article>
          </MDXProvider>
        </React.Suspense>
      </div>
    </div>
  )
}

export default BlogPost
