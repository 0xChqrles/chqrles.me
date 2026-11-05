// THE RENDERER'S PRIMITIVES, in device pixels (dp). The canvas transform is the identity: every
// position and width is rounded to whole dp here, so lines land on dp centres and icon cells on
// whole dp at rest. Strokes are 1, 2 or 3 CSS px, round(w × DPR) dp; the camera never scales one.
import { cells, DART } from '../../lib/glyphs'
import { GROUND, INK, rgba } from '../../lib/palette'
import { Q, type Pt } from '../../lib/tree'

export let dpr = 1
export const setDpr = (v: number) => (dpr = v)
export const D = (v: number) => Math.round(v * dpr)
// A stroke width in dp: never under 1.
export const W = (w: 1 | 2 | 3) => Math.max(1, Math.round(w * dpr))

// THE OCTAGON: flat-to-flat F dp, centred on (cx, cy) dp. Its 45° cut is whole dp, so every
// diagonal face steps exactly one dp across for one down.
export function octPts(cx: number, cy: number, F: number): Pt[] {
  const h = F / 2
  const k = Math.round(h * (2 - Math.SQRT2))
  return [
    [cx - h + k, cy - h], [cx + h - k, cy - h], [cx + h, cy - h + k], [cx + h, cy + h - k],
    [cx + h - k, cy + h], [cx - h + k, cy + h], [cx - h, cy + h - k], [cx - h, cy - h + k],
  ]
}
export function octPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, F: number) {
  const p = octPts(cx, cy, F)
  ctx.moveTo(p[0]![0], p[0]![1])
  for (let i = 1; i < 8; i++) ctx.lineTo(p[i]![0], p[i]![1])
  ctx.closePath()
}
export function oct(ctx: CanvasRenderingContext2D, cx: number, cy: number, F: number, fill: string) {
  ctx.beginPath()
  octPath(ctx, cx, cy, F)
  ctx.fillStyle = fill
  ctx.fill()
}
// A ring between two octagons (even-odd): frames and halos drawn as fills, never blurred.
export function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, Fo: number, Fi: number, fill: string) {
  ctx.beginPath()
  octPath(ctx, cx, cy, Fo)
  octPath(ctx, cx, cy, Fi)
  ctx.fillStyle = fill
  ctx.fill('evenodd')
}
// A halo (E1 to E5): two bands of the shape's own outline, +2 px at α .30 and +4 px at α .12.
export function halo(ctx: CanvasRenderingContext2D, cx: number, cy: number, F: number, col: string, a = 1) {
  ring(ctx, cx, cy, F + 2 * D(4), F + 2 * D(2), rgba(col, 0.12 * a))
  ring(ctx, cx, cy, F + 2 * D(2), F, rgba(col, 0.3 * a))
}
// A bevel inside an octagon of flat F: its top and left faces `hi`, bottom and right `lo`, b dp.
export function bevel(ctx: CanvasRenderingContext2D, cx: number, cy: number, F: number, b: number, hi: string, lo: string, fill: string) {
  ctx.save()
  ctx.beginPath()
  octPath(ctx, cx, cy, F)
  ctx.clip()
  oct(ctx, cx, cy, F, lo)
  oct(ctx, cx - b, cy - b, F, hi)
  oct(ctx, cx, cy, F - 2 * b, fill)
  ctx.restore()
}
// The perimeter of an octagon from 12 o'clock, clockwise: the progress arc.
export function octArc(ctx: CanvasRenderingContext2D, cx: number, cy: number, F: number, share: number, w: number, col: string) {
  const p = octPts(cx, cy, F - w)
  // start at the top face's middle
  const pts: Pt[] = [[cx, p[0]![1]], p[1]!, p[2]!, p[3]!, p[4]!, p[5]!, p[6]!, p[7]!, p[0]!, [cx, p[0]![1]]]
  let total = 0
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1])
  let left = total * Math.max(0, Math.min(1, share))
  ctx.beginPath()
  ctx.moveTo(pts[0]![0], pts[0]![1])
  for (let i = 1; i < pts.length && left > 0; i++) {
    const [ax, ay] = pts[i - 1]!
    const [bx, by] = pts[i]!
    const l = Math.hypot(bx - ax, by - ay)
    const t = Math.min(1, left / l)
    ctx.lineTo(ax + (bx - ax) * t, ay + (by - ay) * t)
    left -= l
  }
  ctx.strokeStyle = col
  ctx.lineWidth = w
  ctx.lineJoin = 'miter'
  ctx.lineCap = 'butt'
  ctx.stroke()
}
export function octStroke(ctx: CanvasRenderingContext2D, cx: number, cy: number, F: number, w: number, col: string, dash?: number[], off = 0) {
  ctx.beginPath()
  octPath(ctx, cx, cy, F - w)
  ctx.strokeStyle = col
  ctx.lineWidth = w
  ctx.lineJoin = 'miter'
  ctx.setLineDash(dash ?? [])
  ctx.lineDashOffset = off
  ctx.stroke()
  ctx.setLineDash([])
}

// CELL SPRITES, cached per (cells, colour, cell size in dp): drawn with smoothing off at whole dp.
const sprites = new Map<string, HTMLCanvasElement>()
export function sprite(key: string, rows: string[] | Pt[], col: string, c: number, pad = 0, keyline?: { col: string; w: number }, box?: [number, number]): HTMLCanvasElement {
  const k = `${key}|${col}|${c}|${pad}|${keyline ? keyline.col + keyline.w : ''}`
  let cv = sprites.get(k)
  if (cv) return cv
  const pts: Pt[] = typeof rows[0] === 'string' ? cells(rows as string[]) : (rows as Pt[])
  const wC = Math.max(...pts.map((p) => p[0])) + 1
  const hC = Math.max(...pts.map((p) => p[1])) + 1
  const w0 = box ? box[0] : typeof rows[0] === 'string' ? (rows[0] as string).length : wC
  const h0 = box ? box[1] : typeof rows[0] === 'string' ? rows.length : hC
  cv = document.createElement('canvas')
  cv.width = w0 * c + 2 * pad
  cv.height = h0 * c + 2 * pad
  const g = cv.getContext('2d')!
  if (keyline) {
    g.fillStyle = keyline.col
    for (const [x, y] of pts) g.fillRect(pad + x * c - keyline.w, pad + y * c - keyline.w, c + 2 * keyline.w, c + 2 * keyline.w)
  }
  g.fillStyle = col
  for (const [x, y] of pts) g.fillRect(pad + x * c, pad + y * c, c, c)
  sprites.set(k, cv)
  return cv
}
export function blit(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, x: number, y: number, a = 1) {
  ctx.imageSmoothingEnabled = false
  const g0 = ctx.globalAlpha
  ctx.globalAlpha = g0 * a
  ctx.drawImage(cv, Math.round(x), Math.round(y))
  ctx.globalAlpha = g0
}
// An icon (11 × 11) centred on (cx, cy) at c dp a cell.
export function icon(ctx: CanvasRenderingContext2D, id: string, rows: string[], cx: number, cy: number, c: number, col: string, a = 1) {
  const cv = sprite('i:' + id, rows, col, c)
  blit(ctx, cv, cx - Math.floor(cv.width / 2), cy - Math.floor(cv.height / 2), a)
}
// The q: its tail stands on (x, foot) dp, the stem continuing the tail down to the plate. An
// actor's keyline is 2 px in the ground (L4), never a grey halo.
export function q(ctx: CanvasRenderingContext2D, x: number, foot: number, c: number, col = INK, ghost = false, key = 2) {
  const h = 7 * c
  const x0 = Math.round(x - 4 * c)
  const y0 = Math.round(foot - h)
  // The ghost: the mark at a 1:1 dither, in the far region's ink. Its keyline: `key` CSS px.
  const kw = Math.max(1, D(key))
  const body = sprite((ghost ? 'qg' : 'q') + kw, ghost ? (cells(Q).filter(([a, b]) => (a + b) % 2 === 0) as Pt[]) : Q, col, c, kw, { col: GROUND, w: kw }, [5, 7])
  blit(ctx, body, x0 - kw, y0 - kw)
}
// The dart ("go there"), one of its eight turns, centred on (cx, cy): edge beacons only.
export function dart(ctx: CanvasRenderingContext2D, dir: number, cx: number, cy: number, c: number, col: string, key = GROUND) {
  const cv = sprite('ch' + dir, DART[dir]!, col, c, D(2), { col: key, w: D(2) }, [7, 7])
  blit(ctx, cv, cx - Math.floor(cv.width / 2), cy - Math.floor(cv.height / 2))
}
// Text with a 2-px keyline in what it stands on (the ground, or a land's tint), never in a box;
// left-aligned at whole dp. `track` spaces the letters (an eyebrow), drawn one by one so the
// width is the one lib/metrics.ts measured.
export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, col: string, a = 1, key = GROUND, track = 0) {
  if (a <= 0) return
  ctx.font = font
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.lineJoin = 'round'
  ctx.lineWidth = D(4)
  const g0 = ctx.globalAlpha
  ctx.globalAlpha = g0 * a
  const parts = track ? [...s] : [s]
  for (const p of [0, 1])
    for (let i = 0, cx = x; i < parts.length; i++) {
      const ch = parts[i]!
      if (p === 0) {
        ctx.strokeStyle = key
        ctx.strokeText(ch, Math.round(cx), Math.round(y))
      } else {
        ctx.fillStyle = col
        ctx.fillText(ch, Math.round(cx), Math.round(y))
      }
      cx += ctx.measureText(ch).width + track
    }
  ctx.globalAlpha = g0
}
