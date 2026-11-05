// THE MAP WITHOUT A SCRIPT: the wide world as a static SVG, at the step a 1440 × 900 screen
// gives, laid out by the page's own rules (lib/place.ts): lands, grooves, relay ports, plates in
// their first-visit state, the goal's bezel, numbers and region titles. Every level, port and
// title is a link. Without a script there is no save: a written level shows open.
import type { World } from './game'
import { runsPath } from './glyphs'
import { FACE } from './metrics'
import { INK, mix, MUTED, NEUTRAL, RAISE, SOCKET, TONES } from './palette'
import { chipOf, facesOf, fitWorld, portAt, runsAt, tableOf, TITLE, type Course } from './place'
import { BEZEL, layout, type TreeData } from './tree'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const r1 = (n: number) => Math.round(n * 10) / 10
const octPts = (cx: number, cy: number, F: number) => {
  const h = F / 2
  const k = Math.round(h * (2 - Math.SQRT2))
  return [[cx - h + k, cy - h], [cx + h - k, cy - h], [cx + h, cy - h + k], [cx + h, cy + h - k], [cx + h - k, cy + h], [cx - h + k, cy + h], [cx - h, cy + h - k], [cx - h, cy - h + k]].map((p) => p.map(r1).join(',')).join(' ')
}
// The reference pane: 1440 × 900 less the head, the track and the briefing.
export const NOJS_PANE = { w: 1056, h: 780, top: 0, foot: 0, gutter: 24 }

export function nojsSvg(T: TreeData, w: World): string {
  const levels = new Map(w.levels.map((l) => [l.id, l]))
  const LY = layout(T, levels, 'h')
  const regs = w.regions.filter((r) => r.levels.some((id) => LY.nodes.has(id)))
  const C: Course = { order: w.order, text: (id) => ({ label: levels.get(id)!.label, name: T.names[id]! }), regs: regs.map((r) => ({ id: r.id, nom: r.nom, count: `0/${r.levels.filter((id) => LY.nodes.has(id)).length}` })), quest: T.quest }
  const home = w.order.find((id) => LY.nodes.has(id)) ?? null
  const faces = facesOf(LY)
  const f = fitWorld(LY, NOJS_PANE, home, C, faces)
  const v = { axis: 'h' as const, kind: f.kind, z: false, s: f.s0, focus: null, home }
  const pad = 24
  let box = f.box
  for (const t of f.titles) box = [Math.min(box[0], t.box[0]), Math.min(box[1], t.box[1]), Math.max(box[2], t.box[2]), Math.max(box[3], t.box[3])]
  const ox = pad - box[0]
  const oy = pad - box[1]
  const Wd = Math.ceil(box[2] - box[0] + 2 * pad)
  const Ht = Math.ceil(box[3] - box[1] + 2 * pad)
  const X = (x: number) => r1(x * f.s0 + ox)
  const Y = (y: number) => r1(y * f.s0 + oy)
  const table = tableOf(v)
  const hue = new Map(w.regions.map((r) => [r.id, r.hue]))
  let o = `<svg class="nojs" width="${Wd}" height="${Ht}" viewBox="0 0 ${Wd} ${Ht}" role="group" aria-label="${esc(T.titre)}">`
  o += '<defs>'
  TONES.forEach((t, i) => (o += `<pattern id="p${i}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${t.dot}"/></pattern>`))
  o += '</defs>'
  // lands: tint, texture, rim
  for (const [id, land] of LY.lands) {
    const t = TONES[land.hue]!
    const d = land.rings.map((ring) => 'M' + ring.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L') + 'Z').join('')
    o += `<path d="${d}" fill="${t.tint}" fill-rule="evenodd"/><path d="${d}" fill="url(#p${land.hue})" fill-rule="evenodd"/><path d="${d}" fill="none" stroke="${t.wire}" stroke-width="2" data-land="${id}"/>`
  }
  // grooves: one 3-px channel, the region's wire inside its land, the neutral grey in a gutter
  for (const l of LY.links)
    for (const pc of runsAt(l, LY, v)) {
      const d = 'M' + pc.pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')
      const t = pc.reg ? TONES[hue.get(pc.reg)!]! : null
      o += `<path d="${d}" fill="none" stroke="${t ? t.wire : NEUTRAL}" stroke-width="3"/>`
    }
  const c = chipOf(v)
  for (const l of LY.links)
    for (const p of l.ports) {
      const at = portAt(LY, l, p.end, v)
      const far = levels.get(p.far)!
      const t = TONES[far.hue]!
      o += `<a href="/${p.far}/" aria-label="${esc(far.label + ' ' + far.titre)}"><rect x="${X(at[0]) - c / 2 + 0.5}" y="${Y(at[1]) - c / 2 + 0.5}" width="${c - 1}" height="${c - 1}" fill="${RAISE}" stroke="${t.wire}"/><path transform="translate(${X(at[0]) - 5.5} ${Y(at[1]) - 5.5})" d="${runsPath(T.icons[p.far]!)}" fill="${far.prevu ? t.fog : t.ink}"/></a>`
    }
  // plates, the goal's bezel, numbers
  for (const n of LY.nodes.values()) {
    const lv = levels.get(n.id)!
    const t = TONES[n.hue]!
    const [F, cell] = table[n.size]
    const open = !lv.prevu
    const front = lv.prevu && lv.prerequis.every((p) => levels.get(p)?.prevu)
    const cx = X(n.x)
    const cy = Y(n.y)
    const frame = open ? t.ink : front ? t.rim : t.sock
    // the map's state language: an open level is an outline (its ink round a dark centre)
    const fill = open ? mix(SOCKET, t.plate, 0.3) : SOCKET
    const ic = open ? INK : front ? t.fog : t.fogd
    const fw = open || front ? 2 : 1
    o += `<a href="/${n.id}/" aria-label="${esc(lv.label + ' ' + lv.titre)}">`
    if (n.size === 'G') o += `<polygon points="${octPts(cx, cy, F + 2 * BEZEL)}" fill="none" stroke="${open ? t.ink : t.rim}" stroke-width="1"/>`
    o += `<polygon class="nf" points="${octPts(cx, cy, F)}" fill="${frame}"/><polygon points="${octPts(cx, cy, F - 2 * fw)}" fill="${fill}"/><path transform="translate(${r1(cx - (11 * cell) / 2)} ${r1(cy - (11 * cell) / 2)}) scale(${cell})" d="${runsPath(T.icons[n.id]!)}" fill="${ic}"/>`
    const lb = f.labels.at.get(n.id)
    if (lb) for (const ln of lb.lines) o += `<text x="${r1(cx + ln.x)}" y="${r1(cy + ln.base)}" font-family="JetBrains Mono Variable" font-weight="500" font-size="${FACE.num.px}" fill="${t.num}">${esc(ln.t)}</text>`
    o += '</a>'
  }
  // region titles: the tick, the name, the counter
  for (const tt of f.titles) {
    const r = regs.find((x) => x.id === tt.reg)!
    const t = TONES[r.hue]!
    const x = r1(tt.box[0] + ox)
    const y = r1(tt.box[1] + oy)
    const first = w.order.find((id) => levels.get(id)!.region === r.id && LY.nodes.has(id))
    const cnt = `0/${r.levels.filter((id) => LY.nodes.has(id)).length}`
    o += `<a href="#lv-${first}" aria-label="${esc(r.nom)}"><rect x="${x}" y="${y + 2}" width="2" height="12" fill="${t.ink}"/><text x="${x + TITLE.tick + TITLE.gap}" y="${y + 12}" font-family="Instrument Sans Variable" font-weight="600" font-size="11" letter-spacing="0.88" fill="${t.ink}">${esc(r.nom.toLocaleUpperCase('fr'))}</text><text x="${r1(x + tt.box[2] - tt.box[0] - cnt.length * 6.6)}" y="${y + 12}" font-family="JetBrains Mono Variable" font-weight="500" font-size="11" fill="${MUTED}">${cnt}</text></a>`
  }
  return o + '</svg>'
}
