import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, type MotionProps } from 'framer-motion'
import uaLogo from '../img/ua-logo.svg'
import caffeinatedLogo from '../img/investors/caffeinated.svg'
import haystackLogo from '../img/investors/haystack.png'
import gtechLogo from '../img/partners/gtech.png'
import uwaterlooLogo from '../img/partners/uwaterloo.png'
import adityaPhoto from '../img/team/aditya.jpg'
import kunalPhoto from '../img/team/kunal.jpg'
import saifPhoto from '../img/team/saif.jpg'
import iconStore from '@tabler/icons/outline/building-store.svg'
import iconFactory from '@tabler/icons/outline/building-factory-2.svg'
import { posts } from '../blog/posts'
import {
  generateCircuitScene,
  getCircuitAnimationEndMs,
  getCircuitSeed,
  renderCircuitFrame,
} from './circuitScene'

type Card = {
  name: string
  url: string
  logo?: string
  cta?: boolean
  logoType?: 'image' | 'text' | 'none'
  logoText?: string
  icon?: React.ReactNode
  description?: string
  ctaText?: string
}

type TeamMember = {
  name: string
  title: string
  photo?: string
  url: string
}

type NewsEntry = {
  slug: string
  title: string
  date: string
  summary: string
}

type Palette = {
  wire: string
  node: string
  ring: string
}

const RESIZE_DEBOUNCE_MS = 120

const investors: Card[] = [
  { name: 'Caffeinated Capital', url: 'https://www.caffeinated.com/', logo: caffeinatedLogo },
  { name: 'Haystack Ventures', url: 'https://haystack.vc/', logo: haystackLogo },
]

const partners: Card[] = [
  { name: 'Silicon Jackets @ Georgia Tech', url: 'https://siliconjackets.gt/', logo: gtechLogo },
  { name: 'G2N @ University of Waterloo', url: 'https://g2n.uwaterloo.ca/', logo: uwaterlooLogo },
  { name: 'Partner with us', url: 'mailto:aditya@microalchemy.xyz', cta: true, logoType: 'text', logoText: 'Your Logo Here' },
]

const iconAlembic = <span aria-hidden>🝪</span>
const iconWorkshop = <img src={iconStore} alt="" aria-hidden className="product-icon-img" />
const iconFoundry = <img src={iconFactory} alt="" aria-hidden className="product-icon-img" />

const products: Card[] = [
  {
    name: 'Alembic',
    url: 'https://workshop.microalchemy.xyz/alembic',
    description: 'High-level analog design language that brings software-speed iteration to silicon.',
    ctaText: 'Discover Alembic →',
    logoType: 'none',
    icon: iconAlembic,
  },
  {
    name: 'Workshop',
    url: 'https://workshop.microalchemy.xyz',
    description: 'Discover, remix, and share open source silicon designs in one place.',
    ctaText: 'Explore Workshop →',
    logoType: 'none',
    icon: iconWorkshop,
  },
  {
    name: 'Foundry',
    url: 'https://workshop.microalchemy.xyz/foundry',
    description: 'Fast fabrication on a 1μm process with turnaround in under three weeks.',
    ctaText: 'Build with Foundry →',
    logoType: 'none',
    icon: iconFoundry,
  },
]

const team: TeamMember[] = [
  { name: 'Aditya Srinivasan', title: 'Chief Executive Officer', photo: adityaPhoto, url: 'https://www.linkedin.com/in/srini-aditya/' },
  { name: 'Kunal Chandan', title: 'Chief Hardware Officer', photo: kunalPhoto, url: 'https://www.linkedin.com/in/kunal-chandan/' },
  { name: 'Saif Khattak', title: 'Chief Software Officer', photo: saifPhoto, url: 'https://www.linkedin.com/in/skhattak00/' },
]

const newsPosts: NewsEntry[] = posts
  .filter((post) => post.frontmatter.tags.some((tag) => tag.toLowerCase() === 'news'))
  .slice(0, 3)
  .map((post) => ({
    slug: post.slug,
    title: post.frontmatter.title,
    date: post.frontmatter.date,
    summary: post.frontmatter.summary,
  }))

const getCircuitPalette = (): Palette => {
  if (typeof window === 'undefined') {
    return { wire: '#d4af37', node: '#f5f1e0', ring: '#ffffff' }
  }

  const styles = getComputedStyle(document.documentElement)
  const readColor = (prop: string, fallback: string) => styles.getPropertyValue(prop).trim() || fallback

  return {
    wire: readColor('--color-circuit-wire', '#d4af37'),
    node: readColor('--color-circuit-node', '#f5f1e0'),
    ring: readColor('--color-circuit-ring', '#ffffff'),
  }
}

const configureCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const pixelRatio = window.devicePixelRatio || 1
  canvas.width = Math.max(1, Math.floor(width * pixelRatio))
  canvas.height = Math.max(1, Math.floor(height * pixelRatio))
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
}

const useCircuitCanvas = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) => {
  const animationFrameRef = useRef<number | null>(null)
  const resizeTimeoutRef = useRef<number | null>(null)
  const initialRenderRef = useRef<number | null>(null)

  useEffect(() => {
    const cancelScheduledWork = () => {
      if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current)
      if (initialRenderRef.current) window.cancelAnimationFrame(initialRenderRef.current)
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current)
    }

    const renderCircuit = () => {
      const container = containerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current)

      const { width, height } = container.getBoundingClientRect()
      configureCanvas(canvas, ctx, width, height)

      const scene = generateCircuitScene(width, height, getCircuitSeed(width, height))
      const palette = getCircuitPalette()
      const animationEndMs = getCircuitAnimationEndMs(scene)
      const startTime = performance.now()

      const drawFrame = (now: number) => {
        renderCircuitFrame(ctx, scene, palette, now - startTime)
        if (now - startTime < animationEndMs) {
          animationFrameRef.current = window.requestAnimationFrame(drawFrame)
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(drawFrame)
    }

    const handleResize = () => {
      if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = window.setTimeout(renderCircuit, RESIZE_DEBOUNCE_MS)
    }

    initialRenderRef.current = window.requestAnimationFrame(renderCircuit)
    window.addEventListener('resize', handleResize)

    return () => {
      cancelScheduledWork()
      window.removeEventListener('resize', handleResize)
    }
  }, [canvasRef, containerRef])
}

const fadeIn = (delay: number): MotionProps => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.25, 0.25, 0.25, 1] },
})

const reveal = (delay: number): MotionProps => ({
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.25, 0.25, 0.25, 1] },
})

const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const Section: React.FC<{ title: string; delay: number; className?: string; children: React.ReactNode }> = ({ title, delay, className = '', children }) => (
  <motion.section className={className} {...fadeIn(delay)}>
    <h2 className="subtitle">{title}</h2>
    {children}
  </motion.section>
)

const CardGrid: React.FC<{ items: Card[]; className?: string; cardClassName?: string }> = ({ items, className = '', cardClassName = '' }) => (
  <div className={`cards-grid ${className}`.trim()}>
    {items.map((item) => {
      const isExternal = item.url.startsWith('http')
      const cardClass = `card${cardClassName ? ` ${cardClassName}` : ''}${item.cta ? ' card-cta' : ''}${item.logoType === 'none' ? ' card-icon-only' : ''}`

      return (
        <a
          key={item.name}
          className={cardClass}
          href={item.url}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
        >
          {item.logoType !== 'none' && (
            <div className={`card-logo${item.logo ? ' has-image' : ''}`}>
              {item.logoType === 'image' || (!item.logoType && item.logo)
                ? item.logo
                  ? <img src={item.logo} alt={`${item.name} logo`} />
                  : (item.logoText ?? 'Logo Placeholder')
                : (item.logoText ?? (item.cta ? 'Get in touch' : 'Logo Placeholder'))}
            </div>
          )}
          <span className="card-name">
            {item.icon && <span className="product-icon" aria-hidden>{item.icon}</span>}
            {item.name}
          </span>
          {item.description && <p className="product-desc">{item.description}</p>}
          {item.ctaText && <span className="blog-cta-link product-cta">{item.ctaText}</span>}
          {item.cta && !item.ctaText && <span className="card-cta-text">Reach out to collaborate</span>}
        </a>
      )
    })}
  </div>
)

const CircuitBoardAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useCircuitCanvas(containerRef, canvasRef)

  return (
    <div ref={containerRef} className="circuit-container">
      <canvas ref={canvasRef} className="circuit-canvas" />
      <div className="text-overlay">
        <motion.div className="text-content" {...reveal(2.5)}>
          <div className="text-content-inner">
            <motion.div className="title-row" {...fadeIn(2)}>
              <h1 className="title">Welcome to MicroAlchemy</h1>
              <div className="title-logo" aria-hidden="true">
                <div
                  className="title-logo-mark"
                  style={{
                    WebkitMask: `url(${uaLogo}) center / contain no-repeat`,
                    mask: `url(${uaLogo}) center / contain no-repeat`,
                  }}
                />
              </div>
            </motion.div>

            <motion.div className="description" {...fadeIn(3.2)}>
              <p>We are compressing silicon prototyping timelines.</p>
              <p>Cutting fabrication lead times and breaking the silicon EDA duopoly.</p>
              <ul className="description-list">
                <li>Silicon wafers in under <strong>3 weeks</strong> on a <strong>1μm</strong> process.</li>
                <li>Open source design tooling with the same stack we fab.</li>
              </ul>
              <div className="blog-cta">
                <Link to="/blog" className="blog-cta-link">Check out our blog →</Link>
              </div>
            </motion.div>

            <Section title="Our Products" delay={3.4} className="expertise">
              <CardGrid className="product-grid" cardClassName="product" items={products} />
            </Section>

            <Section title="The Team" delay={3.6} className="team-section">
              <div className="team-grid">
                {team.map((member) => (
                  <motion.a
                    key={member.name}
                    className="card team-card"
                    href={member.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={`card-logo team-photo${member.photo ? ' has-image' : ''}`} aria-label={`${member.name} LinkedIn profile`}>
                      {member.photo ? <img src={member.photo} alt={`${member.name} portrait`} /> : 'Photo Placeholder'}
                    </div>
                    <h3 className="team-name">{member.name}</h3>
                    <p className="team-title">{member.title}</p>
                  </motion.a>
                ))}
                <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                  <Link to="/careers" className="card team-card team-card-cta">
                    <div className="card-logo team-photo team-photo-cta" aria-hidden="true">
                      Your Face Here
                    </div>
                    <h3 className="team-name">Join the team</h3>
                    <p className="team-title">See open roles and apply</p>
                  </Link>
                </motion.div>
              </div>
            </Section>

            <Section title="Investors" delay={3.7} className="partners-section investors-section">
              <CardGrid items={investors} />
            </Section>

            <Section title="Technical Partners" delay={3.8} className="partners-section">
              <CardGrid items={partners} />
            </Section>

            <Section title="News" delay={3.9} className="partners-section">
              <div className="cards-grid product-grid news-grid">
                {newsPosts.map((post) => (
                  <Link key={post.slug} to={`/blog/${post.slug}`} className="card product news-card">
                    <span className="news-date">{formatDate(post.date) || post.date}</span>
                    <span className="card-name">{post.title}</span>
                    <p className="product-desc">{post.summary}</p>
                    <span className="blog-cta-link product-cta">Read article →</span>
                  </Link>
                ))}
              </div>
            </Section>

            <motion.p className="footer" {...fadeIn(4)}>
              Stay tuned for more updates and exciting developments.
            </motion.p>
            <motion.p className="contact" {...fadeIn(4.2)}>
              Email inquiries to <a href="mailto:aditya@microalchemy.xyz" className="email-link">aditya@microalchemy.xyz</a>
            </motion.p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default CircuitBoardAnimation
