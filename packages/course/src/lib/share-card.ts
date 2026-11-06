// THE SHARE CARDS, drawn at build time: the 1200 × 630 image a link to the course or to one of its
// levels unfurls into. The blog's card, in the course's voice: on the left the q and the course's
// title, then (a level) its region, its plate and number, and its title, the last baseline on the
// map's foot; on the right the map itself, the world at rest (the home) or the level chosen in its
// neighbourhood. The text is the course's own, set as on its pages and drawn as outlines, so the
// build needs no font installed.
import { openSync, type Font } from 'fontkit'
import { createRequire } from 'node:module'
import sharp from 'sharp'
import type { World } from './game'
import { cells, GLYPH } from './glyphs'
import { FACE, type Face } from './metrics'
import { GROUND, INK, LINE_STRONG, mix, SOCKET, TONES } from './palette'
import { mapScene, type MapScene } from './share-map'
import { Q, type TreeData } from './tree'
import { PANES } from './audit'

export const SHARE = { w: 1200, h: 630 }
const M = 64
// The map's window: the blog's square on the right, trimmed by crop marks.
const SIDE = SHARE.h - 2 * M
const LEFT = SHARE.w - M - SIDE
const COLUMN = LEFT - 2 * M
const CROP = { gap: 12, arm: 24, width: 2 }
// A level is framed at twice the world's step, as the page's camera shows it zoomed in.
const LEVEL_K = 2

// The faces, static cuts in WOFF (fontkit cannot vary a WOFF2 file).
const file = (p: string) => openSync(createRequire(import.meta.url).resolve(p)) as Font
const FONTS = {
  serif: file('@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff'),
  serifItalic: file('@fontsource/source-serif-4/files/source-serif-4-latin-400-italic.woff'),
  sans500: file('@fontsource/instrument-sans/files/instrument-sans-latin-500-normal.woff'),
  sans600: file('@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff'),
  mono: file('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff'),
}
type FontName = keyof typeof FONTS

// A line of text as one path of glyph outlines, its baseline at y = 0, from x = 0; `track` in em.
function outline(t: string, font: FontName, size: number, track = 0): { d: string; w: number } {
  const f = FONTS[font]
  const scale = size / f.unitsPerEm
  // The Latin files have no narrow no-break space: a no-break space stands in for it.
  const run = f.layout(t.replaceAll(' ', ' '))
  const missing = run.glyphs.find((g) => g.id === 0)
  if (missing) throw new Error(`The share card cannot set “${String.fromCodePoint(...missing.codePoints)}” in “${t}”.`)
  let d = ''
  let x = 0
  run.glyphs.forEach((g, i) => {
    const { xAdvance, xOffset, yOffset } = run.positions[i]!
    d += g.path.scale(scale, -scale).translate(x + xOffset * scale, -yOffset * scale).toSVG()
    x += xAdvance * scale + track * size
  })
  return { d, w: x - (t.length ? track * size : 0) }
}
const MAP_FONT: Record<Face, FontName> = { num: 'mono', name: 'sans500', eyebrow: 'sans600' }
const mapText = (t: string, face: Face, k: number) => outline(t, MAP_FONT[face], FACE[face].px * k, FACE[face].track)

// Words in balanced lines (the pages' text-wrap: balance): as many lines as the width needs, each
// as short as that allows.
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
// A title set at the largest size that keeps it to `lines` lines in the column.
function title(t: string, font: FontName, sizes: number[], lines: number, leading: number, column = COLUMN) {
  for (const size of sizes) {
    const ls = balance(t.split(' '), (s) => outline(s, font, size).w, column)
    if (ls.length <= lines) return { size, lines: ls, step: Math.round(size * leading) }
  }
  throw new Error(`“${t}” is too long for the share card: more than ${lines} lines at ${sizes.at(-1)}px.`)
}
// The home's title: three lines at most in a narrower column, the map taking the rest of the
// width, GUTTER away from its longest line.
const GUTTER = 72
const homeTitle = (t: string) => title(t, 'serif', [64, 56, 48, 40], 3, 1.08, 440)
const textAt =(d: string, x: number, y: number, fill: string) => `<path transform="translate(${x} ${y})" d="${d}" fill="${fill}"/>`
const cellsD = (rows: readonly string[], x: number, y: number, c: number) =>
  cells(rows).reduce((d, [a, b]) => d + `M${x + a * c} ${y + b * c}h${c}v${c}h-${c}z`, '')

// The world, laid out once for every card: at the 1280 × 800 desk pane, the smallest step the page
// lays the world out at on a desk.
let scene: { T: TreeData; s: MapScene } | null = null
const sceneOf = (T: TreeData, w: World) => {
  if (scene?.T !== T) {
    const P = PANES.find((p) => p.name === '1280 × 800')!
    scene = { T, s: mapScene(T, w, { w: P.w, h: P.h, top: 0, foot: P.foot, gutter: 24 }) }
  }
  return scene.s
}

export type ShareLevel = { id: string; label: string; titre: string; region: string; hue: number; icon: string[] | null }
export async function shareCard(T: TreeData, w: World, course: string, level: ShareLevel | null): Promise<Buffer> {
  const sc = sceneOf(T, w)
  const s = sc.fit.s0
  // the window over the map, in the layout's pixels
  let vb: [number, number, number, number]
  let win: [number, number, number, number]
  if (level) {
    const n = sc.LY.nodes.get(level.id)
    const side = SIDE / LEVEL_K
    const [bx0, by0, bx1, by1] = sc.fit.box
    // centred on the level, kept within the world's box (a level near its edge is not centred)
    const cx = n ? Math.max(bx0 + side / 2, Math.min(bx1 - side / 2, n.x * s)) : (bx0 + bx1) / 2
    const cy = n ? Math.max(by0 + side / 2, Math.min(by1 - side / 2, n.y * s)) : (by0 + by1) / 2
    vb = [Math.round(cx - side / 2), Math.round(cy - side / 2), side, side]
    win = [LEFT, M, SIDE, SIDE]
  } else {
    // the whole world, as large as the room the course's title leaves
    const [bx0, by0, bx1, by1] = sc.fit.box
    const pad = 16
    const bw = bx1 - bx0 + 2 * pad
    const bh = by1 - by0 + 2 * pad
    const ti = homeTitle(course)
    const room = SHARE.w - 2 * M - Math.max(...ti.lines.map((l) => outline(l, 'serif', ti.size).w)) - GUTTER
    const k = Math.min(room / bw, SIDE / bh)
    vb = [bx0 - pad, by0 - pad, bw, bh]
    const ww = Math.round(bw * k)
    const wh = Math.round(bh * k)
    win = [SHARE.w - M - ww, M + Math.round((SIDE - wh) / 2), ww, wh]
  }
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE.w}" height="${SHARE.h}" viewBox="0 0 ${SHARE.w} ${SHARE.h}"><rect width="${SHARE.w}" height="${SHARE.h}" fill="${GROUND}"/>`
  o += `<svg x="${win[0]}" y="${win[1]}" width="${win[2]}" height="${win[3]}" viewBox="${vb.join(' ')}" overflow="hidden">${sc.svg({ chosen: level?.id ?? null, text: mapText })}</svg>`
  // crop marks at the window's corners, outside it
  const { gap, arm, width } = CROP
  const [wx, wy, ww, wh] = win
  for (const [cx, cy, dx, dy] of [[wx, wy, -1, -1], [wx + ww, wy, 1, -1], [wx, wy + wh, -1, 1], [wx + ww, wy + wh, 1, 1]] as const) {
    const hx = dx < 0 ? cx - gap - arm : cx + gap
    const vy = dy < 0 ? cy - gap - arm : cy + gap
    o += `<rect x="${hx}" y="${dy < 0 ? cy : cy - width}" width="${arm}" height="${width}" fill="${LINE_STRONG}"/><rect x="${dx < 0 ? cx : cx - width}" y="${vy}" width="${width}" height="${arm}" fill="${LINE_STRONG}"/>`
  }
  // the head: the q and the course's title, as the pages' head carries them
  const qc = 6
  o += `<path d="${cellsD(Q, M, M, qc)}" fill="${INK}" shape-rendering="crispEdges"/>`
  const foot = M + SIDE
  if (level) {
    const head = outline(course, 'serif', 30)
    o += textAt(head.d, M + 5 * qc + 18, M + 7 * qc - 8, INK)
    const t = TONES[level.hue]!
    const ti = title(level.titre, 'serif', [64, 56, 48, 40], 4, 1.12)
    // from the foot up: the title, the plate and its number, the region
    let y = foot - (ti.lines.length - 1) * ti.step
    ti.lines.forEach((ln, i) => (o += textAt(outline(ln, 'serif', ti.size).d, M, y + i * ti.step, INK)))
    const P = 64
    const numSize = 56
    const plateTop = y - Math.round(ti.size * 0.95) - 28 - P
    const cxp = M + P / 2
    const cyp = plateTop + P / 2
    const dark = mix(SOCKET, t.plate, 0.3)
    const oc = (F: number) => {
      const h = F / 2
      const k = Math.round(h * (2 - Math.SQRT2))
      return `M${cxp - h + k} ${cyp - h}L${cxp + h - k} ${cyp - h}L${cxp + h} ${cyp - h + k}L${cxp + h} ${cyp + h - k}L${cxp + h - k} ${cyp + h}L${cxp - h + k} ${cyp + h}L${cxp - h} ${cyp + h - k}L${cxp - h} ${cyp - h + k}Z`
    }
    o += `<path d="${oc(P)}" fill="${t.ink}"/><path d="${oc(P - 6)}" fill="${dark}"/>`
    // its icon at 4 px a cell; a level off the map has none, and shows the chapters' glyph
    const rows = level.icon ?? GLYPH.chapters!
    const c = 4
    o += `<path d="${cellsD(rows, cxp - (rows[0]!.length * c) / 2, cyp - (rows.length * c) / 2, c)}" fill="${INK}" shape-rendering="crispEdges"/>`
    const num = outline(level.label, 'mono', numSize)
    o += textAt(num.d, M + P + 20, cyp + Math.round(numSize * 0.36), t.ink)
    const eye = outline(level.region.toLocaleUpperCase('fr'), 'sans600', 20, 0.08)
    o += textAt(eye.d, M, plateTop - 24, t.ink)
  } else {
    const ti = homeTitle(course)
    const y = foot - (ti.lines.length - 1) * ti.step
    ti.lines.forEach((ln, i) => (o += textAt(outline(ln, 'serif', ti.size).d, M, y + i * ti.step, INK)))
  }
  o += '</svg>'
  return sharp(Buffer.from(o)).png().toBuffer()
}
