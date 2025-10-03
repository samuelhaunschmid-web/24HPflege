import sharp from 'sharp'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

async function run() {
  const srcPng = join(root, 'app-icon.png')
  const srcSvg = join(root, 'app-icon.svg')
  let input = null
  try { input = readFileSync(srcPng) } catch {}
  if (!input) {
    console.log('No app-icon.png found, trying SVG rasterization...')
    try { input = readFileSync(srcSvg) } catch {}
    if (!input) throw new Error('No app icon found (app-icon.png or app-icon.svg)')
  }
  const out512 = join(root, 'app-icon-512.png')
  const out1024 = join(root, 'app-icon-1024.png')
  await sharp(input).resize(512, 512, { fit: 'cover' }).png().toFile(out512)
  await sharp(input).resize(1024, 1024, { fit: 'cover' }).png().toFile(out1024)
  console.log('Generated:', out512, out1024)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})


