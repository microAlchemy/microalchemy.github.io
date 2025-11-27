import React from 'react'
import { Link } from 'react-router-dom'
import { posts } from '../blog/posts'
import './blog.css'

const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const BlogIndex: React.FC = () => {
  return (
    <div className="blog-shell">
      <div className="blog-container">
        <div className="blog-header">
          <div>
            <div className="blog-eyebrow">Microalchemy</div>
            <h1 className="blog-title">Notes from the lab</h1>
            <p className="blog-lede">
              Build logs, architecture notes, and experiments from the MicroAlchemy team. Everything here
              ships straight from the foundry.
            </p>
          </div>
          <div className="blog-nav">
            <Link to="/" className="ghost-link">
              ← Back home
            </Link>
          </div>
        </div>

        <div className="blog-grid">
          {posts.map(({ slug, frontmatter }) => (
            <Link key={slug} to={`/blog/${slug}`} className="blog-card">
              <div className="blog-card-date">{formatDate(frontmatter.date) || frontmatter.date}</div>
              <h2 className="blog-card-title">{frontmatter.title}</h2>
              {frontmatter.author && (
                <div className="blog-card-author">By {frontmatter.author}</div>
              )}
              {frontmatter.summary && <p className="blog-card-summary">{frontmatter.summary}</p>}
              {frontmatter.tags?.length ? (
                <div className="blog-tags">
                  {frontmatter.tags.map((tag) => (
                    <span key={tag} className="blog-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BlogIndex
