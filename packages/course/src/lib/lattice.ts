import polygonClipping from 'polygon-clipping'
import type { Course } from './course'
import type { World } from './game'
import { merged, reachOf, sizeOf, CELL, GOAL_CELL, PORT, SIZE_RATIO, tableAt, U8, ZOOM_K, type Axis, type AxisData, type Kind, type Piece, type Pt, type Size, type Table, type TreeData } from './tree'

// THE LATTICE: where everything on the map stands, in lattice units (one unit is one step).
//
// Every level stands on the owner's grid point (`col`, `rang`). The lands (each region's
// territory) are grown ONCE, from what each level's plate needs on every drawing the page uses
// (each table at its reference step), with a strait between two lands. Every link is the owner's
// polyline, centre to centre, at 0, 45 or 90 degrees, cut at every coast: on a land it is that
// land's groove, in a gutter it is neutral. A link whose run through the gutter is longer than
// RELAY_RUN steps is a relay: it is not drawn across, each end gets a port instead. A link the
// outline cuts (`coupee`) is a warp: only its incoming port shows.
//
// Nothing searches for room. Whatever the rules cannot hold fails the build, naming it.

// The drawings the lands must hold: every step the page can lay a world out at (lib/place.ts,
// `fitWorld`: a multiple of 8 from 48 to 128 on a desktop, of 4 from 48 to 64 on a phone), and
// each zoomed at the least, a middle and the most k (lib/tree.ts, ZOOM_K), each with its table.
// A phone's are turned.
const DRAWINGS: { axis: Axis; kind: Kind; z: boolean; t: Table; step: number }[] = []
const KS = [ZOOM_K[0], 2, ZOOM_K[1]]
for (let s = 48; s <= 128; s += 4) {
  DRAWINGS.push({ axis: 'h', kind: 'wide', z: false, t: tableAt('wide', false, s), step: s })
  for (const k of KS) DRAWINGS.push({ axis: 'h', kind: 'wide', z: true, t: tableAt('wide', true, Math.min(k, 2) * s), step: k * s })
}
for (let s = 48; s <= 64; s += 4) {
  DRAWINGS.push({ axis: 'v', kind: 'phone', z: false, t: tableAt('phone', false, s), step: s })
  for (const k of KS) DRAWINGS.push({ axis: 'v', kind: 'phone', z: true, t: tableAt('phone', true, Math.min(k, 2) * s), step: k * s })
}
// The room a plate keeps from its coast, in CSS px.
export const CLR = 4
// The strait between two lands, in steps: the gutter where neutral grooves run. A level's cell
// reaches CELL = 0.5 - STRAIT / 2 from it (lib/tree.ts).
export const STRAIT = 0.1
// A port's box (in steps) meets no land here; each view then slides the port out along its stub
// until its chip clears every drawn rim by 4 px (lib/place.ts, `portsAt`).
export const PORT_CLEAR = 0.167
// TWO PORTS NEVER MEET: their centres stand PORT_GAP steps apart at the least, a chip and its 4 px
// at the largest chip a step carries (a phone's world: 20 px over 52).
export const PORT_GAP = 0.42
const segInBox = (p: Pt, q: Pt, b: [number, number, number, number]) => {
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
// A gutter run longer than this (in steps) makes a link a relay.
export const RELAY_RUN = 1.5
// The least half width of a neck between two levels of one region, in steps.
const NECK = 0.08
// THE LEAST COAST EDGE, in steps: a shorter edge (a jog or a notch where cells meet) is merged into
// its neighbours by extending the edges either side of it; one that cannot be fails the build.
export const MIN_EDGE = 0.25
// THE LEAST GUTTER RUN, in steps: a link crossing a strait shorter than this takes no neutral
// stretch; its colour switches at the strait's midline (a colour change happens on a drawn edge).
export const MIN_GUTTER = 0.25

const r2 = (n: number) => Math.round(n * 1e4) / 1e4
const L8: Pt[] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]
export const dirOf = (dx: number, dy: number) => {
  let best = 0
  for (let d = 1; d < 8; d++) if (dx * U8[d]![0] + dy * U8[d]![1] > dx * U8[best]![0] + dy * U8[best]![1]) best = d
  return best
}
// (to 1e-3 of a step: points are written to 1e-4)
export const octilinear = (dx: number, dy: number) => Math.abs(dx) < 1e-3 || Math.abs(dy) < 1e-3 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 1e-3

// ---------------------------------------------------------------- geometry
const T8 = Math.tan(Math.PI / 8)
// A regular octagon with flat faces at 0, 45 and 90 degrees, by its apothem.
export function oct(cx: number, cy: number, a: number): Pt[] {
  const t = a * T8
  return [[cx + a, cy - t], [cx + a, cy + t], [cx + t, cy + a], [cx - t, cy + a], [cx - a, cy + t], [cx - a, cy - t], [cx - t, cy - a], [cx + t, cy - a]]
}
// An octagon by its eight extents from a centre (east first, clockwise): the intersection of
// eight half-planes, so its faces stay at 0, 45 and 90 degrees whatever the extents.
function octExt(cx: number, cy: number, e: number[]): Pt[] {
  let poly: Pt[] = [[cx - 1e4, cy - 1e4], [cx + 1e4, cy - 1e4], [cx + 1e4, cy + 1e4], [cx - 1e4, cy + 1e4]]
  for (let d = 0; d < 8; d++) {
    const u = U8[d]!
    const f = (p: Pt) => (p[0] - cx) * u[0] + (p[1] - cy) * u[1] - e[d]!
    const out: Pt[] = []
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!
      const b = poly[(i + 1) % poly.length]!
      const fa = f(a)
      const fb = f(b)
      if (fa <= 1e-9) out.push(a)
      if ((fa < -1e-9 && fb > 1e-9) || (fa > 1e-9 && fb < -1e-9)) {
        const t = fa / (fa - fb)
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
      }
    }
    poly = out
  }
  return simplify(poly)
}
// Where two segments cross: the parameters on each, or null.
function segX(p1: Pt, p2: Pt, p3: Pt, p4: Pt): { t: number; u: number } | null {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0])
  if (Math.abs(d) < 1e-9) return null
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d
  return t > -1e-9 && t < 1 + 1e-9 && u > -1e-9 && u < 1 + 1e-9 ? { t, u } : null
}
export function segPoint(a: Pt, b: Pt, p: Pt): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const L = dx * dx + dy * dy
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0
  return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1])
}
const segSeg = (a: Pt, b: Pt, c: Pt, d: Pt) => (segX(a, b, c, d) ? 0 : Math.min(segPoint(a, b, c), segPoint(a, b, d), segPoint(c, d, a), segPoint(c, d, b)))
export function inRing(ring: Pt[], p: Pt): boolean {
  let ins = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!
    const [xj, yj] = ring[j]!
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) ins = !ins
  }
  return ins
}
const edgesOf = (ring: Pt[]): [Pt, Pt][] => ring.map((p, i) => [p, ring[(i + 1) % ring.length]!])
// The least distance between two closed polygons (0 when they meet or one holds the other).
export function polyDist(A: Pt[], B: Pt[]): number {
  if (inRing(A, B[0]!) || inRing(B, A[0]!)) return 0
  let d = Infinity
  for (const [a, b] of edgesOf(A)) for (const [c, e] of edgesOf(B)) d = Math.min(d, segSeg(a, b, c, e))
  return d
}
export const lineDist = (pts: Pt[], B: Pt[]) => {
  let d = Infinity
  for (let i = 1; i < pts.length; i++) {
    if (inRing(B, pts[i]!) || inRing(B, pts[i - 1]!)) return 0
    for (const [c, e] of edgesOf(B)) d = Math.min(d, segSeg(pts[i - 1]!, pts[i]!, c, e))
  }
  return d
}
const lengthOf = (pts: Pt[]) => pts.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]), 0)
// Merge repeated and collinear points of a ring.
function simplify(p: Pt[]): Pt[] {
  let out = p.filter((q, i) => Math.hypot(q[0] - p[(i + 1) % p.length]![0], q[1] - p[(i + 1) % p.length]![1]) > 1e-6)
  for (let changed = true; changed && out.length > 2; ) {
    changed = false
    for (let i = 0; i < out.length; i++) {
      const a = out[(i - 1 + out.length) % out.length]!
      const b = out[i]!
      const c = out[(i + 1) % out.length]!
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
      if (Math.abs(cr) < 1e-6) {
        out = out.filter((_, j) => j !== i)
        changed = true
        break
      }
    }
  }
  return out
}
// Where the lines through (a, b) and (c, d) meet, or null when they are parallel.
function lineX(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const ux = b[0] - a[0]
  const uy = b[1] - a[1]
  const vx = d[0] - c[0]
  const vy = d[1] - c[1]
  const den = ux * vy - uy * vx
  if (Math.abs(den) < 1e-9) return null
  const t = ((c[0] - a[0]) * vy - (c[1] - a[1]) * vx) / den
  return [a[0] + ux * t, a[1] + uy * t]
}
const simple = (r: Pt[]) => {
  const E = edgesOf(r)
  for (let i = 0; i < E.length; i++)
    for (let j = i + 2; j < E.length; j++) {
      if (i === 0 && j === E.length - 1) continue
      if (segX(E[i]![0], E[i]![1], E[j]![0], E[j]![1])) return false
    }
  return true
}
// Merge a ring's coast edges shorter than MIN_EDGE, the shortest first; `ok` keeps what must hold.
function trimCoast(ring: Pt[], ok: (r: Pt[]) => boolean): Pt[] {
  let r = ring
  const stuck = new Set<string>()
  for (let guard = 0; guard < 64; guard++) {
    const n = r.length
    let i = -1
    let best = MIN_EDGE - 1e-6
    for (let k = 0; k < n; k++) {
      const a = r[k]!
      const b = r[(k + 1) % n]!
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (len < best && !stuck.has(`${a}|${b}`)) [i, best] = [k, len]
    }
    if (i < 0 || n < 5) return r
    const at = (k: number) => r[(((i + k) % n) + n) % n]!
    const [ppa, pa, a, b, nb, nnb] = [at(-2), at(-1), at(0), at(1), at(2), at(3)]
    const idx = (k: number) => (((i + k) % n) + n) % n
    const cands: Pt[][] = []
    // the edges either side extended to meet
    const X = lineX(pa, a, b, nb)
    if (X && Math.hypot(X[0] - a[0], X[1] - a[1]) < 0.5 && Math.hypot(X[0] - b[0], X[1] - b[1]) < 0.5) cands.push(r.flatMap((p, k) => (k === idx(0) ? [X] : k === idx(1) ? [] : [p])))
    // the edge before moved onto the line of the edge after, or the other way round
    const pa2 = lineX(ppa, pa, b, nb)
    const nb2 = lineX(nb, nnb, pa, a)
    const viaPrev = pa2 && r.flatMap((p, k) => (k === idx(-1) ? [pa2] : k === idx(0) || k === idx(1) ? [] : [p]))
    const viaNext = nb2 && r.flatMap((p, k) => (k === idx(2) ? [nb2] : k === idx(0) || k === idx(1) ? [] : [p]))
    const lp = Math.hypot(a[0] - pa[0], a[1] - pa[1])
    const ln = Math.hypot(nb[0] - b[0], nb[1] - b[1])
    for (const c of lp <= ln ? [viaPrev, viaNext] : [viaNext, viaPrev]) if (c) cands.push(c)
    const good = cands
      .map((c) => simplify(c.map((p) => [r2(p[0]), r2(p[1])] as Pt)))
      .find((c) => c.length >= 4 && edgesOf(c).every(([p, q]) => octilinear(q[0] - p[0], q[1] - p[1])) && simple(c) && ok(c))
    if (good) r = good
    else stuck.add(`${a}|${b}`)
  }
  return r
}
const union = (pieces: Pt[][]) => {
  for (const p of pieces) if (p.length < 3 || p.some((q) => !Number.isFinite(q[0]) || !Number.isFinite(q[1]))) throw new Error('a degenerate piece: ' + JSON.stringify(p))
  const [first, ...rest] = pieces.map((p) => [[...p, p[0]!]] as [number, number][][])
  return polygonClipping.union(first!, ...rest)
}

// ---------------------------------------------------------------- the input
type In = { id: string; region: string; hue: number; col: number; rang: number; size: Size; label: string; name: string }
export type Input = { levels: In[]; regions: World['regions']; aretes: Course['aretes']; quest: string | null; start: string | null }
export function inputOf(course: Course, w: World): Input {
  const cards = new Map(course.cards.map((c) => [c.id, c]))
  const levels = w.levels
    .filter((l) => l.onMap)
    .map((l) => ({ id: l.id, region: l.region, hue: l.hue, col: Math.round(cards.get(l.id)!.col!), rang: cards.get(l.id)!.rang!, size: sizeOf(l, w.objectif), label: l.label, name: cards.get(l.id)!.carte ?? l.nom }))
  const quest = w.regions.find((r) => course.cards.some((c) => c.chapitre && c.quartier === r.id))?.id ?? null
  return { levels, regions: w.regions, aretes: course.aretes, quest, start: w.order.find((id) => levels.some((l) => l.id === id)) ?? null }
}

// ---------------------------------------------------------------- the lands
// LANDS ARE WHOLE CELLS, grown once on the lattice (the wide screen's frame: x = rang, y = col).
// Each level's land is its cell: an octagon reaching CELL in each of the eight directions (the
// goal's, its chamber: GOAL_CELL toward every lattice point free of another level), pulled back
// only where a neighbour of another region needs the room. Nothing else shapes a coast: a plate
// that does not fit its cell on every drawing fails the build, and labels fit the cells or move
// (lib/place.ts), never the coast. Two neighbouring levels of one region are joined by a band as
// wide as both cells; a diagonal that passes a foreign point by a neck, unless thinner than NECK.
// A region is one piece: a region in pieces fails the build.
type LandOut = { id: string; hue: number; rings: Pt[][] }
export function lands(input: Input): { lands: LandOut[]; faults: string[]; notes: string[]; need: Map<string, number[]>; ext: Map<string, number[]> } {
  const faults: string[] = []
  const notes: string[] = []
  const R = CELL
  // A plate is an octagon: it reaches as far in every one of the eight directions, the most any
  // drawing asks (its reach and CLR, over the step).
  const need = new Map<string, number[]>()
  for (const l of input.levels) need.set(l.id, U8.map(() => Math.max(...DRAWINGS.map((D) => (reachOf(D.t, l.size) + CLR) / D.step))))
  // THE CHAMBERS: the course's first level and its goal, the start and the end, reach GOAL_CELL
  // toward every lattice point free of another level.
  const T = input.levels.map((l) => ({ id: l.id, region: l.region, hue: l.hue, size: l.size, x: l.rang, y: l.col, need: need.get(l.id)!, chamber: l.size === 'G' || l.id === input.start }))
  const at8 = new Map(T.map((t) => [`${t.x},${t.y}`, t]))
  const near = (t: (typeof T)[number], d: number) => at8.get(`${t.x + L8[d]![0]},${t.y + L8[d]![1]}`)
  const seen = new Map<string, string>()
  for (const t of T) {
    const k = `${t.x},${t.y}`
    if (seen.has(k)) faults.push(`${t.id} and ${seen.get(k)} share the lattice point ${k}`)
    seen.set(k, t.id)
  }
  const ext = new Map<string, number[]>()
  for (const t of T)
    ext.set(
      t.id,
      U8.map((_, d) => {
        const n = near(t, d)
        if (n && n.region !== t.region) {
          const gap = (d % 2 ? Math.SQRT2 : 1) - STRAIT
          if (t.need[d]! + n.need[(d + 4) % 8]! > gap + 1e-6) faults.push(`${t.id} and ${n.id} need ${r2(t.need[d]! + n.need[(d + 4) % 8]!)} steps between them (their plates and numbers); the lattice gives ${r2(gap)}`)
          return Math.max(Math.min(R, gap - n.need[(d + 4) % 8]!), t.need[d]!)
        }
        return t.chamber ? GOAL_CELL : R
      }),
    )
  // A chamber is centrally symmetric: each direction reaches as far as its opposite (never a lopsided
  // kite where one side is held back by a neighbour).
  for (const t of T)
    if (t.chamber) {
      const e = ext.get(t.id)!
      for (let d = 0; d < 4; d++) e[d] = e[d + 4] = Math.max(Math.min(e[d]!, e[d + 4]!), t.need[d]!, t.need[d + 4]!)
    }
  // The cell rule, checked: no plate needs more than its cell, and no coast stands past one (a
  // vertex that would only hold a label, or anything else).
  for (const t of T)
    ext.get(t.id)!.forEach((e, d) => {
      const cell = t.chamber && near(t, d)?.region !== t.region && near(t, d) ? R : t.chamber ? GOAL_CELL : R
      if (t.need[d]! > cell + 1e-9) faults.push(`${t.id}: its plate needs ${r2(t.need[d]!)} steps toward ${d}; its cell gives ${cell}`)
      if (e > cell + 1e-9) faults.push(`${t.id}: its land reaches ${r2(e)} steps toward ${d}, past its cell (${cell})`)
    })
  const out: LandOut[] = []
  for (const g of input.regions) {
    const own = T.filter((t) => t.region === g.id)
    if (!own.length) continue
    const pieces: Pt[][] = own.map((t) => octExt(t.x, t.y, ext.get(t.id)!))
    const links = new Map(own.map((t) => [t.id, new Set<string>()]))
    for (const t of own)
      for (let d = 0; d < 4; d++) {
        const n = near(t, d)
        if (!n || n.region !== g.id) continue
        links.get(t.id)!.add(n.id)
        links.get(n.id)!.add(t.id)
        const p: Pt = [t.x, t.y]
        const q: Pt = [n.x, n.y]
        const corners = d % 2 ? [at8.get(`${t.x + L8[d]![0]},${t.y}`), at8.get(`${t.x},${t.y + L8[d]![1]}`)].filter((f): f is (typeof T)[number] => !!f && f.region !== g.id) : []
        if (!corners.length) {
          const e1 = Math.min(ext.get(t.id)![(d + 2) % 8]!, ext.get(n.id)![(d + 2) % 8]!)
          const e2 = Math.min(ext.get(t.id)![(d + 6) % 8]!, ext.get(n.id)![(d + 6) % 8]!)
          const n1 = U8[(d + 2) % 8]!
          const n2 = U8[(d + 6) % 8]!
          pieces.push([[p[0] + n1[0] * e1, p[1] + n1[1] * e1], [q[0] + n1[0] * e1, q[1] + n1[1] * e1], [q[0] + n2[0] * e2, q[1] + n2[1] * e2], [p[0] + n2[0] * e2, p[1] + n2[1] * e2]])
          continue
        }
        const m: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
        const half = Math.min(...corners.map((f) => Math.hypot(m[0] - f.x, m[1] - f.y) - ext.get(f.id)![dirOf(m[0] - f.x, m[1] - f.y)]! - STRAIT))
        if (half < NECK) {
          links.get(t.id)!.delete(n.id)
          links.get(n.id)!.delete(t.id)
          notes.push(`the neck from ${t.id} to ${n.id} would be ${r2(2 * Math.max(0, half))} steps wide`)
          continue
        }
        const L = Math.hypot(q[0] - p[0], q[1] - p[1])
        const nx = (-(q[1] - p[1]) / L) * half
        const ny = ((q[0] - p[0]) / L) * half
        pieces.push([[p[0] + nx, p[1] + ny], [q[0] + nx, q[1] + ny], [q[0] - nx, q[1] - ny], [p[0] - nx, p[1] - ny]])
      }
    // Its pieces, by touch; a region in pieces must be joined by one of its own links.
    const comps: string[][] = []
    const done = new Set<string>()
    for (const t of own) {
      if (done.has(t.id)) continue
      const comp = [t.id]
      done.add(t.id)
      for (let i = 0; i < comp.length; i++)
        for (const id of links.get(comp[i]!)!)
          if (!done.has(id)) {
            done.add(id)
            comp.push(id)
          }
      comps.push(comp)
    }
    // A region is one piece: the world teaches which levels belong together by their land.
    if (comps.length > 1) faults.push(`${g.id} stands in ${comps.length} pieces (${comps.map((c) => c.join(', ')).join(' | ')}): move a level so its cell touches the rest`)
    const u = union(pieces)
    if (u.length !== comps.length) faults.push(`${g.id}: its land is in ${u.length} pieces, for ${comps.length} groups of levels`)
    if (u.some((poly) => poly.length > 1)) faults.push(`${g.id}: its land has a hole`)
    out.push({ id: g.id, hue: own[0]!.hue, rings: u.map((poly) => simplify(poly[0]!.slice(0, -1) as Pt[]).map((p) => [r2(p[0]), r2(p[1])] as Pt)) })
  }
  // THE LEAST COAST EDGE: a coast edge shorter than MIN_EDGE is merged into its neighbours (their
  // lines extended to meet, or the shorter one moved onto the other's line), keeping every plate
  // inside, the strait to every other land and the coast's angles. One that cannot fails.
  for (const ld of out) {
    const own = T.filter((t) => ld.id === t.region)
    const others = out.filter((o) => o !== ld).flatMap((o) => o.rings)
    ld.rings = ld.rings.map((ring, ri) =>
      trimCoast(ring, (r) => {
        const rings = ld.rings.map((x, j) => (j === ri ? r : x))
        return own.every((t) => oct(t.x, t.y, Math.max(...t.need) - 1e-3).every((p) => rings.some((x) => inRing(x, p)))) && others.every((o) => polyDist(r, o) >= STRAIT - 1e-3)
      }),
    )
    for (const r of ld.rings)
      edgesOf(r).forEach(([a, b]) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1])
        if (len < MIN_EDGE - 1e-6) faults.push(`${ld.id}: its coast has an edge of ${r2(len)} steps at ${a} (the least is ${MIN_EDGE}) that cannot be merged`)
      })
  }
  return { lands: out, faults, notes, need, ext }
}

// ---------------------------------------------------------------- one axis
// The lattice's frame to an axis: a wide screen keeps it; a phone's is turned (x = col, y = rang).
const turnPt = (axis: Axis) => (p: Pt): Pt => (axis === 'h' ? p : [p[1], p[0]])

export type Plan = AxisData & { faults: string[]; notes: string[] }
export function plan(axis: Axis, input: Input, L: ReturnType<typeof lands>): Plan {
  const faults: string[] = []
  const notes: string[] = []
  const fault = (m: string) => faults.push(`[${axis}] ${m}`)
  const map = turnPt(axis)
  const tiles = input.levels.map((l) => {
    const [x, y] = map([l.rang, l.col])
    return { id: l.id, x, y, region: l.region, size: l.size }
  })
  const byId = new Map(tiles.map((t) => [t.id, t]))
  const P = (id: string): Pt => [byId.get(id)!.x, byId.get(id)!.y]
  const landsA = L.lands.map((l) => ({ ...l, rings: l.rings.map((r) => r.map(map)) }))
  const landAt = (p: Pt) => landsA.find((ld) => ld.rings.some((r) => inRing(r, p)))?.id ?? null
  // The plate's reach (and CLR) on the drawing where it is largest, in steps.
  const size = new Map(input.levels.map((l) => [l.id, l.size]))
  const reach = (id: string) => Math.max(...DRAWINGS.map((D) => (reachOf(D.t, size.get(id)!) + CLR) / D.step))

  // THE LINKS: the owner's polylines, cut where they cross a coast.
  const roads: AxisData['roads'] = []
  const warps: AxisData['warps'] = []
  const split = (pts: Pt[]) => {
    const pieces: { reg: string | null; pts: Pt[] }[] = []
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1]!
      const q = pts[i]!
      const ts = [0, 1]
      for (const ld of landsA) for (const ring of ld.rings) for (const [a, b] of edgesOf(ring)) {
        const x = segX(p, q, a, b)
        if (x) ts.push(x.t)
      }
      ts.sort((a, b) => a - b)
      for (let j = 1; j < ts.length; j++) {
        if (ts[j]! - ts[j - 1]! < 1e-6) continue
        const pt = (t: number): Pt => [r2(p[0] + (q[0] - p[0]) * t), r2(p[1] + (q[1] - p[1]) * t)]
        const reg = landAt([p[0] + ((q[0] - p[0]) * (ts[j]! + ts[j - 1]!)) / 2, p[1] + ((q[1] - p[1]) * (ts[j]! + ts[j - 1]!)) / 2])
        const last = pieces[pieces.length - 1]
        if (last && last.reg === reg) last.pts.push(pt(ts[j]!))
        else pieces.push({ reg, pts: [pt(ts[j - 1]!), pt(ts[j]!)] })
      }
    }
    return pieces
  }
  // A PORT stands PORT steps past its land's coast along the link, wholly on the ground.
  const along = (pts: Pt[], d: number): Pt => {
    let acc = 0
    for (let i = 1; i < pts.length; i++) {
      const L = Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1])
      if (acc + L >= d || i === pts.length - 1) {
        const t = Math.min(1, (d - acc) / L)
        return [r2(pts[i - 1]![0] + (pts[i]![0] - pts[i - 1]![0]) * t), r2(pts[i - 1]![1] + (pts[i]![1] - pts[i - 1]![1]) * t)]
      }
      acc += L
    }
    return pts[pts.length - 1]!
  }
  // a port's chip (1/6 step from its centre at the most: a phone's world) stands wholly on the
  // ground: PORT past the coast, or on from there to the first point where its chip clears every land
  // (PORT_CLEAR round it) its box meets no land and no rim
  const onLand = (q: Pt) => {
    const h = PORT_CLEAR
    const c = landAt(q)
    if (c) return c
    for (const ld of landsA)
      for (const ring of ld.rings)
        for (const [a, b] of edgesOf(ring)) if (segInBox(a, b, [q[0] - h, q[1] - h, q[0] + h, q[1] + h])) return ld.id
    return null
  }
  // the ports placed so far (relays first, then warps): a port is free off every land and
  // PORT_GAP from each of them
  const placed: Pt[] = []
  const free = (q: Pt) => !onLand(q) && placed.every((p) => Math.hypot(p[0] - q[0], p[1] - q[1]) >= PORT_GAP - 1e-9)
  const clearFrom = (pts: Pt[], d0: number): Pt => {
    for (let d = d0; d < d0 + 1; d += 0.01) if (free(along(pts, d))) return along(pts, d)
    for (let d = d0; d < d0 + 1; d += 0.01) if (!onLand(along(pts, d))) return along(pts, d)
    return along(pts, d0)
  }
  const portsOf = (pts: Pt[], pieces: Piece[]): [Pt, Pt] => [clearFrom(pts, lengthOf(pieces[0]!.pts) + PORT), clearFrom([...pts].reverse(), lengthOf(pieces[pieces.length - 1]!.pts) + PORT)]
  // how near a relay's ports stand to their far levels (the nearer of the two)
  const portFar = (pts: Pt[], pp: [Pt, Pt]) => Math.min(Math.hypot(pts[pts.length - 1]![0] - pp[0][0], pts[pts.length - 1]![1] - pp[0][1]), Math.hypot(pts[0]![0] - pp[1][0], pts[0]![1] - pp[1][1]))
  // A gutter run shorter than MIN_GUTTER between two lands takes no neutral stretch: its two halves
  // join the runs either side, so the colour switches at the strait's midline.
  const cut = (pts: Pt[], d: number): [Pt[], Pt[]] => {
    let acc = 0
    for (let i = 1; i < pts.length; i++) {
      const L = Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1])
      if (acc + L >= d) {
        const t = L ? (d - acc) / L : 0
        const m: Pt = [r2(pts[i - 1]![0] + (pts[i]![0] - pts[i - 1]![0]) * t), r2(pts[i - 1]![1] + (pts[i]![1] - pts[i - 1]![1]) * t)]
        return [[...pts.slice(0, i), m], [m, ...pts.slice(i)]]
      }
      acc += L
    }
    return [pts, [pts[pts.length - 1]!]]
  }
  const midline = (pieces: Piece[]): Piece[] => {
    const out: Piece[] = pieces.map((p) => ({ reg: p.reg, pts: [...p.pts] }))
    for (let i = out.length - 2; i >= 1; i--) {
      const p = out[i]!
      if (p.reg || !out[i - 1]!.reg || !out[i + 1]!.reg || lengthOf(p.pts) >= MIN_GUTTER - 1e-9) continue
      const [h1, h2] = cut(p.pts, lengthOf(p.pts) / 2)
      out[i - 1]!.pts.push(...h1.slice(1))
      out[i + 1]!.pts.unshift(...h2.slice(0, -1))
      out.splice(i, 1)
    }
    return out
  }
  for (const e of input.aretes) {
    const A = byId.get(e.a)
    const B = byId.get(e.b)
    if (!A || !B) continue
    if (e.coupee) continue
    let pts: Pt[] = [P(e.a), ...(e.via ?? []).map(([c, r]) => map([r, Math.round(c)])), P(e.b)]
    pts = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1]) > 1e-6)
    if (pts.length < 2) {
      fault(`link ${e.a} > ${e.b} has no length`)
      continue
    }
    for (let i = 1; i < pts.length; i++) if (!octilinear(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1])) fault(`link ${e.a} > ${e.b}: a stretch is not at 0, 45 or 90 degrees`)
    const pieces = split(pts)
    const gutter = pieces.filter((p) => !p.reg).reduce((t, p) => t + lengthOf(p.pts), 0)
    // a NEUTRAL RUN LONGER THAN RELAY_RUN steps is a relay (on the world as zoomed): its ports must
    // each name a far level more than RELAY_RUN steps away, else the link is drawn across
    const pp = portsOf(pts, pieces)
    const relay = gutter > RELAY_RUN + 1e-6 && portFar(pts, pp) > RELAY_RUN + 1e-6
    if (relay) for (const q of pp) if (onLand(q)) fault(`link ${e.a} > ${e.b}: its port at ${q} stands on the land of ${onLand(q)}`)
    if (relay) placed.push(...pp)
    roads.push({ id: `${e.a}>${e.b}`, a: e.a, b: e.b, ra: A.region, rb: B.region, pts, pieces: relay ? pieces : midline(pieces), relay, ...(relay ? { ports: pp } : {}) })
  }
  // A WARP comes into its level from behind, three quarters of a step; where its port would stand
  // on a land or meet another port, from over it, from under it, from the diagonals behind, then
  // from ahead.
  const ways: Pt[] = [[-1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, 0], [1, -1], [1, 1]]
  for (const e of input.aretes) {
    const B = byId.get(e.b)
    if (!e.coupee || !byId.get(e.a) || !B) continue
    // its port: PORT past the coast its way crosses, on the ground and clear of every other port
    const portOn = (u: Pt): Pt => {
      let d = 0
      while (d < 2 && landAt([B.x + u[0] * d, B.y + u[1] * d]) === B.region) d += 0.005
      let k = d + PORT
      while (k < d + 1.5 && !free([B.x + u[0] * k, B.y + u[1] * k])) k += 0.01
      return [r2(B.x + u[0] * k), r2(B.y + u[1] * k)]
    }
    const unitOf = (w: Pt): Pt => [w[0] / Math.hypot(w[0], w[1]), w[1] / Math.hypot(w[0], w[1])]
    const way = ways.map((w) => unitOf(map(w))).find((u) => free(portOn(u)))
    if (!way) {
      fault(`the warp ${e.a} > ${e.b} has no free side for its port`)
      continue
    }
    const port = portOn(way)
    placed.push(port)
    warps.push({ id: `${e.a}>${e.b}`, a: e.a, b: e.b, end: [B.x + way[0] * 0.75, B.y + way[1] * 0.75], port })
  }
  if (axis === 'h') notes.push(`relays (a gutter run over ${RELAY_RUN} steps): ${roads.filter((r) => r.relay).map((r) => r.id).join(', ') || 'none'}; warps: ${warps.map((w) => w.id).join(', ') || 'none'}`)

  // ---------------------------------------------------------------- the audit
  // Lands: a strait apart, every coast at 0, 45 or 90 degrees.
  const rings = landsA.flatMap((ld) => ld.rings.map((r) => ({ id: ld.id, r })))
  for (let i = 0; i < rings.length; i++)
    for (let j = i + 1; j < rings.length; j++) {
      const d = polyDist(rings[i]!.r, rings[j]!.r)
      if (d < STRAIT - 1e-3) fault(`${rings[i]!.id} and ${rings[j]!.id} stand ${r2(d)} apart (the strait is ${STRAIT})`)
    }
  for (const ld of landsA) for (const r of ld.rings) for (const [a, b] of edgesOf(r)) if (!octilinear(b[0] - a[0], b[1] - a[1])) fault(`the coast of ${ld.id} runs at an angle from ${a} to ${b}`)
  // Plates: inside their own land, CLR from its coast on every drawing.
  for (const t of tiles) {
    const ld = landsA.find((x) => x.id === t.region)!
    const plate = oct(t.x, t.y, reach(t.id) - 1e-3)
    if (!plate.every((p) => ld.rings.some((r) => inRing(r, p)))) fault(`${t.id}: its plate leaves its land`)
  }
  // Links: on their own lands or the gutter, past no plate but their ends', out of a land once;
  // in a gutter they never lie on a land (the groove's colour changes exactly at the coast).
  for (const r of roads) {
    for (const p of r.pieces) {
      if (p.reg && p.reg !== r.ra && p.reg !== r.rb) fault(`link ${r.id} crosses the land of ${p.reg}`)
      if (!p.reg)
        for (let i = 1; i < p.pts.length; i++) {
          const m: Pt = [(p.pts[i - 1]![0] + p.pts[i]![0]) / 2, (p.pts[i - 1]![1] + p.pts[i]![1]) / 2]
          if (landAt(m)) fault(`a neutral stretch of link ${r.id} lies on the land of ${landAt(m)}`)
        }
    }
    for (const t of tiles) {
      if (t.id === r.a || t.id === r.b) continue
      const d = lineDist(r.pts, oct(t.x, t.y, reach(t.id)))
      if (d < 1e-3) fault(`link ${r.id} passes over the plate of ${t.id}`)
    }
    for (const reg of new Set([r.ra, r.rb])) if (r.ra !== r.rb && r.pieces.filter((p) => p.reg === reg).length !== 1) fault(`link ${r.id} leaves ${reg} more than once`)
  }
  // Two links cross only at right angles.
  for (let i = 0; i < roads.length; i++)
    for (let j = i + 1; j < roads.length; j++) {
      const A = roads[i]!
      const B = roads[j]!
      if (A.relay || B.relay) continue
      for (let s = 1; s < A.pts.length; s++)
        for (let t = 1; t < B.pts.length; t++) {
          const x = segX(A.pts[s - 1]!, A.pts[s]!, B.pts[t - 1]!, B.pts[t]!)
          if (!x) continue
          const p: Pt = [A.pts[s - 1]![0] + (A.pts[s]![0] - A.pts[s - 1]![0]) * x.t, A.pts[s - 1]![1] + (A.pts[s]![1] - A.pts[s - 1]![1]) * x.t]
          if ([A.a, A.b].some((id) => [B.a, B.b].includes(id) && Math.hypot(P(id)[0] - p[0], P(id)[1] - p[1]) < 1e-6)) continue
          const da: Pt = [A.pts[s]![0] - A.pts[s - 1]![0], A.pts[s]![1] - A.pts[s - 1]![1]]
          const db: Pt = [B.pts[t]![0] - B.pts[t - 1]![0], B.pts[t]![1] - B.pts[t - 1]![1]]
          if (Math.abs(da[0] * db[0] + da[1] * db[1]) > 1e-6) fault(`links ${A.id} and ${B.id} cross at an angle`)
          else if (axis === 'h') notes.push(`links ${A.id} and ${B.id} cross (at a right angle)`)
        }
    }
  for (const e of input.aretes) if (byId.has(e.a) && byId.has(e.b) && !roads.some((r) => r.id === `${e.a}>${e.b}`) && !warps.some((x) => x.id === `${e.a}>${e.b}`)) fault(`link ${e.a} > ${e.b} is not drawn`)
  return { tiles: tiles.map(({ id, x, y }) => ({ id, x, y })), lands: landsA, roads, warps, faults, notes }
}

// THE TREE of a course: both axes, every fault, the notes for the owner.
export function treeOf(course: Course, w: World): { data: TreeData; faults: string[]; notes: string[]; input: Input } {
  const input = inputOf(course, w)
  const faults: string[] = []
  const notes = new Set<string>()
  for (const l of input.levels) if (!course.icones[l.id]) faults.push(`${l.id}: no icon in icones.json`)
  for (const D of DRAWINGS)
    for (const [a, b, least] of [['G', 'L', SIZE_RATIO], ['L', 'M', SIZE_RATIO], ['M', 'S', SIZE_RATIO]] as [Size, Size, number][]) {
      const r = D.t[a][0] / D.t[b][0]
      if (r < least - 1e-9 && !(D.kind === 'wide' && !D.z && merged(D.t, a, b))) faults.push(`the ${D.kind} ${D.z ? 'zoomed' : 'world'} table at step ${D.step}: ${a} and ${b} differ by ${r.toFixed(2)} (${least} at least)`)
    }
  // Every icon of a desktop world is drawn at 2 px a cell or more.
  for (const D of DRAWINGS) if (D.kind === 'wide' && !D.z) for (const s of ['S', 'M', 'L', 'G'] as Size[]) if (D.t[s][1] < 2) faults.push(`the desktop world at step ${D.step}: its ${s} icon is drawn at ${D.t[s][1]} px a cell (2 at least)`)
  // The goal stands on the course's outermost column: the end of the map is the end of the course.
  const goal = input.levels.find((l) => l.size === 'G')
  if (goal && input.levels.some((l) => l.rang > goal.rang)) faults.push(`the goal ${goal.id} stands at rang ${goal.rang}, not on the outermost column (${Math.max(...input.levels.map((l) => l.rang))})`)
  const by = (s: Size) => input.levels.filter((l) => l.size === s).map((l) => l.id)
  notes.add(`sizes from importance: G ${by('G').join(', ')}; L ${by('L').length}; M ${by('M').length}; S ${by('S').length}`)
  const L = lands(input)
  faults.push(...L.faults)
  for (const n of L.notes) notes.add(n)
  const axes = {} as TreeData['axes']
  for (const axis of ['h', 'v'] as const) {
    const p = plan(axis, input, L)
    faults.push(...p.faults)
    for (const n of p.notes) notes.add(n)
    axes[axis] = { tiles: p.tiles, lands: p.lands, roads: p.roads, warps: p.warps }
  }
  const cards = new Map(course.cards.map((c) => [c.id, c]))
  const names = Object.fromEntries(input.levels.map((l) => [l.id, cards.get(l.id)!.carte ?? w.levels.find((x) => x.id === l.id)!.nom]))
  const icons = Object.fromEntries(input.levels.map((l) => [l.id, course.icones[l.id] ?? []]))
  return { data: { titre: course.cours.titre, objectif: w.objectif, quest: input.quest, icons, names, axes }, faults, notes: [...notes], input }
}
