// THE MAP IN A SHARE CARD: the world at rest as an SVG, drawn by the page's own rules (lib/place.ts)
// and in the page's own look (scripts/map/map.ts at a first visit): the field, the lands with their
// texture and rim, the grooves, the arrowheads where links plug in, the relay chips, the plates in
// their state, the numbers, the q on the first level. A level shared is drawn chosen: open, lifted,
// its chain lit and the reticle round it. Coordinates are the layout's pixels at its fitted step;
// the card frames them with a viewBox, as the page's camera does, so everything scales together.
import { cells } from './glyphs'
import { FACE, type Face } from './metrics'
import { FIELD, GROUND, INK, MUTED, mix, NEUTRAL, RAISE, SOCKET, TEXT, TONES, type Tone } from './palette'
import { chipOf, colourRuns, facesOf, fitWorld, plateF, portAt, qCellAt, qKey, qSink, runsAt, sizeIn, tableOf, type Course as PlaceCourse, type Fit, type Pane, type View } from './place'
import { BEZEL, inRings, layout, Q, type Etat, type Layout, type Link, type Node, type Pt, type TreeData } from './tree'
import type { World } from './game'

export type MapScene = { LY: Layout; fit: Fit; v: View; svg: (o: { chosen: string | null; text: TextPath }) => string }
// A line of text as outlines: the card has no fonts installed.
export type TextPath = (t: string, face: Face, k: number) => { d: string; w: number }

const r = (n: number) => Math.round(n * 100) / 100
const hexA = (h: string, a: number) => `fill="${h}" fill-opacity="${a}"`

// The octagon of flat-to-flat F centred on (cx, cy), its 45° cut on whole pixels.
function octD(cx: number, cy: number, F: number): string {
  const h = F / 2
  const k = Math.round(h * (2 - Math.SQRT2))
  const p = [[cx - h + k, cy - h], [cx + h - k, cy - h], [cx + h, cy - h + k], [cx + h, cy + h - k], [cx + h - k, cy + h], [cx - h + k, cy + h], [cx - h, cy + h - k], [cx - h, cy - h + k]]
  return 'M' + p.map(([x, y]) => `${r(x!)} ${r(y!)}`).join('L') + 'Z'
}
const oct = (cx: number, cy: number, F: number, fill: string) => `<path d="${octD(cx, cy, F)}" fill="${fill}"/>`
const ring = (cx: number, cy: number, Fo: number, Fi: number, fill: string, a = 1) => `<path d="${octD(cx, cy, Fo)}${octD(cx, cy, Fi)}" fill-rule="evenodd" ${hexA(fill, a)}/>`
// A bevel inside an octagon of flat F: its top and left faces `hi`, bottom and right `lo`, b px.
let clips = 0
function bevel(cx: number, cy: number, F: number, b: number, hi: string, lo: string, fill: string): string {
  const id = `b${clips++}`
  return `<clipPath id="${id}"><path d="${octD(cx, cy, F)}"/></clipPath><g clip-path="url(#${id})">${oct(cx, cy, F, lo)}${oct(cx - b, cy - b, F, hi)}${oct(cx, cy, F - 2 * b, fill)}</g>`
}
// An 11 × 11 icon (or any rows of cells) centred on (cx, cy) at c px a cell, as one path of runs.
function cellsAt(rows: string[] | Pt[], x0: number, y0: number, c: number, fill: string): string {
  const pts: Pt[] = typeof rows[0] === 'string' ? cells(rows as string[]) : (rows as Pt[])
  let d = ''
  for (const [x, y] of pts) d += `M${r(x0 + x * c)} ${r(y0 + y * c)}h${c}v${c}h-${c}z`
  return `<path d="${d}" fill="${fill}" shape-rendering="crispEdges"/>`
}
const icon = (rows: string[], cx: number, cy: number, c: number, fill: string) => cellsAt(rows, cx - Math.floor((rows[0]!.length * c) / 2), cy - Math.floor((rows.length * c) / 2), c, fill)

// The world laid out and fitted at a reference pane, as the page lays it out for that screen.
export function mapScene(T: TreeData, w: World, pane: Pane): MapScene {
  const levels = new Map(w.levels.map((l) => [l.id, l]))
  const LY = layout(T, levels, 'h')
  const regs = w.regions.filter((g) => g.levels.some((id) => LY.nodes.has(id)))
  const C: PlaceCourse = { order: w.order, text: (id) => ({ label: levels.get(id)!.label, name: T.names[id]! }), regs: regs.map((g) => ({ id: g.id, nom: g.nom, count: `0/${g.levels.filter((id) => LY.nodes.has(id)).length}` })), quest: T.quest }
  const home = w.order.find((id) => LY.nodes.has(id)) ?? null
  const fit = fitWorld(LY, pane, home, C, facesOf(LY))
  const v: View = { axis: 'h', kind: fit.kind, z: false, s: fit.s0, s0: fit.s0, focus: null, home }
  const s = fit.s0
  const node = (id: string) => LY.nodes.get(id)!
  const F = (n: Node) => plateF(n, v)
  const CELL = (n: Node) => tableOf(v)[sizeIn(n, v)][1]
  const P = (p: Pt): Pt => [Math.round(p[0] * s), Math.round(p[1] * s)]
  // A first visit: nothing read. A written level is open when every written level before it is
  // read (none), else soft; a planned one is at the front when it needs nothing, else in the fog.
  const etat = (id: string): Etat => {
    const l = levels.get(id)!
    if (l.prevu) return l.prerequis.length ? 'fog' : 'front'
    return l.prerequis.some((p) => levels.get(p) && !levels.get(p)!.prevu) ? 'soft' : 'dispo'
  }
  // The level « Commencer ici » opens: the first written one.
  const rec = w.order.find((id) => LY.nodes.has(id) && !levels.get(id)!.prevu) ?? null

  const svg = ({ chosen, text }: { chosen: string | null; text: TextPath }) => {
    clips = 0
    const st = (id: string): Etat => (id === chosen ? 'dispo' : etat(id))
    const [x0, y0, x1, y1] = LY.box
    let o = ''
    // L0 + L1: the lands' tint; on a grid of eighth steps, a 1-px field dot every half step outside
    // every land, a 2-px dot of its texture inside one; no dot within 2 px of a label's box
    const landD = (rings: Pt[][]) => rings.map((g) => 'M' + g.map((p) => P(p).join(' ')).join('L') + 'Z').join('')
    for (const land of LY.lands.values()) o += `<path d="${landD(land.rings)}" fill="${TONES[land.hue]!.tint}" fill-rule="evenodd"/>`
    const N = 8
    const lands = [...LY.lands.values()]
    const boxes = [...fit.labels.boxes.values()]
    const dots = new Map<string, string>()
    for (let i = Math.floor((x0 - 3) * N); i <= Math.ceil((x1 + 3) * N); i++)
      for (let j = Math.floor((y0 - 3) * N); j <= Math.ceil((y1 + 3) * N); j++) {
        const land = lands.find((l) => inRings(l.rings, i / N, j / N))
        if (!land && (i % (N / 2) !== 0 || j % (N / 2) !== 0)) continue
        const x = Math.round((i / N) * s)
        const y = Math.round((j / N) * s)
        const sz = land ? 2 : 1
        if (boxes.some((b) => x + sz > b[0] - 2 && x - sz < b[2] + 2 && y + sz > b[1] - 2 && y - sz < b[3] + 2)) continue
        const col = land ? TONES[land.hue]!.dot : FIELD
        dots.set(col, (dots.get(col) ?? '') + `M${x - (sz >> 1)} ${y - (sz >> 1)}h${sz}v${sz}h-${sz}z`)
      }
    for (const [col, d] of dots) o += `<path d="${d}" fill="${col}" shape-rendering="crispEdges"/>`
    // the rims, 2 px in the wire
    for (const land of LY.lands.values()) o += `<path d="${landD(land.rings)}" fill="none" stroke="${TONES[land.hue]!.wire}" stroke-width="2" stroke-linejoin="miter"/>`

    // L2: grooves, one 3-px channel with a 1-px highlight along its top edge; the chosen level's
    // chain in its region's ink (deeper links at 45 %)
    const chain = new Map<string, number>()
    if (chosen) {
      const seen = new Set<string>()
      const walk = (x: string, depth: number) => {
        for (const l of LY.links)
          if (l.b === x && !seen.has(l.id)) {
            seen.add(l.id)
            chain.set(l.id, depth === 0 ? 1 : 0.5)
            walk(l.a, depth + 1)
          }
      }
      walk(chosen, 0)
      for (const l of LY.links) if (l.a === chosen) chain.set(l.id, 1)
    }
    const line = (pts: Pt[], wdt: number, col: string, a = 1) => {
      const off = wdt % 2 ? 0.5 : 0
      return `<path d="M${pts.map((p) => P(p).map((q) => q + off).join(' ')).join('L')}" fill="none" stroke="${col}" stroke-opacity="${a}" stroke-width="${wdt}" stroke-linejoin="miter" stroke-linecap="butt"/>`
    }
    const edge = (pts: Pt[], col: string) => {
      let d = ''
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = P(pts[i - 1]!)
        const [bx, by] = P(pts[i]!)
        const L = Math.hypot(bx - ax, by - ay) || 1
        let nx = (by - ay) / L
        let ny = -(bx - ax) / L
        if (ny > 1e-6 || (Math.abs(ny) < 1e-6 && nx > 0)) [nx, ny] = [-nx, -ny]
        const ox = Math.round(nx) + 0.5
        const oy = Math.round(ny) + 0.5
        d += `M${ax + ox} ${ay + oy}L${bx + ox} ${by + oy}`
      }
      return `<path d="${d}" fill="none" stroke="${col}" stroke-width="1" stroke-linecap="butt"/>`
    }
    type Drawn = { l: Link; ch: number; runs: { pts: Pt[]; col: string; chain: string }[] }
    const drawn: Drawn[] = []
    for (const l of LY.links) {
      const ch = chain.get(l.id) ?? 0
      const mine: Drawn = { l, ch, runs: [] }
      drawn.push(mine)
      for (const pc of colourRuns(l, LY, v)) {
        const reg = pc.tone && pc.tone !== 'p:' ? pc.tone.replace(/^p:/, '') : null
        const t: Tone | null = reg ? TONES[w.regions.find((g) => g.id === reg)!.hue]! : null
        const chan = t ? t.wire : NEUTRAL
        o += line(pc.pts, 3, chan) + edge(pc.pts, mix(chan, INK, 0.3))
        const chainCol = t ? t.ink : mix(NEUTRAL, INK, 0.6)
        mine.runs.push({ pts: pc.pts, col: chan, chain: chainCol })
        if (ch) o += ch === 1 ? line(pc.pts, 3, chainCol) : line(pc.pts, 3, t ? t.ink : INK, 0.45)
      }
    }
    // the direction of a link, where it plugs into the level it opens: an arrowhead on that plate's
    // edge (a stub out of its level: on its chip's edge), in the colour of the run it ends
    const done = new Set<string>()
    const head = (tip: Pt, u: Pt, col: string) => {
      const px = Math.round(tip[0] * s)
      const py = Math.round(tip[1] * s)
      const k = `${px}|${py}|${Math.round(u[0] * 4)}|${Math.round(u[1] * 4)}`
      if (done.has(k)) return
      done.add(k)
      const h = 6
      const b = 4
      o += `<path d="M${px} ${py}L${r(px - u[0] * h - u[1] * b)} ${r(py - u[1] * h + u[0] * b)}L${r(px - u[0] * h + u[1] * b)} ${r(py - u[1] * h - u[0] * b)}Z" fill="${col}"/>`
    }
    const unit = (a: Pt, b: Pt): Pt => {
      const h = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
      return [(b[0] - a[0]) / h, (b[1] - a[1]) / h]
    }
    const edgeOf = (n: Node) => (F(n) / 2 + (sizeIn(n, v) === 'G' ? BEZEL + 1 : 0)) / s
    const chipEdge = chipOf(v) / 2 / s
    for (const d of drawn) {
      const l = d.l
      const colOf = (x: Drawn['runs'][number]) => (d.ch === 1 ? x.chain : x.col)
      if (!l.relay) {
        const pts = runsAt(l, LY, v).flatMap((x, i) => (i ? x.pts.slice(1) : x.pts))
        const b = node(l.b)
        const u = unit(pts[pts.length - 2]!, pts[pts.length - 1]!)
        head([b.x - u[0] * edgeOf(b), b.y - u[1] * edgeOf(b)], u, colOf(d.runs[d.runs.length - 1]!))
        continue
      }
      for (const p of l.ports) {
        const m = node(p.end === 'a' ? l.a : l.b)
        const q = portAt(LY, l, p.end, v)
        const run = d.runs.reduce(
          (best, x) => {
            const e = x.pts[x.pts.length - 1]!
            const s0 = x.pts[0]!
            const dd = Math.min(Math.hypot(e[0] - q[0], e[1] - q[1]), Math.hypot(s0[0] - q[0], s0[1] - q[1]))
            return dd < best.dd ? { x, dd } : best
          },
          { x: d.runs[0]!, dd: Infinity },
        ).x
        if (p.end === 'b') {
          const u = unit(q, [m.x, m.y])
          head([m.x - u[0] * edgeOf(m), m.y - u[1] * edgeOf(m)], u, colOf(run))
        } else {
          const u = unit([m.x, m.y], q)
          head([q[0] - u[0] * chipEdge, q[1] - u[1] * chipEdge], u, colOf(run))
        }
      }
    }
    // relay ports: a chip at each end, the far level's icon framed in its region's wire
    const chipSz = chipOf(v)
    const chip = (x: number, y: number, sz: number, cut: number, frame: string, fill: string) => {
      const half = sz >> 1
      const path = (i: number, c: number) => `M${x - half + i + c} ${y - half + i}L${x + half - i} ${y - half + i}L${x + half - i} ${y + half - i - c}L${x + half - i - c} ${y + half - i}L${x - half + i} ${y + half - i}L${x - half + i} ${y - half + i + c}Z`
      return `<path d="${path(0, cut)}" fill="${frame}"/><path d="${path(1, Math.max(0, cut - 0))}" fill="${fill}"/>`
    }
    for (const l of LY.links)
      for (const p of l.ports) {
        const far = node(p.far)
        const ft = TONES[far.hue]!
        const [x, y] = P(portAt(LY, l, p.end, v))
        o += chip(x, y, chipSz, 4, ft.wire, RAISE) + icon(T.icons[p.far]!, x, y, 1, st(p.far) === 'fog' ? ft.fog : ft.ink)
      }

    // L3: plates in their state, the goal's bezel, the numbers; the chosen level last
    const keyAt = (x: number, y: number) => {
      for (const land of LY.lands.values()) if (inRings(land.rings, x / s, y / s)) return TONES[land.hue]!.tint
      return GROUND
    }
    const order = [...LY.nodes.values()].sort((a, b) => (a.id === chosen ? 1 : 0) - (b.id === chosen ? 1 : 0))
    let qAt: { x: number; y: number; F: number } | null = null
    for (const n of order) {
      const t = TONES[n.hue]!
      const e = st(n.id)
      const lift = n.id === chosen ? 2 : 0
      const [x, y0] = P([n.x, n.y])
      const y = y0 - lift
      const Fd = F(n)
      const G = sizeIn(n, v) === 'G'
      const fw = e === 'fog' || e === 'soft' ? 1 : 2
      if (n.id === rec) o += ring(x, y, Fd + (G ? 2 * (BEZEL + 2) : 0) + 8, Fd + (G ? 2 * (BEZEL + 2) : 0) + 4, t.ink, 0.12) + ring(x, y, Fd + (G ? 2 * (BEZEL + 2) : 0) + 4, Fd + (G ? 2 * (BEZEL + 2) : 0), t.ink, 0.3)
      if (G) {
        const Fb = Fd + 2 * BEZEL
        o += ring(x, y, Fb, Fb - 2, e === 'lu' ? t.ink : t.rim)
        const tick = e === 'lu' || e === 'dispo' || e === 'prog' ? t.ink : t.rim
        const hb = Fb / 2
        const k = Math.round(hb * (2 - Math.SQRT2))
        const half = hb - k / 2
        for (const [sx, sy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as Pt[])
          for (const off of [-1, 1]) {
            const along = Math.round((hb - k) * 0.5) * off
            if (sx) o += `<rect x="${x + sx * hb - (sx > 0 ? 0 : 4)}" y="${y + along - 1}" width="4" height="2" fill="${tick}"/>`
            else o += `<rect x="${x + along - 1}" y="${y + sy * hb - (sy > 0 ? 0 : 4)}" width="2" height="4" fill="${tick}"/>`
          }
        for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as Pt[])
          for (const off of [-1, 1]) {
            const cx = x + sx * half + (off * sy * k) / 4
            const cy = y + sy * half - (off * sx * k) / 4
            for (let i = 0; i < 3; i++) o += `<rect x="${Math.round(cx + sx * i - 1 + (sx > 0 ? 0 : -1))}" y="${Math.round(cy + sy * i - 1 + (sy > 0 ? 0 : -1))}" width="2" height="2" fill="${tick}"/>`
          }
      }
      const dark = mix(SOCKET, t.plate, 0.3)
      let ic = INK
      if (e === 'dispo') {
        o += oct(x, y, Fd, t.ink) + bevel(x, y, Fd - 2 * fw, 1, '#040308', mix(dark, t.plate, 0.5), dark)
      } else if (e === 'soft') {
        o += oct(x, y, Fd, t.rim) + oct(x, y, Fd - 2 * fw, t.plate)
        ic = MUTED
      } else {
        o += oct(x, y, Fd, e === 'front' ? t.rim : t.sock) + bevel(x, y, Fd - 2 * fw, 1, '#040308', '#1a1926', SOCKET)
        ic = e === 'fog' ? t.fogd : t.ink
      }
      o += icon(T.icons[n.id]!, x, y, CELL(n), ic)
      if (n.id === v.home) qAt = { x, y, F: Fd }
      const lb = fit.labels.at.get(n.id)
      if (lb)
        for (const ln of lb.lines) {
          const k = ln.k ?? 1
          const { d } = text(ln.face === 'eyebrow' ? ln.t.toLocaleUpperCase('fr') : ln.t, ln.face, k)
          const col = ln.face === 'num' ? t.num : ln.face === 'eyebrow' ? t.ink : e === 'fog' ? MUTED : TEXT
          const tx = Math.round(x + ln.x)
          const ty = Math.round(y0 + ln.base - lift)
          const key = keyAt(x + ln.x, y0 + ln.base - (FACE[ln.face].px * k) / 3)
          o += `<g transform="translate(${tx} ${ty})"><path d="${d}" fill="none" stroke="${key}" stroke-width="4" stroke-linejoin="round"/><path d="${d}" fill="${col}"/></g>`
        }
      // the reticle: four 2-px brackets, arms 6, 6 off the plate's box
      if (n.id === chosen) {
        const b = Fd / 2 + 6 + (G ? BEZEL + 2 : 0)
        const [a0, b0, a1, b1] = [x - b, y - b, x + b, y + b]
        for (const [rx, ry, rw, rh] of [[a0, b0, 6, 2], [a0, b0, 2, 6], [a1 - 6, b0, 6, 2], [a1 - 2, b0, 2, 6], [a0, b1 - 2, 6, 2], [a0, b1 - 6, 2, 6], [a1 - 6, b1 - 2, 6, 2], [a1 - 2, b1 - 6, 2, 6]] as number[][])
          o += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${INK}"/>`
      }
    }
    // L4: the q stands on the first level, its feet sunk into the top face, keylined in the ground
    if (qAt) {
      const c = qCellAt(LY, v).c
      const kw = qKey(c)
      const foot = qAt.y - qAt.F / 2 + qSink(qAt.F, c)
      const xq = Math.round(qAt.x - 4 * c)
      const yq = Math.round(foot - 7 * c)
      const pts = cells(Q)
      let d = ''
      for (const [a, b] of pts) d += `M${xq + a * c - kw} ${yq + b * c - kw}h${c + 2 * kw}v${c + 2 * kw}h-${c + 2 * kw}z`
      o += `<path d="${d}" fill="${GROUND}" shape-rendering="crispEdges"/>` + cellsAt(Q, xq, yq, c, INK)
    }
    return o
  }
  return { LY, fit, v, svg }
}
