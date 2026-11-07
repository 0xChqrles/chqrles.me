// THE MAP WITHOUT A SCRIPT: the world as a static SVG, laid out by the page's own rules
// (lib/place.ts): lands, the main line and its stations' plaques, grooves, the arrowheads where
// links plug in, relay ports, plates in their first-visit state, the goal's bezel and numbers. Every
// level and port is a link. Without a script there is no save: a written level shows open. Two
// drawings, as the page lays out two: the wide world at the step a 1440 × 900 screen gives, and the
// phone's (the path running down) at a 390-px screen's; the stylesheet shows the one the screen's
// width asks for, at the page's own threshold.
import type { World } from './game'
import { EMPTY, etatOf, missing } from './gate'
import { runsPath } from './glyphs'
import { FACE } from './metrics'
import { GROUND, INK, mix, MUTED, NEUTRAL, RAISE, restOf, SOCKET, TEXT, TONES, TRACK_BED, TRACK_LIT, TRACK_RAIL } from './palette'
import { bandPts, MAIN_BARB, plaqueBox, chipOf, facesOf, fitWorld, GUTTER, kindOf, portAt, runsAt, tableOf, trackOf, type Course } from './place'
import { BEZEL, layout, type Axis, type TreeData } from './tree'
import { url } from './base'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const r1 = (n: number) => Math.round(n * 10) / 10
const octPts = (cx: number, cy: number, F: number) => {
  const h = F / 2
  const k = Math.round(h * (2 - Math.SQRT2))
  return [[cx - h + k, cy - h], [cx + h - k, cy - h], [cx + h, cy - h + k], [cx + h, cy + h - k], [cx + h - k, cy + h], [cx - h + k, cy + h], [cx - h, cy + h - k], [cx - h, cy - h + k]].map((p) => p.map(r1).join(',')).join(' ')
}
// The reference panes: 1440 × 900 less the head, the track and the briefing; a 390-px phone.
export const NOJS_PANE = { w: 1056, h: 780, top: 0, foot: 0, gutter: 24 }
export const NOJS_PHONE = { w: 390, h: 748, top: 0, foot: 88, gutter: GUTTER.phone }

export const nojsMap = (T: TreeData, w: World) => nojsSvg(T, w, 'h') + nojsSvg(T, w, 'v')
export function nojsSvg(T: TreeData, w: World, axis: Axis = 'h'): string {
  const levels = new Map(w.levels.map((l) => [l.id, l]))
  const byId = Object.fromEntries(levels)
  const LY = layout(T, levels, axis)
  const regs = w.regions.filter((r) => r.levels.some((id) => LY.nodes.has(id)))
  const C: Course = { order: w.order, text: (id) => ({ label: levels.get(id)!.label, name: T.names[id]! }), regs: regs.map((r) => ({ id: r.id, nom: r.nom, count: `0/${r.levels.filter((id) => LY.nodes.has(id)).length}` })) }
  const home = w.order.find((id) => LY.nodes.has(id)) ?? null
  const faces = facesOf(LY)
  const f = fitWorld(LY, axis === 'v' ? NOJS_PHONE : NOJS_PANE, home, C, faces)
  const v = { axis, kind: kindOf(axis), z: false, s: f.s0, focus: null, home }
  const pad = axis === 'v' ? 8 : 24
  let box = f.box
  const ox = pad - box[0]
  const oy = pad - box[1]
  const Wd = Math.ceil(box[2] - box[0] + 2 * pad)
  const Ht = Math.ceil(box[3] - box[1] + 2 * pad)
  const X = (x: number) => r1(x * f.s0 + ox)
  const Y = (y: number) => r1(y * f.s0 + oy)
  const table = tableOf(v)
  const hue = new Map(w.regions.map((r) => [r.id, r.hue]))
  let o = `<svg class="nojs nojs-${axis}" width="${Wd}" height="${Ht}" viewBox="0 0 ${Wd} ${Ht}" role="group" aria-label="${esc(T.titre)}">`
  o += '<defs>'
  TONES.forEach((t, i) => (o += `<pattern id="p${i}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${t.dot}"/></pattern>`))
  o += '</defs>'
  // lands: tint, texture, rim
  for (const [id, land] of LY.lands) {
    const t = TONES[land.hue]!
    const d = land.rings.map((ring) => 'M' + ring.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L') + 'Z').join('')
    o += `<path d="${d}" fill="${t.tint}" fill-rule="evenodd"/><path d="${d}" fill="url(#p${land.hue})" fill-rule="evenodd"/><path d="${d}" fill="none" stroke="${t.wire}" stroke-width="2" data-land="${id}"/>`
  }
  // the main line, as the page draws it at a first visit: every rail, then every bed, then each
  // stretch into a chapter whose gate an empty save meets, lit
  const half = trackOf(v) / 2
  const band = (pts: [number, number][], h: number, col: string) => `<path d="M${bandPts(pts.map(([x, y]) => [X(x), Y(y)]), h).map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}Z" fill="${col}"/>`
  const mains = LY.links.filter((l) => l.main)
  const gateMet = (id: string) => !missing(levels.get(id)!, byId, EMPTY).length
  for (const l of mains) for (const pc of runsAt(l, LY, v)) o += band(pc.pts, half, TRACK_RAIL)
  for (const l of mains) for (const pc of runsAt(l, LY, v)) o += band(pc.pts, half - 1, TRACK_BED)
  for (const l of mains) if (gateMet(l.b)) for (const pc of runsAt(l, LY, v)) o += band(pc.pts, half, TRACK_LIT)
  // grooves: one 3-px channel, the region's wire inside its land, the neutral grey in a gutter
  for (const l of LY.links)
    for (const pc of l.main ? [] : runsAt(l, LY, v)) {
      const d = 'M' + pc.pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')
      const t = pc.reg ? TONES[hue.get(pc.reg)!]! : null
      o += `<path d="${d}" fill="none" stroke="${t ? t.wire : NEUTRAL}" stroke-width="3"/>`
    }
  // the direction of a link, where it plugs into the level it opens: an arrowhead, its tip on that
  // plate's edge (the goal's: its bezel's), in the colour of the run it ends (on the main line,
  // wider than the band: its barbs MAIN_BARB px past each edge, lit where the track is)
  for (const l of LY.links) {
    if (l.relay) continue
    const pts = runsAt(l, LY, v).flatMap((x, i) => (i ? x.pts.slice(1) : x.pts))
    const last = runsAt(l, LY, v).at(-1)!
    const b = LY.nodes.get(l.b)!
    const [ax, ay] = pts[pts.length - 2]!
    const L = Math.hypot(b.x - ax, b.y - ay) || 1
    const u = [(b.x - ax) / L, (b.y - ay) / L] as const
    const e = table[b.size][0] / 2 + (b.size === 'G' ? BEZEL + 1 : 0)
    const px = X(b.x) - u[0] * e
    const py = Y(b.y) - u[1] * e
    const bw = l.main ? half + MAIN_BARB : 4
    const hh = l.main ? bw + 2 : 6
    const col = l.main ? (gateMet(l.b) ? TRACK_LIT : TRACK_RAIL) : last.reg ? TONES[hue.get(last.reg)!]!.wire : NEUTRAL
    o += `<path d="M${r1(px)} ${r1(py)}L${r1(px - u[0] * hh - u[1] * bw)} ${r1(py - u[1] * hh + u[0] * bw)}L${r1(px - u[0] * hh + u[1] * bw)} ${r1(py - u[1] * hh - u[0] * bw)}Z" fill="${col}"/>`
  }
  const c = chipOf(v)
  for (const l of LY.links)
    for (const p of l.ports) {
      const at = portAt(LY, l, p.end, v)
      const far = levels.get(p.far)!
      const t = TONES[far.hue]!
      o += `<a href="${url(`${p.far}/`)}" aria-label="${esc(far.label + ' ' + far.titre)}"><rect x="${X(at[0]) - c / 2 + 0.5}" y="${Y(at[1]) - c / 2 + 0.5}" width="${c - 1}" height="${c - 1}" fill="${RAISE}" stroke="${t.wire}"/><path transform="translate(${X(at[0]) - 5.5} ${Y(at[1]) - 5.5})" d="${runsPath(T.icons[p.far]!)}" fill="${far.prevu ? t.fog : t.ink}"/></a>`
    }
  // plates, the goal's bezel, numbers
  for (const n of LY.nodes.values()) {
    const lv = levels.get(n.id)!
    const t = TONES[n.hue]!
    const [F, cell] = table[n.size]
    // no save: a written level open, a planned one in the state an empty save gives it
    const open = !lv.prevu
    const front = lv.prevu && etatOf(lv, byId, EMPTY) === 'front'
    const cx = X(n.x)
    const cy = Y(n.y)
    const frame = open ? t.ink : front ? restOf(t, !!n.chap).rim : restOf(t, !!n.chap).sock
    // the map's state language: an open level is an outline (its ink round a dark centre)
    const fill = open ? mix(SOCKET, t.plate, 0.3) : SOCKET
    const ic = open ? INK : front ? t.fog : t.fogd
    const fw = open || front ? 2 : 1
    o += `<a href="${url(`${n.id}/`)}" aria-label="${esc(lv.label + ' ' + lv.titre)}">`
    if (n.size === 'G') o += `<polygon points="${octPts(cx, cy, F + 2 * BEZEL)}" fill="none" stroke="${open ? t.ink : t.rim}" stroke-width="1"/>`
    o += `<polygon class="nf" points="${octPts(cx, cy, F)}" fill="${frame}"/><polygon points="${octPts(cx, cy, F - 2 * fw)}" fill="${fill}"/><path transform="translate(${r1(cx - (11 * cell) / 2)} ${r1(cy - (11 * cell) / 2)}) scale(${cell})" d="${runsPath(T.icons[n.id]!)}" fill="${ic}"/>`
    const lb = f.labels.at.get(n.id)
    // a station's plaque: the track's bed, lit once its gate is met
    const lit = lb?.plaque && gateMet(n.id)
    const pq = lb?.plaque ? plaqueBox(lb) : null
    if (pq) o += `<rect x="${r1(cx + pq[0])}" y="${r1(cy + pq[1])}" width="${r1(pq[2] - pq[0])}" height="${r1(pq[3] - pq[1])}" fill="${lit ? TRACK_LIT : TRACK_BED}"/>`
    if (lb) for (const ln of lb.lines) o += `<text x="${r1(cx + ln.x)}" y="${r1(cy + ln.base)}" font-family="JetBrains Mono Variable" font-weight="${ln.strong ? 700 : 500}" font-size="${FACE.num.px}" fill="${lb.plaque ? (lit ? GROUND : TEXT) : t.num}">${esc(ln.t)}</text>`
    o += '</a>'
  }
  return o + '</svg>'
}
