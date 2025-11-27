import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import uaLogo from '../img/ua-logo.svg'
import caffeinatedLogo from '../img/investors/caffeinated.svg'
import haystackLogo from '../img/investors/haystack.png'
import gtechLogo from '../img/partners/gtech.png'
import uwaterlooLogo from '../img/partners/uwaterloo.png'
import adityaPhoto from '../img/team/aditya.jpeg'
import kunalPhoto from '../img/team/kunal.jpg'
import saifPhoto from '../img/team/saif.jpg'

type PartnerCard = {
  name: string
  url: string
  logo?: string
  cta?: boolean
}

const investorCards: PartnerCard[] = [
  { name: 'Caffeinated Capital', url: 'https://www.caffeinated.com/', logo: caffeinatedLogo },
  { name: 'Haystack Ventures', url: 'https://haystack.vc/', logo: haystackLogo },
]

const partnerCards: PartnerCard[] = [
  { name: 'Silicon Jackets @ Georgia Tech', url: 'https://siliconjackets.gt/', logo: gtechLogo },
  { name: 'G2N @ University of Waterloo', url: 'https://g2n.uwaterloo.ca/', logo: uwaterlooLogo },
  { name: 'Partner with us', url: 'mailto:aditya@microalchemy.xyz', cta: true },
]

const { floor, random } = Math

const settings = {
  size: 10,
  leave: 10,
  wireMaxLen: 40,
}

type Palette = {
  wire: string
  node: string
  ring: string
  white: string
}

const getColorPalette = (): Palette => {
  if (typeof window === 'undefined')
    return { wire: '#d4af37', node: '#f5f1e0', ring: '#ffffff', white: '#ffffff' }

  const styles = getComputedStyle(document.documentElement)
  const read = (prop: string, fallback: string) => styles.getPropertyValue(prop).trim() || fallback

  return {
    wire: read('--color-circuit-wire', '#d4af37'),
    node: read('--color-circuit-node', '#f5f1e0'),
    ring: read('--color-circuit-ring', '#ffffff'),
    white: read('--color-white', '#ffffff'),
  }
}

class Cell {
  x = 0
  y = 0
  available = true
  dirInd = floor(random() * 8) // 该节点会往哪个方向延申

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
}

class Wire {
  cells: Cell[] = []

  constructor(start: Cell) {
    start.available = false
    this.cells.push(start)
  }

  validNoCrossOver(c1: Cell, dirInd: number, cellsMap: { [k: string]: Cell }) {
    // 水平垂直肯定不会交叉
    if ([0, 2, 4, 6].includes(dirInd))
      return true
    // 1-tr,3-br,5-bl,7-tl这四个方向会触发交叉重叠判断
    if (dirInd === 1) {
      // 在一些边界中，c3和c4根本不存在，所以不会交叉
      const c3 = cellsMap[`${c1.x},${c1.y - 1}`]?.available ?? true
      const c4 = cellsMap[`${c1.x + 1},${c1.y}`]?.available ?? true
      if (c3 && c4)
        return true
    }
    if (dirInd === 3) {
      const c3 = cellsMap[`${c1.x + 1},${c1.y}`]?.available ?? true
      const c4 = cellsMap[`${c1.x},${c1.y + 1}`]?.available ?? true
      if (c3 && c4)
        return true
    }
    if (dirInd === 5) {
      const c3 = cellsMap[`${c1.x - 1},${c1.y}`]?.available ?? true
      const c4 = cellsMap[`${c1.x},${c1.y + 1}`]?.available ?? true
      if (c3 && c4)
        return true
    }
    if (dirInd === 7) {
      const c3 = cellsMap[`${c1.x - 1},${c1.y}`]?.available ?? true
      const c4 = cellsMap[`${c1.x},${c1.y - 1}`]?.available ?? true
      if (c3 && c4)
        return true
    }
    return false
  }

  generate(cells: Cell[], cellsMap: { [k: string]: Cell }, rows: number, cols: number) {
    // 方向是顺时针旋转定义的，反正只要连续的方向就行，为了给cell依次指定方向
    const dirs = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]]
    const tryMax = dirs.length

    let hasSpace = true
    while (this.cells.length < settings.wireMaxLen && hasSpace) {
      hasSpace = true

      let dirInc = 0
      let tryNum = 0
      while (tryNum < tryMax) {
        const last = this.cells[this.cells.length - 1]
        const dirInd = (last.dirInd + dirInc) % 8

        const dir = dirs[dirInd]
        const x = last.x + dir[0]
        const y = last.y + dir[1]
        const index = y * cols + x
        // 方向越界
        if (x < 0 || x >= cols || y < 0 || y >= rows || index < 0 || index >= cells.length) {
          dirInc += 1
          tryNum += 1
          continue
        }
        const next = cells[index]
        // 节点占用
        if (!next.available) {
          dirInc += 1
          tryNum += 1
          continue
        }
        // 线路交叉判断
        if (!this.validNoCrossOver(last, dirInd, cellsMap)) {
          dirInc += 1
          tryNum += 1
          continue
        }

        // ok
        next.available = false
        next.dirInd = dirInd
        this.cells.push(next)
        dirInc = 0
        tryNum = 0
        break
      }
      // 所有方向都试过，不成立
      if (tryNum === tryMax) {
        hasSpace = false
        dirInc = 0
        tryNum = 0
      }
    }
  }

  draw(svgElement: SVGSVGElement, palette: Palette) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const circle1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    const circle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle')

    let d = ''
    const s = settings.size
    const r = s / 3

    circle1.setAttribute('r', `${r}`)
    circle2.setAttribute('r', `${r}`)
    circle1.setAttribute('stroke', palette.ring)
    circle2.setAttribute('stroke', palette.ring)
    circle1.setAttribute('fill', palette.node)
    circle2.setAttribute('fill', palette.node)

    // Add initial opacity and animation for dots
    circle1.setAttribute('opacity', '0')
    circle2.setAttribute('opacity', '0')
    circle1.classList.add('animated-dot')
    circle2.classList.add('animated-dot')

    for (let i = 0; i < this.cells.length; i += 1) {
      const cur = this.cells[i]
      if (i === 0) {
        d += `M ${cur.x * s + s / 2} ${cur.y * s + s / 2}`
        circle1.setAttribute('cx', `${cur.x * s + s / 2}`)
        circle1.setAttribute('cy', `${cur.y * s + s / 2}`)
        // Set transform origin for first circle
        circle1.style.transformOrigin = `${cur.x * s + s / 2}px ${cur.y * s + s / 2}px`
      }

      if (i < this.cells.length)
        d += ` L ${cur.x * s + s / 2} ${cur.y * s + s / 2}`

      if (i === this.cells.length - 1) {
        circle2.setAttribute('cx', `${cur.x * s + s / 2}`)
        circle2.setAttribute('cy', `${cur.y * s + s / 2}`)
        // Set transform origin for second circle
        circle2.style.transformOrigin = `${cur.x * s + s / 2}px ${cur.y * s + s / 2}px`
      }
    }

    path.setAttribute('d', d)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', palette.wire)
    path.setAttribute('stroke-width', `${settings.size / 4}`)
    const length = path.getTotalLength()
    path.setAttribute('stroke-dasharray', `${length}, ${length}`)
    path.setAttribute('stroke-dashoffset', `${length}`)
    path.classList.add('animated-path')

    // Add delay to path drawing
    path.style.animationDelay = '1.0s'

    svgElement.appendChild(path)
    svgElement.appendChild(circle1)
    svgElement.appendChild(circle2)
  }
}

const CircuitBoardAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const generateAnimation = () => {
    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg) return

    const palette = getColorPalette()
    // Clear existing animation
    svg.innerHTML = ''

    const { width, height } = container.getBoundingClientRect()
    svg.setAttribute('width', `${width}`)
    svg.setAttribute('height', `${height}`)

    const rows = floor(height / settings.size)
    const cols = floor(width / settings.size)
    const wireNum = floor(rows * cols / (settings.wireMaxLen + settings.leave))
    const cells: Cell[] = []
    const cellsMap: { [k: string]: Cell } = {} // {'x,y': Cell}
    const wires: Wire[] = []

    // Create cells
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const cell = new Cell(x, y)
        cells.push(cell)
        cellsMap[`${x},${y}`] = cell
      }
    }

    // Generate wires
    while (wires.length < wireNum) {
      const cell = cells[floor(random() * cells.length)]
      if (!cell.available) continue

      const wire = new Wire(cell)
      wires.push(wire)
      wire.generate(cells, cellsMap, rows, cols)
      wire.draw(svg, palette)
    }
  }

  useEffect(() => {
    const handleResize = () => {
      setTimeout(generateAnimation, 100)
    }

    // Initial generation
    generateAnimation()

    // Handle window resize
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div ref={containerRef} className="circuit-container">
      <svg
        ref={svgRef}
        className="circuit-svg"
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
      />
      <div className="text-overlay">
        <motion.div
          className="text-content"
          initial={{
            opacity: 0,
            scale: 0.95,
            y: 20
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0
          }}
          transition={{
            duration: 0.8,
            delay: 2.5,
            ease: [0.25, 0.25, 0.25, 1]
          }}
        >
          <div className="text-content-inner">
                      <motion.div
              className="title-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 2.0 }}
            >
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
                      <motion.div
              className="description"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 3.2 }}
            >
            <p>We're a startup revolutionizing <i>silicon prototyping</i>.</p>
            <p>We're cutting silicon fabrication lead times and breaking the silicon EDA duopoly.</p>
            <ul className="description-list">
              <li>Silicon wafers in under <strong>3 weeks</strong> on a <strong>1μm</strong> process.</li>
              <li>An open source toolchain coming soon!</li>
            </ul>
            <div className="blog-cta">
              <Link to="/blog" className="blog-cta-link">
                Check out our blog →
              </Link>
            </div>
          </motion.div>
                      <motion.div
              className="expertise"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 3.4 }}
            >
            <h2 className="subtitle">Our expertise includes:</h2>
            <ul className="expertise-list">
              <li>
                Alembic a groundbreaking language for high level analog design <br/> ✳ ✳ ✳
              </li>
              <li>
                Chip manufacturing blazingly fast <br/> ❇ ❇ ❇
              </li>
              <li>
                Discover more on our web platform <br/> ✳ ✳ ✳
              </li>
            </ul>
          </motion.div>
                      <motion.div
              className="team-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 3.6 }}
            >
            <h2 className="subtitle">The Team</h2>
            <div className="team-grid">
              {[
                { name: 'Aditya Srinivasan', title: 'Chief Executive Officer', photo: adityaPhoto },
                { name: 'Kunal Chandan', title: 'Chief Hardware Officer', photo: kunalPhoto },
                { name: 'Saif Khattak', title: 'Chief Software Officer', photo: saifPhoto },
              ].map(member => (
                <div className="team-card" key={member.name}>
                  <div className={`team-photo${member.photo ? ' has-image' : ''}`}>
                    {member.photo ? (
                      <img src={member.photo} alt={`${member.name} portrait`} />
                    ) : (
                      'Photo Placeholder'
                    )}
                  </div>
                  <h3 className="team-name">{member.name}</h3>
                  <p className="team-title">{member.title}</p>
                </div>
              ))}
            </div>
          </motion.div>
                      <motion.div
              className="partners-section investors-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 3.7 }}
            >
            <h2 className="subtitle">Investors</h2>
            <div className="partners-grid">
              {investorCards.map(investor => (
                <a
                  className={`partner-card${investor.cta ? ' partner-card-cta' : ''}`}
                  href={investor.url}
                  key={investor.name}
                  target={investor.url.startsWith('http') ? '_blank' : undefined}
                  rel={investor.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  <div className={`partner-logo${investor.logo ? ' has-image' : ''}`}>
                    {investor.logo
                      ? <img src={investor.logo} alt={`${investor.name} logo`} />
                      : investor.cta ? 'Invest with us' : 'Logo Placeholder'}
                  </div>
                  <span className="partner-name">{investor.name}</span>
                  {investor.cta && (
                    <span className="partner-cta-text">Contact us for details</span>
                  )}
                </a>
              ))}
            </div>
          </motion.div>
                      <motion.div
              className="partners-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 3.8 }}
            >
            <h2 className="subtitle">Technical Partners</h2>
            <div className="partners-grid">
              {partnerCards.map(partner => (
                <a
                  className={`partner-card${partner.cta ? ' partner-card-cta' : ''}`}
                  href={partner.url}
                  key={partner.name}
                  target={partner.url.startsWith('http') ? '_blank' : undefined}
                  rel={partner.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  <div className={`partner-logo${partner.logo ? ' has-image' : ''}`}>
                    {partner.logo
                      ? <img src={partner.logo} alt={`${partner.name} logo`} />
                      : partner.cta ? 'Your Logo Here' : 'Logo Placeholder'}
                  </div>
                  <span className="partner-name">{partner.name}</span>
                  {partner.cta && (
                    <span className="partner-cta-text">Reach out to collaborate</span>
                  )}
                </a>
              ))}
            </div>
          </motion.div>
                      <motion.p
              className="footer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 3.9 }}
            >
              Stay tuned for more updates and exciting developments!
            </motion.p>
            <motion.p
              className="contact"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 4.1 }}
            >
            Email inquiries to <a href="mailto:aditya@microalchemy.xyz" className="email-link">aditya@microalchemy.xyz</a>
          </motion.p>
                      <motion.div
              className="blog-cta"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 4.2 }}
            >
              <Link to="/blog" className="blog-cta-link">
                Visit the Microalchemy blog →
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default CircuitBoardAnimation
