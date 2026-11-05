// PLACEMENT: where every label, region title, door, card and the q stand on the screen, by rule.
// The page draws what these functions return, and the build runs the same functions at reference
// panes (`audit`), so a label that would cross a link or meet a plate fails the build, naming it.
// Text is measured with lib/metrics.ts on both sides, so the two always agree.
import { textW, type Face } from './metrics'
import { below, cellOf, inRings, reachOf, smaller, tableAt, ZOOM_K, dir8, type Axis, type Box, type Kind, type Layout, type Link, type Node, type Pt, type Size, type Table } from './tree'

// THE VIEW: which table, at what scale (CSS px a lattice step), which region is in focus (and its
// largest class, which no neighbour exceeds), where the q stands.
export type View = { axis: Axis; kind: Kind; z: boolean; s: number; focus: string | null; home: string | null; fmax?: Size | null; s0?: number }
// Every desktop world shows its numbers ('wide'); a phone's shows none.
export const kindOf = (axis: Axis): Kind => (axis === 'v' ? 'phone' : 'wide')
// ZOOMED PLATES grow with k up to ZPLATE_K and no further: past it, k only gives the names room.
export const ZPLATE_K = 2
export const tableOf = (v: Pick<View, 'kind' | 'z' | 's' | 's0'>): Table => tableAt(v.kind, v.z, v.z ? Math.min(v.s, ZPLATE_K * (v.s0 ?? v.s / ZPLATE_K)) : v.s)
// ZOOMED, a neighbour's plate is one class below its own, never larger than the focused region's
// largest.
export const sizeIn = (n: Node, v: View): Size => (v.z && v.focus && n.reg !== v.focus ? smaller(below(n.size), v.fmax ?? 'G') : n.size)
export const fmaxOf = (LY: Layout, reg: string): Size => {
  const rank = ['S', 'M', 'L', 'G'] as const
  return rank[Math.max(...[...LY.nodes.values()].filter((n) => n.reg === reg).map((n) => rank.indexOf(n.size)))]!
}
// A port or door chip, cut 4: 20 on a world, 28 zoomed; a phone's 16 and 20.
export const chipOf = (v: Pick<View, 'kind' | 'z'>) => (v.kind === 'phone' ? (v.z ? 20 : 16) : v.z ? 28 : 20)

// THE HUD's reserved bands, in CSS px. At zoom the sector bar holds the pane's top ZBAR px: the
// camera frames under it and nothing of the map is drawn there.
export const ZBAR = 48
// The safe area's gutter: 24 on a desktop world, 16 zoomed (the HUD's corner brackets stand 8 in)
// and on a phone.
export const GUTTER = { desk: 24, zoom: 16, phone: 16 }
export type Pane = { w: number; h: number; top: number; foot: number; gutter: number }
export const safe = (p: Pane): Box => [p.gutter, p.top + p.gutter, p.w - p.gutter, p.h - p.foot - p.gutter]

// How far a node's plate reaches at a view (the goal's bezel and ticks included), and its width.
export const reach = (n: Node, v: View) => reachOf(tableOf(v), sizeIn(n, v))
export const plateF = (n: Node, v: View) => tableOf(v)[sizeIn(n, v)][0]

// THE Q stands ON its plate, its feet QSINK px into the plate's top face, wholly inside its own
// land. Its box (keyline included), relative to the plate's centre, at c px a cell: the mark is 5
// cells wide, its tail (the last two) over the plate's centre.
export const QSINK = 4
// ...but never into its plate's icon: its feet and keyline stop at the icon's top edge (QSINK at the
// most). Its keyline is 2 px at 3 px a cell, 1 px below that (a 2-px keyline would eat the icon's top
// row of a 30-px plate).
export const qKey = (c: number) => (c >= 3 ? 2 : 1)
export const qSink = (F: number, c: number) => Math.max(0, Math.min(QSINK, (F - 11 * cellOf(F)) / 2 - qKey(c)))
export const qBox = (F: number, c: number): Box => [-4 * c - qKey(c), -(F / 2 - qSink(F, c)) - 7 * c - qKey(c), c + qKey(c), -(F / 2 - qSink(F, c)) + qKey(c)]
// THE Q'S CELL at a view: the most px (3, 2, then 1) at which the q, standing on ANY level of the
// view, stays wholly inside that level's land, 1 px off its rim (the room is reserved over every
// plate in every save state: nothing ever moves because of where the q stands).
const qCache = new WeakMap<Layout, Map<string, { c: number; bad: string[] }>>()
export function qCellAt(LY: Layout, v: View): { c: number; bad: string[] } {
  const key = `${v.kind}|${v.z}|${v.s}|${v.focus}`
  let m = qCache.get(LY)
  if (!m) qCache.set(LY, (m = new Map()))
  const hit = m.get(key)
  if (hit) return hit
  let res = { c: 1, bad: [] as string[] }
  for (const c of [3, 2, 1]) {
    const bad = [...LY.nodes.values()].filter((n) => !qInside(LY, n, v, c)).map((n) => n.id)
    res = { c, bad }
    if (!bad.length) break
  }
  m.set(key, res)
  return res
}
function qInside(LY: Layout, n: Node, v: View, c: number): boolean {
  const land = LY.lands.get(n.reg)
  if (!land) return false
  const b = qBox(plateF(n, v), c)
  // the q's box holds its keyline; the rim's stroke reaches 1 px inside the coast: the keyline
  // clears the stroke by half a px
  const g = 1.5
  const xs = [b[0] - g, (b[0] + b[2]) / 2, b[2] + g]
  const ys = [b[1] - g, (b[1] + b[3]) / 2, b[3]]
  return xs.every((x) => ys.every((y) => inRings(land.rings, n.x + x / v.s, n.y + y / v.s)))
}
export const qRoom = (LY: Layout, n: Node, v: View): Box => qBox(plateF(n, v), qCellAt(LY, v).c)

// LABELS. A level owns its label: its number (mono 11), and zoomed in its region on a desktop
// its number and name. It stands UNDER the plate; where a groove leaves the plate straight down,
// right; then left. Never over: that is the q's room. A named label is one line, else two balanced
// lines. On a world a label stands in its cell, else past its coast (wholly on the ground); zoomed,
// the region in focus uses ONE side for all its levels (under, else right), within its own coast.
export const GAP = { num: 1, name: 6, side: 8 }
// A number's line is its digits' height (the mono's figures stand 8 px over the baseline at 11 px)
// and a pixel either side; a name's line is 16.
export const LINE = { num: 10, name: 16 }
// The farthest a label stands from its row's plates, in px (audited).
export const NEAR_LABEL = 12
// Labels of one lattice row share a line only where it stays this near each plate.
export const ROW_SHARE = 6
// A label's keyline reaches a pixel past its box; the rim's 2-px stroke a pixel inside its coast:
// RIM_CLEAR px round the box keep the two apart.
export const RIM_CLEAR = 2
// A rim's concave vertex (a notch's corner) stands RIM_VERTEX px off any label, title, tag or card.
export const RIM_VERTEX = 4
const inBox = (b: Box, p: Pt) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3]
export type Side = 'S' | 'E' | 'W'
export type Line = { t: string; face: Face; x: number; base: number; k?: number }
export type Label = { side: Side; form: 'one' | 'two' | 'num'; box: Box; lines: Line[]; fresh: boolean }
// « Nouveau » (a level a clear just opened) is an eyebrow line over the label, never in place of
// its name: EYE px more, in the label's own slot (audited as the label is).
export const EYE = 13
// French binds a short word to the next: a line never ends on one.
const BOUND = new Set(['le', 'la', 'les', 'du', 'de', 'des', 'un', 'une', 'et', 'ou', 'au', 'aux', 'en', 'à', 'dans', 'sur', 'par', 'pour', 'sans', 'l’', "l'", 'd’', "d'"])
// The two most balanced lines of a name: cut at a space (never after a bound word) or after a
// hyphen (Schwartz- / Zippel).
export function halves(t: string): [string, string] | null {
  let best: [string, string] | null = null
  let m = Infinity
  for (let i = 1; i < t.length; i++) {
    let a: string
    let b: string
    if (t[i] === ' ') {
      a = t.slice(0, i)
      b = t.slice(i + 1)
      if (BOUND.has(a.split(' ').pop()!.toLowerCase())) continue
    } else if (t[i - 1] === '-') {
      a = t.slice(0, i)
      b = t.slice(i)
    } else continue
    const w = Math.max(textW(a, 'name'), textW(b, 'name'))
    if (w < m) [best, m] = [[a, b], w]
  }
  return best
}

// The faces a node's links leave by (0 = east, clockwise), on the screen.
export function facesOf(LY: Layout): Map<string, Set<number>> {
  const f = new Map([...LY.nodes.keys()].map((id) => [id, new Set<number>()]))
  for (const l of LY.links) {
    if (l.relay) for (const p of l.ports) f.get(p.end === 'a' ? l.a : l.b)!.add(dir8(p.dir[0], p.dir[1]))
    else {
      const a = l.pts[0]!
      const a1 = l.pts[1]!
      const b = l.pts[l.pts.length - 1]!
      const b1 = l.pts[l.pts.length - 2]!
      f.get(l.a)!.add(dir8(a1[0] - a[0], a1[1] - a[1]))
      f.get(l.b)!.add(dir8(b1[0] - b[0], b1[1] - b[1]))
    }
  }
  return f
}
// Every side a label may take, in order: under, right, left (beside a groove leaving straight that
// way: right of it under the plate, under it beside the plate). Over is the q's room, on every
// level, in every save state.
export const sidesOf = (_faces: Set<number>): Side[] => ['S', 'E', 'W']
export const sideOf = (faces: Set<number>): Side | null => sidesOf(faces)[0] ?? null
// SEMANTIC ZOOM: a desktop world shows its numbers; a phone's shows none (the sheet names the
// level chosen). Every region zoomed shows them.
export const labelled = (v: Pick<View, 'kind' | 'z'>) => v.z || v.kind === 'wide'

// A label's box on its side. Under the plate it is centred, then kept between the diagonal links
// that leave the plate on that side (a link from the centre at 45° passes x = ±y): it shifts off
// one, and a label wider than the room between two does not stand in that form. `h` is how far its
// row's plates reach (under), or its own plate (beside).
function lineBox(side: Side, h: number, w: number, hgt: number, gap: number, faces: Set<number>): Box | null {
  // beside: centred on the plate; where a groove leaves straight that way, under it
  const yb = (f: number): [number, number] => (faces.has(f) ? [LINK_OFF, LINK_OFF + hgt] : [-hgt / 2, hgt / 2])
  if (side === 'E') return [h + GAP.side, yb(0)[0], h + GAP.side + w, yb(0)[1]]
  if (side === 'W') return [-h - GAP.side - w, yb(4)[0], -h - GAP.side, yb(4)[1]]
  const near = h + gap
  // a 45° groove from the centre passes x = ±y: the label keeps its keyline and 3 px off it
  const room = near - 6.5
  const [lo, hi] = [faces.has(3) ? -room : -Infinity, faces.has(1) ? room : Infinity]
  // a groove leaving straight down: the label stands beside it, right then left (LINK_OFF off it)
  const spans: [number, number][] = faces.has(2) ? [[LINK_OFF, hi], [lo, -LINK_OFF]] : [[lo, hi]]
  for (const [a, b] of spans) {
    if (w > b - a) continue
    const x0 = faces.has(2) ? (a > 0 ? a : b - w) : Math.min(Math.max(-w / 2, a), b - w)
    return [x0, near, x0 + w, near + hgt]
  }
  return null
}
// How far a label under its plate keeps off a groove leaving straight down (its keyline clear).
export const LINK_OFF = 6
// The label in each form, relative to the plate's centre; a fresh level's carries « Nouveau » over
// its first line.
// A LABEL'S LINES SHARE ONE ALIGNMENT: under its plate each line is centred on the plate's axis (the
// box is), right of it they start at its left, left of it they end at its right.
// `tk` is the text's scale at the view (lib/place.ts's `textK`): 11-px numbers and eyebrows on most
// tables, 13 on the largest world, so text keeps its rank against plates that grow with the step.
export function forms(label: string, name: string | null, side: Side, h: number, faces: Set<number>, fresh = false, numOnly = true, tk = 1): Label[] {
  const nw = textW(label, 'num') * tk
  const ew = fresh ? textW('Nouveau', 'eyebrow') * tk : 0
  const e = fresh ? Math.round(EYE * tk) : 0
  const out: Label[] = []
  const xin = (b: Box, w: number) => (side === 'S' ? b[0] + (b[2] - b[0] - w) / 2 : side === 'E' ? b[0] : b[2] - w)
  const eye = (b: Box): Line[] => (fresh ? [{ t: 'Nouveau', face: 'eyebrow', x: xin(b, ew), base: b[1] + Math.round(10 * tk), k: tk }] : [])
  if (name) {
    const gw = nw + 6 + textW(name, 'name')
    const b = lineBox(side, h, Math.max(ew, gw), LINE.name + e, GAP.name, faces)
    if (b) out.push({ side, form: 'one', fresh, box: b, lines: [...eye(b), { t: label, face: 'num', x: xin(b, gw), base: b[1] + e + 12 }, { t: name, face: 'name', x: xin(b, gw) + nw + 6, base: b[1] + e + 12 }] })
    const hv = halves(name)
    const gw2 = hv ? nw + 6 + Math.max(textW(hv[0], 'name'), textW(hv[1], 'name')) : 0
    const b2 = hv && lineBox(side, h, Math.max(ew, gw2), 2 * LINE.name + e, GAP.name, faces)
    if (hv && b2) out.push({ side, form: 'two', fresh, box: b2, lines: [...eye(b2), { t: label, face: 'num', x: xin(b2, gw2), base: b2[1] + e + 12 }, { t: hv[0], face: 'name', x: xin(b2, gw2) + nw + 6, base: b2[1] + e + 12 }, { t: hv[1], face: 'name', x: xin(b2, gw2) + nw + 6, base: b2[1] + e + 28 }] })
  }
  if (!numOnly) return out
  const w = Math.max(ew, nw)
  const lh = Math.round(LINE.num * tk)
  const b = lineBox(side, h, w, lh + e, GAP.num, faces) ?? lineBox(side, h, w, lh + e, GAP.num, new Set())!
  out.push({ side, form: 'num', fresh, box: b, lines: [...eye(b), { t: label, face: 'num', x: xin(b, nw), base: b[1] + e + Math.round(9 * tk), k: tk }] })
  return out
}
// THE TEXT'S SCALE at a view: one step per table, so a label keeps its rank beside plates that grow
// with the step: 11-px numbers and titles on a world up to TEXT_STEP, 13 px beyond it (1920).
export const TEXT_STEP = 104
export const textK = (v: Pick<View, 'z' | 'kind' | 's'>) => (!v.z && v.kind === 'wide' && v.s >= TEXT_STEP ? 13 / 11 : 1)
// A label's box moved by (x, y), its lines with it.
export const moved = (f: Label, x: number, y: number): Label => ({ ...f, box: [f.box[0] + x, f.box[1] + y, f.box[2] + x, f.box[3] + y], lines: f.lines.map((l) => ({ ...l, x: l.x + x, base: l.base + y })) })

// THE SCENE at a view: every plate, link run, port and q room, in screen px (the lattice point at
// x·s, y·s), for the rules to test against. `qs` is the q's room over every plate (reserved in
// every save state); `q` the one the q stands in.
type Seg = [Pt, Pt]
export type Scene = { v: View; LY: Layout; segs: { seg: Seg; link: string }[]; rims: { seg: Seg; land: string }[]; notches: { at: Pt; land: string }[]; plates: { id: string; box: Box }[]; ports: { link: string; far: string; box: Box }[]; qs: { id: string; box: Box }[]; q: Box | null }
export const meets = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]
export const grow = (b: Box, m: number): Box => [b[0] - m, b[1] - m, b[2] + m, b[3] + m]
const at = (b: Box, x: number, y: number): Box => [b[0] + x, b[1] + y, b[2] + x, b[3] + y]
export const join = (a: Box, b: Box): Box => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]
// The distance from a point to a segment.
export function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}
// Does a segment meet a box? (Liang–Barsky)
export function segBox(p: Pt, q: Pt, b: Box): boolean {
  let t0 = 0
  let t1 = 1
  const dx = q[0] - p[0]
  const dy = q[1] - p[1]
  for (const [pp, qq] of [[-dx, p[0] - b[0]], [dx, b[2] - p[0]], [-dy, p[1] - b[1]], [dy, b[3] - p[1]]] as Pt[]) {
    if (pp === 0) {
      if (qq < 0) return false
    } else {
      const r = qq / pp
      if (pp < 0) t0 = Math.max(t0, r)
      else t1 = Math.min(t1, r)
      if (t0 > t1) return false
    }
  }
  return true
}
export function scene(LY: Layout, v: View): Scene {
  const S = (p: Pt): Pt => [p[0] * v.s, p[1] * v.s]
  const segs: Scene['segs'] = []
  for (const l of LY.links) for (const r of runsAt(l, LY, v)) for (let i = 1; i < r.pts.length; i++) segs.push({ seg: [S(r.pts[i - 1]!), S(r.pts[i]!)], link: l.id })
  // The rims drawn: every land's, on the world and zoomed (a neighbour's, zoomed, at 30 %: still a
  // line that nothing may cross).
  const rims: Scene['rims'] = []
  for (const [id, land] of LY.lands) for (const r of land.rings) r.forEach((p, i) => rims.push({ seg: [S(p), S(r[(i + 1) % r.length]!)], land: id }))
  // the notches: every drawn ring's concave vertices
  const notches: Scene['notches'] = []
  for (const [id, land] of LY.lands)
      for (const r of land.rings) {
        const area = r.reduce((t, p, i) => t + p[0] * r[(i + 1) % r.length]![1] - r[(i + 1) % r.length]![0] * p[1], 0)
        r.forEach((p, i) => {
          const a = r[(i + r.length - 1) % r.length]!
          const b = r[(i + 1) % r.length]!
          const cr = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])
          if (cr * area < -1e-9) notches.push({ at: S(p), land: id })
        })
      }
  const plates = [...LY.nodes.values()].map((n) => {
    const h = reach(n, v)
    return { id: n.id, box: [n.x * v.s - h, n.y * v.s - h, n.x * v.s + h, n.y * v.s + h] as Box }
  })
  const c = chipOf(v) / 2
  const ports = LY.links.flatMap((l) => l.ports.map((p) => {
    const q = portAt(LY, l, p.end, v)
    return { link: l.id, far: p.far, box: [q[0] * v.s - c, q[1] * v.s - c, q[0] * v.s + c, q[1] * v.s + c] as Box }
  }))
  const qs = [...LY.nodes.values()].map((n) => ({ id: n.id, box: at(qRoom(LY, n, v), n.x * v.s, n.y * v.s) }))
  return { v, LY, segs, rims, notches, plates, ports, qs, q: qs.find((x) => x.id === v.home)?.box ?? null }
}
const inside = (rings: Pt[][], x: number, y: number) => inRings(rings, x, y)
const corners = (b: Box): Pt[] => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [(b[0] + b[2]) / 2, b[1]], [(b[0] + b[2]) / 2, b[3]]]
// What a box meets in a scene (other than its own node's): the reasons it is not free. A label's
// rim test counts its keyline (RIM_CLEAR).
export function hits(sc: Scene, b: Box, own: string | null, labels: Map<string, Box>, rims = true): string[] {
  const out: string[] = []
  const B = grow(b, 2)
  for (const s of sc.segs) if (segBox(s.seg[0], s.seg[1], grow(b, 3))) out.push(`link ${s.link}`)
  if (rims) for (const r of sc.rims) if (segBox(r.seg[0], r.seg[1], grow(b, RIM_CLEAR))) out.push(`the rim of ${r.land}`)
  // a notch's corner (a rim's concave vertex) keeps RIM_VERTEX px off a box: a corner pointing at
  // a label reads as the rim running into it
  if (rims) for (const q of sc.notches) if (inBox(grow(b, RIM_VERTEX), q.at)) out.push(`a notch of the rim of ${q.land}`)
  for (const p of sc.plates) if (p.id !== own && meets(B, p.box)) out.push(`the plate of ${p.id}`)
  for (const p of sc.ports) if (meets(B, p.box)) out.push(`the port of ${p.link}`)
  for (const q of sc.qs) if (q.id !== own && meets(b, q.box)) out.push(`the q's room over ${q.id}`)
  for (const [id, l] of labels) if (id !== own && meets(B, l)) out.push(`the label of ${id}`)
  // a label stands on its own land or on the ground, never on another region's drawn land
  const mine = own ? sc.LY.nodes.get(own)?.reg : null
  if (own)
    for (const [id, land] of sc.LY.lands)
      if (id !== mine && corners(b).some(([x, y]) => inside(land.rings, x! / sc.v.s, y! / sc.v.s))) out.push(`the land of ${id}`)
  return [...new Set(out)]
}

// Every label of a scene, in course order (an earlier label stands; a later one keeps clear of
// it). `named` says which nodes show their name. Zoomed, the region in focus takes `side` for all
// its levels, in its own cells (never past its coast), and always its names. Labels of one lattice
// row of a region share a line, set by the row's largest plate (the goal apart). Faults and notes
// name each level.
export type Labels = { at: Map<string, Label>; boxes: Map<string, Box>; faults: string[]; notes: string[]; off: string[] }
export function labels(sc: Scene, order: string[], text: (id: string) => { label: string; name: string }, named: (n: Node) => boolean, faces: Map<string, Set<number>>, fresh: Set<string> = new Set(), side: Side = 'S'): Labels {
  const out: Labels = { at: new Map(), boxes: new Map(), faults: [], notes: [], off: [] }
  if (!labelled(sc.v)) return out
  const v = sc.v
  // a row: the levels of one region on one lattice row; its plates reach as far as its largest
  // (a level shares its row's line only when its plate's foot stands ROW_SHARE px or less above the
  // row's lowest: else its label hugs its own plate)
  const rowH = new Map<string, number>()
  for (const n of sc.LY.nodes.values()) {
    if (n.size === 'G') continue
    const k = `${n.reg}|${n.y}`
    rowH.set(k, Math.max(rowH.get(k) ?? 0, reach(n, v)))
  }
  const tk = textK(v)
  for (const id of order) {
    const n = sc.LY.nodes.get(id)
    if (!n) continue
    const { label, name } = text(id)
    const f0 = faces.get(id)!
    const own = reach(n, v)
    const row = rowH.get(`${n.reg}|${n.y}`) ?? own
    const hS = n.size === 'G' || row - own > ROW_SHARE ? own : row
    const focused = v.z && n.reg === v.focus
    // zoomed, the region's side first; a level whose grooves close it takes the next (a note)
    const sides = focused ? [...new Set([side, ...sidesOf(f0)])].filter((x) => x === side || sidesOf(f0).includes(x)) : sidesOf(f0)
    const nm = named(n) ? name : null
    const land = sc.LY.lands.get(n.reg)!
    const inOwn = (b: Box) => corners(grow(b, RIM_CLEAR)).every(([x, y]) => inside(land.rings, x! / v.s, y! / v.s)) && !sc.rims.some((r) => segBox(r.seg[0], r.seg[1], grow(b, RIM_CLEAR)))
    // NEAR ITS PLATE, ON EVERY VIEW: where no side's own place is free, the number alone, moved
    // round its plate (under, right, left: never over, the q's room) up to NEAR_LABEL px off it,
    // nearest first; it may stand on its own land or the ground, never across a rim or a link.
    const nearForms = (e: boolean): Label[] => {
      const res: { f: Label; d: number }[] = []
      for (const sd of ['S', 'E', 'W'] as Side[]) {
        const base = forms(label, null, sd, sd === 'S' ? own : own, new Set(), e, true, tk).find((x) => x.form === 'num')!
        const bw = base.box[2] - base.box[0]
        const bh = base.box[3] - base.box[1]
        for (let g = GAP.num; g <= NEAR_LABEL; g += 1)
          for (let sh = 0; sh <= own + bw; sh += 2)
            for (const sg of sh ? [1, -1] : [1]) {
              let x0: number
              let y0: number
              if (sd === 'S') [x0, y0] = [-bw / 2 + sg * sh, own + g]
              else [x0, y0] = [sd === 'E' ? own + g : -own - g - bw, -bh / 2 + sg * sh]
              // within NEAR_LABEL of the plate's box on both axes
              const dx = Math.max(x0 - own, -own - (x0 + bw), 0)
              const dy = Math.max(y0 - own, -own - (y0 + bh), 0)
              if (Math.max(dx, dy) > NEAR_LABEL || y0 + bh < -own) continue
              res.push({ f: moved(base, x0 - base.box[0], y0 - base.box[1]), d: Math.max(dx, dy) + sh * 0.5 })
            }
      }
      return res.sort((a, b) => a.d - b.d).map((x) => x.f)
    }
    const ok = (f: Label) => {
      const abs = at(f.box, n.x * v.s, n.y * v.s)
      return !hits(sc, abs, id, out.boxes).length && (!focused || inOwn(abs))
    }
    const order3 = (all: Label[]) => [...all.filter((x) => x.form === 'one'), ...all.filter((x) => x.form === 'two'), ...all.filter((x) => x.form === 'num')]
    const eyes = fresh.has(id) ? [true, false] : [false]
    // in its cell; on a world, else past its coast (sought only when no place in the cell is free)
    let fs = eyes.flatMap((e) => order3(sides.flatMap((sd) => forms(label, nm, sd, sd === 'S' ? hS : own, f0, e, !focused || !nm, tk))))
    // zoomed in its region: each form slid along its side (2 px at a time, never off its plate's
    // span), before the region's k has to change
    const slid = (f: Label): Label[] => {
      const res: Label[] = []
      const bw = f.box[2] - f.box[0]
      const bh = f.box[3] - f.box[1]
      const lim = f.side === 'S' ? own + bw / 2 - 2 : own + bh / 2 - 2
      for (let k = 2; k <= lim; k += 2) for (const sg of [1, -1]) res.push(f.side === 'S' ? moved(f, sg * k, 0) : moved(f, 0, sg * k))
      return res
    }
    if (focused && !fs.some(ok)) fs = [...fs, ...fs.flatMap(slid)]
    if (!focused && !fs.some(ok)) fs = [...fs, ...eyes.flatMap((e) => nearForms(e))]
    const pick = fs.find(ok)
    const f = pick ?? fs[fs.length - 1]
    if (!f) {
      out.faults.push(`${id}: no form of its label stands on side ${side}`)
      continue
    }
    const abs = at(f.box, n.x * v.s, n.y * v.s)
    if (f.side !== 'S') out.off.push(`${id} (${f.side === 'E' ? 'right' : 'left'})`)
    if (focused && pick && f.side !== side) out.notes.push(`${id}: its grooves close side ${side}; its label stands ${f.side === 'E' ? 'right' : f.side === 'W' ? 'left' : 'under'}`)
    if (!pick) out.faults.push(`the label of ${id} meets ${[...hits(sc, abs, id, out.boxes), ...(focused && !inOwn(abs) ? [`the coast of ${n.reg}`] : [])].join(', ')}`)
    else if (fresh.has(id) && !f.fresh) out.notes.push(`${id}: « Nouveau » does not fit over its label`)
    out.at.set(id, f)
    out.boxes.set(id, abs)
  }
  return out
}
// How far a label stands from its own plate: the gap between their boxes (the larger of the two
// axes' gaps), audited on every view.
export function labelGap(lb: Label, own: number): number {
  const b = lb.box
  return Math.max(b[0] - own, -own - b[2], b[1] - own, -own - b[3], 0)
}

// The obstacles a card or a tag may be given beside the map's own (a box with a region).
export type Title = { reg: string; box: Box; inside: boolean }

// DOORS, zoomed on a region: where a link leaves it. A road's door is its groove; it carries a
// chip (the far level's icon) where the far plate stands more than NEAR steps away, OR where the far
// plate is not drawn (the pane cuts it): a link only ever ends on a drawn plate or a drawn chip, and
// such a link is drawn only up to its chip. A relay's door is its port. One chip at most per far
// level in a view (a port first).
// THE CHIP'S PLACE: just past the coast, its box grown CHIP_CLEAR px clear of every drawn rim (and
// its notches), every plate and every label; slid out along its link until it is, else in; inside
// the safe area (`sa`, scene px) when one is given. None: just past the coast (the audit fails it).
export const NEAR = 2
export const CHIP_CLEAR = 4
export type Door = { link: string; at: Pt; dir: number; far: string; farReg: string; mine: string; chip: boolean; cut: boolean }
export function doors(LY: Layout, reg: string | null, v: View, o: { sc?: Scene; labels?: Map<string, Box>; drawn?: (id: string) => boolean; sa?: Box } = {}): Door[] {
  if (!reg) return []
  const out: Door[] = []
  const shown = new Set(LY.links.flatMap((l) => l.ports.map((p) => p.far)))
  const sc = o.sc ?? scene(LY, v)
  const cs = chipOf(v) / 2
  const free = (p: Pt, mine: string, far: string) => {
    const b: Box = [p[0] * v.s - cs, p[1] * v.s - cs, p[0] * v.s + cs, p[1] * v.s + cs]
    const g = grow(b, CHIP_CLEAR)
    if (sc.rims.some((r) => segBox(r.seg[0], r.seg[1], g)) || sc.notches.some((q) => inBox(g, q.at))) return false
    if (sc.plates.some((q) => meets(grow(b, 2), q.box))) return false
    if (o.labels && [...o.labels.values()].some((q) => meets(grow(b, 2), q))) return false
    if (o.sa && (b[0] < o.sa[0] || b[1] < o.sa[1] || b[2] > o.sa[2] || b[3] > o.sa[3])) return false
    return mine !== far
  }
  for (const l of LY.links) {
    if (l.ra === l.rb) continue
    const mineA = l.ra === reg
    if (!mineA && l.rb !== reg) continue
    const far = mineA ? l.b : l.a
    const mine = mineA ? l.a : l.b
    const farReg = LY.nodes.get(far)!.reg
    if (l.relay) {
      const p = l.ports.find((pt) => (pt.end === 'a') === mineA)
      if (p) out.push({ link: l.id, at: portAt(LY, l, p.end, v), dir: dir8(p.dir[0], p.dir[1]), far, farReg, mine, chip: true, cut: false })
      continue
    }
    // the coast the link leaves the region by: its first crossing of the region's rim, from its level
    const full = mineA ? l.pts : [...l.pts].reverse()
    const cut0 = clipIn(full, LY.lands.get(reg)!.rings)
    const coast = cut0[0]!.pts[cut0[0]!.pts.length - 1]!
    const lenOf = (pts: Pt[]) => pts.slice(1).reduce((t, q, i) => t + Math.hypot(q[0] - pts[i]![0], q[1] - pts[i]![1]), 0)
    const dc = lenOf(cut0[0]!.pts)
    const total = lenOf(full)
    const ra = reach(LY.nodes.get(mine)!, v) / v.s
    const rb = reach(LY.nodes.get(far)!, v) / v.s
    const u0 = alongPts(full, dc + 1e-3)
    const u: Pt = [(u0[0] - coast[0]) * 1000, (u0[1] - coast[1]) * 1000]
    const k = (cs * (Math.abs(u[0]) > 1e-3 && Math.abs(u[1]) > 1e-3 ? Math.SQRT2 : 1)) / v.s
    const stepPx = 2 / v.s
    const cands: number[] = []
    for (let d = dc + k; d <= total - rb - k; d += stepPx) cands.push(d)
    for (let d = dc - k; d >= ra + k; d -= stepPx) cands.push(d)
    const pick = cands.find((d) => free(alongPts(full, d), mine, far))
    const at_ = alongPts(full, pick ?? dc + k)
    const fn = LY.nodes.get(far)!
    const cut = !!o.drawn && !o.drawn(far)
    const chip = (cut || Math.hypot(fn.x - at_[0], fn.y - at_[1]) > NEAR + 1e-6) && !shown.has(far)
    if (chip) shown.add(far)
    out.push({ link: l.id, at: at_, dir: dir8(u[0], u[1]), far, farReg, mine, chip, cut })
  }
  return out
}
// PORTS AT A VIEW: a relay's (or a warp's) port stands where the lattice put it (PORT past its
// coast), slid on out along its stub, a px at a time, until its chip's box grown CHIP_CLEAR px clears
// every rim the view draws and their notches, covers no plate, and stands 4 px off every chip placed
// before it. A warp's stub runs straight from its level to its port, so where its own side has no
// such room near, it takes the nearest that has round its level (never behind another port of its
// level where another side is free).
const portCache = new WeakMap<Layout, Map<string, Map<string, Pt>>>()
export function portsAt(LY: Layout, v: Pick<View, 'kind' | 'z' | 's' | 'focus'>): Map<string, Pt> {
  const key = `${v.kind}|${v.z}|${v.s}|${v.z ? v.focus : ''}`
  let m = portCache.get(LY)
  if (!m) portCache.set(LY, (m = new Map()))
  const hit = m.get(key)
  if (hit) return hit
  const res = new Map<string, Pt>()
  const rings = [...LY.lands.entries()].flatMap(([, l]) => l.rings)
  const segs = rings.flatMap((r) => r.map((p, i) => [p, r[(i + 1) % r.length]!] as Seg))
  const half = (chipOf(v) / 2 + CHIP_CLEAR) / v.s
  const gap = (chipOf(v) + 5) / v.s
  const plates = [...LY.nodes.values()].map((n) => ({ x: n.x, y: n.y, r: (reach(n, v as View) + 2) / v.s + chipOf(v) / 2 / v.s }))
  const ground = (q: Pt) => {
    const b: Box = [q[0] - half, q[1] - half, q[0] + half, q[1] + half]
    return !segs.some(([a, c]) => segBox(a, c, b)) && !inRings(rings, q[0], q[1]) && plates.every((n) => Math.abs(n.x - q[0]) >= n.r || Math.abs(n.y - q[1]) >= n.r)
  }
  const apart = (q: Pt) => [...res.values()].every((o) => Math.abs(o[0] - q[0]) >= gap || Math.abs(o[1] - q[1]) >= gap)
  // the directions a level's ports leave it by
  const used = new Map<string, Pt[]>()
  const dirOf = (n: Node, q: Pt): Pt => {
    const h = Math.hypot(q[0] - n.x, q[1] - n.y) || 1
    return [(q[0] - n.x) / h, (q[1] - n.y) / h]
  }
  const behind = (n: Node, u: Pt) => (used.get(n.id) ?? []).some((w) => w[0] * u[0] + w[1] * u[1] > 0.9)
  for (const l of LY.links)
    for (const p of l.ports) {
      const at = (d: number): Pt => [p.at[0] + p.dir[0] * d, p.at[1] + p.dir[1] * d]
      const own = LY.nodes.get(p.end === 'a' ? l.a : l.b)!
      let q = p.at
      let found = false
      for (let d = 0; d < (l.warp ? 0.3 : 1.5) && !found; d += 1 / v.s) if (ground(at(d)) && apart(at(d)) && !(l.warp && behind(own, dirOf(own, at(d))))) (q = at(d)), (found = true)
      if (!found && l.warp) {
        const ways = [0, 1, 2, 3, 4, 5, 6, 7]
          .map((i) => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)] as Pt)
          .sort((a, b) => Number(behind(own, a)) - Number(behind(own, b)) || b[0] * p.dir[0] + b[1] * p.dir[1] - (a[0] * p.dir[0] + a[1] * p.dir[1]))
        for (const u of ways)
          for (let d = 0.3; d < 2 && !found; d += 1 / v.s) {
            const c: Pt = [own.x + u[0] * d, own.y + u[1] * d]
            if (ground(c) && apart(c) && LY.links.every((o) => o.warp || !o.pts.slice(1).some((b, k) => segBox(o.pts[k]!, b, [c[0] - half, c[1] - half, c[0] + half, c[1] + half])))) (q = c), (found = true)
          }
      }
      for (let d = 0; d < 1.5 && !found; d += 1 / v.s) if (ground(at(d)) && apart(at(d))) (q = at(d)), (found = true)
      for (let d = 0; d < 1.5 && !found; d += 1 / v.s) if (ground(at(d))) (q = at(d)), (found = true)
      res.set(`${l.id}|${p.end}`, q)
      used.set(own.id, [...(used.get(own.id) ?? []), dirOf(own, q)])
    }
  m.set(key, res)
  return res
}
export const portAt = (LY: Layout, l: Link, end: 'a' | 'b', v: Pick<View, 'kind' | 'z' | 's' | 'focus'>): Pt => portsAt(LY, v).get(`${l.id}|${end}`) ?? l.ports.find((p) => p.end === end)!.at
// A link's stretches at a view: a road's pieces; a relay's stubs, each to its port at the view.
export const runsAt = (l: Link, LY: Layout, v: Pick<View, 'kind' | 'z' | 's' | 'focus'>) =>
  l.relay ? l.ports.map((p) => {
    const m = LY.nodes.get(p.end === 'a' ? l.a : l.b)!
    return { reg: m.reg, pts: [[m.x, m.y], portAt(LY, l, p.end, v)] as Pt[] }
  }) : l.pieces

// The point at a distance along a polyline.
function alongPts(pts: Pt[], d: number): Pt {
  let acc = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    const L = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (acc + L >= d || i === pts.length - 1) {
      const t = L ? Math.max(0, Math.min(1, (d - acc) / L)) : 0
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    }
    acc += L
  }
  return pts[0]!
}

// THE COLOUR RUNS of a link at a view: a colour changes only on a drawn edge (a coast, or a plate).
// On a world, the run on each land in its wire, the gutter neutral (a strait narrower than
// MIN_GUTTER has none: lib/lattice.ts). Zoomed, the run on the focused land in its wire; outside
// it ONE peripheral tone to the far plate: the far region's for a road of the focused region, the
// region's own for a road inside one neighbour, neutral between two neighbours. `tone`: a region,
// 'p:' + a region (its peripheral tone), null (neutral) or 'p:' (neutral, peripheral).
export type Run = { tone: string | null; pts: Pt[]; a: boolean; b: boolean }
// A polyline cut where it crosses a land's rings: its stretches, each inside the land or not.
export function clipIn(pts: Pt[], rings: Pt[][]): { pts: Pt[]; inside: boolean }[] {
  const out: { pts: Pt[]; inside: boolean }[] = []
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!
    const q = pts[i]!
    const ts = [0, 1]
    for (const r of rings)
      for (let j = 0; j < r.length; j++) {
        const a = r[j]!
        const b = r[(j + 1) % r.length]!
        const d = (q[0] - p[0]) * (b[1] - a[1]) - (q[1] - p[1]) * (b[0] - a[0])
        if (Math.abs(d) < 1e-12) continue
        const t = ((a[0] - p[0]) * (b[1] - a[1]) - (a[1] - p[1]) * (b[0] - a[0])) / d
        const u = ((a[0] - p[0]) * (q[1] - p[1]) - (a[1] - p[1]) * (q[0] - p[0])) / d
        if (t > 1e-9 && t < 1 - 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) ts.push(t)
      }
    ts.sort((x, y) => x - y)
    for (let k = 1; k < ts.length; k++) {
      if (ts[k]! - ts[k - 1]! < 1e-9) continue
      const P = (t: number): Pt => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
      const m = P((ts[k]! + ts[k - 1]!) / 2)
      const inside = inRings(rings, m[0], m[1])
      const last = out[out.length - 1]
      if (last && last.inside === inside) last.pts.push(P(ts[k]!))
      else out.push({ pts: [P(ts[k - 1]!), P(ts[k]!)], inside })
    }
  }
  return out
}
export function colourRuns(l: Link, LY: Layout, v: View): Run[] {
  const runs = runsAt(l, LY, v)
  const ends = runs.map((_, i) => ({ a: l.relay || i === 0, b: l.relay || i === runs.length - 1 }))
  if (!v.z || !v.focus) return runs.map((r, i) => ({ tone: r.reg, pts: r.pts, ...ends[i]! }))
  // ZOOMED, THE COLOUR CHANGES ON THE DRAWN RIM: the link (or a relay's stub) is cut where it
  // crosses the focused land's rim, the focused wire inside, one peripheral tone outside (the
  // world's midline rule is the world's only)
  const far = l.ra === v.focus ? l.rb : l.rb === v.focus ? l.ra : null
  const outTone = far ? 'p:' + far : l.ra === l.rb ? 'p:' + l.ra : 'p:'
  const land = LY.lands.get(v.focus)!
  const out: Run[] = []
  const lines = l.relay ? runs.map((r) => r.pts) : [l.pts]
  lines.forEach((pts, li) => {
    const cut = clipIn(pts, land.rings)
    cut.forEach((c, i) => {
      const tone = c.inside ? v.focus : l.relay ? 'p:' + (runs[li]!.reg === v.focus ? (far ?? runs[li]!.reg) : runs[li]!.reg) : outTone
      out.push({ tone, pts: c.pts, a: i === 0 && (l.relay || li === 0), b: i === cut.length - 1 && (l.relay || li === lines.length - 1) })
    })
  })
  return out
}
// The visible length of a run, in px: its length at the view less the plates it starts or ends in.
export function runPx(r: Run, l: Link, LY: Layout, v: View): number {
  const len = r.pts.slice(1).reduce((t, q, i) => t + Math.hypot(q[0] - r.pts[i]![0], q[1] - r.pts[i]![1]), 0) * v.s
  const cut = (id: string, p: Pt) => {
    const n = LY.nodes.get(id)!
    return Math.hypot(n.x - p[0], n.y - p[1]) < 1e-6 ? reach(n, v) : 0
  }
  const p0 = r.pts[0]!
  const p1 = r.pts[r.pts.length - 1]!
  return len - Math.max(cut(l.a, p0), cut(l.b, p0)) - Math.max(cut(l.a, p1), cut(l.b, p1))
}
// The least colour run, in px: 12 on a desktop, 7 on a phone (whose world is drawn at 0.6 the scale).
export const MIN_RUN = { desk: 12, phone: 7 }

// THE WORLD'S STEP: the largest multiple of 8 (4 on a phone), up to MAX_STEP, whose world (its
// labels included) fits the pane's safe area. A region is seen at k times the step.
export const MAX_STEP = { h: 128, v: 64 }
export const MIN_STEP = 48
export type Fit = { s0: number; kind: Kind; box: Box; labels: Labels }
// `fresh`: levels a clear just opened (« Nouveau » over their labels).
export type Course = { order: string[]; text: (id: string) => { label: string; name: string }; regs: { id: string; nom: string; count: string }[]; quest: string | null; fresh?: Set<string> }
// The box a view frames: plates, labels, ports, titles, the q, door chips, and the lands' rings (a
// coast is never cut by the pane at rest).
export function contentBox(sc: Scene, L: Labels, T: Title[], only?: string, ds: Door[] = []): Box {
  let b: Box = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [id, land] of sc.LY.lands) if (!only || id === only) for (const r of land.rings) for (const p of r) b = join(b, [p[0] * sc.v.s, p[1] * sc.v.s, p[0] * sc.v.s, p[1] * sc.v.s])
  for (const p of sc.plates) if (!only || sc.LY.nodes.get(p.id)!.reg === only) b = join(b, p.box)
  for (const [id, l] of L.boxes) if (!only || sc.LY.nodes.get(id)!.reg === only) b = join(b, l)
  if (!only) for (const p of sc.ports) b = join(b, p.box)
  for (const t of T) b = join(b, t.box)
  if (sc.q && (!only || sc.LY.nodes.get(sc.v.home!)!.reg === only)) b = join(b, sc.q)
  const c = chipOf(sc.v) / 2
  for (const d of ds) if (d.chip) b = join(b, [d.at[0] * sc.v.s - c, d.at[1] * sc.v.s - c, d.at[0] * sc.v.s + c, d.at[1] * sc.v.s + c])
  return b
}
// THE WORLD AT REST: its box, at the largest step that fits the safe area with every label in place.
// A region is named in no place of its own on the map.
export function fitWorld(LY: Layout, p: Pane, home: string | null, C: Course, faces: Map<string, Set<number>>): Fit {
  const sa = safe(p)
  const stepBy = 4
  const kind = kindOf(LY.axis)
  let last: Fit | null = null
  for (let s = MAX_STEP[LY.axis]; s >= MIN_STEP; s -= stepBy) {
    const v: View = { axis: LY.axis, kind, z: false, s, focus: null, home }
    const sc = scene(LY, v)
    const L = labels(sc, C.order, C.text, () => false, faces, C.fresh)
    const box = contentBox(sc, L, [])
    const fits = box[2] - box[0] <= sa[2] - sa[0] && box[3] - box[1] <= sa[3] - sa[1]
    // a label with no place near its plate: the step drops a notch
    if ((!fits || L.faults.length) && s > MIN_STEP) continue
    last = { s0: s, kind, box, labels: L }
    return last
  }
  return last!
}
// The world's camera: its box centred in the safe area.
export const centre = (box: Box, p: Pane) => {
  const sa = safe(p)
  return { tx: Math.round((sa[0] + sa[2]) / 2 - (box[0] + box[2]) / 2), ty: Math.round((sa[1] + sa[3]) / 2 - (box[1] + box[3]) / 2) }
}
// THE CARD beside a level pointed at: right of its plate (centred on it, then aligned to its
// top, then to its foot), the same on its left, then under, then over: the first inside the pane
// that covers no plate (its own and the reticle round it included), no number or name, no region
// title, no chip, no link (+3 px), no drawn rim (+RIM_CLEAR, its notches +RIM_VERTEX), and whose
// frame runs along no straight link (CARD.edge px). Where none is free, the compact tag (`tagAt`);
// where the tag finds no place either, the HUD names the level (never a floating chip).
export const CARD = { w: 240, h: 88, off: 12, inset: 8, edge: 4 }
// What a card or a tag must keep clear of, on the screen: the boxes it may not cover, and the lines
// (links, rims) it may not cross.
export type Clear = { boxes: Box[]; links: Seg[]; rims: Seg[]; notches: Pt[] }
export function clearOf(sc: Scene, L: Labels | null, T: Title[], ds: Door[], cam: { tx: number; ty: number }, except: string | null = null): Clear {
  const sh = (p: Pt): Pt => [p[0] + cam.tx, p[1] + cam.ty]
  return {
    boxes: cardOthers(sc, L, T, ds, cam, except),
    links: sc.segs.map((x) => [sh(x.seg[0]), sh(x.seg[1])] as Seg),
    rims: sc.rims.map((x) => [sh(x.seg[0]), sh(x.seg[1])] as Seg),
    notches: sc.notches.map((x) => sh(x.at)),
  }
}
// The reasons a HUD box (a card, a tag) is not free.
export function blocked(b: Box, c: Clear): string[] {
  const out: string[] = []
  if (c.boxes.some((o) => meets(b, o))) out.push('a plate, label, title or chip')
  if (c.links.some(([p, q]) => segBox(p, q, grow(b, 3)))) out.push('a link')
  if (c.rims.some(([p, q]) => segBox(p, q, grow(b, RIM_CLEAR)))) out.push('a rim')
  if (c.notches.some((q) => inBox(grow(b, RIM_VERTEX), q))) out.push('a notch')
  return out
}
export function cardAt(n: Node, cam: { s: number; tx: number; ty: number }, v: View, p: Pane, size: [number, number], others: Box[] | Clear, segs: Seg[] = []): { box: Box | null } {
  const c: Clear = Array.isArray(others) ? { boxes: others, links: [], rims: [], notches: [] } : others
  const x = cam.tx + n.x * cam.s
  const y = cam.ty + n.y * cam.s
  const r = reach(n, v)
  const h = r + CARD.off
  const [w, ht] = size
  const cands: Box[] = [
    [x + h, y - ht / 2],
    [x + h, y - r],
    [x + h, y + r - ht],
    [x - h - w, y - ht / 2],
    [x - h - w, y - r],
    [x - h - w, y + r - ht],
    [x - w / 2, y + h],
    [x - w / 2, y - h - ht],
  ].map(([a, b]) => [Math.round(a!), Math.round(b!), Math.round(a!) + w, Math.round(b!) + ht] as Box)
  const top = p.top + CARD.inset
  const inPane = (b: Box) => b[0] >= CARD.inset && b[2] <= p.w - CARD.inset && b[1] >= top && b[3] <= p.h - p.foot - CARD.inset
  const own = grow([x - r, y - r, x + r, y + r], 8)
  const along = (b: Box) => segs.some(([a, cc]) => {
    const e = CARD.edge
    if (Math.abs(a[1] - cc[1]) < 1e-6) return (Math.abs(a[1] - b[1]) < e || Math.abs(a[1] - b[3]) < e) && Math.max(a[0], cc[0]) > b[0] && Math.min(a[0], cc[0]) < b[2]
    if (Math.abs(a[0] - cc[0]) < 1e-6) return (Math.abs(a[0] - b[0]) < e || Math.abs(a[0] - b[2]) < e) && Math.max(a[1], cc[1]) > b[1] && Math.min(a[1], cc[1]) < b[3]
    return false
  })
  return { box: cands.find((b) => inPane(b) && !meets(b, own) && !blocked(b, c).length && !along(b)) ?? null }
}
// THE COMPACT TAG: one line (the number, mono 11; the name, sans 13), TAG.h tall, cut 4. It stands
// next to its plate: in its label's place (the label steps aside while it shows), else under (centred,
// then slid along), right, left; within TAG.near px of the plate, inside the pane, clear of the
// same things as a card. None free: null, and the HUD names the level.
export const TAG = { h: 24, pad: 8, gap: 6, near: 12 }
export const tagW = (label: string, name: string) => Math.ceil(TAG.pad * 2 + textW(label, 'num') + TAG.gap + textW(name, 'name'))
export function tagAt(n: Node, cam: { s: number; tx: number; ty: number }, v: View, p: Pane, w: number, lb: Label | null, c: Clear): Box | null {
  const x = cam.tx + n.x * cam.s
  const y = cam.ty + n.y * cam.s
  const r = reach(n, v)
  const h = TAG.h
  const out: Box[] = []
  const add = (a: number, b: number) => out.push([Math.round(a), Math.round(b), Math.round(a) + w, Math.round(b) + h])
  if (lb) {
    const L: Box = [x + lb.box[0], y + lb.box[1], x + lb.box[2], y + lb.box[3]]
    add(lb.side === 'E' ? L[0] : lb.side === 'W' ? L[2] - w : (L[0] + L[2]) / 2 - w / 2, lb.side === 'S' ? L[1] : (L[1] + L[3]) / 2 - h / 2)
  }
  for (let g = 2; g <= TAG.near; g += 2)
    for (let k = 0; k <= w / 2 + r; k += 4)
      for (const sg of k ? [1, -1] : [1]) {
        add(x - w / 2 + sg * k, y + r + g)
        if (k <= r + h / 2) {
          add(x + r + g, y - h / 2 + sg * k)
          add(x - r - g - w, y - h / 2 + sg * k)
        }
      }
  const top = p.top + CARD.inset
  const inPane = (b: Box) => b[0] >= CARD.inset && b[2] <= p.w - CARD.inset && b[1] >= top && b[3] <= p.h - p.foot - CARD.inset
  const own = grow([x - r, y - r, x + r, y + r], 1)
  return out.find((b) => inPane(b) && !meets(b, own) && !blocked(b, c).length) ?? null
}
// What a card must not cover in a scene: every plate, label, title and chip, on the screen (a tag
// may take its own level's label place: `except`).
export function cardOthers(sc: Scene, L: Labels | null, T: Title[], ds: Door[], cam: { tx: number; ty: number }, except: string | null = null): Box[] {
  const c = chipOf(sc.v) / 2
  return [...sc.plates.filter((p) => p.id !== except).map((p) => grow(p.box, 2)), ...(L ? [...L.boxes].filter(([id]) => id !== except).map(([, b]) => b) : []), ...T.map((t) => t.box), ...sc.ports.map((p) => p.box), ...ds.filter((d) => d.chip).map((d) => [d.at[0] * sc.v.s - c, d.at[1] * sc.v.s - c, d.at[0] * sc.v.s + c, d.at[1] * sc.v.s + c] as Box)].map((b) => at(b, cam.tx, cam.ty))
}
export const cardSegs = (sc: Scene, cam: { tx: number; ty: number }): Seg[] => sc.segs.map((s) => [[s.seg[0][0] + cam.tx, s.seg[0][1] + cam.ty], [s.seg[1][0] + cam.tx, s.seg[1][1] + cam.ty]] as Seg)

// THE AUDIT at a pane: the world, in three save states (a first visit, a
// reader in progress, a reader who has cleared everything: the q on the first level, the middle
// one, the last). Faults fail the build; notes are for the owner.
export type Audit = { faults: string[]; notes: string[]; flags: { off: string[]; numOnly: string[]; qc: number }; s0: number; kind: Kind }
export function audit(LY: Layout, p: Pane, home: string | null, C: Course, name: string, desk: boolean): Audit {
  const faults: string[] = []
  const notes: string[] = []
  const faces = facesOf(LY)
  const order = C.order.filter((id) => LY.nodes.has(id))
  const homes = [...new Set([home ?? order[0]!, order[Math.floor(order.length / 2)]!, order[order.length - 1]!])]
  const tag = (m: string) => `[${name}] ${m}`
  const add = (m: string) => {
    const t = tag(m)
    if (!faults.includes(t)) faults.push(t)
  }
  const f = fitWorld(LY, p, homes[0]!, C, faces)
  const sa = safe(p)
  if (f.box[2] - f.box[0] > sa[2] - sa[0] || f.box[3] - f.box[1] > sa[3] - sa[1]) add(`the world does not fit the pane at any step`)
  for (const x of f.labels.faults) add(`world: ${x}`)
  const wv: View = { axis: LY.axis, kind: f.kind, z: false, s: f.s0, focus: null, home: homes[0]! }
  // THE Q: wholly inside its land, on every level, at every view
  const wq = qCellAt(LY, wv)
  if (wq.bad.length) add(`world: the q does not stand inside the land of ${wq.bad.join(', ')} even at 1 px a cell`)
  // Labels never change with the save state; every label within NEAR_LABEL of its row's plates.
  for (const h of homes.slice(1)) {
    const g = fitWorld(LY, p, h, C, faces)
    if (g.s0 !== f.s0) add(`world: the step changes with the q on ${h} (${g.s0}, not ${f.s0})`)
    for (const [id, lb] of g.labels.at) if (f.labels.at.get(id)?.side !== lb.side || f.labels.boxes.get(id)!.join() !== g.labels.boxes.get(id)!.join()) add(`world: the label of ${id} moves when the q stands on ${h}`)
  }
  const off = new Set(f.labels.off)
  const numOnly = new Set<string>()
  const wsc = scene(LY, wv)
  const wcam = { s: f.s0, ...centre(f.box, p) }
  // The world's frame: every coast inside the safe area.
  for (const [id, land] of LY.lands)
    for (const r of land.rings)
      for (const q of r) {
        const X = q[0] * f.s0 + wcam.tx
        const Y = q[1] * f.s0 + wcam.ty
        if (X < sa[0] - 1 || X > sa[2] + 1 || Y < sa[1] - 1 || Y > sa[3] + 1) {
          add(`the coast of ${id} leaves the safe area at (${Math.round(X)}, ${Math.round(Y)})`)
          break
        }
      }
  // Colour runs: none shorter than MIN_RUN px (a colour change only on a drawn edge).
  const minRun = LY.axis === 'v' ? MIN_RUN.phone : MIN_RUN.desk
  const runCheck = (v: View, where: string) => {
    for (const l of LY.links)
      for (const r of colourRuns(l, LY, v)) {
        const px = runPx(r, l, LY, v)
        // a run between two plates is a short link, not a fragment: only a run that ends at a
        // colour change counts
        if (r.a && r.b && !l.relay) continue
        if (px > 0 && px < minRun - 1e-6) add(`${where}: link ${l.id} has a colour run of ${Math.round(px)} px (${r.tone ?? 'neutral'}; the least is ${minRun})`)
        // zoomed, a colour change stands on the focused land's drawn rim (within 1 px)
        if (v.z && v.focus && !r.b) {
          const e = r.pts[r.pts.length - 1]!
          const ring = LY.lands.get(v.focus)!.rings.flatMap((rg) => rg.map((q, i) => [q, rg[(i + 1) % rg.length]!] as Seg))
          const d = Math.min(...ring.map(([a, b]) => segDist(e, a, b))) * v.s
          if (d > 1) add(`${where}: link ${l.id} changes colour ${Math.round(d)} px off the rim of ${v.focus}`)
        }
      }
  }
  runCheck(wv, 'world')
  // Ports: each chip clears every drawn rim by CHIP_CLEAR px, every other chip by 4 px, and covers
  // no plate: two chips never stack.
  const portCheck = (sc: Scene, where: string) => {
    sc.ports.forEach((p, i) => {
      const g = grow(p.box, CHIP_CLEAR)
      const r = sc.rims.find((x) => segBox(x.seg[0], x.seg[1], g))
      if (r) add(`${where}: the port of ${p.link} stands within ${CHIP_CLEAR} px of the rim of ${r.land}`)
      for (const o of sc.ports.slice(i + 1)) if (meets(grow(p.box, 4), o.box)) add(`${where}: the chips of ${p.link} and ${o.link} meet`)
      for (const q of sc.plates) if (meets(p.box, q.box)) add(`${where}: the chip of ${p.link} covers the plate of ${q.id}`)
    })
  }
  portCheck(scene(LY, wv), 'world')
  // Labels stand within NEAR_LABEL of their row's plates (zoomed, in the region in focus).
  const gapCheck = (L: Labels, v: View, only: string | null, where: string) => {
    for (const [id, lb] of L.at) {
      const n = LY.nodes.get(id)!
      if (only && n.reg !== only) continue
      const g = labelGap(lb, reach(n, v))
      if (g > NEAR_LABEL + 1e-6) add(`${where}: the label of ${id} stands ${Math.round(g)} px from its plate (the most is ${NEAR_LABEL})`)
    }
  }
  gapCheck(f.labels, wv, null, 'world')
  // Cards and tags: where one stands it covers nothing and crosses no rim and no link (re-measured
  // here); a level with neither is named by the HUD (counted).
  const named = { world: [0, 0, 0] }
  const cardCheck = (sc: Scene, L: Labels, T: Title[], ds: Door[], cam: { s: number; tx: number; ty: number }, pane: Pane, ids: string[]) => {
    if (!desk) return
    const all = clearOf(sc, L, T, ds, cam)
    for (const id of ids) {
      const n = LY.nodes.get(id)!
      const c = cardAt(n, cam, sc.v, pane, [CARD.w, CARD.h], all, cardSegs(sc, cam))
      const k = named.world
      if (c.box) {
        k[0]!++
        const why = blocked(c.box, all)
        if (why.length) add(`the card of ${id} meets ${why.join(', ')} (${sc.v.focus ?? 'world'})`)
        continue
      }
      const mine = clearOf(sc, L, T, ds, cam, id)
      const t = tagAt(n, cam, sc.v, pane, tagW(C.text(id).label, C.text(id).name), L.at.get(id) ?? null, mine)
      if (!t) {
        k[2]!++
        continue
      }
      k[1]!++
      const why = blocked(t, mine)
      if (why.length) add(`the tag of ${id} meets ${why.join(', ')} (${sc.v.focus ?? 'world'})`)
    }
  }
  cardCheck(wsc, f.labels, [], [], wcam, p, [...LY.nodes.keys()])
  if (desk) notes.push(tag(`a level pointed is named by its card / its tag / the HUD: ${named.world.join(' / ')}`))
  return { faults, notes, flags: { off: [...off], numOnly: [...numOnly], qc: wq.c }, s0: f.s0, kind: f.kind }
}
