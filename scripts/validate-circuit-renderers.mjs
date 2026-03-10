import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)

const loadTsModule = (entryPath) => {
  const absolutePath = path.resolve(entryPath)
  const source = fs.readFileSync(absolutePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: absolutePath,
  })

  const module = { exports: {} }
  const context = vm.createContext({
    module,
    exports: module.exports,
    require,
    __dirname: path.dirname(absolutePath),
    __filename: absolutePath,
    console,
    process,
  })

  vm.runInContext(transpiled.outputText, context, { filename: absolutePath })
  return module.exports
}

const {
  generateCircuitScene,
  serializeSvgSnapshot,
  serializeCanvasSnapshot,
  getCircuitSeed,
} = loadTsModule('./src/components/circuitScene.ts')

const width = 1440
const height = 2200
const seed = getCircuitSeed(width, height)
const firstScene = generateCircuitScene(width, height, seed)
const secondScene = generateCircuitScene(width, height, seed)

if (JSON.stringify(firstScene) !== JSON.stringify(secondScene)) {
  throw new Error('Circuit scene generation is not deterministic for the same seed.')
}

const checkpoints = [0, 600, 1200, 2400, 3600, 5200]
for (const checkpoint of checkpoints) {
  const svgSnapshot = serializeSvgSnapshot(firstScene, checkpoint)
  const canvasSnapshot = serializeCanvasSnapshot(firstScene, checkpoint)
  if (svgSnapshot !== canvasSnapshot) {
    throw new Error(`Renderer output mismatch at ${checkpoint}ms.`)
  }
}

console.log('Circuit renderer validation passed.')
console.log(`Checkpoints: ${checkpoints.join(', ')}ms`)
