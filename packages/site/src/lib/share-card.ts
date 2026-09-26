import type { ImageMetadata } from 'astro'
import sharp from 'sharp'
import { lit, toneMap } from './dither'
import { isLit, MARK, MARK_WIDTH } from './mark'
import { GROUND, INK, LINE_STRONG, RAISE, type Rgb } from './palette'
import { SHARE_HEIGHT, SHARE_WIDTH } from './share-image'
import { sleeveRatio } from './sleeve'

// A share image, drawn pixel by pixel at build time: the mark, and a post's
// sleeve in its own shape, printed as a one-bit dither in the ink and trimmed
// by crop marks. A post's shows its own photo, the index's the newest post's.
// No words: a link preview already shows the title and the description.
const MARGIN = 96
const MARK_CELL = 16
// The sleeve stands at the right, centred on the height: at most this tall,
// and never nearer the mark than a margin.
const TALL = 462
const WIDE = SHARE_WIDTH - 3 * MARGIN - MARK_WIDTH * MARK_CELL
// A preview shows the card about 300 to 600px wide: 3px cells keep the
// dither's grain there, where 2px ones blur to grey and 4px ones lose the subject.
const DITHER_CELL = 3
const OVERSAMPLE = 4
const CROP = { gap: 12, arm: 24, width: 2 }

export async function shareCard(photo?: ImageMetadata): Promise<Buffer> {
  const pixels = Buffer.alloc(SHARE_WIDTH * SHARE_HEIGHT * 3)
  const fill = (x: number, y: number, w: number, h: number, rgb: Rgb) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) pixels.set(rgb, (j * SHARE_WIDTH + i) * 3)
  }
  fill(0, 0, SHARE_WIDTH, SHARE_HEIGHT, GROUND)

  for (let y = 0; y < MARK.length; y++) {
    for (let x = 0; x < MARK_WIDTH; x++) if (isLit(x, y)) fill(MARGIN + x * MARK_CELL, MARGIN + y * MARK_CELL, MARK_CELL, MARK_CELL, INK)
  }

  if (photo) {
    const ratio = sleeveRatio(photo.width, photo.height)
    const tall = Math.min(TALL, WIDE / ratio)
    const cols = Math.floor((tall * ratio) / DITHER_CELL)
    const rows = Math.floor(tall / DITHER_CELL)
    const [w, h] = [cols * DITHER_CELL, rows * DITHER_CELL]
    const left = SHARE_WIDTH - MARGIN - w
    const top = (SHARE_HEIGHT - h) / 2
    fill(left, top, w, h, RAISE)
    const tone = toneMap(await luma(photo, cols, rows), cols, rows)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (lit(tone, cols, x, y)) fill(left + x * DITHER_CELL, top + y * DITHER_CELL, DITHER_CELL, DITHER_CELL, INK)
      }
    }
    // A pair of hairlines at each corner, outside the trim.
    const { gap, arm, width } = CROP
    for (const [cx, cy, dx, dy] of [
      [left, top, -1, -1],
      [left + w, top, 1, -1],
      [left, top + h, -1, 1],
      [left + w, top + h, 1, 1],
    ] as const) {
      const hx = dx < 0 ? cx - gap - arm : cx + gap
      const vy = dy < 0 ? cy - gap - arm : cy + gap
      fill(hx, dy < 0 ? cy : cy - width, arm, width, LINE_STRONG)
      fill(dx < 0 ? cx : cx - width, vy, width, arm, LINE_STRONG)
    }
  }

  return sharp(pixels, { raw: { width: SHARE_WIDTH, height: SHARE_HEIGHT, channels: 3 } }).png().toBuffer()
}

// The photo's brightness per cell: cropped to the sleeve's shape on what sharp
// finds most salient (as the page's sleeve is), each cell the mean of a 4×4
// block.
async function luma(image: ImageMetadata, cols: number, rows: number): Promise<Float32Array> {
  // Astro keeps the source file's path on the image's metadata.
  const file = (image as ImageMetadata & { fsPath?: string }).fsPath
  if (!file) throw new Error(`The share image cannot find the file behind ${image.src}.`)
  const [width, height] = [cols * OVERSAMPLE, rows * OVERSAMPLE]
  const { data } = await sharp(file)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const out = new Float32Array(cols * rows)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) out[Math.floor(y / OVERSAMPLE) * cols + Math.floor(x / OVERSAMPLE)]! += data[y * width + x]!
  }
  return out.map((v) => v / (255 * OVERSAMPLE * OVERSAMPLE))
}
