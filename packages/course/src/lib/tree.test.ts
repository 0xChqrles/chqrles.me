import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { auditMap, PANES } from './audit'
import { ease, FLIGHT_CHECK, flightFaults } from './camera'
import { iconFault, iconPairFault, loadCourse } from './course'
import { world } from './game'
import { DART } from './glyphs'
import { inputOf, inRing, lands, linksOf, MIN_EDGE, MIN_GUTTER, RELAY_RUN, STRAIT } from './lattice'
import { textW } from './metrics'
import { nojsSvg } from './nojs'
import { chroma, contrast, deltaE, GROUND, INK, INKS, NEUTRAL, NEUTRAL_CHROMA, NEUTRAL_DE, paletteFaults, PERIPH, TONES, WIRE_CHROMA } from './palette'
import { blocked, cardAt, cardOthers, CARD, clipIn, colourRuns, facesOf, fits, labelGap, NEAR_LABEL, reach, tagAt, type Clear, fitWorld, forms, GUTTER, halves, MIN_RUN, NEAR, qCellAt, runPx, safe, scene, segBox, sideOf, ZBAR, type Course as PlaceCourse } from './place'
import { CELL, GOAL_CELL, layout, runsOf, SIZE_RATIO, sizeOf, tableAt, ZOOM_K, type Kind, type Pt } from './tree'

const FIXTURE = join(import.meta.dirname, '..', '..', 'fixture')
const temporary: string[] = []
afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true })
})
function mapOf(dir: string) {
  const { course, errors } = loadCourse(dir)
  expect(errors).toEqual([])
  const w = world(course!)
  return { course: course!, w, map: auditMap(course!, w) }
}
function variant(change: (outline: any, icons: Record<string, string[]>) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'course-'))
  temporary.push(dir)
  cpSync(FIXTURE, dir, { recursive: true })
  const outline = JSON.parse(readFileSync(join(dir, 'outline.json'), 'utf8'))
  const icons = JSON.parse(readFileSync(join(dir, 'icones.json'), 'utf8'))
  change(outline, icons)
  writeFileSync(join(dir, 'outline.json'), JSON.stringify(outline))
  writeFileSync(join(dir, 'icones.json'), JSON.stringify(icons))
  return dir
}
// The course being written, when a preview points at it: its map must be clean too.
const courses = [FIXTURE, ...(process.env.COURSE_DIR ? [process.env.COURSE_DIR] : [])]

describe.each(courses)('the tree of %s', (dir) => {
  const { course, w, map } = mapOf(dir)
  const T = map.tree.data
  const levels = new Map(w.levels.map((l) => [l.id, l]))
  const onMap = course.cards.filter((c) => c.col != null)
  const C = (LY: ReturnType<typeof layout>): PlaceCourse => ({
    order: w.order,
    text: (id) => ({ label: levels.get(id)!.label, name: T.names[id]! }),
    regs: w.regions.filter((r) => r.levels.some((id) => LY.nodes.has(id))).map((r) => ({ id: r.id, nom: r.nom, count: `0/${r.levels.length}` })),
  })

  it('passes every rule of the audit, at every reference pane', () => expect(map.faults).toEqual([]))

  it('puts every card on the map, chapters included', () => expect(onMap.map((c) => c.id)).toEqual(course.cards.map((c) => c.id)))

  it('lays the chapters out as one path, in their order, never turning back, on large plates; a region holds whole chapters', () => {
    const chapters = course.cards.filter((c) => c.chapitre).sort((a, b) => a.chapitre! - b.chapitre!)
    const links = linksOf(course.cards)
    chapters.forEach((c, i) => {
      if (!i) return
      expect(links).toContain(`${chapters[i - 1]!.id}>${c.id}`)
      expect(c.rang!).toBeGreaterThanOrEqual(chapters[i - 1]!.rang!)
    })
    for (const ch of chapters) for (const id of ch.notions) expect(course.cards.find((c) => c.id === id)!.quartier, id).toBe(ch.quartier)
    // a chapter stands on the large plate (the goal on its own)
    for (const ch of chapters) expect(sizeOf(ch, w.objectif), ch.id).toBe(ch.id === w.objectif ? 'G' : 'L')
  })

  it('draws the path, a chapter to its notions, a notion to a notion of its chapter, and nothing else', () => {
    expect(course.aretes.map((e) => `${e.a}>${e.b}`).sort()).toEqual([...linksOf(course.cards)].sort())
    const chapterOf = (id: string) => course.cards.find((c) => c.id === id || c.notions.includes(id))!.id
    for (const e of course.aretes) if (!course.cards.find((c) => c.id === e.b)!.chapitre) expect(chapterOf(e.a), `${e.a} > ${e.b}`).toBe(chapterOf(e.b))
  })

  it('stands the q wholly inside its own land, on every level, at every reference view', () => {
    for (const P of PANES) {
      const LY = layout(T, levels, P.axis)
      const f = fitWorld(LY, { w: P.w, h: P.h, top: 0, foot: P.foot, gutter: P.axis === 'v' ? GUTTER.phone : GUTTER.desk }, null, C(LY), facesOf(LY))
      expect(qCellAt(LY, { axis: P.axis, kind: f.kind, z: false, s: f.s0, focus: null, home: null }).bad).toEqual([])

    }
  })

  it('never moves a label because of where the q stands (its room is reserved over every plate)', () => {
    const LY = layout(T, levels, 'h')
    const P = PANES[0]!
    const pane = { w: P.w, h: P.h, top: 0, foot: 0, gutter: GUTTER.desk }
    const ids = w.order.filter((id) => LY.nodes.has(id))
    const a = fitWorld(LY, pane, ids[0]!, C(LY), facesOf(LY))
    for (const home of ids) {
      const b = fitWorld(LY, pane, home, C(LY), facesOf(LY))
      for (const [id, box] of a.labels.boxes) expect(b.labels.boxes.get(id), `${id} with the q on ${home}`).toEqual(box)
      for (const lb of b.labels.at.values()) expect(lb.side).not.toBe('N')
    }
  })

  it('changes a link’s colour only on a drawn edge: no colour run under MIN_RUN px', () => {
    for (const P of PANES) {
      const LY = layout(T, levels, P.axis)
      const f = fitWorld(LY, { w: P.w, h: P.h, top: 0, foot: P.foot, gutter: P.axis === 'v' ? GUTTER.phone : GUTTER.desk }, null, C(LY), facesOf(LY))
      const views = [{ axis: P.axis, kind: f.kind, z: false, s: f.s0, focus: null, home: null }]
      for (const v of views)
        for (const l of LY.links)
          for (const r of colourRuns(l, LY, v)) {
            if (r.a && r.b && !l.relay) continue
            const px = runPx(r, l, LY, v)
            if (px > 0) expect(px, `${l.id} ${v.focus ?? 'world'}`).toBeGreaterThanOrEqual((P.axis === 'v' ? MIN_RUN.phone : MIN_RUN.desk) - 1e-6)
          }
    }
  })

  it('puts every level on the map on its own lattice point, on both axes', () => {
    for (const axis of ['h', 'v'] as const) {
      const tiles = T.axes[axis].tiles
      expect(tiles.length).toBe(onMap.length)
      expect(new Set(tiles.map((t) => `${t.x},${t.y}`)).size).toBe(tiles.length)
      for (const t of tiles) {
        const c = onMap.find((x) => x.id === t.id)!
        expect(axis === 'h' ? [t.x, t.y] : [t.y, t.x]).toEqual([c.rang, Math.round(c.col!)])
      }
    }
  })

  it('sizes each level from its rank: a chapter large, a notion a class under (M at importance 5, else S), the goal apart', () => {
    for (const l of w.levels) {
      const s = sizeOf(l, w.objectif)
      expect(s).toBe(l.id === w.objectif ? 'G' : l.chapitre ? 'L' : (l.importance ?? 3) >= 5 ? 'M' : 'S')
    }
  })

  it('draws every link, cut at every coast: a region’s groove on its own land, a neutral one only in a gutter, none across a strait', () => {
    const lands = T.axes.h.lands
    const landAt = (p: Pt) => lands.find((l) => l.rings.some((r) => inRing(r, p)))?.id ?? null
    for (const e of course.aretes) {
      if (!onMap.some((c) => c.id === e.a) || !onMap.some((c) => c.id === e.b)) continue
      const id = `${e.a}>${e.b}`
      expect(T.axes.h.roads.some((r) => r.id === id) || T.axes.h.warps.some((x) => x.id === id)).toBe(true)
    }
    for (const r of T.axes.h.roads)
      for (const p of r.pieces)
        for (let i = 1; i < p.pts.length; i++) {
          const m: Pt = [(p.pts[i - 1]![0] + p.pts[i]![0]) / 2, (p.pts[i - 1]![1] + p.pts[i]![1]) / 2]
          // a run takes its land's colour up to the strait's midline: off its land only by half a strait
          if (p.reg) expect([p.reg, null]).toContain(landAt(m))
          else expect(landAt(m)).toBeNull()
        }
    // a strait narrower than MIN_GUTTER has no neutral stretch: the colour switches at its midline
    for (const r of T.axes.h.roads)
      r.pieces.forEach((p, i) => {
        if (p.reg || i === 0 || i === r.pieces.length - 1) return
        const len = p.pts.slice(1).reduce((t, q, k) => t + Math.hypot(q[0] - p.pts[k]![0], q[1] - p.pts[k]![1]), 0)
        expect(len).toBeGreaterThanOrEqual(MIN_GUTTER - 1e-6)
      })
  })

  it('keeps two lands a strait apart, every coast at 0, 45 or 90 degrees', () => {
    for (const l of T.axes.h.lands)
      for (const r of l.rings)
        r.forEach((p, i) => {
          const q = r[(i + 1) % r.length]!
          const [dx, dy] = [Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])]
          expect(dx < 1e-3 || dy < 1e-3 || Math.abs(dx - dy) < 1e-3).toBe(true)
        })
    expect(STRAIT).toBeGreaterThan(0)
  })

  it('makes a relay of a long gutter run: two ports showing the far level, never a line across', () => {
    const LY = layout(T, levels, 'h')
    for (const l of LY.links.filter((x) => x.relay)) {
      const runs = runsOf(l, LY.nodes)
      expect(runs.length).toBe(l.ports.length)
      for (const p of l.ports) expect([l.a, l.b]).toContain(p.far)
    }
  })

  it('stands a number under its plate first, never over it (the q’s room), in every save state', () => {
    for (const axis of ['h', 'v'] as const) {
      const LY = layout(T, levels, axis)
      const faces = facesOf(LY)
      for (const id of LY.nodes.keys()) expect(sideOf(faces.get(id)!)).toBe('S')
    }
    // beside a groove leaving straight down, the label stands right of it, clear of it
    const b = forms('1-1', null, 'S', 20, new Set([2]))[0]!.box
    expect(b[0]).toBeGreaterThanOrEqual(6)
  })

  it('keeps every label clear of links, plates, rims and other labels, and inside its land on the world', () => {
    const LY = layout(T, levels, 'h')
    const faces = facesOf(LY)
    for (const P of PANES.filter((x) => x.axis === 'h')) {
      const f = fitWorld(LY, { w: P.w, h: P.h, top: 0, foot: P.foot, gutter: GUTTER.desk }, w.order.find((id) => LY.nodes.has(id))!, C(LY), faces)
      expect(f.labels.faults).toEqual([])
      const sc = scene(LY, { axis: 'h', kind: f.kind, z: false, s: f.s0, focus: null, home: null })
      for (const [id, b] of f.labels.boxes) {
        for (const s of sc.segs) if (!s.link.includes(id)) expect(segBox(s.seg[0], s.seg[1], b), `${id} and ${s.link}`).toBe(false)
        for (const r of sc.rims) expect(segBox(r.seg[0], r.seg[1], b), `${id} and the rim of ${r.land}`).toBe(false)
      }
    }
  })

  it('makes every land whole cells: no coast past a cell, the goal’s chamber apart, one piece a region', () => {
    const L = lands(inputOf(course, w))
    expect(L.faults).toEqual([])
    // the chambers: the course's first level and its goal
    const first = w.order.find((id) => onMap.some((c) => c.id === id))
    for (const [id, e] of L.ext) for (const x of e) expect(x, id).toBeLessThanOrEqual((id === T.objectif || id === first ? GOAL_CELL : CELL) + 1e-9)
    // every coast edge MIN_EDGE long at least
    for (const l of L.lands) for (const r of l.rings) r.forEach((p, i) => expect(Math.hypot(r[(i + 1) % r.length]![0] - p[0], r[(i + 1) % r.length]![1] - p[1]), l.id).toBeGreaterThanOrEqual(MIN_EDGE - 1e-6))
    for (const l of L.lands) expect(l.rings.length, l.id).toBe(1)
  })

  it('stands the goal on the outermost column', () => {
    const rang = new Map(course.cards.map((c) => [c.id, c.rang ?? -1]))
    expect(Math.max(...[...rang.values()])).toBe(rang.get(T.objectif))
  })

  it('fits a phone’s world to the pane’s width, and lets it run taller: the pane pans it along the path', () => {
    const P = PANES.find((x) => x.axis === 'v')!
    const LY = layout(T, levels, 'v')
    const pane = { w: P.w, h: P.h, top: 0, foot: P.foot, gutter: GUTTER.phone }
    const f = fitWorld(LY, pane, null, C(LY), facesOf(LY))
    const sa = safe(pane)
    expect(f.box[2] - f.box[0]).toBeLessThanOrEqual(sa[2] - sa[0])
    const cx = (sa[0] + sa[2]) / 2 - (f.box[0] + f.box[2]) / 2
    for (const l of LY.lands.values())
      for (const r of l.rings)
        for (const [x] of r) {
          expect(x * f.s0 + cx).toBeGreaterThanOrEqual(sa[0] - 1)
          expect(x * f.s0 + cx).toBeLessThanOrEqual(sa[2] + 1)
        }
  })

  it('frames the whole world, coasts included, centred in the safe area', () => {
    const LY = layout(T, levels, 'h')
    for (const P of PANES.filter((x) => x.axis === 'h')) {
      const pane = { w: P.w, h: P.h, top: 0, foot: P.foot, gutter: GUTTER.desk }
      const f = fitWorld(LY, pane, null, C(LY), facesOf(LY))
      const sa = safe(pane)
      const cx = (sa[0] + sa[2]) / 2 - (f.box[0] + f.box[2]) / 2
      const cy = (sa[1] + sa[3]) / 2 - (f.box[1] + f.box[3]) / 2
      for (const l of LY.lands.values())
        for (const r of l.rings)
          for (const [x, y] of r) {
            expect(x * f.s0 + cx).toBeGreaterThanOrEqual(sa[0] - 1)
            expect(x * f.s0 + cx).toBeLessThanOrEqual(sa[2] + 1)
            expect(y * f.s0 + cy).toBeGreaterThanOrEqual(sa[1] - 1)
            expect(y * f.s0 + cy).toBeLessThanOrEqual(sa[3] + 1)
          }
    }
  })

  it('never lets a card cover a plate, a number or a title on the world', () => {
    const LY = layout(T, levels, 'h')
    const P = PANES[0]!
    const pane = { w: P.w, h: P.h, top: 0, foot: 0, gutter: GUTTER.desk }
    const f = fitWorld(LY, pane, null, C(LY), facesOf(LY))
    const sa = safe(pane)
    const cam = { s: f.s0, tx: Math.round((sa[0] + sa[2]) / 2 - (f.box[0] + f.box[2]) / 2), ty: Math.round((sa[1] + sa[3]) / 2 - (f.box[1] + f.box[3]) / 2) }
    const v = { axis: 'h' as const, kind: f.kind, z: false, s: f.s0, focus: null, home: null }
    const others = cardOthers(scene(LY, v), f.labels, [], [], cam)
    for (const n of LY.nodes.values()) {
      const c = cardAt(n, cam, v, pane, [CARD.w, CARD.h], others)
      if (c.box) for (const o of others) expect(c.box[0] < o[2] && o[0] < c.box[2] && c.box[1] < o[3] && o[1] < c.box[3], n.id).toBe(false)
    }
  })

  it('draws the page without a script: every level a link, the goal’s bezel', () => {
    const svg = nojsSvg(T, w)
    for (const c of onMap) expect(svg).toContain(`href="/${c.id}/"`)
    expect(svg).not.toMatch(/\sstyle=/)
  })
})

describe('a placement the rules cannot draw', () => {
  it('names two levels on one point, and a link at an angle', () => {
    const shared = mapOf(variant((o) => (o.cartes.find((c: any) => c.id === 'rapport').rang = 0)))
    expect(shared.map.faults.join('\n')).toMatch(/(dents and rapport|rapport and dents) share the lattice point 0,2/)
    const angled = mapOf(variant((o) => (o.aretes.find((e: any) => e.a === 'dents').via = [[1, 2]])))
    expect(angled.map.faults.join('\n')).toMatch(/link dents > rapport: a stretch is not at 0, 45 or 90 degrees/)
  })
  it('names a link the map does not draw, one it misses, and a path that turns back', () => {
    const across = mapOf(variant((o) => o.aretes.push({ a: 'rapport', b: 'roue', ligne: 'atelier' })))
    expect(across.map.faults.join('\n')).toMatch(/link rapport > roue: not a link the map draws/)
    const missing = mapOf(variant((o) => (o.aretes = o.aretes.filter((e: any) => e.b !== 'developpement'))))
    expect(missing.map.faults.join('\n')).toMatch(/link braquet > developpement: the map draws it, and outline.json has no arete for it/)
    const back = mapOf(variant((o) => (o.cartes.find((c: any) => c.id === 'cadence').rang = 0)))
    expect(back.map.faults.join('\n')).toMatch(/the path turns back: chapter 3 \(cadence\)/)
  })
  it('fits a phone’s world by its width alone; a desktop’s by both', () => {
    const tall: [number, number, number, number] = [0, 0, 300, 2000]
    const sa: [number, number, number, number] = [16, 16, 374, 644]
    expect(fits(tall, sa, 'v')).toBe(true)
    expect(fits(tall, sa, 'h')).toBe(false)
    expect(fits([0, 0, 400, 100], sa, 'v')).toBe(false)
  })
  it('fails a level with no icon, by name', () => {
    const { errors } = loadCourse(variant((_, icons) => delete icons.dents))
    expect(errors).toContain('dents: pas d’icône dans icones.json')
  })
})

describe('the size tables', () => {
  it('are tied to the step: classes SIZE_RATIO apart, the goal the largest, every icon inside its plate', () => {
    // every world step each kind is laid out at (lib/place.ts), and twice it zoomed
    const ranges: [Kind, number, number][] = [['wide', 48, 128], ['phone', 48, 64]]
    for (const [kind, lo, hi] of ranges)
      for (const z of [false, true])
        for (let s = lo; s <= hi; s += 4) {
          const t = tableAt(kind, z, z ? 2 * s : s)
          // two classes SIZE_RATIO apart, or one size where a desktop world merged them
          const world = kind === 'wide' && !z
          expect(t.G[0] / t.L[0]).toBeGreaterThanOrEqual(SIZE_RATIO)
          if (!(world && t.L[0] === t.M[0])) expect(t.L[0] / t.M[0]).toBeGreaterThanOrEqual(SIZE_RATIO)
          if (!(world && t.M[0] === t.S[0])) expect(t.M[0] / t.S[0]).toBeGreaterThanOrEqual(SIZE_RATIO)
          for (const [F, c] of Object.values(t)) expect(11 * c).toBeLessThanOrEqual(F - 4)
          // P3: on a desktop world every icon is drawn at 2 px a cell or more
          if (world) for (const [, c] of Object.values(t)) expect(c).toBeGreaterThanOrEqual(2)
        }
    // a 1920 world is a 1440 world grown: the plate keeps its share of the step
    expect(tableAt('wide', false, 128).L[0] / 128).toBeCloseTo(tableAt('wide', false, 80).L[0] / 80, 1)
  })
})

describe('labels', () => {
  it('break a name into two balanced lines: at a space never after a bound word, or after a hyphen', () => {
    expect(halves('Prouver sans refaire')).toEqual(['Prouver', 'sans refaire'])
    expect(halves('Schwartz-Zippel')).toEqual(['Schwartz-', 'Zippel'])
    expect(halves('Les polynômes')).toBeNull()
  })
  it('keep clear of a diagonal link leaving on their side, or take another form', () => {
    const free = forms('1-1', 'Un nom assez long', 'S', 20, new Set())[0]!.box
    const pushed = forms('1-1', 'Un nom assez long', 'S', 20, new Set([1]))[0]!.box
    expect(free[0]).toBeCloseTo(-(free[2] - free[0]) / 2)
    expect(pushed[2]).toBeLessThanOrEqual(pushed[1] - 6.5 + 1e-9)
  })
  it('measure text with the faces’ own advances (a number: 0.6 em a figure)', () => {
    expect(textW('10-1', 'num')).toBeCloseTo(4 * 6.6)
    expect(textW('Modulo', 'name')).toBeGreaterThan(textW('Modul', 'name'))
    expect(textW('ab', 'eyebrow')).toBeCloseTo(textW('AB', 'eyebrow'))
  })
})

describe('the card', () => {
  it('stands right of its plate, else left, under, over: the first in the pane clear of every label', () => {
    const n = { id: 'x', x: 5, y: 3, size: 'M' as const, reg: 'r', hue: 0 }
    const v = { axis: 'h' as const, kind: 'wide' as const, z: false, s: 100, focus: null, home: null }
    const pane = { w: 1000, h: 700, top: 0, foot: 0, gutter: 24 }
    const cam = { s: 100, tx: 0, ty: 0 }
    const r = tableAt('wide', false, 100).M[0] / 2
    expect(cardAt(n, cam, v, pane, [CARD.w, CARD.h], []).box![0]).toBe(500 + r + CARD.off)
    const blocked = cardAt(n, cam, v, pane, [CARD.w, CARD.h], [[530, 0, 900, 700]])
    expect(blocked.box![2]).toBe(500 - r - CARD.off)
    // nowhere free: no floating card (the caption line names the level)
    expect(cardAt(n, cam, v, pane, [CARD.w, CARD.h], [[0, 0, 1000, 700]]).box).toBeNull()
  })
})

describe('the camera', () => {
  it('flies one ease-in-out: 15 to 40 % at a quarter of its time, 40 to 65 % at half', () => {
    expect(flightFaults()).toEqual([])
    for (const [t, lo, hi] of FLIGHT_CHECK) {
      expect(ease(t)).toBeGreaterThanOrEqual(lo)
      expect(ease(t)).toBeLessThanOrEqual(hi)
    }
  })
})

describe('the glyphs', () => {
  it('draw the dart in eight turns of one drawing each way, on whole cells', () => {
    expect(DART.length).toBe(8)
    for (const d of DART) for (const [x, y] of d) expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true)
    expect(DART[2]!.length).toBe(DART[0]!.length)
    expect(DART[3]!.length).toBe(DART[1]!.length)
  })
})

describe('the icons', () => {
  it('tell apart, pair by pair: twenty cells and twelve of silhouette', () => {
    const ring = ['....###....', '...#####...', '..#.###.#..', '.#.......#.', '###.....###', '###.....###', '###.....###', '.#.......#.', '..#.###.#..', '...#####...', '....###....']
    const ring2 = ring.map((r, y) => (y === 5 ? '###..#..###' : r))
    expect(iconPairFault(ring, ring2)).toMatch(/cases diffèrent/)
    const disc = ['...........', '...#####...', '..#######..', '.#########.', '.#########.', '.#########.', '.#########.', '.#########.', '..#######..', '...#####...', '...........']
    const holed = disc.map((r, y) => (y >= 3 && y <= 7 ? '.#.......#.' : r))
    expect(iconPairFault(disc, holed)).toMatch(/silhouettes/)
  })
  const ok = ['...........', '...#####...', '..#######..', '.##.....##.', '.##.....##.', '.##.....##.', '.##.....##.', '.##.....##.', '..#######..', '...#####...', '...........']
  it('pass the grid’s rules', () => expect(iconFault(ok)).toBeNull())
  it('refuse a cell in a corner, a cell alone, a small drawing, a wrong grid', () => {
    expect(iconFault(ok.map((r, y) => (y === 0 ? '#' + r.slice(1) : r)))).toMatch(/coin/)
    expect(iconFault(ok.map((r, y) => (y === 5 ? r.slice(0, 5) + '#' + r.slice(6) : r)))).toMatch(/seule/)
    expect(iconFault(['...........', '...........', '....###....', '....###....', '....###....', ...Array(6).fill('...........')])).toMatch(/9 cases/)
    expect(iconFault(ok.slice(1))).toMatch(/11 lignes/)
  })
})

describe('the colours', () => {
  const css = readFileSync(join(import.meta.dirname, '..', 'styles', 'course.css'), 'utf8')
  it('mix every tone from the region inks the stylesheet names', () => {
    const hues = [...css.matchAll(/^\.h(\d) \{[^}]*--hue: (#[0-9a-f]{6})/gm)].map((m) => m[2])
    expect(hues).toEqual([...INKS])
  })
  it('keep the neutral groove a true grey, apart from every region’s wire', () => {
    expect(chroma(NEUTRAL)).toBeLessThanOrEqual(NEUTRAL_CHROMA)
    for (const t of TONES) expect(deltaE(NEUTRAL, t.wire)).toBeGreaterThanOrEqual(NEUTRAL_DE)
    // and every wire reads as its region's at 1×: chroma WIRE_CHROMA at least, never a grey
    for (const t of TONES) expect(chroma(t.wire)).toBeGreaterThanOrEqual(WIRE_CHROMA)
  })
  it('hold every contrast a tone needs (the build fails otherwise)', () => {
    expect(paletteFaults()).toEqual([])
    for (const t of TONES) {
      expect(contrast(t.ink, GROUND)).toBeGreaterThanOrEqual(7)
      expect(contrast(t.num, t.tint)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(INK, t.plate)).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('step a neighbour back: less chroma, never brighter', () => {
    TONES.forEach((t, i) => {
      expect(chroma(PERIPH[i]!.ink)).toBeLessThan(chroma(t.ink))
      expect(contrast(PERIPH[i]!.ink, GROUND)).toBeLessThanOrEqual(contrast(t.ink, GROUND))
    })
  })
})

const mapCache = new Map<string, ReturnType<typeof mapOf>>()
const mapsOf = (dir: string) => mapCache.get(dir) ?? (mapCache.set(dir, mapOf(dir)), mapCache.get(dir)!)
describe('polish round 3', () => {
  it('cuts a link where it crosses a land: the colour changes on the rim itself', () => {
    const sq: Pt[][] = [[[0, 0], [2, 0], [2, 2], [0, 2]]]
    const c = clipIn([[1, 1], [5, 1]], sq)
    expect(c.map((x) => x.inside)).toEqual([true, false])
    expect(c[0]!.pts[c[0]!.pts.length - 1]![0]).toBeCloseTo(2, 9)
  })
  it('centres a label’s lines on the plate’s axis under it (« Nouveau » over a number)', () => {
    const [f] = forms('3-1', null, 'S', 20, new Set(), true)
    const mid = (l: { t: string; face: 'num' | 'eyebrow' | 'name'; x: number }) => l.x + textW(l.face === 'eyebrow' ? l.t.toUpperCase() : l.t, l.face) / 2
    for (const l of f!.lines) expect(Math.abs(mid(l))).toBeLessThan(0.5)
  })
  it('never lets a tag or a card cross a rim or a link: none free means null (the HUD names it)', () => {
    const n = { id: 'x', x: 5, y: 3, size: 'M' as const, reg: 'r', hue: 0 }
    const v = { axis: 'h' as const, kind: 'wide' as const, z: false, s: 100, focus: null, home: null }
    const pane = { w: 1000, h: 700, top: 0, foot: 0, gutter: 24 }
    const cam = { s: 100, tx: 0, ty: 0 }
    const free: Clear = { boxes: [], links: [], rims: [], notches: [] }
    expect(tagAt(n, cam, v, pane, 80, null, free)).not.toBeNull()
    // a rim boxed tight round the plate: no side is free
    const r = 40
    const rims: [Pt, Pt][] = [[[500 - r, 300 - r], [500 + r, 300 - r]], [[500 + r, 300 - r], [500 + r, 300 + r]], [[500 + r, 300 + r], [500 - r, 300 + r]], [[500 - r, 300 + r], [500 - r, 300 - r]]]
    expect(tagAt(n, cam, v, pane, 80, null, { ...free, rims })).toBeNull()
    expect(cardAt(n, cam, v, pane, [CARD.w, CARD.h], { ...free, rims }).box).toBeNull()
    const t = tagAt(n, cam, v, pane, 80, null, { ...free, links: [[[0, 340], [1000, 340]]] })
    expect(t && blocked(t, { ...free, links: [[[0, 340], [1000, 340]]] })).toEqual([])
  })
  it('stands every world label within NEAR_LABEL of its plate, on every reference pane', { timeout: 60000 }, () => {
    for (const dir of courses)
    for (const P of PANES) {
      const { w, map } = mapsOf(dir)
      const levels = new Map(w.levels.map((l) => [l.id, l]))
      const LY = layout(map.tree.data, levels, P.axis)
      const C: PlaceCourse = { order: w.order, text: (id) => ({ label: levels.get(id)!.label, name: map.tree.data.names[id]! }), regs: w.regions.filter((r) => r.levels.some((id) => LY.nodes.has(id))).map((r) => ({ id: r.id, nom: r.nom, count: '0/1' })) }
      const f = fitWorld(LY, { w: P.w, h: P.h, top: 0, foot: P.foot, gutter: P.axis === 'v' ? GUTTER.phone : GUTTER.desk }, null, C, facesOf(LY))
      const v = { axis: P.axis, kind: f.kind, z: false, s: f.s0, focus: null, home: null }
      for (const [id, lb] of f.labels.at) expect(labelGap(lb, reach(LY.nodes.get(id)!, v)), id).toBeLessThanOrEqual(NEAR_LABEL)
    }
  })
})
