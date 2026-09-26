import type { ImageMetadata } from 'astro'
import { openSync, type Font } from 'fontkit'
import { createRequire } from 'node:module'
import sharp from 'sharp'
import { lit, toneMap } from './dither'
import { isLit, MARK, MARK_WIDTH } from './mark'
import { GROUND, INK, LINE_STRONG, RAISE, type Rgb } from './palette'
import { SHARE_HEIGHT, SHARE_WIDTH } from './share-image'

// A share image, drawn at build time: a post's photo cropped square on its
// centre, printed as a one-bit dither in the ink and trimmed by crop marks;
// on its left, the mark and the post's title, whose last baseline sits on the
// photo's foot. The title is on the card because some previews (X's) show the
// image alone. The index's card shows the newest post's photo beside the mark.
const MARGIN = 64
const SIDE = SHARE_HEIGHT - 2 * MARGIN
const LEFT = SHARE_WIDTH - MARGIN - SIDE
const COLUMN = LEFT - 2 * MARGIN
// The mark is smaller beside a title.
const MARK_CELL = { alone: 16, titled: 8 }
const DITHER_CELL = 2
const OVERSAMPLE = 4
const CROP = { gap: 12, arm: 24, width: 2 }
// The title is set as on the page, in Source Serif 4 at weight 500 and in
// balanced lines; the largest size that keeps it to six lines wins. It is
// drawn as outlines, so the build needs no font installed. fontkit cannot vary
// a WOFF2 file, so this is the static weight-500 cut, in WOFF.
const TITLE = { sizes: [52, 44, 36], lines: 6, leading: 1.08 }
const SERIF = openSync(
  createRequire(import.meta.url).resolve('@fontsource/source-serif-4/files/source-serif-4-latin-500-normal.woff'),
) as Font

export async function shareCard(photo?: ImageMetadata, title?: string): Promise<Buffer> {
  const pixels = Buffer.alloc(SHARE_WIDTH * SHARE_HEIGHT * 3)
  const fill = (x: number, y: number, w: number, h: number, rgb: Rgb) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) pixels.set(rgb, (j * SHARE_WIDTH + i) * 3)
  }
  fill(0, 0, SHARE_WIDTH, SHARE_HEIGHT, GROUND)

  const cell = title ? MARK_CELL.titled : MARK_CELL.alone
  for (let y = 0; y < MARK.length; y++) {
    for (let x = 0; x < MARK_WIDTH; x++) if (isLit(x, y)) fill(MARGIN + x * cell, MARGIN + y * cell, cell, cell, INK)
  }

  if (photo) {
    const cells = SIDE / DITHER_CELL
    fill(LEFT, MARGIN, SIDE, SIDE, RAISE)
    const tone = toneMap(await luma(photo, cells), cells, cells)
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        if (lit(tone, cells, x, y)) fill(LEFT + x * DITHER_CELL, MARGIN + y * DITHER_CELL, DITHER_CELL, DITHER_CELL, INK)
      }
    }
    // A pair of hairlines at each corner, outside the trim.
    const { gap, arm, width } = CROP
    for (const [cx, cy, dx, dy] of [
      [LEFT, MARGIN, -1, -1],
      [LEFT + SIDE, MARGIN, 1, -1],
      [LEFT, MARGIN + SIDE, -1, 1],
      [LEFT + SIDE, MARGIN + SIDE, 1, 1],
    ] as const) {
      const hx = dx < 0 ? cx - gap - arm : cx + gap
      const vy = dy < 0 ? cy - gap - arm : cy + gap
      fill(hx, dy < 0 ? cy : cy - width, arm, width, LINE_STRONG)
      fill(dx < 0 ? cx : cx - width, vy, width, arm, LINE_STRONG)
    }
  }

  const card = sharp(pixels, { raw: { width: SHARE_WIDTH, height: SHARE_HEIGHT, channels: 3 } })
  if (title) {
    const { svg, baseline } = setTitle(title)
    card.composite([{ input: svg, left: MARGIN, top: MARGIN + SIDE - baseline }])
  }
  return card.png().toBuffer()
}

// The photo's brightness per cell: cropped square on its centre, where a
// photo is composed (sharp's saliency picks the brightest area, which may not
// be the point: it cut the pigeon's knife), each cell the mean of a 4×4 block.
async function luma(image: ImageMetadata, cells: number): Promise<Float32Array> {
  // Astro keeps the source file's path on the image's metadata.
  const file = (image as ImageMetadata & { fsPath?: string }).fsPath
  if (!file) throw new Error(`The share image cannot find the file behind ${image.src}.`)
  const side = cells * OVERSAMPLE
  const { data } = await sharp(file)
    .resize(side, side, { fit: 'cover', position: 'centre' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const out = new Float32Array(cells * cells)
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) out[Math.floor(y / OVERSAMPLE) * cells + Math.floor(x / OVERSAMPLE)]! += data[y * side + x]!
  }
  return out.map((v) => v / (255 * OVERSAMPLE * OVERSAMPLE))
}

// The title as an SVG of glyph outlines, the width of the column, and the
// distance from its top to the last line's baseline.
function setTitle(title: string): { svg: Buffer; baseline: number } {
  // The font's Latin file has no narrow no-break space: a no-break space
  // stands in for it.
  const words = title.replaceAll(' ', ' ').split(' ')
  const font = SERIF
  for (const size of TITLE.sizes) {
    const scale = size / font.unitsPerEm
    const measure = (line: string) => font.layout(line).advanceWidth * scale
    const lines = balance(words, measure, COLUMN)
    if (lines.length > TITLE.lines) continue

    const ascent = font.ascent * scale
    const step = size * TITLE.leading
    let d = ''
    lines.forEach((line, i) => {
      const run = font.layout(line)
      const missing = run.glyphs.find((glyph) => glyph.id === 0)
      if (missing) throw new Error(`The share card cannot set “${String.fromCodePoint(...missing.codePoints)}” in the title “${title}”.`)
      let x = 0
      run.glyphs.forEach((glyph, g) => {
        const { xAdvance, xOffset, yOffset } = run.positions[g]!
        d += glyph.path.scale(scale, -scale).translate(x + xOffset * scale, ascent + i * step - yOffset * scale).toSVG()
        x += xAdvance * scale
      })
    })
    const baseline = ascent + (lines.length - 1) * step
    const height = Math.ceil(baseline - font.descent * scale)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLUMN}" height="${height}"><path fill="rgb(${INK.join(',')})" d="${d}"/></svg>`
    return { svg: Buffer.from(svg), baseline: Math.round(baseline) }
  }
  throw new Error(`The title “${title}” is too long for the share card: more than ${TITLE.lines} lines at ${TITLE.sizes.at(-1)}px.`)
}

// Words wrapped as the page's text-wrap: balance wraps them: as many lines as
// the column needs, each as short as that allows.
function balance(words: string[], measure: (line: string) => number, width: number): string[] {
  const wrap = (max: number) =>
    words.reduce<string[]>((lines, word) => {
      const last = lines.at(-1)
      if (last !== undefined && measure(`${last} ${word}`) <= max) lines[lines.length - 1] = `${last} ${word}`
      else lines.push(word)
      return lines
    }, [])
  const count = wrap(width).length
  let [narrow, wide] = [0, width]
  while (wide - narrow > 1) {
    const mid = Math.floor((narrow + wide) / 2)
    if (wrap(mid).length === count) wide = mid
    else narrow = mid
  }
  return wrap(wide)
}
