import React, { useEffect, useRef, useState } from 'react'
import uaLogo from '../img/ua-logo.svg'
import caffeinatedLogo from '../img/investors/caffeinated.svg'
import haystackLogo from '../img/optimized/haystack.webp'
import goldenLogo from '../img/investors/golden.svg'
import gtechLogo from '../img/optimized/gtech.webp'
import iisenseLogo from '../img/optimized/iisense.webp'
import uwaterlooLogo from '../img/optimized/uwaterloo.webp'
import adityaPhoto from '../img/optimized/aditya.webp'
import kunalPhoto from '../img/optimized/kunal.webp'
import saifPhoto from '../img/optimized/saif.webp'
import iconStore from '@tabler/icons/outline/building-store.svg'
import iconFactory from '@tabler/icons/outline/building-factory-2.svg'
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
  status?: 'Pre-release'
  wideLogo?: boolean
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
  { name: 'Caffeinated Capital', url: 'https://www.caffeinated.com/', logo: caffeinatedLogo.src },
  { name: 'Haystack Ventures', url: 'https://haystack.vc/', logo: haystackLogo.src },
  { name: 'Golden Ventures', url: 'https://www.golden.ventures/', logo: goldenLogo.src },
  { name: 'Invest with us', url: '/invest-with-us/', cta: true, logoType: 'text', logoText: 'Back the next silicon stack' },
]

const partners: Card[] = [
  { name: 'IISENSE', url: 'https://iisense.ca/', logo: iisenseLogo.src },
  { name: 'Silicon Jackets @ Georgia Tech', url: 'https://siliconjackets.gt/', logo: gtechLogo.src },
  { name: 'University of Waterloo', url: 'https://uwaterloo.ca/', logo: uwaterlooLogo.src, wideLogo: true },
  { name: 'Partner with us', url: '/build-with-us/?interest=partnership', cta: true, logoType: 'text', logoText: 'Your Logo Here' },
]

const iconAlembic = <span aria-hidden>🝪</span>
const iconWorkshop = <img src={iconStore.src} alt="" aria-hidden width="24" height="24" className="product-icon-img" />
const iconFoundry = <img src={iconFactory.src} alt="" aria-hidden width="24" height="24" className="product-icon-img" />

const products: Card[] = [
  {
    name: 'Alembic',
    url: '/build-with-us/',
    description: 'High-level analog design language that brings software-speed iteration to silicon.',
    ctaText: 'Discover Alembic →',
    status: 'Pre-release',
    logoType: 'none',
    icon: iconAlembic,
  },
  {
    name: 'Workshop',
    url: '/build-with-us/',
    description: 'Discover, remix, and share open source silicon designs in one place.',
    ctaText: 'Explore Workshop →',
    status: 'Pre-release',
    logoType: 'none',
    icon: iconWorkshop,
  },
  {
    name: 'Foundry',
    url: '/build-with-us/',
    description: 'Fast fabrication on a 1μm process with turnaround in under three weeks.',
    ctaText: 'Build with Foundry →',
    status: 'Pre-release',
    logoType: 'none',
    icon: iconFoundry,
  },
]

const team: TeamMember[] = [
  { name: 'Aditya Srinivasan', title: 'Chief Executive Officer', photo: adityaPhoto.src, url: 'https://www.linkedin.com/in/srini-aditya/' },
  { name: 'Kunal Chandan', title: 'Chief Technical Officer', photo: kunalPhoto.src, url: 'https://www.linkedin.com/in/kunal-chandan/' },
  { name: 'Saif Khattak', title: 'Director of Software', photo: saifPhoto.src, url: 'https://www.linkedin.com/in/skhattak00/' },
]

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
  prefersReducedMotion: boolean,
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

      if (prefersReducedMotion) {
        renderCircuitFrame(ctx, scene, palette, animationEndMs)
        return
      }

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
  }, [canvasRef, containerRef, prefersReducedMotion])
}

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(media.matches)
    updatePreference()
    media.addEventListener('change', updatePreference)
    return () => media.removeEventListener('change', updatePreference)
  }, [])

  return prefersReducedMotion
}

const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const Section: React.FC<{ title: string; className?: string; children: React.ReactNode }> = ({ title, className = '', children }) => (
  <section className={className}>
    <h2 className="subtitle">{title}</h2>
    {children}
  </section>
)

const CardGrid: React.FC<{ items: Card[]; className?: string; cardClassName?: string }> = ({ items, className = '', cardClassName = '' }) => (
  <div className={`cards-grid ${className}`.trim()}>
    {items.map((item) => {
      const isExternal = item.url.startsWith('http')
      const cardClass = `card${cardClassName ? ` ${cardClassName}` : ''}${item.cta ? ' card-cta' : ''}${item.logoType === 'none' ? ' card-icon-only' : ''}`

      const contents = (
        <>
          {item.logoType !== 'none' && (
            <div className={`card-logo${item.logo ? ' has-image' : ''}${item.wideLogo ? ' card-logo-wide' : ''}`}>
              {item.logoType === 'image' || (!item.logoType && item.logo)
                ? item.logo
                  ? <img src={item.logo} alt={`${item.name} logo`} loading="lazy" decoding="async" />
                  : (item.logoText ?? 'Logo Placeholder')
                : (item.logoText ?? (item.cta ? 'Get in touch' : 'Logo Placeholder'))}
            </div>
          )}
          <span className="card-name">
            {item.icon && <span className="product-icon" aria-hidden>{item.icon}</span>}
            {item.name}
          </span>
          {item.status && <span className="product-status">{item.status}</span>}
          {item.description && <p className="product-desc">{item.description}</p>}
          {item.ctaText && <span className="blog-cta-link product-cta">{item.ctaText}</span>}
          {item.cta && !item.ctaText && <span className="card-cta-text">Reach out to collaborate</span>}
        </>
      )

      return (
        <a
          key={item.name}
          className={cardClass}
          href={item.url}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
        >
          {contents}
        </a>
      )
    })}
  </div>
)

const CircuitBoardAnimation: React.FC<{ newsPosts: NewsEntry[] }> = ({ newsPosts }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useCircuitCanvas(containerRef, canvasRef, prefersReducedMotion)

  return (
    <main ref={containerRef} className="circuit-container">
      <canvas ref={canvasRef} className="circuit-canvas" aria-hidden="true" />
      <div className="text-overlay">
        <div className="text-content">
          <div className="text-content-inner">
            <div className="title-row">
              <h1 className="title">Rapid silicon prototyping</h1>
              <div className="title-logo" aria-hidden="true">
                <div
                  className="title-logo-mark"
                  style={{
                    WebkitMask: `url(${uaLogo.src}) center / contain no-repeat`,
                    mask: `url(${uaLogo.src}) center / contain no-repeat`,
                  }}
                />
              </div>
            </div>

            <div className="description">
              <p>We are compressing silicon prototyping timelines.</p>
              <p>Cutting fabrication lead times and building an open-source alternative to closed EDA stacks.</p>
              <ul className="description-list">
                <li>Silicon wafers in under <strong>3 weeks</strong> on a <strong>1μm</strong> process.</li>
                <li>Open source design tooling with the same stack we fab.</li>
              </ul>
              <div className="blog-cta">
                <a href="/build-with-us/" className="blog-cta-link">Build with us →</a>
                <a href="/blog/" className="blog-cta-link">Check out our blog →</a>
              </div>
            </div>

            <Section title="Our Products" className="expertise">
              <CardGrid className="product-grid" cardClassName="product" items={products} />
            </Section>

            <Section title="The Team" className="team-section">
              <div className="team-grid">
                {team.map((member) => (
                  <a
                    key={member.name}
                    className="card team-card"
                    href={member.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className={`card-logo team-photo${member.photo ? ' has-image' : ''}`} aria-label={`${member.name} LinkedIn profile`}>
                      {member.photo ? <img src={member.photo} alt={`${member.name} portrait`} width="120" height="120" loading="lazy" decoding="async" /> : 'Photo Placeholder'}
                    </div>
                    <h3 className="team-name">{member.name}</h3>
                    <p className="team-title">{member.title}</p>
                  </a>
                ))}
                <div>
                  <a href="/careers/" className="card team-card team-card-cta">
                    <div className="card-logo team-photo team-photo-cta" aria-hidden="true">
                      Your Face Here
                    </div>
                    <h3 className="team-name">Join the team</h3>
                    <p className="team-title">See open roles and apply</p>
                  </a>
                </div>
              </div>
            </Section>

            <Section title="Investors" className="partners-section investors-section">
              <CardGrid items={investors} />
            </Section>

            <Section title="Technical Partners" className="partners-section">
              <CardGrid items={partners} />
            </Section>

            <Section title="News" className="partners-section">
              <div className="cards-grid product-grid news-grid">
                {newsPosts.map((post) => (
                  <a key={post.slug} href={`/blog/${post.slug}/`} className="card product news-card">
                    <span className="news-date">{formatDate(post.date) || post.date}</span>
                    <span className="card-name">{post.title}</span>
                    <p className="product-desc">{post.summary}</p>
                    <span className="blog-cta-link product-cta">Read article →</span>
                  </a>
                ))}
              </div>
            </Section>

            <footer className="footer">
              Stay tuned for more updates and exciting developments.
            </footer>
          </div>
        </div>
      </div>
    </main>
  )
}

export default CircuitBoardAnimation
