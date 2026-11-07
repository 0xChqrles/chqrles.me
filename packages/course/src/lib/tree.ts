// THE TREE: the course as a skill tree that lights up as you learn. This module is the model the
// build and the page share: the size tables, the size rule, the layout read from the lattice
// (lib/lattice.ts, in lattice units: one unit is one lattice step), the relays, and the save.
// It imports nothing heavy: it ships in the page's bundle.
import type { Level } from './game'

export type Pt = [number, number]
export type Box = [number, number, number, number]
// The course runs left to right on a wide screen ('h': x = rang, y = col) and down on a phone
// ('v': x = col, y = rang).
export type Axis = 'h' | 'v'
export type Size = 'S' | 'M' | 'L' | 'G'
// A level's state (lib/gate.ts): understood, begun, open, locked (written, its gate unmet), at the
// front (planned, its gate met), in the fog (planned).
export type Etat = 'lu' | 'prog' | 'dispo' | 'verrou' | 'front' | 'fog'
export const ETATS: Etat[] = ['lu', 'prog', 'dispo', 'verrou', 'front', 'fog']

// SIZES ARE TIED TO THE STEP: a plate's flat-to-flat width is a share of the step it is read at, so
// the map keeps its density at every screen (a 1920 world is a 1440 world grown, never specks in
// wide lands). L is FRAC of the step (rounded down to an even px); M is L over SIZE_RATIO, S is M
// over it; the goal is GOAL_RATIO × L. The icon takes the most whole px a cell that keeps it in
// three quarters of its plate, and 4 px of frame round it.
//   wide: a desktop (every desktop world shows its numbers: the audit fails a pane where they do
//   not fit, never drops them); phone: a phone or tablet.
export type Table = Record<Size, [number, number]>
export type Kind = 'wide' | 'phone'
export const FRAC: Record<Kind, Record<'w' | 'z', number>> = { wide: { w: 0.53, z: 0.4 }, phone: { w: 0.6, z: 0.55 } }
// Two size classes differ by SIZE_RATIO at least, in every table; the goal by GOAL_RATIO.
export const SIZE_RATIO = 1.25
export const GOAL_RATIO = 1.4
const even = (n: number) => Math.floor(n / 2) * 2
export const cellOf = (F: number) => Math.max(1, Math.min(Math.floor((F - 8) / 11), Math.floor((0.75 * F) / 11)))
// A desktop world's plate leaves its number room under it in its cell: NUM_ROOM px (the number's gap
// 1, its line 10, its keyline's clearance from the rim 2: lib/place.ts), so numbers fit.
export const NUM_ROOM = 13
// ON A DESKTOP WORLD EVERY ICON IS DRAWN AT 2 PX A CELL OR MORE (it must be recognised at a glance):
// ICON2 is the least plate that holds one. A class that cannot hold one takes the next class's size
// (S takes M's; where M cannot either, both take ICON2, and L at least that): classes merge, never
// shrink an icon to 1 px. The build fails a desktop world's icon under 2 px a cell (lib/lattice.ts).
export const ICON2 = 30
// THE TEXT'S SCALE at a view: 11-px numbers and titles on a world up to TEXT_STEP, 13 px beyond it
// (1920), so a label keeps its rank beside plates that grow with the step (lib/place.ts, `textK`).
export const TEXT_STEP = 100
export const textScale = (kind: Kind, z: boolean, s: number) => (!z && kind === 'wide' && s >= TEXT_STEP ? 13 / 11 : 1)
// A STATION'S PLAQUE (lib/place.ts) is PLAQUE_H px tall at 11-px text (2 px round its digits, whose
// line is 10), its line scaled with the text. It hangs PLAQUE_TUCK px over its plate's edge, more
// where its cell is too short to hold it (CELL·s, less the rim's 2 px), never over the icon (the
// plate's frame round it).
export const PLAQUE_H = 12
export const PLAQUE_TUCK = 5
export const plaqueH = (k: number) => Math.round(10 * k) + PLAQUE_H - 10
export const tuckMax = (F: number) => (F - 11 * cellOf(F)) / 2
export const tuckAt = (F: number, s: number, k = 1) => Math.max(PLAQUE_TUCK, Math.ceil(F / 2 + plaqueH(k) + 2 - CELL * s - 1e-9))
export function tableAt(kind: Kind, z: boolean, s: number): Table {
  const world = kind === 'wide' && !z
  let L = even(Math.min(FRAC[kind][z ? 'z' : 'w'] * s, world ? 2 * (CELL * s - NUM_ROOM) : Infinity))
  let M = even(L / SIZE_RATIO)
  let S = even(M / SIZE_RATIO)
  if (world) {
    if (cellOf(S) < 2) S = M
    if (cellOf(M) < 2) M = S = ICON2
    // A CHAPTER STANDS A CLASS OVER ITS NOTIONS wherever its cell holds the larger plate with its
    // plaque hung under it (tucked over its frame, never its icon, and the rim's 2 px of
    // clearance), and the goal's chamber a goal SIZE_RATIO over it. Else the two classes merge.
    const up = even(Math.ceil(M * SIZE_RATIO) + 1)
    if (L < M * SIZE_RATIO) L = tuckAt(up, s, textScale(kind, z, s)) <= tuckMax(up) && 2 * (GOAL_CELL * s - 4 - BEZEL - TICK) >= SIZE_RATIO * up ? up : M
  }
  // the goal: GOAL_RATIO × L, within its chamber (GOAL_CELL, less its bezel and 4 px of land)
  const G = even(world ? Math.min(GOAL_RATIO * L, 2 * (GOAL_CELL * s - 4 - BEZEL - TICK)) : GOAL_RATIO * L)
  return { S: [S, cellOf(S)], M: [M, cellOf(M)], L: [L, cellOf(L)], G: [G, cellOf(G)] }
}
// Two classes are the same size only where a desktop world merged them (above).
export const merged = (t: Table, a: Size, b: Size) => t[a][0] === t[b][0] && a !== 'G' && b !== 'G'
// A REGION ZOOMED is seen at k times the world's step, k chosen per region (lib/place.ts,
// `frameRegion`) between ZOOM_K[0] and ZOOM_K[1], in steps of ZOOM_K[2] (sixteenths).
export const ZOOM_K: [number, number, number] = [1.5, 3, 0.0625]
// Zoomed, a neighbour's plate is drawn one class below its own, and never larger than the focused
// region's largest: the eye goes to the region in focus.
const RANK: Size[] = ['S', 'M', 'L', 'G']
export const below = (s: Size): Size => RANK[Math.max(0, RANK.indexOf(s) - 1)]!
export const smaller = (a: Size, b: Size): Size => (RANK.indexOf(a) <= RANK.indexOf(b) ? a : b)
// THE CELL a level's land holds round it, in steps: half a step less half the strait (lib/lattice.ts);
// the goal's, toward every lattice point free of another level, GOAL_CELL (its chamber).
export const CELL = 0.45
export const GOAL_CELL = 0.7
// SIZE IS RANK: a chapter stands on the large plate (the course's goal on G), a notion one class
// under it, M at importance 5, else S.
export const sizeOf = (l: { id: string; importance: number | null; chapitre: number | null }, goal: string): Size => (l.id === goal ? 'G' : l.chapitre ? 'L' : (l.importance ?? 3) >= 5 ? 'M' : 'S')
// The goal's bezel: a 1-px ring BEZEL off its plate, with 16 ticks TICK px out.
export const BEZEL = 6
export const TICK = 4
// How far a plate reaches from its centre (the goal's bezel and ticks included), in CSS px.
export const reachOf = (t: Table, s: Size) => t[s][0] / 2 + (s === 'G' ? BEZEL + TICK : 0)
// A relay's (or a warp's) port stands PORT steps past its land's coast, along the link: wholly on
// the ground, never across a rim (lib/lattice.ts places it). RELAY is its nominal distance from
// its level, for the rules that need one before the lands exist.
export const RELAY = 0.62
export const PORT = 0.27
// The icon's cells, and the q's (the mark).
export const ICON = 11
export const Q = ['.##.#', '##.##', '##.##', '##.##', '.####', '...##', '...##']

// THE DATA the build hands the page, one per axis, in lattice units.
export type Piece = { reg: string | null; pts: Pt[] }
export type AxisData = {
  tiles: { id: string; x: number; y: number }[]
  lands: { id: string; hue: number; rings: Pt[][] }[]
  roads: { id: string; a: string; b: string; ra: string; rb: string; pts: Pt[]; pieces: Piece[]; relay: boolean; ports?: [Pt, Pt] }[]
  warps: { id: string; a: string; b: string; end: Pt; port: Pt }[]
}
export type TreeData = { titre: string; objectif: string; icons: Record<string, string[]>; names: Record<string, string>; axes: Record<Axis, AxisData> }

// THE LAYOUT of one axis: nodes, links (a relay is a link drawn as two stubs into ports that show
// the far level's icon; a warp has only its incoming port), lands.
// `chap`: a chapter, a station of the main line.
export type Node = { id: string; x: number; y: number; size: Size; reg: string; hue: number; chap?: boolean }
export type Port = { at: Pt; dir: Pt; end: 'a' | 'b'; far: string }
// `main`: a chapter to the next, a stretch of the main line (its track, not a groove).
export type Link = { id: string; a: string; b: string; ra: string; rb: string; pts: Pt[]; pieces: Piece[]; relay: boolean; warp: boolean; ports: Port[]; main?: boolean }
export type Layout = { axis: Axis; nodes: Map<string, Node>; links: Link[]; lands: Map<string, { hue: number; rings: Pt[][] }>; box: Box }

const unit = (a: Pt, b: Pt): Pt => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]
}
export function layout(T: TreeData, levels: Map<string, Level>, axis: Axis): Layout {
  const A = T.axes[axis]
  const nodes = new Map<string, Node>()
  for (const t of A.tiles) {
    const lv = levels.get(t.id)!
    nodes.set(t.id, { id: t.id, x: t.x, y: t.y, size: sizeOf(lv, T.objectif), reg: lv.region, hue: lv.hue, chap: lv.chapitre != null })
  }
  const links: Link[] = []
  for (const r of A.roads) {
    const ports: Port[] = []
    if (r.relay) {
      const n = r.pts.length
      const u0 = unit(r.pts[0]!, r.pts[1]!)
      const u1 = unit(r.pts[n - 1]!, r.pts[n - 2]!)
      const [pa, pb] = r.ports ?? [[r.pts[0]![0] + u0[0] * RELAY, r.pts[0]![1] + u0[1] * RELAY] as Pt, [r.pts[n - 1]![0] + u1[0] * RELAY, r.pts[n - 1]![1] + u1[1] * RELAY] as Pt]
      ports.push({ at: pa, dir: u0, end: 'a', far: r.b })
      ports.push({ at: pb, dir: u1, end: 'b', far: r.a })
    }
    links.push({ ...r, warp: false, ports, main: !!nodes.get(r.a)?.chap && !!nodes.get(r.b)?.chap })
  }
  for (const w of A.warps) {
    const a = nodes.get(w.a)!
    const b = nodes.get(w.b)!
    const u = unit([b.x, b.y], w.end)
    links.push({ id: w.id, a: w.a, b: w.b, ra: a.reg, rb: b.reg, pts: [[a.x, a.y], [b.x, b.y]], pieces: [], relay: true, warp: true, ports: [{ at: w.port, dir: u, end: 'b', far: w.a }], main: !!a.chap && !!b.chap })
  }
  const lands = new Map(A.lands.map((l) => [l.id, { hue: l.hue, rings: l.rings }]))
  const xs = [...nodes.values()].map((n) => n.x)
  const ys = [...nodes.values()].map((n) => n.y)
  return { axis, nodes, links, lands, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
}
// The stretches a link draws: a road's pieces (cut at every coast), or a relay's two stubs.
export const runsOf = (l: Link, nodes: Map<string, Node>): Piece[] =>
  l.relay
    ? l.ports.map((p) => {
        const m = nodes.get(p.end === 'a' ? l.a : l.b)!
        return { reg: m.reg, pts: [[m.x, m.y], p.at] }
      })
    : l.pieces

// The eight directions, east first, clockwise on the screen (y down), and the nearest one to a
// vector.
const SQ = Math.SQRT1_2
export const U8: Pt[] = [[1, 0], [SQ, SQ], [0, 1], [-SQ, SQ], [-1, 0], [-SQ, -SQ], [0, -1], [SQ, -SQ]]
export const dir8 = (dx: number, dy: number) => ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8

// Point in a land (even-odd over its rings).
export function inRings(rings: Pt[][], x: number, y: number): boolean {
  let inside = false
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!
      const [xj, yj] = ring[j]!
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
  return inside
}
