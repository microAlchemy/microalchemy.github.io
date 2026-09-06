import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(scriptDirectory, '..')
const source = path.join(root, 'assets', 'social-card.typ')
const output = path.join(root, 'public', 'social-card.png')
const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'microalchemy-social-card-'))
const vectorOutput = path.join(temporaryDirectory, 'social-card.svg')

try {
  // Typst converts all text to vector glyphs. Sharp then performs only the
  // final SVG-to-PNG rasterization, avoiding local font rendering differences.
  execFileSync('typst', [
    'compile',
    '--root', root,
    '--format', 'svg',
    source,
    vectorOutput,
  ], { stdio: 'inherit' })

  await sharp(vectorOutput)
    .png({ compressionLevel: 9, palette: false })
    .toFile(output)

  const metadata = await sharp(output).metadata()
  if (metadata.width !== 1200 || metadata.height !== 630) {
    throw new Error(`Expected a 1200x630 social card, received ${metadata.width}x${metadata.height}`)
  }

  console.log(`Generated ${path.relative(root, output)} (${metadata.width}x${metadata.height})`)
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}
