import type { ImageMetadata } from 'astro'
import sharp from 'sharp'
import { lit, toneMap } from './dither'
import { isLit, MARK, MARK_WIDTH } from './mark'
import { GROUND, INK, LINE_STRONG, RAISE, type Rgb } from './palette'
import { SHARE_HEIGHT, SHARE_WIDTH } from './share-image'

// The index's share image, drawn pixel by pixel at build time: the mark, and
// the newest post's sleeve printed as the page prints it (a one-bit dither in
// the ink, trimmed by crop marks). No words: a link preview already shows
// the title and the description beside it.
const MARGIN = 96
const MARK_CELL = 16
const SLEEVE = 462
const DITHER_CELL = 2
const OVERSAMPLE = 4
const CROP = { gap: 12, arm: 24, width: 2 }

export async function shareCard(newest?: ImageMetadata): Promise<Buffer> {
  const pixels = Buffer.alloc(SHARE_WIDTH * SHARE_HEIGHT * 3)
  const fill = (x: number, y: number, w: number, h: number, rgb: Rgb) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) pixels.set(rgb, (j * SHARE_WIDTH + i) * 3)
  }
  fill(0, 0, SHARE_WIDTH, SHARE_HEIGHT, GROUND)

  for (let y = 0; y < MARK.length; y++) {
    for (let x = 0; x < MARK_WIDTH; x++) if (isLit(x, y)) fill(MARGIN + x * MARK_CELL, MARGIN + y * MARK_CELL, MARK_CELL, MARK_CELL, INK)
  }

  if (newest) {
    const left = SHARE_WIDTH - MARGIN - SLEEVE
    const top = (SHARE_HEIGHT - SLEEVE) / 2
    fill(left, top, SLEEVE, SLEEVE, RAISE)
    const cols = SLEEVE / DITHER_CELL
    const tone = toneMap(await luma(newest, cols), cols, cols)
    for (let y = 0; y < cols; y++) {
      for (let x = 0; x < cols; x++) {
        if (lit(tone, cols, x, y)) fill(left + x * DITHER_CELL, top + y * DITHER_CELL, DITHER_CELL, DITHER_CELL, INK)
      }
    }
    // A pair of hairlines at each corner, outside the trim.
    const { gap, arm, width } = CROP
    for (const [cx, cy, dx, dy] of [
      [left, top, -1, -1],
      [left + SLEEVE, top, 1, -1],
      [left, top + SLEEVE, -1, 1],
      [left + SLEEVE, top + SLEEVE, 1, 1],
    ] as const) {
      const hx = dx < 0 ? cx - gap - arm : cx + gap
      const vy = dy < 0 ? cy - gap - arm : cy + gap
      fill(hx, dy < 0 ? cy : cy - width, arm, width, LINE_STRONG)
      fill(dx < 0 ? cx : cx - width, vy, width, arm, LINE_STRONG)
    }
  }

  return sharp(pixels, { raw: { width: SHARE_WIDTH, height: SHARE_HEIGHT, channels: 3 } }).png().toBuffer()
}

// The photo's brightness per cell: cropped square on what sharp finds most
// salient (as the page's sleeve is), each cell the mean of a 4×4 block.
async function luma(image: ImageMetadata, cols: number): Promise<Float32Array> {
  // Astro keeps the source file's path on the image's metadata.
  const file = (image as ImageMetadata & { fsPath?: string }).fsPath
  if (!file) throw new Error(`The index share image cannot find the file behind ${image.src}.`)
  const side = cols * OVERSAMPLE
  const { data } = await sharp(file)
    .resize(side, side, { fit: 'cover', position: 'attention' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const out = new Float32Array(cols * cols)
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) out[Math.floor(y / OVERSAMPLE) * cols + Math.floor(x / OVERSAMPLE)]! += data[y * side + x]!
  }
  return out.map((v) => v / (255 * OVERSAMPLE * OVERSAMPLE))
}
