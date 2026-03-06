import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MDXProvider } from '@mdx-js/react'
import { findJob } from '../jobs/jobs'
import './blog.css'

type LazyModule = { default: React.ComponentType }
type ErrorState = { hasError: boolean; message?: string }

const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

class JobErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorState> {
  state: ErrorState = { hasError: false, message: undefined }

  static getDerivedStateFromError(error: Error): ErrorState {
    return { hasError: true, message: error?.message }
  }

  componentDidCatch(error: Error) {
    console.error('Error rendering career post', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="blog-shell">
          <div className="blog-container">
            <div className="blog-error">
              <h2>Unable to load role</h2>
              <p>{this.state.message || 'Something went wrong while rendering this job description.'}</p>
              <div className="blog-nav" style={{ marginTop: '1rem' }}>
                <Link to="/careers" className="ghost-link">
                  Careers
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

    return this.props.children
  }
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

const CareerPost: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>()
  const job = slug ? findJob(slug) : undefined

  if (!job) {
    return (
      <div className="blog-shell">
        <div className="blog-container">
          <div className="blog-not-found">
            <h2>Role not found</h2>
            <p>We could not find that opening. Check the URL or head back to the careers index.</p>
            <div className="blog-nav" style={{ marginTop: '1rem' }}>
              <Link to="/careers" className="ghost-link">
                Careers
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

  const LazyJob = useMemo(
    () => React.lazy(job.import as () => Promise<LazyModule>),
    [job],
  )
  const { category, employmentType, formUrl, location, postedAt, summary, title, workMode } = job.frontmatter

  return (
    <JobErrorBoundary>
      <div className="blog-shell">
        <div className="blog-container">
          <div className="blog-header blog-post-header">
            <div>
              <div className="blog-eyebrow">Microalchemy careers</div>
              <h1 className="blog-title">{title}</h1>
              <div className="blog-meta">
                <span className="blog-tag">{category}</span>
                {workMode ? <span className="blog-tag">{workMode}</span> : null}
                {location ? <span className="blog-tag">{location}</span> : null}
                {employmentType ? <span className="blog-tag">{employmentType}</span> : null}
                {postedAt ? <span>Posted {formatDate(postedAt) || postedAt}</span> : null}
              </div>
              <p className="blog-lede">{summary}</p>
            </div>
            <div className="blog-nav">
              <a href={formUrl} className="ghost-link" target="_blank" rel="noopener noreferrer">
                Apply now
              </a>
              <Link to="/careers" className="ghost-link">
                All roles
              </Link>
              <Link to="/" className="ghost-link">
                Home
              </Link>
            </div>
          </div>

          <div className="job-apply-strip">
            <span>Ready to apply?</span>
            <a href={formUrl} className="blog-cta-link" target="_blank" rel="noopener noreferrer">
              Open application form
            </a>
          </div>

          <React.Suspense fallback={<div className="blog-loading">Loading role...</div>}>
            <MDXProvider components={mdxComponents}>
              <article className="blog-article">
                <LazyJob />
              </article>
            </MDXProvider>
          </React.Suspense>
        </div>
      </div>
    </JobErrorBoundary>
  )
}

export default CareerPost
