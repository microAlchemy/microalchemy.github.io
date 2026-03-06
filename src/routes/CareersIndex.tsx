import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  JOB_CATEGORIES,
  JOB_SORT_OPTIONS,
  JOB_WORK_MODES,
  isEngineeringCategory,
  type JobEntry,
  type JobSortOption,
  type JobWorkMode,
  jobs,
} from '../jobs/jobs'
import './blog.css'

const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const sortJobs = (entries: JobEntry[], sortBy: JobSortOption) => {
  const sorted = [...entries]
  sorted.sort((a, b) => {
    if (sortBy === 'title') return a.frontmatter.title.localeCompare(b.frontmatter.title)
    if (sortBy === 'category') {
      const categoryCompare = a.frontmatter.category.localeCompare(b.frontmatter.category)
      return categoryCompare || a.frontmatter.title.localeCompare(b.frontmatter.title)
    }

    const left = Date.parse(a.frontmatter.postedAt)
    const right = Date.parse(b.frontmatter.postedAt)
    const timeCompare = Number.isNaN(left) || Number.isNaN(right) ? 0 : left - right

    if (sortBy === 'oldest') return timeCompare || a.frontmatter.title.localeCompare(b.frontmatter.title)
    return (0 - timeCompare) || a.frontmatter.title.localeCompare(b.frontmatter.title)
  })
  return sorted
}

const CareersIndex: React.FC = () => {
  const [category, setCategory] = useState<'All' | (typeof JOB_CATEGORIES)[number]>('All')
  const [workMode, setWorkMode] = useState<'All' | JobWorkMode>('All')
  const [sortBy, setSortBy] = useState<JobSortOption>('newest')

  const filteredJobs = useMemo(() => {
    const matching = category === 'All'
      ? jobs
      : category === 'Engineering'
        ? jobs.filter((job) => isEngineeringCategory(job.frontmatter.category))
        : jobs.filter((job) => job.frontmatter.category === category)
    const workModeMatching = workMode === 'All'
      ? matching
      : matching.filter((job) => job.frontmatter.workMode === workMode)
    return sortJobs(workModeMatching, sortBy)
  }, [category, sortBy, workMode])

  return (
    <div className="blog-shell">
      <div className="blog-container">
        <div className="blog-header">
          <div>
            <div className="blog-eyebrow">Microalchemy careers</div>
            <h1 className="blog-title">Open roles</h1>
            <p className="blog-lede">
              Browse current openings by category, then open each role for the full description and application link.
            </p>
          </div>
          <div className="blog-nav">
            <Link to="/" className="ghost-link">
              Home
            </Link>
            <Link to="/blog" className="ghost-link">
              Blog
            </Link>
          </div>
        </div>

        <div className="jobs-controls">
          <label className="jobs-control">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as 'All' | (typeof JOB_CATEGORIES)[number])}>
              <option value="All">All categories</option>
              {JOB_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="jobs-control">
            <span>Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as JobSortOption)}>
              {JOB_SORT_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item === 'newest' ? 'Newest first' : item === 'oldest' ? 'Oldest first' : item === 'title' ? 'Title' : 'Category'}
                </option>
              ))}
            </select>
          </label>

          <label className="jobs-control">
            <span>Work mode</span>
            <select value={workMode} onChange={(event) => setWorkMode(event.target.value as 'All' | JobWorkMode)}>
              <option value="All">All work modes</option>
              {JOB_WORK_MODES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredJobs.length ? (
          <div className="blog-grid jobs-grid">
            {filteredJobs.map(({ slug, frontmatter }) => (
              <Link key={slug} to={`/careers/${slug}`} className="blog-card job-card">
                <div className="blog-card-date">Posted {formatDate(frontmatter.postedAt) || frontmatter.postedAt}</div>
                <h2 className="blog-card-title">{frontmatter.title}</h2>
                <div className="blog-tags">
                  <span className="blog-tag">{frontmatter.category}</span>
                  {frontmatter.workMode ? <span className="blog-tag">{frontmatter.workMode}</span> : null}
                  {frontmatter.location ? <span className="blog-tag">{frontmatter.location}</span> : null}
                  {frontmatter.employmentType ? <span className="blog-tag">{frontmatter.employmentType}</span> : null}
                </div>
                <p className="blog-card-summary">{frontmatter.summary}</p>
                <span className="blog-card-action">View role</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="blog-not-found">
            <h2>No roles match this filter</h2>
            <p>Try another category or check back later.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CareersIndex
