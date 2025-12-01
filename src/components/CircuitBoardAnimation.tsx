import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, type MotionProps } from 'framer-motion'
import uaLogo from '../img/ua-logo.svg'
import caffeinatedLogo from '../img/investors/caffeinated.svg'
import haystackLogo from '../img/investors/haystack.png'
import gtechLogo from '../img/partners/gtech.png'
import uwaterlooLogo from '../img/partners/uwaterloo.png'
import adityaPhoto from '../img/team/aditya.png'
import kunalPhoto from '../img/team/kunal.jpg'
import saifPhoto from '../img/team/saif.jpg'
import iconStore from '@tabler/icons/outline/building-store.svg'
import iconFactory from '@tabler/icons/outline/building-factory-2.svg'

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

type TeamMember = { name: string; title: string; photo?: string; url: string }

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

const { floor, random } = Math
const settings = { size: 10, leave: 10, wireMaxLen: 40 }

type Palette = { wire: string; node: string; ring: string; white: string }

const palette = () => {
  if (typeof window === 'undefined')
    return { wire: '#d4af37', node: '#f5f1e0', ring: '#ffffff', white: '#ffffff' }
  const s = getComputedStyle(document.documentElement)
  const read = (prop: string, fallback: string) => s.getPropertyValue(prop).trim() || fallback
  return {
    wire: read('--color-circuit-wire', '#d4af37'),
    node: read('--color-circuit-node', '#f5f1e0'),
    ring: read('--color-circuit-ring', '#ffffff'),
    white: read('--color-white', '#ffffff'),
  }
}

class Cell {
  x = 0; y = 0; available = true; dirInd = floor(random() * 8)
  constructor(x: number, y: number) { this.x = x; this.y = y }
}

class Wire {
  cells: Cell[] = []
  constructor(start: Cell) { start.available = false; this.cells.push(start) }

  noCross(c: Cell, d: number, map: Record<string, Cell>) {
    if ([0, 2, 4, 6].includes(d)) return true
    const checks: Record<number, [string, string]> = {
      1: [`${c.x},${c.y - 1}`, `${c.x + 1},${c.y}`],
      3: [`${c.x + 1},${c.y}`, `${c.x},${c.y + 1}`],
      5: [`${c.x - 1},${c.y}`, `${c.x},${c.y + 1}`],
      7: [`${c.x - 1},${c.y}`, `${c.x},${c.y - 1}`],
    }
    const [a, b] = checks[d]
    return (map[a]?.available ?? true) && (map[b]?.available ?? true)
  }

  generate(cells: Cell[], map: Record<string, Cell>, rows: number, cols: number) {
    const dirs = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]]
    while (this.cells.length < settings.wireMaxLen) {
      let tried = 0
      while (tried < dirs.length) {
        const last = this.cells[this.cells.length - 1]
        const dirInd = (last.dirInd + tried) % dirs.length
        const [dx, dy] = dirs[dirInd]
        const x = last.x + dx
        const y = last.y + dy
        const idx = y * cols + x
        if (x < 0 || x >= cols || y < 0 || y >= rows || idx < 0 || idx >= cells.length) { tried += 1; continue }
        const next = cells[idx]
        if (!next.available || !this.noCross(last, dirInd, map)) { tried += 1; continue }
        next.available = false; next.dirInd = dirInd; this.cells.push(next); break
      }
      if (tried === dirs.length) break
    }
  }

  draw(svg: SVGSVGElement, colors: Palette) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    const s = settings.size; const r = s / 3
    c1.setAttribute('r', `${r}`); c2.setAttribute('r', `${r}`)
    c1.setAttribute('stroke', colors.ring); c2.setAttribute('stroke', colors.ring)
    c1.setAttribute('fill', colors.node); c2.setAttribute('fill', colors.node)
    c1.setAttribute('opacity', '0'); c2.setAttribute('opacity', '0')
    c1.classList.add('animated-dot'); c2.classList.add('animated-dot')

    let d = ''
    this.cells.forEach((cell, i) => {
      const cx = cell.x * s + s / 2
      const cy = cell.y * s + s / 2
      if (i === 0) { d += `M ${cx} ${cy}`; c1.setAttribute('cx', `${cx}`); c1.setAttribute('cy', `${cy}`); c1.style.transformOrigin = `${cx}px ${cy}px` }
      d += ` L ${cx} ${cy}`
      if (i === this.cells.length - 1) { c2.setAttribute('cx', `${cx}`); c2.setAttribute('cy', `${cy}`); c2.style.transformOrigin = `${cx}px ${cy}px` }
    })

    path.setAttribute('d', d)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', colors.wire)
    path.setAttribute('stroke-width', `${settings.size / 4}`)
    const length = path.getTotalLength()
    path.setAttribute('stroke-dasharray', `${length}, ${length}`)
    path.setAttribute('stroke-dashoffset', `${length}`)
    path.classList.add('animated-path')
    path.style.animationDelay = '1s'
    svg.append(path, c1, c2)
  }
}

const fadeIn = (delay: number): MotionProps => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: [0.25, 0.25, 0.25, 1] } })
const reveal = (delay: number): MotionProps => ({ initial: { opacity: 0, scale: 0.95, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, transition: { duration: 0.8, delay, ease: [0.25, 0.25, 0.25, 1] } })

const Section: React.FC<{ title: string; delay: number; className?: string; children: React.ReactNode }> = ({ title, delay, className = '', children }) => (
  <motion.section className={className} {...fadeIn(delay)}>
    <h2 className="subtitle">{title}</h2>
    {children}
  </motion.section>
)

const CardGrid: React.FC<{ items: Card[]; className?: string; cardClassName?: string }> = ({ items, className = '', cardClassName = '' }) => (
  <div className={`partners-grid ${className}`.trim()}>
    {items.map((item) => (
      <a
        key={item.name}
        className={`partner-card${cardClassName ? ` ${cardClassName}` : ''}${item.cta ? ' partner-card-cta' : ''}`}
        href={item.url}
        target={item.url.startsWith('http') ? '_blank' : undefined}
        rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {item.logoType !== 'none' && (
          <div className={`partner-logo${item.logo ? ' has-image' : ''}`}>
            {item.logoType === 'image' || (!item.logoType && item.logo) ? (
              item.logo
                ? <img src={item.logo} alt={`${item.name} logo`} />
                : (item.logoText ?? 'Logo Placeholder')
            ) : (
              item.logoText ?? (item.cta ? 'Get in touch' : 'Logo Placeholder')
            )}
          </div>
        )}
        <span className="partner-name">
          {item.icon && <span className="product-icon" aria-hidden>{item.icon}</span>}
          {item.name}
        </span>
        {item.description && <p className="product-desc">{item.description}</p>}
        {item.ctaText && <span className="blog-cta-link product-cta">{item.ctaText}</span>}
        {item.cta && !item.ctaText && <span className="partner-cta-text">Reach out to collaborate</span>}
      </a>
    ))}
  </div>
)

const CircuitBoardAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const generate = () => {
    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg) return
    svg.innerHTML = ''
    const colors = palette()
    const { width, height } = container.getBoundingClientRect()
    svg.setAttribute('width', `${width}`); svg.setAttribute('height', `${height}`)

    const rows = floor(height / settings.size)
    const cols = floor(width / settings.size)
    const wireNum = floor(rows * cols / (settings.wireMaxLen + settings.leave))
    const cells: Cell[] = []
    const map: Record<string, Cell> = {}
    const wires: Wire[] = []

    for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) {
      const cell = new Cell(x, y); cells.push(cell); map[`${x},${y}`] = cell
    }

    while (wires.length < wireNum) {
      const cell = cells[floor(random() * cells.length)]
      if (!cell.available) continue
      const wire = new Wire(cell)
      wire.generate(cells, map, rows, cols)
      wire.draw(svg, colors)
      wires.push(wire)
    }
  }

  useEffect(() => {
    const handleResize = () => setTimeout(generate, 100)
    generate()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div ref={containerRef} className="circuit-container">
      <svg ref={svgRef} className="circuit-svg" xmlns="http://www.w3.org/2000/svg" />
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
              <CardGrid className="product-grid" cardClassName="product-card" items={products} />
            </Section>

            <Section title="The Team" delay={3.6} className="team-section">
              <div className="team-grid">
                {team.map((member) => (
                  <motion.a
                    key={member.name}
                    className="team-card"
                    href={member.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={`team-photo${member.photo ? ' has-image' : ''}`} aria-label={`${member.name} LinkedIn profile`}>
                      {member.photo ? <img src={member.photo} alt={`${member.name} portrait`} /> : 'Photo Placeholder'}
                    </div>
                    <h3 className="team-name">{member.name}</h3>
                    <p className="team-title">{member.title}</p>
                  </motion.a>
                ))}
              </div>
            </Section>

            <Section title="Investors" delay={3.7} className="partners-section investors-section">
              <CardGrid items={investors} />
            </Section>

            <Section title="Technical Partners" delay={3.8} className="partners-section">
              <CardGrid items={partners} />
            </Section>

            <motion.p className="footer" {...fadeIn(3.9)}>
              Stay tuned for more updates and exciting developments.
            </motion.p>
            <motion.p className="contact" {...fadeIn(4.1)}>
              Email inquiries to <a href="mailto:aditya@microalchemy.xyz" className="email-link">aditya@microalchemy.xyz</a>
            </motion.p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default CircuitBoardAnimation
