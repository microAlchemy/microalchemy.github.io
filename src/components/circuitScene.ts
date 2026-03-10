export type CircuitSettings = {
  size: number
  leave: number
  wireMaxLen: number
  maxWires: number
}

export type CircuitColors = {
  wire: string
  node: string
  ring: string
}

export type CircuitPoint = {
  x: number
  y: number
}

export type CircuitWire = {
  points: CircuitPoint[]
  segmentLengths: number[]
  totalLength: number
  startDot: CircuitPoint
  endDot: CircuitPoint
  pathD: string
  lineDelayMs: number
  dotDelayMs: number
}

export type CircuitScene = {
  width: number
  height: number
  rows: number
  cols: number
  seed: number
  size: number
  dotRadius: number
  lineWidth: number
  wires: CircuitWire[]
}

type InternalCell = {
  x: number
  y: number
  available: boolean
  dirInd: number
}

const DIRECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 1],
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, -1],
  [-1, 0],
  [-1, 1],
]

export const circuitSettings: CircuitSettings = {
  size: 10,
  leave: 10,
  wireMaxLen: 40,
  maxWires: 600,
}

export const circuitAnimation = {
  lineDurationMs: 1500,
  dotDurationMs: 600,
  initialDelayMs: 600,
  dotLeadMs: 180,
  perWireStepMs: 18,
  perBatchStepMs: 45,
  wiresPerBatch: 24,
}

const SEED_WIDTH_FACTOR = 73856093
const SEED_HEIGHT_FACTOR = 19349663
const SEED_SALT = 0x9e3779b9

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const easeOut = (value: number) => 1 - Math.pow(1 - clamp(value, 0, 1), 2)
const normalizeNumber = (value: number) => Number(value.toFixed(4))

const getSafeBounds = (width: number, height: number, size: number) => ({
  width: Math.max(width, size),
  height: Math.max(height, size),
})

const getGridDimensions = (width: number, height: number, size: number) => ({
  rows: Math.floor(height / size),
  cols: Math.floor(width / size),
})

const getWireBudget = (rows: number, cols: number, settings: CircuitSettings) =>
  Math.min(settings.maxWires, Math.floor((rows * cols) / (settings.wireMaxLen + settings.leave)))

const getAnimationDelayMs = (index: number) =>
  circuitAnimation.initialDelayMs
  + (index % circuitAnimation.wiresPerBatch) * circuitAnimation.perWireStepMs
  + Math.floor(index / circuitAnimation.wiresPerBatch) * circuitAnimation.perBatchStepMs

const toCircuitPoint = (cell: InternalCell, size: number): CircuitPoint => ({
  x: cell.x * size + size / 2,
  y: cell.y * size + size / 2,
})

const buildPathData = (points: CircuitPoint[]) => {
  let pathD = ''
  const segmentLengths: number[] = []
  let totalLength = 0

  points.forEach((point, index) => {
    if (index === 0) {
      pathD = `M ${point.x} ${point.y}`
      return
    }

    pathD += ` L ${point.x} ${point.y}`
    const previous = points[index - 1]
    const segmentLength = Math.hypot(point.x - previous.x, point.y - previous.y)
    segmentLengths.push(segmentLength)
    totalLength += segmentLength
  })

  return { pathD, segmentLengths, totalLength }
}

const makeCell = (x: number, y: number, random: () => number): InternalCell => ({
  x,
  y,
  available: true,
  dirInd: Math.floor(random() * 8),
})

const noCross = (cell: InternalCell, directionIndex: number, map: Record<string, InternalCell>) => {
  if ([0, 2, 4, 6].includes(directionIndex)) return true

  const checks: Record<number, [string, string]> = {
    1: [`${cell.x},${cell.y - 1}`, `${cell.x + 1},${cell.y}`],
    3: [`${cell.x + 1},${cell.y}`, `${cell.x},${cell.y + 1}`],
    5: [`${cell.x - 1},${cell.y}`, `${cell.x},${cell.y + 1}`],
    7: [`${cell.x - 1},${cell.y}`, `${cell.x},${cell.y - 1}`],
  }

  const [first, second] = checks[directionIndex]
  return (map[first]?.available ?? true) && (map[second]?.available ?? true)
}

const buildWire = (
  start: InternalCell,
  cells: InternalCell[],
  map: Record<string, InternalCell>,
  rows: number,
  cols: number,
  settings: CircuitSettings,
) => {
  start.available = false
  const wireCells = [start]

  while (wireCells.length < settings.wireMaxLen) {
    let tried = 0

    while (tried < DIRECTIONS.length) {
      const last = wireCells[wireCells.length - 1]
      const directionIndex = (last.dirInd + tried) % DIRECTIONS.length
      const [dx, dy] = DIRECTIONS[directionIndex]
      const x = last.x + dx
      const y = last.y + dy
      const idx = y * cols + x

      if (x < 0 || x >= cols || y < 0 || y >= rows || idx < 0 || idx >= cells.length) {
        tried += 1
        continue
      }

      const next = cells[idx]
      if (!next.available || !noCross(last, directionIndex, map)) {
        tried += 1
        continue
      }

      next.available = false
      next.dirInd = directionIndex
      wireCells.push(next)
      break
    }

    if (tried === DIRECTIONS.length) break
  }

  return wireCells
}

export const getCircuitSeed = (width: number, height: number) => {
  const roundedWidth = Math.max(1, Math.round(width))
  const roundedHeight = Math.max(1, Math.round(height))
  return ((roundedWidth * SEED_WIDTH_FACTOR) ^ (roundedHeight * SEED_HEIGHT_FACTOR) ^ SEED_SALT) >>> 0
}

export const generateCircuitScene = (
  width: number,
  height: number,
  seed: number,
  settings: CircuitSettings = circuitSettings,
): CircuitScene => {
  const safeBounds = getSafeBounds(width, height, settings.size)
  const { rows, cols } = getGridDimensions(safeBounds.width, safeBounds.height, settings.size)
  const wireNum = getWireBudget(rows, cols, settings)
  const random = createSeededRandom(seed)
  const cells: InternalCell[] = []
  const map: Record<string, InternalCell> = {}

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cell = makeCell(x, y, random)
      cells.push(cell)
      map[`${x},${y}`] = cell
    }
  }

  const wires: CircuitWire[] = []

  while (wires.length < wireNum) {
    const cell = cells[Math.floor(random() * cells.length)]
    if (!cell.available) continue

    const wireCells = buildWire(cell, cells, map, rows, cols, settings)
    const points = wireCells.map((wireCell) => toCircuitPoint(wireCell, settings.size))
    const { pathD, segmentLengths, totalLength } = buildPathData(points)
    const lineDelayMs = getAnimationDelayMs(wires.length)

    wires.push({
      points,
      segmentLengths,
      totalLength,
      startDot: points[0],
      endDot: points[points.length - 1],
      pathD,
      lineDelayMs,
      dotDelayMs: lineDelayMs + circuitAnimation.dotLeadMs,
    })
  }

  return {
    width: safeBounds.width,
    height: safeBounds.height,
    rows,
    cols,
    seed,
    size: settings.size,
    dotRadius: settings.size / 3,
    lineWidth: settings.size / 4,
    wires,
  }
}

const getLineProgress = (wire: CircuitWire, elapsedMs: number) =>
  clamp((elapsedMs - wire.lineDelayMs) / circuitAnimation.lineDurationMs, 0, 1)

const getDotProgress = (wire: CircuitWire, elapsedMs: number) =>
  easeOut((elapsedMs - wire.dotDelayMs) / circuitAnimation.dotDurationMs)

const getLineDrawLength = (wire: CircuitWire, elapsedMs: number) =>
  wire.totalLength * getLineProgress(wire, elapsedMs)

const getDotRadius = (scene: CircuitScene, wire: CircuitWire, elapsedMs: number) =>
  scene.dotRadius * (0.5 + 0.5 * getDotProgress(wire, elapsedMs))

const buildCanonicalSnapshot = (scene: CircuitScene, elapsedMs: number) => ({
  paths: scene.wires.map((wire) => ({
    d: wire.pathD,
    drawLength: normalizeNumber(getLineDrawLength(wire, elapsedMs)),
    totalLength: normalizeNumber(wire.totalLength),
    lineWidth: normalizeNumber(scene.lineWidth),
  })),
  dots: scene.wires.flatMap((wire) => {
    const progress = getDotProgress(wire, elapsedMs)
    const scale = 0.5 + 0.5 * progress
    const baseDot = {
      radius: normalizeNumber(scene.dotRadius * scale),
      opacity: normalizeNumber(progress),
    }

    return [
      {
        x: normalizeNumber(wire.startDot.x),
        y: normalizeNumber(wire.startDot.y),
        ...baseDot,
      },
      {
        x: normalizeNumber(wire.endDot.x),
        y: normalizeNumber(wire.endDot.y),
        ...baseDot,
      },
    ]
  }),
})

export const serializeSvgSnapshot = (scene: CircuitScene, elapsedMs: number) =>
  JSON.stringify(buildCanonicalSnapshot(scene, elapsedMs))

export const serializeCanvasSnapshot = (scene: CircuitScene, elapsedMs: number) =>
  JSON.stringify(buildCanonicalSnapshot(scene, elapsedMs))

const drawPartialWire = (ctx: CanvasRenderingContext2D, wire: CircuitWire, drawLength: number) => {
  if (drawLength <= 0 || wire.points.length < 2) return

  ctx.beginPath()
  ctx.moveTo(wire.points[0].x, wire.points[0].y)

  let remaining = drawLength
  for (let index = 1; index < wire.points.length; index += 1) {
    const from = wire.points[index - 1]
    const to = wire.points[index]
    const segmentLength = wire.segmentLengths[index - 1]

    if (remaining >= segmentLength) {
      ctx.lineTo(to.x, to.y)
      remaining -= segmentLength
      continue
    }

    const ratio = segmentLength === 0 ? 0 : remaining / segmentLength
    ctx.lineTo(
      from.x + (to.x - from.x) * ratio,
      from.y + (to.y - from.y) * ratio,
    )
    break
  }

  ctx.stroke()
}

export const renderCircuitFrame = (
  ctx: CanvasRenderingContext2D,
  scene: CircuitScene,
  colors: CircuitColors,
  elapsedMs: number,
) => {
  ctx.clearRect(0, 0, scene.width, scene.height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = colors.wire
  ctx.lineWidth = scene.lineWidth

  scene.wires.forEach((wire) => {
    drawPartialWire(ctx, wire, getLineDrawLength(wire, elapsedMs))
  })

  scene.wires.forEach((wire) => {
    const progress = getDotProgress(wire, elapsedMs)
    if (progress <= 0) return

    const radius = getDotRadius(scene, wire, elapsedMs)
    ctx.globalAlpha = progress
    ctx.fillStyle = colors.node
    ctx.strokeStyle = colors.ring
    ctx.lineWidth = 1

    ;[wire.startDot, wire.endDot].forEach((dot) => {
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    })
  })

  ctx.globalAlpha = 1
}

export const getCircuitAnimationEndMs = (scene: CircuitScene) => {
  if (!scene.wires.length) return 0
  const lastWire = scene.wires[scene.wires.length - 1]
  return Math.max(
    lastWire.lineDelayMs + circuitAnimation.lineDurationMs,
    lastWire.dotDelayMs + circuitAnimation.dotDurationMs,
  )
}
