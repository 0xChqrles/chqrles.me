// THE HOME: the course as a skill tree that lights up as you learn.
// The map is one Canvas 2D in device pixels (field, lands, grooves, plates and labels, the q, the
// reticle, effects); the HUD is HTML (head, sector bar, briefing with its minimap, chapter track,
// card); an invisible link layer carries the meaning for the keyboard and screen readers; the
// page without a script is a static SVG and the plan. Every place comes from lib/place.ts, the
// rules the build audits.
import { EARLY } from '../../lib/camera'
import { glyphSvg, miniNode } from '../../lib/glyphs'
import { FACE, textW } from '../../lib/metrics'
import { FIELD, GROUND, HUD, INK, LINE_STRONG, MUTED, NEUTRAL, RAISE, rgba, SOCKET, TEXT, TONES, mix, type Tone } from '../../lib/palette'
import { CARD, cardAt, cardSegs, chipOf, clearOf, colourRuns, contentBox, labels, runPx, facesOf, fitWorld, GUTTER, labelled, plateF, portAt, qBox, qCellAt, qKey, qSink, reach, runsAt, safe, scene, sizeIn, tableOf, tagAt, tagW, textK, ZBAR, type Course as PlaceCourse, type Fit, type Labels, type Pane, type View } from '../../lib/place'
import { BEZEL, ETATS, inRings, layout, U8, type Axis, type Box, type Etat, type Layout, type Link, type Node, type Pt, type TreeData } from '../../lib/tree'
import { chapters, complete, etat as etatOf, L, load, next, reached, S, share, store, written, type Ici, type Vu, WORLD } from '../save'
import { bevel, D, dpr, halo, icon, oct, octArc, octPath, octStroke, q as drawQ, ring, setDpr, text, W } from './draw'
import { back, busy, inout, linear, now, out, set, still, T, tick, tw, val } from './motion'
import { url } from '../../lib/base'

const $ = <E extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<E>(s)
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export function mapPage() {
  const DATA: TreeData = JSON.parse($('#arbre')!.textContent!)
  const pane = $('#pane')!
  const cv = $<HTMLCanvasElement>('#map')!
  const ctx = cv.getContext('2d', { alpha: false })!
  const linksEl = $('#links')!
  const tip = $('#tip')!
  const brief = $('#brief')!
  const bc = $('#bc')!
  const zbar = $('#zbar')!
  const mini = $<HTMLCanvasElement>('#mini canvas')
  const live = $('#live')!
  const deskQ = matchMedia('(min-width: 1200px)')
  const tallQ = matchMedia('(max-width: 699px)')
  const desk = () => deskQ.matches
  const R = new Map(WORLD.regions.map((r) => [r.id, r]))
  const levels = new Map(WORLD.levels.map((l) => [l.id, l]))

  let axis: Axis = tallQ.matches ? 'v' : 'h'
  let LY: Layout = layout(DATA, levels, axis)
  let faces = facesOf(LY)
  const onMap = (id: string) => LY.nodes.has(id)
  let mapRegions = WORLD.regions.filter((r) => r.levels.some(onMap))
  const node = (id: string) => LY.nodes.get(id)!
  const counter = (reg: string) => {
    const ids = R.get(reg)!.levels.filter(onMap)
    return `${ids.filter((id) => S.lus.has(id) && !held.has(id)).length}/${ids.length}`
  }
  // What lib/place.ts needs of the course: its order, each level's number and map name, and
  // each region with its counter. A level a clear just opened carries « Nouveau » as an eyebrow
  // over its label (never in place of its name).
  const fresh = new Set<string>()
  const course = (): PlaceCourse => ({
    order: WORLD.order,
    text: (id) => ({ label: L[id]!.label, name: DATA.names[id]! }),
    regs: mapRegions.map((r) => ({ id: r.id, nom: r.nom, count: counter(r.id) })),
    quest: DATA.quest,
    fresh,
  })

  // ---------------------------------------------------------------- the save, as the map reads it
  const held = new Map<string, Etat>() // states held back during the reward
  const lit = new Map<string, number>() // a link's lit share during the reward (0..1)
  const etat = (id: string) => held.get(id) ?? etatOf(id)
  const linkOpen = (l: Link) => S.lus.has(l.a) && !held.has(l.a)
  // Where the q stands: `ici` (or its chapter), else the first open level on the map.
  const homeOf = () => {
    const ici = store.get<Ici | null>('ici', null)
    if (ici && L[ici.c]) {
      if (onMap(ici.c)) return ici.c
      const ch = L[ici.c]!.chap
      if (ch && onMap(ch)) return ch
    }
    return WORLD.order.find((id) => onMap(id) && ['dispo', 'prog'].includes(etatOf(id))) ?? WORLD.order.find(onMap)!
  }
  let home = homeOf()
  let rec = next()?.id ?? null // the recommended level (it breathes)
  // What is new since the map was last seen: written or opened since (the briefing says
  // « Nouveau »), and cleared since (the reward plays).
  const vu = store.get<Vu | null>('vu', null)
  const nouveaux = new Set<string>()
  const cleared: string[] = []
  if (vu) {
    for (const l of WORLD.levels) {
      if (!l.prevu && !vu.ecrits.includes(l.id)) nouveaux.add(l.id)
      if (['dispo', 'front', 'prog'].includes(etatOf(l.id)) && !vu.ouverts.includes(l.id)) nouveaux.add(l.id)
    }
    for (const id of S.lus) if (!vu.lus.includes(id) && onMap(id)) cleared.push(id)
  }
  const remember = () => store.set('vu', { ecrits: written.map((l) => l.id), lus: [...S.lus], ouverts: WORLD.levels.filter((l) => ['dispo', 'front', 'prog'].includes(etatOf(l.id))).map((l) => l.id) })
  remember()

  // ---------------------------------------------------------------- the view
  type Cam = { s: number; tx: number; ty: number }
  let pw = 0
  let ph = 0
  let fit: Fit | null = null
  let world: Cam = { s: 80, tx: 0, ty: 0 }
  let cam: Cam = { ...world }
  let focus: string | null = null
  let zt = false // the sector bar is up (a region in focus), switched at half the flight
  let sel: string | null = null // the chosen level: the reticle, the briefing
  type Tg = { k: 'node' | 'region' | 'relay'; id: string; far?: string; link?: string }
  let hov: Tg | null = null
  let kf: Tg | null = null
  let down: Tg | null = null
  let flight: { a: Cam; b: Cam; t0: number; dur: number; pivot: Pt; to: string | null; switched: boolean } | null = null
  const queue: { t: number; fn: () => void }[] = []
  const at = (ms: number, fn: () => void) => queue.push({ t: now + (still.matches ? 0 : ms), fn })
  const s0 = () => fit?.s0 ?? 80
  const kind = () => fit?.kind ?? 'wide'
  // ONE MAP, ONE CAMERA. The map is laid out once, at the world's fitted step; the camera only
  // moves and scales it, its scale over that step a pixel ratio (`inMap`): nothing is placed again,
  // everything (plates, chips, labels, lines) grows and shrinks together, on whole device pixels.
  // A level is named by its card, its briefing or its sheet, never by a zoom.
  const view = (): View => ({ axis, kind: kind(), z: false, s: s0(), s0: s0(), focus: null, home })
  const F = (n: Node) => plateF(n, view())
  const CELL = (n: Node) => tableOf(view())[sizeIn(n, view())][1]
  // the camera's scale over the detail drawn (1 outside `inMap`)
  let qf = 1
  const footOf = () => (desk() ? 0 : sheetH) / qf
  const paneOf = (z: boolean): Pane => ({ w: pw, h: ph, top: z ? ZBAR : 0, foot: footOf(), gutter: axis === 'v' ? GUTTER.phone : z ? GUTTER.zoom : GUTTER.desk })
  // the pane the layout is made for (the sheet at its peek): sizes and k never change with the sheet
  const layoutPane = (z: boolean): Pane => ({ ...paneOf(z), foot: desk() ? 0 : PEEK })
  const scr = (x: number, y: number, c: Cam = cam): Pt => [c.tx + x * c.s, c.ty + y * c.s]
  // The labels on the map. A region is named in no place of its own on the map: it is named by its
  // sector bar once in focus, and by its link for the keyboard.
  const labelsNow = (): Labels | null => fit?.labels ?? null
  // The map's own space: the camera swapped for the detail's, the pane and the pixel ratio scaled
  // by the camera's scale over it. Drawing and hit-testing run in it.
  function inMap<T>(fn: () => T): T {
    const f = cam.s / view().s
    const keep = { cam, pw, ph, d: dpr }
    cam = { s: view().s, tx: cam.tx / f, ty: cam.ty / f }
    pw /= f
    ph /= f
    qf = f
    setDpr(keep.d * f)
    try {
      return fn()
    } finally {
      cam = keep.cam
      pw = keep.pw
      ph = keep.ph
      qf = 1
      setDpr(keep.d)
    }
  }

  // every region keeps its own tones at every view: nothing is dimmed by the camera
  const tone = (hue: number, _reg: string): Tone => TONES[hue]!

  // ---------------------------------------------------------------- the field and the lands
  // A dot every half step outside every land; inside a land its texture, every eighth step, in its
  // tone. Each grid point holds the index of its land.
  type Grid = { n: number; i0: number; j0: number; w: number; h: number; reg: Int8Array }
  let grids: Grid[] = []
  let regIds: string[] = []
  function buildDots() {
    regIds = [...LY.lands.keys()]
    const lands = [...LY.lands.values()]
    const [x0, y0, x1, y1] = LY.box
    grids = [8].map((n) => {
      const i0 = Math.floor((x0 - 3) * n)
      const j0 = Math.floor((y0 - 3) * n)
      const w = Math.ceil((x1 + 3) * n) - i0 + 1
      const h = Math.ceil((y1 + 3) * n) - j0 + 1
      const reg = new Int8Array(w * h).fill(-1)
      for (let a = 0; a < w; a++)
        for (let b = 0; b < h; b++) for (let k = 0; k < lands.length; k++) if (inRings(lands[k]!.rings, (i0 + a) / n, (j0 + b) / n)) reg[a + b * w] = k
      return { n, i0, j0, w, h, reg }
    })
  }

  // ---------------------------------------------------------------- framing
  function fitAll() {
    fit = fitWorld(LY, layoutPane(false), home, course(), faces)
    world = worldCam()
  }
  // THE CAMERA'S RANGE: from the world at rest (the whole map fitted; a phone's at PHONE_REST at the
  // least, so its levels keep their size) to MAX_K times the world's step.
  const PHONE_REST = 72
  const minS = () => (axis === 'v' ? Math.max(s0(), PHONE_REST) : s0())
  const MAX_K = 4
  const maxS = () => MAX_K * s0()
  // The map's box at a scale: the world's, scaled from its step.
  const boxAt = (sc: number): Box => fit!.box.map((v) => (v * sc) / s0()) as Box
  // The camera kept on the map: on each axis the box centred if it fits the safe area, else its
  // edges kept on the safe area's.
  function clampCam(c: Cam): Cam {
    const sa = safe(paneOf(!!focus))
    const b = boxAt(c.s)
    const one = (t: number, lo: number, hi: number, b0: number, b1: number) => (b1 - b0 <= hi - lo ? (lo + hi) / 2 - (b0 + b1) / 2 : Math.max(hi - b1, Math.min(lo - b0, t)))
    return { s: c.s, tx: one(c.tx, sa[0], sa[2], b[0], b[2]), ty: one(c.ty, sa[1], sa[3], b[1], b[3]) }
  }
  const settled = (c: Cam): Cam => ({ s: c.s, tx: whole(c.tx), ty: whole(c.ty) })
  // The world at rest: the map centred; where it is larger than the pane (a phone), the level to
  // read next centred.
  function worldCam(): Cam {
    const s = minS()
    const sa = safe(layoutPane(false))
    const n = node(rec ?? home ?? WORLD.order.find(onMap)!)
    return settled(clampCam({ s, tx: (sa[0] + sa[2]) / 2 - n.x * s, ty: (sa[1] + sa[3]) / 2 - n.y * s }))
  }
  // A REGION IN FOCUS: the camera on its box (its coast, its plates and labels), as large as fits
  // under the sector bar, between the world at rest and REGION_K times the world's step. A region
  // larger than the pane at that scale is centred on the level chosen.
  const REGION_K = 3
  function regionCam(reg: string, on?: string): Cam {
    const k = s0()
    const sa = safe(layoutPane(true))
    let b: Box = [Infinity, Infinity, -Infinity, -Infinity]
    const add = (x: Box) => (b = [Math.min(b[0], x[0]), Math.min(b[1], x[1]), Math.max(b[2], x[2]), Math.max(b[3], x[3])])
    for (const r of LY.lands.get(reg)!.rings) for (const [x, y] of r) add([x * k, y * k, x * k, y * k])
    for (const [id, lb] of fit!.labels.boxes) if (node(id).reg === reg) add(lb)
    const fitS = k * Math.min((sa[2] - sa[0]) / (b[2] - b[0]), (sa[3] - sa[1]) / (b[3] - b[1]))
    const s = Math.max(minS(), Math.min(fitS, REGION_K * k))
    const f = s / k
    const big = (b[2] - b[0]) * f > sa[2] - sa[0] || (b[3] - b[1]) * f > sa[3] - sa[1]
    const [cx, cy] = big && on ? [node(on).x * s, node(on).y * s] : [((b[0] + b[2]) / 2) * f, ((b[1] + b[3]) / 2) * f]
    return settled(clampCam({ s, tx: (sa[0] + sa[2]) / 2 - cx, ty: (sa[1] + sa[3]) / 2 - cy }))
  }
  // How much of the pane's foot the sheet covers (0 on a desktop).
  const overlap = () => {
    if (desk()) return 0
    const pr = pane.getBoundingClientRect()
    const br = brief.getBoundingClientRect()
    return Math.max(0, Math.round(pr.bottom - br.top))
  }
  // The camera after the sheet moved: where it is, with the level chosen kept clear of the sheet.
  function restCam(): Cam {
    const c = clampCam({ ...cam })
    if (desk() || sheetH <= PEEK) return settled(c)
    const sa = safe(paneOf(!!focus))
    const n = node(sel ?? home)
    const y = c.ty + n.y * c.s
    const r = 48
    if (y < sa[1] + r) c.ty += sa[1] + r - y
    else if (y > sa[3] - r) c.ty -= y - (sa[3] - r)
    return settled(c)
  }
  // At rest the camera's offset is a whole number of device pixels.
  function whole(v: number) {
    const d = devicePixelRatio || 1
    return Math.round(v * d) / d
  }
  // Re-lay the view after a change of state (a counter, the q, « Nouveau »): titles and labels.
  function relayout() {
    fitAll()
  }

  // ---------------------------------------------------------------- the canvas pane
  let sized = false
  function sizePane() {
    const r = pane.getBoundingClientRect()
    const d = devicePixelRatio || 1
    setDpr(d)
    pw = Math.round(r.width)
    ph = Math.round(r.height)
    cv.width = Math.round(pw * d)
    cv.height = Math.round(ph * d)
    const ax: Axis = tallQ.matches ? 'v' : 'h'
    // a new layout (the first, or the axis turned) puts the camera at rest; any other resize (a
    // phone's toolbar folding) keeps it where the reader left it
    const fresh_ = !sized || ax !== axis
    sized = true
    if (ax !== axis) {
      axis = ax
      LY = layout(DATA, levels, axis)
      faces = facesOf(LY)
      mapRegions = WORLD.regions.filter((rg) => rg.levels.some(onMap))
      home = homeOf()
      buildDots()
    }
    fitAll()
    if (mini) {
      const mr = mini.getBoundingClientRect()
      mini.width = Math.round(mr.width * d)
      mini.height = Math.round(mr.height * d)
    }
    if (!desk() && !drag) sheetH = overlap()
    flight = null
    cam = fresh_ ? (focus ? regionCam(focus, sel ?? undefined) : world) : settled(clampCam(cam))
    drawMini()
    placeLinks()
    kick()
  }

  // ---------------------------------------------------------------- flights
  // Scale in log space, the target's centre straight across the screen, one ease-in-out; the
  // first frame covers EARLY of the way; a new target mid-flight starts from the current pose; the
  // HUD swaps at half the flight. The map itself is only moved and scaled.
  const P0 = (() => {
    let p = 0
    while (inout(p) < EARLY) p += 0.002
    return p
  })()
  function fly(b: Cam, to: string | null, dur: number, pivot: Pt) {
    if (still.matches) {
      cam = b
      flight = null
      zt = !!to
      afterFlight()
      return
    }
    const a = { ...cam }
    const dist = Math.hypot(b.tx - a.tx, b.ty - a.ty) + Math.abs(Math.log(b.s / a.s)) * 400
    const d = flight ? Math.max(240, Math.min(dur, dist)) : dur
    flight = { a, b, t0: now - P0 * d, dur: d, pivot, to, switched: zt === !!to }
    frames = 0
    kick()
  }
  function camAt(f: NonNullable<typeof flight>, p: number): Cam {
    const e = inout(p)
    const s = Math.exp(Math.log(f.a.s) + (Math.log(f.b.s) - Math.log(f.a.s)) * e)
    const [px, py] = f.pivot
    const sx = f.a.tx + px * f.a.s + (f.b.tx + px * f.b.s - (f.a.tx + px * f.a.s)) * e
    const sy = f.a.ty + py * f.a.s + (f.b.ty + py * f.b.s - (f.a.ty + py * f.a.s)) * e
    return { s, tx: sx - px * s, ty: sy - py * s }
  }
  const centreOf = (reg: string): Pt => {
    const ns = R.get(reg)!.levels.filter(onMap).map(node)
    return [(Math.min(...ns.map((n) => n.x)) + Math.max(...ns.map((n) => n.x))) / 2, (Math.min(...ns.map((n) => n.y)) + Math.max(...ns.map((n) => n.y))) / 2]
  }
  function stepFlight() {
    if (!flight) return
    const p = Math.min(1, (now - flight.t0) / flight.dur)
    cam = camAt(flight, p)
    if (!flight.switched && p >= 0.5) {
      flight.switched = true
      zt = !!flight.to
      syncHud()
    }
    if (p >= 1) {
      cam = flight.b
      flight = null
      afterFlight()
    }
  }
  function afterFlight() {
    point(last ? hit(last[0], last[1]) : null)
    placeLinks()
    syncHud()
    drawMini()
  }
  function zoomTo(reg: string, pick?: string, push = true) {
    if (!R.get(reg)!.levels.some(onMap)) return
    const was = focus
    focus = reg
    fly(regionCam(reg, pick ?? (sel && node(sel)?.reg === reg ? sel : pickIn(reg))), reg, was ? T.camTravel : T.camIn, centreOf(reg))
    point(null)
    if (pick) choose(pick)
    else if (!sel || node(sel)?.reg !== reg) choose(pickIn(reg))
    if (push) history.pushState({ vue: reg }, '', `#vue-${reg}`)
    announce(R.get(reg)!.nom)
    buildAnchors()
    syncBar()
    // the focus follows the camera: to the level chosen in the region reached
    if (sel) anchorOf('node', sel)?.focus({ preventScroll: true })
  }
  function toWorld(push = true) {
    if (!focus) return
    const from = focus
    focus = null
    tw('left:' + from, 1, 0)
    tw('left:' + from, 0, T.state, out, 1, 600)
    fly(world, null, T.camOut, centreOf(from))
    point(null)
    sel = null
    showBrief(rec ?? WORLD.order[0]!)
    if (push && location.hash) history.pushState({}, '', location.pathname + location.search)
    buildAnchors()
    syncBar()
    // the focus returns to the region the camera came from
    anchorOf('region', from)?.focus({ preventScroll: true })
  }
  const pickIn = (reg: string) => {
    const ids = WORLD.order.filter((id) => onMap(id) && node(id).reg === reg)
    const is = (...e: Etat[]) => ids.find((id) => e.includes(etatOf(id)))
    if (home && ids.includes(home)) return home
    return is('prog') ?? is('dispo', 'soft') ?? is('front') ?? ids[0]!
  }

  // ---------------------------------------------------------------- the chain
  // A level's chain: every link on its way back to level 1 (deeper ones at half), and the links
  // it opens.
  function chainOf(id: string): Map<string, number> {
    const out = new Map<string, number>()
    const seen = new Set<string>()
    const walk = (x: string, depth: number) => {
      for (const l of LY.links)
        if (l.b === x && !seen.has(l.id)) {
          seen.add(l.id)
          out.set(l.id, depth === 0 ? 1 : 0.5)
          walk(l.a, depth + 1)
        }
    }
    walk(id, 0)
    for (const l of LY.links) if (l.a === id) out.set(l.id, 1)
    return out
  }
  let headLog: { link: string; from: number; to: number; cuts: number[]; a: number; b: number } | null = null

  // ---------------------------------------------------------------- effects
  type Part = { x: number; y: number; vx: number; vy: number; sz: number; col: string; t0: number; life: number }
  let parts: Part[] = []
  let waves: { x: number; y: number; F: number; col: string; t0: number; to: number }[] = []
  let heads: { link: string; t0: number; dur: number }[] = []
  let charge: { id: string; t0: number } | null = null
  let flash = 0
  let shake: { a: number; t0: number; dur: number } | null = null
  const sweeps: { reg: string; t0: number }[] = []
  let lap: { t0: number } | null = null
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  let chainLog: { link: string; len: number; clipped: boolean }[] = []
  let spanLog: { link: string; ends: Pt[]; cut: boolean }[] = []
  const fades = new Map<string, number>()
  const hvTo = new Map<string, boolean>()
  const progEdge = new Map<string, number>()
  let flashLog: { id: string; at: number }[] = []
  let qLog: { x: number; foot: number; c: number } | null = null
  let ghostLog: { id: string; x: number; y: number } | null = null
  const fxMax = { wave: 0, part: Infinity, parts: 0, span: 0, reach: 0 }
  const fxBusy = () => parts.length > 0 || waves.length > 0 || heads.length > 0 || !!charge || !!shake || sweeps.length > 0 || !!lap || flash > 0

  // ---------------------------------------------------------------- the frame
  const renderMs: number[] = []
  let raf = 0
  let frames = 0
  function kick() {
    if (!raf) raf = requestAnimationFrame(frame)
  }
  const idle = () => !still.matches && !document.hidden
  function frame(t: number) {
    raf = 0
    tick(t)
    frames++
    for (let i = queue.length - 1; i >= 0; i--)
      if (queue[i]!.t <= now) {
        const q = queue.splice(i, 1)[0]!
        q.fn()
      }
    stepFlight()
    const r0 = performance.now()
    render()
    if (renderMs.length < 4000) renderMs.push(performance.now() - r0)
    if (flight) drawMini()
    placeLinks()
    const flowing = !still.matches && !!(sel || (hov && hov.k !== 'region'))
    if (flight || busy() || fxBusy() || queue.length || flowing) kick()
    else if (idle()) raf = requestAnimationFrame(frame) // the q's bob and the breathing halo
  }

  // ---------------------------------------------------------------- render
  // The map in its own space (`inMap`), then the HUD's frame on the screen's.
  function render() {
    inMap(drawMap)
    drawFrame()
  }
  function drawMap() {
    const d = dpr
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = GROUND
    ctx.fillRect(0, 0, cv.width, cv.height)
    // the map layer's shake (never the HUD)
    let ox = 0
    let oy = 0
    if (shake) {
      const p = (now - shake.t0) / shake.dur
      if (p >= 1) shake = null
      else {
        const a = shake.a * (1 - p) * (1 - p)
        ox = Math.round(Math.sin(p * Math.PI * 7) * a)
        oy = Math.round(Math.cos(p * Math.PI * 5) * a * 0.6)
      }
    }
    const v = view()
    const S_ = (x: number, y: number): Pt => [Math.round((cam.tx + ox + x * cam.s) * d), Math.round((cam.ty + oy + y * cam.s) * d)]
    const chain = sel ? chainOf(sel) : new Map<string, number>()
    const hovChain = hov && hov.k === 'node' && hov.id !== sel ? chainOf(hov.id) : new Map<string, number>()
    const hovReg = hov && hov.k === 'region' ? hov.id : hov && hov.k === 'node' ? node(hov.id).reg : null
    const kReg = kf && kf.k === 'region' ? kf.id : null
    const wayReg = hov && hov.k === 'relay' ? node(hov.far!).reg : hovReg && focus && hovReg !== focus ? hovReg : null
    // A region pointed at (its land or one of its levels), or focused by the keyboard: its tint and
    // rim brighten in place. Nothing moves, so the routes stay whole.

    // L0 + L1: the field, the lands (tint, texture, rim, corner marks)
    const G = grids[0]!
    const fieldEvery = G.n / 2
    const ia = Math.max(0, Math.floor((-cam.tx / cam.s) * G.n) - G.i0 - 1)
    const ib = Math.min(G.w - 1, Math.ceil(((pw - cam.tx) / cam.s) * G.n) - G.i0 + 1)
    const ja = Math.max(0, Math.floor((-cam.ty / cam.s) * G.n) - G.j0 - 1)
    const jb = Math.min(G.h - 1, Math.ceil(((ph - cam.ty) / cam.s) * G.n) - G.j0 + 1)
    for (const [id, land] of LY.lands) {
      const t = TONES[land.hue]!
      landPath(land.rings, ox, oy)
      // pointed or focused: the tint rises 4 % (90 ms)
      ctx.fillStyle = mix(t.tint, t.tintHi, 0.8 * val('rh:' + id, 0))
      ctx.fill('evenodd')
    }
    const swX = new Map(
      sweeps.map((sw) => {
        const ns = R.get(sw.reg)!.levels.filter(onMap).map(node)
        const x0 = Math.min(...ns.map((n) => n.x)) - 1
        const x1 = Math.max(...ns.map((n) => n.x)) + 1
        return [sw.reg, x0 + (x1 - x0) * Math.min(1, (now - sw.t0) / 600)]
      }),
    )
    const cols = regIds.map((id) => {
      const t = tone(R.get(id)!.hue, id)
      const hot = id === hovReg || id === kReg || (id === wayReg && focus !== id)
      const lf = val('left:' + id, 0)
      return hot ? t.dotHi : lf > 0 ? mix(t.dot, t.dotHi, lf) : t.dot
    })
    const d1 = Math.max(1, Math.round(d))
    const d2 = D(2)
    // no dot inside a label's or a title's keyline box (2 px round it), at rest
    const LBd = labelsNow()
    const keep: Box[] =
      flight || !LBd
        ? []
        : [...LBd.boxes.values()].map((b) => [Math.round((cam.tx + ox + b[0] - 2) * d), Math.round((cam.ty + oy + b[1] - 2) * d), Math.round((cam.tx + ox + b[2] + 2) * d), Math.round((cam.ty + oy + b[3] + 2) * d)] as Box)
    for (let a = ia; a <= ib; a++)
      for (let b = ja; b <= jb; b++) {
        const k = G.reg[a + b * G.w]!
        const gi = G.i0 + a
        const gj = G.j0 + b
        if (k < 0 && (gi % fieldEvery !== 0 || gj % fieldEvery !== 0)) continue
        const lx = gi / G.n
        const ly = gj / G.n
        const id = k >= 0 ? regIds[k]! : null
        const x = Math.round((cam.tx + ox + lx * cam.s) * d)
        const y = Math.round((cam.ty + oy + ly * cam.s) * d)
        let col = k < 0 ? FIELD : cols[k]!
        if (id && swX.has(id) && Math.abs(lx - swX.get(id)!) < 0.2) col = INK
        const sz = k < 0 ? d1 : d2
        if (keep.length && keep.some((bx) => x + sz > bx[0] && x - sz < bx[2] && y + sz > bx[1] && y - sz < bx[3])) continue
        ctx.fillStyle = col
        ctx.fillRect(x - (sz >> 1), y - (sz >> 1), sz, sz)
      }
    for (const [id, land] of LY.lands) {
      const t = TONES[land.hue]!
      const done = R.get(id)!.levels.filter(onMap).every((x) => S.lus.has(x) && !held.has(x))
      // the rim: one continuous 2-px stroke in the wire; pointed, it brightens within its own hue,
      // to the region's light tone (never toward the ink: that is the selection's)
      const rh = val('rh:' + id, 0)
      landPath(land.rings, ox, oy, W(2))
      // focused by the keyboard: the rim goes to the ink (the focus drawn on the thing itself)
      ctx.strokeStyle = (kReg === id || regSel === id) && !focus ? INK : done ? t.ink : mix(t.wire, t.ink, rh)
      ctx.lineWidth = W(2)
      ctx.lineJoin = 'miter'
      ctx.stroke()
      const sw = sweeps.find((x) => x.reg === id)
      if (sw) {
        // a completed region's rim sweep: a 2-px ink line running round its rim (600 ms)
        const p = Math.min(1, (now - sw.t0) / 600)
        for (const r of land.rings) {
          const pts = r.map(([x, y]) => S_(x, y))
          pts.push(pts[0]!)
          let len = 0
          for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1])
          ctx.setLineDash([len * out(p), len])
          ctx.beginPath()
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
          ctx.strokeStyle = INK
          ctx.lineWidth = W(2)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
      ctx.globalAlpha = 1
    }

    // L2: grooves. A groove is ONE 3-px channel (the region's wire on its land, the neutral grey in
    // a gutter) with a 1-px highlight along its top edge; lit, the same channel in the ink.
    const core = W(3)
    const strokePts = (pts: Pt[], w: number, col: string, dash?: number[], off = 0) => {
      ctx.beginPath()
      const odd = w % 2 ? 0.5 : 0
      pts.forEach(([x, y], i) => {
        const [a, b] = S_(x, y)
        if (i === 0) ctx.moveTo(a + odd, b + odd)
        else ctx.lineTo(a + odd, b + odd)
      })
      ctx.lineWidth = w
      ctx.strokeStyle = col
      ctx.lineJoin = 'miter'
      ctx.lineCap = 'butt'
      ctx.setLineDash(dash ?? [])
      ctx.lineDashOffset = -off
      ctx.stroke()
      ctx.setLineDash([])
    }
    const partial = (pts: Pt[], from: number, len: number): Pt[] => {
      const res: Pt[] = []
      let acc = 0
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1]!
        const [bx, by] = pts[i]!
        const l = Math.hypot(bx - ax, by - ay)
        const a0 = Math.max(from, acc)
        const a1 = Math.min(from + len, acc + l)
        if (a1 > a0) {
          if (!res.length) res.push([ax + ((bx - ax) * (a0 - acc)) / l, ay + ((by - ay) * (a0 - acc)) / l])
          res.push([ax + ((bx - ax) * (a1 - acc)) / l, ay + ((by - ay) * (a1 - acc)) / l])
        }
        acc += l
      }
      return res
    }
    const lenOf = (pts: Pt[]) => pts.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - pts[i - 1]![0], q[1] - pts[i - 1]![1]) : s), 0)
    // a link's runs kept from its own end up to `to` (a point on it)
    function cutRuns<R extends { pts: Pt[] }>(rs: R[], l: Link, to: Pt, from: 'a' | 'b'): R[] {
      const all = rs.flatMap((x, i) => (i ? x.pts.slice(1) : x.pts))
      let best = 0
      let bd = Infinity
      let acc = 0
      for (let i = 1; i < all.length; i++) {
        const [ax, ay] = all[i - 1]!
        const [bx, by] = all[i]!
        const L_ = Math.hypot(bx - ax, by - ay) || 1
        const t = Math.max(0, Math.min(1, ((to[0] - ax) * (bx - ax) + (to[1] - ay) * (by - ay)) / (L_ * L_)))
        const dd = Math.hypot(ax + (bx - ax) * t - to[0], ay + (by - ay) * t - to[1])
        if (dd < bd) [bd, best] = [dd, acc + t * L_]
        acc += L_
      }
      const [lo, hi] = from === 'a' ? [0, best] : [best, acc]
      const out_: R[] = []
      let a0 = 0
      for (const r of rs) {
        const len = lenOf(r.pts)
        const s0_ = Math.max(lo, a0)
        const s1_ = Math.min(hi, a0 + len)
        if (s1_ > s0_ + 1e-9) out_.push({ ...r, pts: partial(r.pts, s0_ - a0, s1_ - s0_) })
        a0 += len
      }
      void l
      return out_
    }
    // the top edge of a channel: a 1-px line one px off its centre, toward the top (or the left of
    // an upright one)
    const edge = (pts: Pt[], col: string) => {
      const o = W(1)
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = S_(pts[i - 1]![0], pts[i - 1]![1])
        const [bx, by] = S_(pts[i]![0], pts[i]![1])
        const L = Math.hypot(bx - ax, by - ay) || 1
        let nx = (by - ay) / L
        let ny = -(bx - ax) / L
        if (ny > 1e-6 || (Math.abs(ny) < 1e-6 && nx > 0)) [nx, ny] = [-nx, -ny]
        const ox_ = Math.round(nx * o)
        const oy_ = Math.round(ny * o)
        ctx.beginPath()
        const odd = o % 2 ? 0.5 : 0
        ctx.moveTo(ax + ox_ + odd, ay + oy_ + odd)
        ctx.lineTo(bx + ox_ + odd, by + oy_ + odd)
        ctx.lineWidth = o
        ctx.strokeStyle = col
        ctx.lineCap = 'butt'
        ctx.stroke()
      }
    }
    // THE CHAIN of the level chosen (or pointed): a solid 3-px line in the ink with one 12-px bright
    // head travelling it at 48 px/s. A link that leaves the pane shows its chain only within 2 steps
    // of each end, never a long line across empty ground.
    const HEAD = 12
    chainLog = []
    headLog = null
    const inPane = (pts: Pt[]) => pts.every(([x, y]) => {
      const [a, b] = S_(x, y)
      return a >= 0 && a <= pw * d && b >= D(top0) && b <= D(ph - footOf())
    })
    const top0 = focus && zt ? ZBAR : 0
    spanLog = []
    // what each link's runs are drawn in, for its arrowhead (drawn once every link is down)
    const drawnRuns: { l: Link; ch: number; share: number; runs: { pts: Pt[]; from: number; len: number; col: string; lit: string; chain: string }[] }[] = []
    for (const l of LY.links) {
      // the link's colour runs (lib/place.ts): a colour changes only on a drawn edge
      let runs = colourRuns(l, LY, v).map((r) => ({ reg: r.tone && r.tone !== 'p:' ? r.tone.replace(/^p:/, '') : null, pts: r.pts }))
      spanLog.push({ link: l.id, ends: runs.length ? [runs[0]!.pts[0]!, runs[runs.length - 1]!.pts[runs[runs.length - 1]!.pts.length - 1]!].map((q) => scr(q[0], q[1])) : [], cut: false })
      const open = linkOpen(l)
      const ch = Math.max(chain.get(l.id) ?? 0, hovChain.get(l.id) ?? 0)
      const share_ = lit.has(l.id) ? lit.get(l.id)! : open ? 1 : 0
      const wayHot = !!wayReg && !!focus && (node(l.a).reg === wayReg || node(l.b).reg === wayReg) && (l.ra === focus || l.rb === focus)
      const regHot = !!hovReg && !focus && l.ra === hovReg && l.rb === hovReg
      const total = runs.reduce((a, p) => a + lenOf(p.pts), 0)
      const near = !l.relay && !inPane(runs.flatMap((r) => r.pts)) ? 2 : Infinity
      // the stretches of the link the chain may show: all of it, or 2 steps from each end
      const shown = (pts: Pt[], from: number): Pt[][] => {
        const len = lenOf(pts)
        if (near === Infinity) return [pts]
        const out: Pt[][] = []
        const a = partial(pts, 0, Math.max(0, near - from))
        if (a.length > 1) out.push(a)
        const s0_ = Math.max(0, total - near - from)
        const b = partial(pts, s0_, len - s0_)
        if (b.length > 1 && s0_ < len) out.push(b)
        return out
      }
      let acc = 0
      const mine: (typeof drawnRuns)[number] = { l, ch, share: share_, runs: [] }
      drawnRuns.push(mine)
      runs.forEach((pc, i) => {
        const len = lenOf(pc.pts)
        const t = pc.reg ? tone(R.get(pc.reg)!.hue, pc.reg) : null
        let chan = t ? t.wire : NEUTRAL
        if (!t && focus) chan = mix(NEUTRAL, GROUND, 0.35)
        if (wayHot || regHot) chan = mix(chan, INK, wayHot ? 0.45 : 0.25)
        strokePts(pc.pts, core, chan)
        edge(pc.pts, mix(chan, INK, 0.3))
        const litCol = t ? t.ink : INK
        mine.runs.push({ pts: pc.pts, from: acc, len, col: chan, lit: litCol, chain: t ? t.ink : mix(NEUTRAL, INK, 0.6) })
        const a0 = acc / total
        const a1 = (acc + len) / total
        if (share_ > a0) {
          const sub = share_ >= a1 ? pc.pts : partial(pc.pts, 0, ((share_ - a0) / (a1 - a0)) * len)
          if (sub.length > 1) {
            strokePts(sub, core, litCol)
            edge(sub, mix(litCol, INK, 0.5))
          }
        }
        if (ch)
          for (const st of shown(pc.pts, acc)) {
            strokePts(st, core, ch === 1 ? (t ? t.ink : mix(NEUTRAL, INK, 0.6)) : rgba(litCol, 0.45))
            chainLog.push({ link: l.id, len: lenOf(st) * cam.s, clipped: near !== Infinity })
          }
        acc += len
      })
      // a link toward a pointed neighbour carries the head toward the far region (in its ink)
      if (wayHot && !ch && !still.matches && !l.relay && near === Infinity) headOn(l, runs, TONES[R.get(wayReg!)!.hue]!.ink)
    }
    arrowheads()
    // THE DIRECTION OF A LINK is told where it plugs into the level it opens: an arrowhead, its tip
    // on that plate's edge, in the colour of the route's last run (lit, or on a chain, as drawn).
    // A relay's or a warp's stub into its level ends the same way; a stub out of its level ends on
    // its port's chip with the head on the chip's edge. Heads drawn twice in one place (links that
    // share their last stretch) are one.
    function arrowheads() {
      const done = new Set<string>()
      const head = (tip: Pt, u: Pt, col: string) => {
        const [px, py] = S_(tip[0], tip[1])
        const k = `${Math.round(px)}|${Math.round(py)}|${Math.round(u[0] * 4)}|${Math.round(u[1] * 4)}`
        if (done.has(k)) return
        done.add(k)
        const h = D(6)
        const w = D(4)
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(px - u[0] * h - u[1] * w, py - u[1] * h + u[0] * w)
        ctx.lineTo(px - u[0] * h + u[1] * w, py - u[1] * h - u[0] * w)
        ctx.closePath()
        ctx.fillStyle = col
        ctx.fill()
      }
      const unit = (a: Pt, b: Pt): Pt => {
        const h = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
        return [(b[0] - a[0]) / h, (b[1] - a[1]) / h]
      }
      // a plate's edge along u, from its centre (its bezel's for the goal), in steps
      const edgeOf = (n: Node) => (F(n) / 2 + (sizeIn(n, v) === 'G' ? BEZEL + 1 : 0)) / v.s
      const chipEdge = chipOf(v) / 2 / v.s
      for (const d of drawnRuns) {
        const l = d.l
        const colOf = (r: (typeof d.runs)[number]) => (d.ch === 1 ? r.chain : d.share >= 1 ? r.lit : r.col)
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
          // the run of this stub: the one ending nearest its port
          const run = d.runs.reduce((best, r) => {
            const e = r.pts[r.pts.length - 1]!
            const s0_ = r.pts[0]!
            const dd = Math.min(Math.hypot(e[0] - q[0], e[1] - q[1]), Math.hypot(s0_[0] - q[0], s0_[1] - q[1]))
            return dd < best.dd ? { r, dd } : best
          }, { r: d.runs[0]!, dd: Infinity }).r
          if (p.end === 'b') {
            const u = unit(q, [m.x, m.y])
            head([m.x - u[0] * edgeOf(m), m.y - u[1] * edgeOf(m)], u, colOf(run))
          } else {
            const u = unit([m.x, m.y], q)
            head([q[0] - u[0] * chipEdge, q[1] - u[1] * chipEdge], u, colOf(run))
          }
        }
      }
    }
    // AT REST the cue lives on the recommended plate (its breathing halo) only: no head on a link.
    function headOn(l: Link, runs: { pts: Pt[] }[], col: string) {
      const all = runs.flatMap((x, i) => (i ? x.pts.slice(1) : x.pts))
      const total = lenOf(all) * cam.s
      // where the colour changes (coasts), along the link, in px
      const cuts: number[] = []
      let acc_ = 0
      for (const r of runs.slice(0, -1)) cuts.push((acc_ += lenOf(r.pts)) * cam.s)
      let a = reach(node(l.a), v) + 8
      let b = total - reach(node(l.b), v) - 8
      for (const c of cuts) {
        if (Math.abs(a - c) < 8) a = c + 8
        if (Math.abs(b - c) < 8 + HEAD) b = c - 8 - HEAD
      }
      if (b - a < HEAD || !inPane(all)) return
      const at_ = a + (((now / 1000) * 48) % (b - a - HEAD))
      const seg = partial(all, at_ / cam.s, HEAD / cam.s)
      if (seg.length > 1) strokePts(seg, core, col)
      headLog = { link: l.id, from: at_, to: at_ + HEAD, cuts, a, b }
    }
    // the reward's charge: a 4-px ink head running ahead of the lit share
    for (const h of heads) {
      const l = LY.links.find((x) => x.id === h.link)!
      const p = Math.min(1, (now - h.t0) / h.dur)
      const all = runsAt(l, LY, v).flatMap((x, i) => (i ? x.pts.slice(1) : x.pts))
      const tip_ = partial(all, 0, lenOf(all) * p)
      const end = tip_[tip_.length - 1]
      if (end) {
        const [x, y] = S_(end[0], end[1])
        const hs = D(4)
        ctx.fillStyle = INK
        ctx.fillRect(x - hs / 2 - D(2), y - hs / 2 - D(2), hs + D(4), hs + D(4))
        ctx.fillStyle = GROUND
        ctx.fillRect(x - hs / 2 - D(1), y - hs / 2 - D(1), hs + D(2), hs + D(2))
        ctx.fillStyle = INK
        ctx.fillRect(x - hs / 2, y - hs / 2, hs, hs)
      }
    }

    // relay ports: a chip at each end, the far level's icon framed in its region's wire
    const chipSz = chipOf(v)
    for (const l of LY.links)
      for (const p of l.ports) {
        const far = node(p.far)
        const ft = tone(far.hue, far.reg)
        const mine = node(p.end === 'a' ? l.a : l.b)
        const pa = portAt(LY, l, p.end, v)
        const [x, y] = S_(pa[0], pa[1])
        const hot = hov && hov.k === 'relay' && hov.link === l.id
        const chosen = selVia === `${l.id}|${p.end}` && sel === p.far
        chip(x, y, D(chipSz), D(4), hot ? ft.ink : ft.wire, hot ? mix(HUD, ft.ink, 0.25) : RAISE)
        icon(ctx, p.far, DATA.icons[p.far]!, x, y, Math.max(1, Math.round(d)), etat(p.far) === 'fog' ? ft.fog : ft.ink)
        if (chosen) brackets(x - D(chipSz / 2 + 4), y - D(chipSz / 2 + 4), x + D(chipSz / 2 + 4), y + D(chipSz / 2 + 4))
        ctx.globalAlpha = 1
      }

    // L3: nodes and their labels
    const LB = labelsNow()
    const order = [...LY.nodes.values()].sort((a, b) => (a.id === sel ? 1 : 0) - (b.id === sel ? 1 : 0))
    const qPos = { x: 0, y: 0, F: 0, id: '' }
    const top = focus && zt ? ZBAR : 0
    const bottom = ph - footOf()
    for (const n of order) {
      const t = tone(n.hue, n.reg)
      const st = etat(n.id)
      const kHere = !!kf && kf.k === 'node' && kf.id === n.id
      const hot = (hov && hov.k === 'node' && hov.id === n.id) || kHere
      // a press: one frame of ink, then the plate drops 3 px (lib: the input's felt response)
      const lift = val('lift:' + n.id, 0) + (n.id === sel ? 2 : 0) - val('drop:' + n.id, 0)
      const sc = val('pr:' + n.id, 1) * val('pop:' + n.id, 1)
      const [x, y0] = S_(n.x, n.y)
      const nope = val('nope:' + n.id, 0)
      const xx = x + Math.round(Math.sin(nope * Math.PI * 6) * D(3) * (1 - nope) * (nope > 0 && nope < 1 ? 1 : 0))
      const y = y0 - D(lift)
      const Fd = Math.round((F(n) * sc * d) / 2) * 2
      // the map is cut by the pane's edge like any map: a plate off it is only skipped
      const ph_ = F(n) / 2 + (sizeIn(n, v) === 'G' ? BEZEL + 4 : 0) + 8
      fades.set(n.id, 1)
      if (xx / d + ph_ < 0 || xx / d - ph_ > pw || y / d + ph_ < 0 || y / d - ph_ > ph) continue
      const fw = st === 'fog' || st === 'soft' ? W(1) : W(2)
      const cell = Math.max(1, Math.round(CELL(n) * d))
      if (n.id === rec && !held.size) {
        const a = still.matches ? 1 : 0.4 + 0.6 * (0.5 - 0.5 * Math.cos(((now % T.breathe) / T.breathe) * Math.PI * 2))
        halo(ctx, xx, y, Fd + (sizeIn(n, v) === 'G' ? 2 * D(BEZEL + 2) : 0), t.ink, a)
      }
      if (sizeIn(n, v) === 'G') bezelOf(xx, y, Fd, st, t)
      // POINTED (or focused): every state change tweens (lib: T.hover, an ease-out): the ring in the
      // region's light tone scales in from 0.9 to 1 as it fades in, 2 px off the plate, the frame and
      // the icon go toward the ink, the plate lifts 2 px
      if (!!hot !== (hvTo.get(n.id) ?? false)) {
        hvTo.set(n.id, !!hot)
        tw('hv:' + n.id, hot ? 1 : 0, hot ? T.hover : T.hoverOut, out, val('hv:' + n.id, 0))
      }
      const hv = val('hv:' + n.id, 0)
      if (hv > 0.001) {
        const Fo = Math.round(((Fd + 2 * D(2) + 2 * W(2)) * (0.9 + 0.1 * hv)) / 2) * 2
        ctx.globalAlpha = hv
        ring(ctx, xx, y, Fo, Fo - 2 * W(2), t.ink)
        ctx.globalAlpha = 1
      }
      const hc = (c: string) => (hv > 0.001 ? mix(c, INK, hv) : c)
      const pre = val('flood:' + n.id, -1)
      let ic = INK
      // THE STATES, each with a shape cue as well as a value: CLEARED is filled (its ink), framed in
      // the ink, its icon flipped to the ground and its stamp ring inside; OPEN is an outline (its
      // frame in its ink round a dark centre, the icon in the ink), BEGUN the same with its foot
      // filling; FRONT (opened, not written) is framed in its region's rim round a dark centre, its
      // icon in its ink (and « Nouveau » over its label when a clear just opened it); FOG is a
      // recessed socket, the icon dim; SOFT a muted frame.
      const dark = mix(SOCKET, t.plate, 0.3)
      if (st === 'lu' && !(pre >= 0 && pre < 1)) {
        oct(ctx, xx, y, Fd, INK)
        bevel(ctx, xx, y, Fd - 2 * fw, W(1), mix(t.ink, INK, 0.35), mix(t.ink, GROUND, 0.3), t.ink)
        ic = GROUND
        const fi = Fd - 2 * fw - 2 * D(2)
        octArc(ctx, xx, y, fi, val('stamp:' + n.id, 1), W(1), GROUND)
      } else if (pre >= 0 && pre < 1) {
        // the reward's flood: the plate fills with its ink from the frame inward
        oct(ctx, xx, y, Fd, pre > 0.5 ? INK : t.ink)
        oct(ctx, xx, y, Fd - 2 * fw, t.ink)
        const inner = Math.round(((Fd - 2 * fw) * (1 - pre)) / 2) * 2
        if (inner > 2) oct(ctx, xx, y, inner, dark)
        ic = pre > 0.5 ? GROUND : INK
      } else if (st === 'dispo' || st === 'prog') {
        oct(ctx, xx, y, Fd, hc(t.ink))
        bevel(ctx, xx, y, Fd - 2 * fw, W(1), '#040308', mix(dark, t.plate, 0.5), dark)
        ic = INK
        if (st === 'prog') {
          // begun: its foot fills with its ink as its checkpoints are reached; the fill's lit edge
          // never runs within 2 px of a groove's axis (it would read as the link going through)
          const inner = Fd - 2 * fw
          let edgeY = y + inner / 2 - Math.max(D(4), Math.round(inner * Math.max(0.25, share(n.id))))
          const axes = [y]
          for (const a of axes) if (Math.abs(edgeY - a) < D(3)) edgeY = share(n.id) < 0.5 ? a + D(3) : a - D(3) - W(1)
          ctx.save()
          ctx.beginPath()
          octPath(ctx, xx, y, inner)
          ctx.clip()
          ctx.fillStyle = mix(t.plate, t.ink, 0.62)
          ctx.fillRect(xx - inner / 2, edgeY, inner, y + inner / 2 - edgeY)
          ctx.fillStyle = mix(t.ink, INK, 0.4)
          ctx.fillRect(xx - inner / 2, edgeY, inner, W(1))
          ctx.restore()
          progEdge.set(n.id, (edgeY - y) / d)
        }
      } else if (st === 'soft') {
        // written but its prerequisites not met (a soft lock): a thin rim round a raised, flat plate,
        // its icon muted — never the front's dark centre and coloured icon
        oct(ctx, xx, y, Fd, hc(t.rim))
        oct(ctx, xx, y, Fd - 2 * fw, t.plate)
        ic = hc(MUTED)
      } else {
        oct(ctx, xx, y, Fd, st === 'front' ? hc(t.rim) : hc(t.sock))
        bevel(ctx, xx, y, Fd - 2 * fw, W(1), '#040308', '#1a1926', SOCKET)
        if (st === 'front') {
          const dr = val('dash:' + n.id, 1)
          if (dr < 1) octArc(ctx, xx, y, Fd, out(dr), fw, t.ink)
        }
        ic = hc(st === 'fog' ? t.fogd : t.ink)
      }
      icon(ctx, n.id, DATA.icons[n.id]!, xx, y, cell, ic)
      // the press's one frame of ink
      if (val('pf:' + n.id, 0) > 0) {
        oct(ctx, xx, y, Fd, INK)
        icon(ctx, n.id, DATA.icons[n.id]!, xx, y, cell, GROUND)
      }
      // a hit flash: the region's light tone, added, for two frames at most; the icon stays legible
      const hit_ = val('hit:' + n.id, 0)
      if (hit_ > 0) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        oct(ctx, xx, y, Fd, rgba(t.ink, 0.55 * hit_))
        ctx.restore()
        icon(ctx, n.id, DATA.icons[n.id]!, xx, y, cell, ic)
        flashLog.push({ id: n.id, at: now })
      }
      // the reward's charge round the frame, from 12 o'clock (160 ms)
      if (charge && charge.id === n.id) {
        const p = Math.min(1, (now - charge.t0) / 160)
        octArc(ctx, xx, y, Fd + 2 * D(4), out(p), W(2), INK)
      }
      if (n.id === home) Object.assign(qPos, { x: xx, y, F: Fd, id: n.id })
      // its label, by lib/place.ts's rule; a pointed level whose card has no free side shows its
      // compact tag in the label's place instead
      const lb = LB?.at.get(n.id)
      if (lb && labelled(v)) {
        const [cx, cy] = scr(n.x, n.y)
        const bx = [cx + lb.box[0] + ox, cy + lb.box[1] + oy - lift, cx + lb.box[2] + ox, cy + lb.box[3] + oy - lift]
        const key = keyAt((bx[0]! + bx[2]!) / 2, (bx[1]! + bx[3]!) / 2)
        for (const ln of lb.lines) {
          const eye = ln.face === 'eyebrow'
          const a = 1
          const col = ln.face === 'num' ? t.num : eye ? t.ink : st === 'fog' ? MUTED : TEXT
          const f = FACE[ln.face]
          const lk = ln.k ?? 1
          text(ctx, eye ? ln.t.toLocaleUpperCase('fr') : ln.t, Math.round((cx + ox + ln.x) * d), Math.round((cy + oy + ln.base - lift) * d), f.css.replace(/(\d+)px/, (_, p) => `${Math.round(Number(p) * lk * d)}px`), col, a, key, f.track * f.px * lk * d)
        }
      }
      // the reticle: four 2-px brackets, arms 6, 6 off the plate's box
      if (n.id === sel || kHere) {
        const fly_ = val('ret:' + n.id, 0)
        const off = D(6 + 8 * fly_) + (sizeIn(n, v) === 'G' ? D(BEZEL + 2) : 0)
        const b = Fd / 2 + off
        brackets(xx - b, y - b, xx + b, y + b)
      }
    }

    // L4: the q stands ON its plate (its feet QSINK px into the top face), wholly inside its land; the
    // camera keeps it in the safe area or it is not drawn. The ghost q stands on a trip's landing
    // level, only when that level and the ghost are wholly in view.
    const sa = safe(paneOf(zt))
    const cq = qCellAt(LY, v).c
    const inSafe = (x: number, y: number, Fd: number, c: number) => {
      const b = qBox(Fd / d, c)
      return x / d + b[0] >= sa[0] && x / d + b[2] <= sa[2] && y / d + b[1] >= sa[1] && y / d + b[3] <= sa[3]
    }
    qLog = null
    if (qPos.id) {
      const bob = !still.matches && !flight && Math.floor(now / T.bob) % 2 ? D(1) : 0
      const foot = qPos.y - qPos.F / 2 + D(qSink(qPos.F / d, cq)) - bob - D(val('qhop', 0))
      drawQ(ctx, qPos.x, foot, Math.max(1, Math.round(cq * d)), INK, false, qKey(cq))
      qLog = { x: qPos.x / d, foot: foot / d, c: cq }
    }
    const ghost = ghostAt(wayReg, hov)
    ghostLog = null
    if (ghost && ghost !== home) {
      const n = node(ghost)
      const [x, y] = S_(n.x, n.y)
      const Fd = Math.round((F(n) * d) / 2) * 2
      if (fades.get(ghost)) {
        drawQ(ctx, x, y - Fd / 2 + D(qSink(Fd / d, cq)), Math.max(1, Math.round(cq * d)), TONES[n.hue]!.ink, true, qKey(cq))
        ghostLog = { id: ghost, x: x / d, y: y / d }
      }
    }

    // L6: effects
    // the shockwave: a 2-px octagon out to 3.2 × the plate (and a second, 1-px, behind it)
    for (const w of waves) {
      const p = (now - w.t0) / 480
      if (p >= 1) continue
      const Fw = Math.round((w.F * (1 + (w.to - 1) * out(p))) / 2) * 2
      fxMax.wave = Math.max(fxMax.wave, Fw / w.F)
      octStroke(ctx, w.x, w.y, Fw, W(2), rgba(w.col, 1 - p * p))
      const p2 = Math.max(0, p - 0.18)
      if (p2 > 0) octStroke(ctx, w.x, w.y, Math.round((w.F * (1 + (w.to - 1) * 0.7 * out(p2))) / 2) * 2, W(1), rgba(w.col, 0.6 * (1 - p2)))
    }
    waves = waves.filter((w) => now - w.t0 < 480)
    for (const pt of parts) {
      if (now - pt.t0 < 20) {
        fxMax.part = Math.min(fxMax.part, pt.sz / dpr)
        fxMax.parts++
      }
      const tt = (now - pt.t0) / 1000
      const fx = (1 - Math.exp(-3.2 * tt)) / 3.2
      const x = pt.x + pt.vx * fx
      const y = pt.y + pt.vy * fx + 140 * d * tt * tt
      fxMax.reach = Math.max(fxMax.reach, Math.hypot(x - pt.x, y - pt.y) / dpr)
      const p = (now - pt.t0) / pt.life
      const sz = pt.sz * (p > 0.7 ? 0.5 : 1)
      ctx.fillStyle = rgba(pt.col, p > 0.85 ? 0.5 : 1)
      ctx.fillRect(Math.round(x - sz / 2), Math.round(y - sz / 2), Math.round(sz), Math.round(sz))
    }
    parts = parts.filter((pt) => now - pt.t0 < pt.life)
    if (flash > 0) {
      const p = (now - flash) / 80
      if (p >= 1) flash = 0
      else {
        ctx.fillStyle = rgba(INK, 0.08 * (1 - p))
        ctx.fillRect(0, 0, cv.width, cv.height)
      }
    }
    for (let i = sweeps.length - 1; i >= 0; i--) if (now - sweeps[i]!.t0 > 600) sweeps.splice(i, 1)
    if (charge && now - charge.t0 > 170) charge = null
    if (lap) {
      const p = (now - lap.t0) / 1200
      if (p >= 1) lap = null
      else
        for (const l of LY.links) {
          if (!linkOpen(l)) continue
          const pp = 1 - p * 1.4 + depthOf(l.b) * 0.06 - 0.4
          if (pp > 0 && pp < 0.2) for (const pc of runsAt(l, LY, v)) strokePts(pc.pts, core, INK)
        }
    }
    // the card's leader: 1 px in its region's wire, from the plate's edge to the card's
    if (cardBox && !flight) {
      const n = node(cardBox.id)
      const [px, py] = scr(n.x, n.y)
      const r = reach(n, v) + 2
      const b = cardBox.box.map((x) => x / qf) as Box
      ctx.fillStyle = TONES[n.hue]!.wire
      const w1 = W(1)
      if (b[0] >= px + r) ctx.fillRect(D(px + r), D(py) - (w1 >> 1), D(b[0]) - D(px + r), w1)
      else if (b[2] <= px - r) ctx.fillRect(D(b[2]), D(py) - (w1 >> 1), D(px - r) - D(b[2]), w1)
      else if (b[1] >= py + r) ctx.fillRect(D(px) - (w1 >> 1), D(py + r), w1, D(b[1]) - D(py + r))
      else if (b[3] <= py - r) ctx.fillRect(D(px) - (w1 >> 1), D(b[3]), w1, D(py - r) - D(b[3]))
    }
    ctx.globalAlpha = 1
  }
  // the HUD's frame: four 1-px corner brackets, 8 in from the pane's corners
  function drawFrame() {
    const top = focus && zt ? ZBAR : 0
    const bottom = ph - footOf()
    const fy0 = D(top + 8)
    const fy1 = D(bottom - 8)
    const fx0 = D(8)
    const fx1 = D(pw - 8)
    const arm = D(12)
    const w1 = W(1)
    ctx.fillStyle = LINE_STRONG
    for (const [x, y, sx, sy] of [[fx0, fy0, 1, 1], [fx1, fy0, -1, 1], [fx0, fy1, 1, -1], [fx1, fy1, -1, -1]] as [number, number, number, number][]) {
      ctx.fillRect(sx > 0 ? x : x - arm, sy > 0 ? y : y - w1, arm, w1)
      ctx.fillRect(sx > 0 ? x : x - w1, sy > 0 ? y : y - arm, w1, arm)
    }
  }
  function chip(x: number, y: number, sz: number, cut: number, frameCol: string, fill: string) {
      const half = sz >> 1
      const path = (i: number, c: number) => {
        ctx.beginPath()
        ctx.moveTo(x - half + i + c, y - half + i)
        ctx.lineTo(x + half - i, y - half + i)
        ctx.lineTo(x + half - i, y + half - i - c)
        ctx.lineTo(x + half - i - c, y + half - i)
        ctx.lineTo(x - half + i, y + half - i)
        ctx.lineTo(x - half + i, y - half + i + c)
        ctx.closePath()
      }
      path(0, cut)
      ctx.fillStyle = frameCol
      ctx.fill()
      const i1 = W(1)
      path(i1, Math.max(0, cut - Math.round(i1 * 0.41)))
      ctx.fillStyle = fill
      ctx.fill()
    }
    function bezelOf(xx: number, y: number, Fd: number, st: Etat, t: Tone) {
      // the goal's bezel: a 1-px ring 6 off the plate, 16 ticks; diagonal ticks are whole-dp stairs
      const Fb = Fd + 2 * D(BEZEL)
      ring(ctx, xx, y, Fb, Fb - 2 * W(1), st === 'lu' ? t.ink : t.rim)
      const tl = D(4)
      ctx.fillStyle = st === 'lu' || st === 'dispo' || st === 'prog' ? t.ink : t.rim
      const hb = Fb / 2
      const k = Math.round(hb * (2 - Math.SQRT2))
      const half = hb - k / 2
      for (const [sx, sy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as Pt[])
        for (const off of [-1, 1]) {
          const along = Math.round((hb - k) * 0.5) * off
          if (sx) ctx.fillRect(xx + sx * hb - (sx > 0 ? 0 : tl), y + along - W(1), tl, W(2))
          else ctx.fillRect(xx + along - W(1), y + sy * hb - (sy > 0 ? 0 : tl), W(2), tl)
        }
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as Pt[])
        for (const off of [-1, 1]) {
          const cx = xx + sx * half + (off * sy * k) / 4
          const cy = y + sy * half - (off * sx * k) / 4
          const q = W(2)
          for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(cx + sx * i * W(1) - q / 2 + (sx > 0 ? 0 : -1)), Math.round(cy + sy * i * W(1) - q / 2 + (sy > 0 ? 0 : -1)), q, q)
        }
  }
  // A label fades to nothing over the last 24 px of the pane (under the sector bar zoomed, over the
  // sheet's peek), never clipped mid-glyph.
  const fadeOf = (bx: Box, top: number, bottom: number) => Math.max(0, Math.min(1, Math.min(bx[0], pw - bx[2], bx[1] - top, bottom - bx[3]) / 24))
  // What a label stands on, for its keyline: the tint of the land under its centre (drawn), else
  // the ground.
  const keyAt = (px: number, py: number) => {
    const x = (px - cam.tx) / cam.s
    const y = (py - cam.ty) / cam.s
    for (const [id, land] of LY.lands) if (inRings(land.rings, x, y)) return Math.round(2 * val('rh:' + id, 0)) ? TONES[land.hue]!.tintHi : TONES[land.hue]!.tint
    return GROUND
  }
  function landPath(rings: Pt[][], ox: number, oy: number, w = W(1)) {
    const d = dpr
    const odd = w % 2 ? 0.5 : 0
    ctx.beginPath()
    for (const r of rings)
      r.forEach(([x, y], i) => {
        const X = Math.round((cam.tx + ox + x * cam.s) * d) + odd
        const Y = Math.round((cam.ty + oy + y * cam.s) * d) + odd
        if (i) ctx.lineTo(X, Y)
        else ctx.moveTo(X, Y)
      })
    ctx.closePath()
  }
  function brackets(x0: number, y0: number, x1: number, y1: number) {
    const arm = D(6)
    const w2 = W(2)
    ctx.fillStyle = INK
    ctx.fillRect(x0, y0, arm, w2)
    ctx.fillRect(x0, y0, w2, arm)
    ctx.fillRect(x1 - arm, y0, arm, w2)
    ctx.fillRect(x1 - w2, y0, w2, arm)
    ctx.fillRect(x0, y1 - w2, arm, w2)
    ctx.fillRect(x0, y1 - arm, w2, arm)
    ctx.fillRect(x1 - arm, y1 - w2, arm, w2)
    ctx.fillRect(x1 - w2, y1 - arm, w2, arm)
  }
  const depthOf = (id: string): number => {
    const l = L[id]!
    return l.prerequis.length ? 1 + Math.max(...l.prerequis.filter(onMap).map(depthOf), 0) : 0
  }
  function ghostAt(reg: string | null, h: Tg | null): string | null {
    if (h && h.k === 'relay') return h.far!
    if (!reg || !focus || reg === focus) return null
    return pickIn(reg)
  }

  // ---------------------------------------------------------------- input
  function hit(px: number, py: number): Tg | null {
    if (focus && zt && py < ZBAR) return null
    const f = cam.s / view().s
    return inMap(() => hitAt(px / f, py / f))
  }
  function hitAt(px: number, py: number): Tg | null {
    let best: Tg | null = null
    let bd = Infinity
    for (const n of LY.nodes.values()) {
      const [x, y] = scr(n.x, n.y)
      const r = Math.max(12, F(n) / 2 + 2)
      const dd = Math.hypot(px - x, py - y)
      if (dd <= r && dd < bd) {
        bd = dd
        best = { k: 'node', id: n.id }
      }
    }
    if (best) return best
    const c = chipOf(view()) / 2 + 2
    for (const l of LY.links)
      for (const p of l.ports) {
        const pa = portAt(LY, l, p.end, view())
        const [x, y] = scr(pa[0], pa[1])
        if (Math.abs(px - x) <= c && Math.abs(py - y) <= c) return { k: 'relay', id: l.id, far: p.far, link: l.id }
      }
    const lx = (px - cam.tx) / cam.s
    const ly = (py - cam.ty) / cam.s
    for (const [id, land] of LY.lands) if (inRings(land.rings, lx, ly)) return { k: 'region', id }
    return null
  }
  const same = (a: Tg | null, b: Tg | null) => !!a && !!b && a.k === b.k && a.id === b.id && a.link === b.link
  function point(t: Tg | null) {
    if (same(t, hov) || (!t && !hov)) return
    const old = hov
    hov = t
    if (old && old.k === 'node') tw('lift:' + old.id, 0, T.hover)
    if (t && t.k === 'node') tw('lift:' + t.id, 2, T.hover)
    const was = old && old.k === 'region' ? old.id : null
    const now_ = t && t.k === 'region' ? t.id : t && t.k === 'node' ? node(t.id).reg : null
    if (now_ !== was) {
      if (was) tw('rh:' + was, 0, T.hover)
      if (now_) {
        tw('rh:' + now_, 1, T.hover)
      }
    }
    cv.style.cursor = t ? 'pointer' : 'grab'
    showTip(t)
    lightRow(t && t.k === 'node' ? t.id : null)
    syncBar()
    kick()
  }
  let last: Pt | null = null
  // THE CAMERA IN HAND: one pointer drags the map, two scale it about the point between them, the
  // wheel (or a trackpad's pinch) about the pointer. Past 6 px a press is a drag, never a tap.
  const touches = new Map<number, Pt>()
  let hand: { a: Cam; p0: Pt; d0: number; moved: boolean } | null = null
  const clampS = (v: number) => Math.max(minS(), Math.min(maxS(), v))
  const at_ = (e: PointerEvent): Pt => {
    const r = cv.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  // the camera at scale `sc`, the map point under `from` (at camera `a`) moved under `to`
  const about = (a: Cam, sc: number, from: Pt, to: Pt): Cam => {
    const wx = (from[0] - a.tx) / a.s
    const wy = (from[1] - a.ty) / a.s
    return clampCam({ s: sc, tx: to[0] - wx * sc, ty: to[1] - wy * sc })
  }
  const mid = (): [Pt, number] => {
    const [p, q] = [...touches.values()] as [Pt, Pt]
    return [[(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], Math.hypot(p[0] - q[0], p[1] - q[1])]
  }
  function grabMap() {
    flight = null
    if (touches.size >= 2) {
      const [m, d0] = mid()
      hand = { a: { ...cam }, p0: m, d0, moved: true }
    } else {
      const p = [...touches.values()][0]!
      hand = { a: { ...cam }, p0: p, d0: 0, moved: hand?.moved ?? false }
    }
  }
  // A camera moved by hand: zoomed back out to the world, the region in focus is let go.
  function moved() {
    if (focus && cam.s <= minS() * 1.02) {
      focus = null
      zt = false
      sel = null
      showBrief(rec ?? WORLD.order[0]!)
      if (location.hash) history.replaceState({}, '', location.pathname + location.search)
      buildAnchors()
      syncHud()
      syncBar()
    }
    placeLinks()
    drawMini()
    kick()
  }
  function unpress() {
    if (down && down.k === 'node') tw('drop:' + down.id, 0, T.pressUp, back)
    if (down && down.k === 'region') R.get(down.id)!.levels.filter(onMap).forEach((id) => tw('drop:' + id, 0, T.pressUp, back))
    down = null
  }
  cv.addEventListener('pointermove', (e) => {
    if (touches.has(e.pointerId)) {
      touches.set(e.pointerId, at_(e))
      if (hand) {
        if (touches.size >= 2) {
          const [m, d] = mid()
          cam = about(hand.a, clampS((hand.a.s * d) / Math.max(1, hand.d0)), hand.p0, m)
        } else {
          const p = touches.get(e.pointerId)!
          const dx = p[0] - hand.p0[0]
          const dy = p[1] - hand.p0[1]
          if (!hand.moved && Math.hypot(dx, dy) > 6) {
            hand.moved = true
            cv.setPointerCapture(e.pointerId)
            cv.style.cursor = 'grabbing'
            unpress()
            point(null)
          }
          if (hand.moved) cam = clampCam({ s: hand.a.s, tx: hand.a.tx + dx, ty: hand.a.ty + dy })
        }
        if (hand.moved) {
          placeLinks()
          kick()
          return
        }
      }
    }
    if (e.pointerType === 'touch') return
    last = at_(e)
    point(flight ? null : hit(last[0], last[1]))
  })
  cv.addEventListener('pointerleave', () => {
    last = null
    point(null)
  })
  cv.addEventListener('pointerdown', (e) => {
    const p = at_(e)
    touches.set(e.pointerId, p)
    grabMap()
    if (touches.size >= 2) {
      unpress()
      point(null)
      return kick()
    }
    const t = hit(p[0], p[1])
    down = t
    // a press: one frame of ink on the plate, then it drops 3 px; a region's levels drop 2
    if (t && t.k === 'node') pressNode(t.id, 3)
    if (t && t.k === 'region') R.get(t.id)!.levels.filter(onMap).forEach((id) => pressNode(id, 2))
    kick()
  })
  const release = (e: PointerEvent) => {
    if (!touches.delete(e.pointerId)) return false
    const was = hand
    if (touches.size) {
      // a pinch ends with one finger left: it drags on from here, and the release is no tap
      grabMap()
      hand!.moved = true
      return true
    }
    hand = null
    if (was?.moved) {
      cv.style.cursor = 'grab'
      cam = settled(cam)
      moved()
      return true
    }
    return false
  }
  cv.addEventListener('pointercancel', (e) => {
    release(e)
    unpress()
  })
  addEventListener('pointerup', (e) => {
    if (release(e)) return kick()
    const r = cv.getBoundingClientRect()
    const t = e.target === cv ? hit(e.clientX - r.left, e.clientY - r.top) : null
    const d0 = down
    down = null
    if (d0 && d0.k === 'node') tw('drop:' + d0.id, 0, T.pressUp, back)
    if (d0 && d0.k === 'region') R.get(d0.id)!.levels.filter(onMap).forEach((id) => tw('drop:' + id, 0, T.pressUp, back))
    if (e.target !== cv) return
    if (same(t, d0) && t) act(t)
    else if (!t && !d0 && focus) toWorld()
    else if (!t && !d0 && (sel || regSel)) {
      sel = null
      regSel = null
      showBrief(rec ?? WORLD.order[0]!)
      kick()
    }
    kick()
  })
  function pressNode(id: string, by: number) {
    tw('pf:' + id, 0, 17, linear, 1)
    tw('drop:' + id, by, T.pressDown, out, 0, 17)
  }
  let wheelEnd = 0
  cv.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      flight = null
      const p = at_(e as unknown as PointerEvent)
      // a trackpad's pinch comes as a wheel with ctrl held, in small steps; a line is 16 px
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1)
      cam = about(cam, clampS(cam.s * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015))), p, p)
      placeLinks()
      kick()
      clearTimeout(wheelEnd)
      wheelEnd = window.setTimeout(() => {
        cam = settled(cam)
        moved()
        if (last) point(hit(last[0], last[1]))
      }, 120)
    },
    { passive: false },
  )
  // A LEVEL PRESSED, on its plate or on a port's chip that shows it, is chosen (its reticle, its
  // briefing or sheet); pressed again, it opens. A REGION PRESSED, its land, is chosen the same way
  // (its rim in the ink, its summary in the briefing or sheet). A press never moves the camera.
  function act(t: Tg) {
    if (t.k === 'region') {
      chooseRegion(t.id)
      return
    }
    regSel = null
    const id = t.k === 'node' ? t.id : t.far!
    const via = t.k === 'relay' ? `${t.link}|${LY.links.find((x) => x.id === t.link)!.ports.find((p) => p.far === id)!.end}` : null
    if (sel === id && selVia === via) return open(id)
    choose(id)
    selVia = via
    kick()
  }
  // the port's chip a level was chosen by (its reticle is drawn there as well as on the plate)
  let selVia: string | null = null
  // the region chosen (its land pressed): its rim in the ink, its summary shown
  let regSel: string | null = null
  function chooseRegion(reg: string) {
    sel = null
    selVia = null
    regSel = reg
    briefReg = null
    showRegion(reg)
    kick()
  }
  function choose(id: string) {
    if (sel === id) return
    selVia = null
    sel = id
    tw('ret:' + id, 0, T.focusIn, back, 1)
    showBrief(id)
    kick()
  }
  // Open a level: one not written shakes no; else the q walks there (at most 3 hops along the
  // chain), the plate pulses, the map steps back, and the page opens.
  function open(id: string) {
    if (L[id]!.prevu) {
      tw('nope:' + id, 1, 360, linear, 0)
      announce('Pas encore écrit.')
      // every tap gets a response: the off key shakes 2 px
      for (const k of document.querySelectorAll<HTMLElement>('#peek .badge, #brief .br-foot .badge')) {
        k.classList.remove('shake')
        void k.offsetWidth
        k.classList.add('shake')
      }
      kick()
      return
    }
    const path = onMap(id) && onMap(home) ? route(home, id) : null
    const hops = path && path.length - 1 <= 3 ? path.slice(1) : onMap(id) ? [id] : []
    let t = 0
    for (const h of hops) {
      at(t, () => {
        home = h
        tw('qhop', 6, 90, out, 0)
        tw('qhop', 0, 90, linear, 6, 90)
      })
      t += 180
    }
    at(t, () => {
      if (onMap(id)) {
        tw('pop:' + id, 1.08, 90, out, 1)
        tw('pop:' + id, 1, 90, out, 1.08, 90)
      }
      document.body.classList.add('leaving')
    })
    const ici = store.get<Ici | null>('ici', null)
    at(t + 180, () => (location.href = `${url(`${id}/`)}${ici && ici.c === id && ici.s && !S.lus.has(id) ? '#' + ici.s : ''}`))
    kick()
  }
  function route(a: string, b: string): string[] | null {
    const prev = new Map<string, string>([[a, '']])
    const qu = [a]
    while (qu.length) {
      const x = qu.shift()!
      if (x === b) break
      for (const l of LY.links) {
        if (l.relay) continue
        const y = l.a === x ? l.b : l.b === x ? l.a : null
        if (y && !prev.has(y)) {
          prev.set(y, x)
          qu.push(y)
        }
      }
    }
    if (!prev.has(b)) return null
    const res: string[] = []
    for (let x: string = b; x; x = prev.get(x)!) res.unshift(x)
    return res
  }
  addEventListener('keydown', (e) => {
    if ((e.target as Element).closest?.('input, .home.open')) return
    if (reward && !rewardDone) {
      finishReward()
      e.preventDefault()
      return
    }
    if (e.key === 'Escape' && focus) {
      toWorld()
      e.preventDefault()
    }
    const kAnchor = (document.activeElement as HTMLElement | null)?.closest?.<HTMLElement>('#links a[data-k="node"]')
    if (kAnchor && e.key.startsWith('Arrow')) {
      const n = node(kAnchor.dataset.id!)
      const dv: Pt = e.key === 'ArrowLeft' ? [-1, 0] : e.key === 'ArrowRight' ? [1, 0] : e.key === 'ArrowUp' ? [0, -1] : [0, 1]
      let best: string | null = null
      let bs = 0.3
      for (const l of LY.links) {
        const o = l.a === n.id ? l.b : l.b === n.id ? l.a : null
        if (!o) continue
        const m = node(o)
        const dx = m.x - n.x
        const dy = m.y - n.y
        const sc = (dx * dv[0] + dy * dv[1]) / Math.hypot(dx, dy)
        if (sc > bs) {
          bs = sc
          best = o
        }
      }
      if (best) {
        e.preventDefault()
        if (node(best).reg !== focus) zoomTo(node(best).reg, best)
        anchorOf('node', best)?.focus({ preventScroll: true })
      }
    } else if (focus && e.key.startsWith('Arrow') && !(e.target as Element).closest?.('.links a, .brief, .track, .head')) {
      // with the focus nowhere on the map, an arrow key lands on the level chosen
      const id = sel ?? pickIn(focus)
      e.preventDefault()
      anchorOf('node', id)?.focus({ preventScroll: true })
    }
  })

  // ---------------------------------------------------------------- the link layer
  // One <a> per region and level, transparent over its drawn box: Tab reaches the regions, then
  // every level in course order; a level reached is chosen, and Enter opens it.
  function buildAnchors() {
    linksEl.textContent = ''
    const add = (t: Tg, href: string, label: string) => {
      const a = document.createElement('a')
      a.href = href
      a.setAttribute('aria-label', label)
      a.dataset.k = t.k
      a.dataset.id = t.id
      if (t.link) a.dataset.link = t.link
      a.addEventListener('focus', () => {
        // a focus moved by a pointer's action (the camera's) chooses but shows no ring
        const vis = a.matches(':focus-visible')
        if (vis) kf = t
        if (t.k === 'node' && vis) {
          regSel = null
          choose(t.id)
        }
        if (!vis) return kick()
        if (t.k === 'node') tw('ret:' + t.id, 0, T.focusIn, back, 1)
        if (t.k === 'region' && !focus) {
          tw('rh:' + t.id, 1, T.hover)
          tw('ret:' + t.id, 0, T.focusIn, back, 1)
          showRegion(t.id)
        }
        showTip(t.k === 'region' ? null : t)
        kick()
      })
      a.addEventListener('blur', () => {
        if (same(kf, t)) kf = null
        if (t.k === 'region' && !(hov && hov.k === 'region' && hov.id === t.id)) tw('rh:' + t.id, 0, T.hover)
        if (t.k === 'region' && !focus) setTimeout(() => !kf && !focus && showBrief(rec ?? WORLD.order[0]!), 0)
        showTip(hov)
        kick()
      })
      a.addEventListener('click', (e) => {
        e.preventDefault()
        act(t)
      })
      linksEl.append(a)
    }
    for (const r of mapRegions) add({ k: 'region', id: r.id }, `#vue-${r.id}`, r.nom)
    for (const id of WORLD.order.filter(onMap)) add({ k: 'node', id }, url(`${id}/`), `${L[id]!.label} ${L[id]!.titre}${stateWord(id) ? ', ' + stateWord(id) : ''}`)
    placeLinks()
  }
  const anchorOf = (k: string, id: string) => linksEl.querySelector<HTMLAnchorElement>(`a[data-k="${k}"][data-id="${id}"]`)
  function placeLinks() {
    // sizes are the detail's, scaled by the camera's scale over it
    const f = cam.s / view().s
    for (const a of linksEl.children as unknown as HTMLAnchorElement[]) {
      const k = a.dataset.k!
      const id = a.dataset.id!
      let box: Box = [0, 0, 0, 0]
      if (k === 'node') {
        const n = node(id)
        const [x, y] = scr(n.x, n.y)
        const h = Math.max(12, (F(n) / 2) * f)
        box = [x - h, y - h, x + h, y + h]
      } else {
        const ps = R.get(id)!.levels.filter(onMap).map((x) => scr(node(x).x, node(x).y))
        box = [Math.min(...ps.map((p) => p[0])) - 16, Math.min(...ps.map((p) => p[1])) - 16, Math.max(...ps.map((p) => p[0])) + 16, Math.max(...ps.map((p) => p[1])) + 16]
      }
      a.style.transform = `translate(${Math.round(box[0])}px,${Math.round(box[1])}px)`
      a.style.width = `${Math.round(box[2] - box[0])}px`
      a.style.height = `${Math.round(box[3] - box[1])}px`
    }
  }
  const announce = (s: string) => {
    live.textContent = ''
    live.textContent = s
  }

  // ---------------------------------------------------------------- the HUD
  const stateWord = (id: string) => {
    const e = etat(id)
    if (nouveaux.has(id) && (e === 'dispo' || e === 'front')) return 'Nouveau'
    if (e === 'prog') return `${reached(id).length}/${L[id]!.sections.length}`
    if (e === 'lu') return 'compris'
    if (e === 'front' || e === 'fog') return 'Pas encore écrit.'
    return ''
  }
  const mn = (id: string, px = 32) => miniNode(DATA.icons[id] ?? null, L[id]!.hue, etat(id), px, share(id))
  const pips = (n: number | null) => `<span class="pips" role="img" aria-label="Difficulté ${n ?? 0}/5">${[1, 2, 3, 4, 5].map((i) => `<i${i <= (n ?? 0) ? ' class="on"' : ''}></i>`).join('')}</span>`
  // a row: its mini node, number, name and state word; EACH STATE WORD ONCE A VIEW: a row drops its
  // word where it is the level's own (`own`, shown once in the briefing)
  // « Pas encore écrit. » stands once a view: the first row that would say it keeps it (`said` is
  // reset by each render of the briefing); the mini node shows every row's state
  let said = false
  const row = (id: string, long = false, own: string | null = null) => {
    const l = L[id]!
    let w = stateWord(id) === own ? '' : stateWord(id)
    if (w === 'Pas encore écrit.') {
      if (said) w = ''
      said = true
    }
    return `<li class="row h${l.hue}${long ? ' long' : ''}" data-lv="${id}"><a href="${url(`${id}/`)}" data-row="${id}">${mn(id)}<span class="row-n num">${l.label}</span><span class="row-t">${esc(l.nom)}</span><span class="row-s${w === 'Nouveau' ? ' new' : ''}">${w}</span>${long ? `<span class="row-r">${l.resume}</span>` : ''}</a></li>`
  }
  // A KEY EXISTS ONLY WHEN IT ACTS: a level not written shows a state badge in its plate's language
  // (its mini octagon and the state word), never a key off.
  const badge = (id: string) => `<span class="badge h${L[id]!.hue} e-${etat(id)}" role="status">${pipSvg}<span>${stateWord(id) || 'Pas encore écrit.'}</span></span>`
  // the verb of the key that opens a level: the course's own (« Commencer ici », « Continuer ») where
  // the level is the next to read, else « Ouvrir la page »
  const verbOf = (id: string) => {
    const nx = next()
    return nx && nx.id === id ? nx.label : 'Ouvrir la page'
  }
  // the level shown last in the briefing, and the state each was shown in (a clear flips its plate)
  const shownAs = new Map<string, Etat>()
  let briefId: string | null = null
  // ONE RENDER PATH FROM THE SAVE: every call draws the briefing from the state as it is (`force`
  // redraws it in place even when its level is unchanged, without a crossfade).
  function showBrief(id: string, force = false) {
    if (!force && briefId === id && brief.dataset.v === stateKey() && !briefReg) return
    const was = briefId
    briefId = id
    const l = L[id]!
    const r = R.get(l.region)!
    const notions = WORLD.order.filter((i) => L[i]!.chap === id)
    const btn = l.prevu ? null : verbOf(id)
    // the level's own state word stands once: in the foot's badge for a level not written, else
    // beside its number
    const own = stateWord(id)
    said = own === 'Pas encore écrit.'
    const flip = shownAs.get(id) !== undefined && shownAs.get(id) !== 'lu' && etat(id) === 'lu'
    shownAs.set(id, etat(id))
    const html =
      `<div class="br-in h${r.hue}">` +
      `<div class="br-tab"><span class="eyebrow">${esc(r.nom)}</span><span class="num">${counter(r.id)}</span></div>` +
      `<div class="br-id${flip ? ' flip' : ''}">${mn(id, 48)}<span class="num-l">${l.label}</span><span class="br-st e-${etat(id)}">${etat(id) === 'prog' || !btn ? '' : own}</span></div>` +
      `<h2 class="br-t">${esc(l.titre)}</h2>` +
      `<p class="br-r">${l.resume}</p>` +
      `<div class="br-stats">${l.complexite ? `<span class="stt"><span class="eyebrow">Difficulté</span>${pips(l.complexite)}</span>` : ''}${l.minutes ? `<span class="stt num">${l.minutes} min</span>` : ''}${l.sections.length ? `<span class="stt">${glyphSvg('flag', 2)}<span class="num">${reached(id).length ? reached(id).length + '/' : ''}${l.sections.length}</span></span>` : ''}</div>` +
      (l.prerequis.length ? `<div class="br-l"><div class="rule"><span class="eyebrow">Avant ça</span></div><ul>${l.prerequis.map((x) => row(x, false, own)).join('')}</ul></div>` : '') +
      (notions.length ? `<div class="br-l"><div class="rule"><span class="eyebrow">Les notions de ce chapitre</span></div><ul>${notions.map((x) => row(x, false, own)).join('')}</ul></div>` : '') +
      (l.suite.length ? `<div class="br-l"><div class="rule"><span class="eyebrow">Ce que ça débloque</span></div><ul>${l.suite.map((x) => row(x, false, own)).join('')}</ul></div>` : '') +
      `</div>` +
      // the foot: the key where it acts, else the level's state badge (its slot kept)
      `<div class="br-foot">${btn ? `<a class="btn primary h${r.hue}" href="${url(`${id}/`)}" id="br-go"><span>${btn}</span>${glyphSvg('next', 2)}</a>` : badge(id)}</div>`
    briefReg = null
    swapBrief(html, was !== id && !!was, () => {
      peek(id, btn)
      $('#br-go', brief)?.addEventListener('click', (e) => {
        e.preventDefault()
        open(id)
      })
      syncHud()
    })
  }
  // A content swap is a crossfade of 120 ms at most, the old content fading over the new, never an
  // empty frame; a swap within 150 ms of the last lands at once (fast keyboard travel).
  let swapAt = -1e9
  function swapBrief(html: string, out_: boolean, then: () => void) {
    const fast = performance.now() - swapAt < 150
    swapAt = performance.now()
    for (const g of brief.querySelectorAll('.bc-ghost')) g.remove()
    if (out_ && !still.matches && !fast && bc.firstElementChild) {
      const ghost = bc.cloneNode(true) as HTMLElement
      ghost.removeAttribute('id')
      ghost.removeAttribute('aria-live')
      ghost.className = 'bc bc-ghost'
      ghost.setAttribute('aria-hidden', 'true')
      ghost.style.top = `${bc.offsetTop}px`
      brief.append(ghost)
      setTimeout(() => ghost.remove(), 130)
    }
    bc.innerHTML = html
    brief.dataset.v = stateKey()
    brief.classList.toggle('xf', out_ && !still.matches && !fast)
    void brief.offsetWidth
    brief.classList.add('in')
    // the list scrolls under a 24-px fade while rows are left below; never a row cut by the foot
    const sc = $('.br-in', brief)
    if (sc) {
      const more = () => sc.classList.toggle('more', sc.scrollTop + sc.clientHeight < sc.scrollHeight - 2)
      sc.addEventListener('scroll', more, { passive: true })
      more()
    }
    then()
  }
  // A REGION focused on the world: its tab, its name, and its roster (each level a row).
  let briefReg: string | null = null
  function showRegion(reg: string) {
    if (briefReg === reg) return
    briefReg = reg
    const r = R.get(reg)!
    const ids = WORLD.order.filter((id) => onMap(id) && node(id).reg === reg)
    const mins = ids.reduce((t, id) => t + (L[id]!.minutes ?? 0), 0)
    said = false
    const html =
      `<div class="br-in h${r.hue}">` +
      `<div class="br-tab"><span class="eyebrow">${esc(r.nom)}</span><span class="num">${counter(r.id)}</span></div>` +
      `<h2 class="br-t">${esc(r.nom)}</h2>` +
      `<div class="br-stats"><span class="stt">${glyphSvg('check', 2)}<span class="num">${counter(r.id)}</span></span>${mins ? `<span class="stt num">${mins} min</span>` : ''}</div>` +
      `<div class="br-l roster"><ul>${ids.map((id) => row(id, true)).join('')}</ul></div>` +
      `</div>` +
      `<div class="br-foot"><a class="btn primary h${r.hue}" href="#vue-${reg}" id="br-go"><span>${esc(r.nom)}</span>${glyphSvg('next', 2)}</a></div>`
    swapBrief(html, true, () => {
      $('#br-go', brief)?.addEventListener('click', (e) => {
        e.preventDefault()
        zoomTo(reg)
      })
    })
    // the sheet's peek names the region (its counter over its name), as it names a level
    const pk = $('#peek')
    if (pk) {
      pk.className = `peek h${r.hue}`
      pk.innerHTML = `<span class="grip" aria-hidden="true"></span><span class="pk-x"><span class="num">${counter(r.id)}</span><b>${esc(r.nom)}</b></span>`
    }
  }
  const stateKey = () => [...S.lus].join() + [...held.keys()].join()
  // two-way hover: a row lights its node on the map; a node pointed lights its row
  bc.addEventListener('pointerover', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-row]')
    if (a && onMap(a.dataset.row!)) point({ k: 'node', id: a.dataset.row! })
  })
  bc.addEventListener('pointerout', (e) => {
    if ((e.target as HTMLElement).closest('[data-row]')) point(null)
  })
  bc.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-row]')
    if (!a) return
    e.preventDefault()
    const id = a.dataset.row!
    if (onMap(id)) zoomTo(node(id).reg, id)
    else showBrief(id)
  })
  function lightRow(id: string | null) {
    for (const r of brief.querySelectorAll<HTMLElement>('.row')) r.classList.toggle('lit', r.dataset.lv === id)
  }
  // THE TOOLTIP on a level pointed at (its plate, or a port's chip that shows it), and only there:
  // its card (region, number, name, difficulty) where one has a free place (lib/place.ts's rule),
  // else its compact tag beside it, clear of every label, else that tag beside it all the same.
  // Pointing never changes the briefing nor the sector bar: a level's summary comes with a press.
  // The card is measured in a hidden copy of the tip, so the tip on screen only ever shows what it
  // stands for: a tag fading out stays a tag, and a card never flashes in a tag's place.
  const probe = tip.cloneNode(false) as HTMLElement
  probe.removeAttribute('id')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.visibility = 'hidden'
  tip.after(probe)
  function showTip(t: Tg | null) {
    const id = t && t.k === 'node' ? t.id : t && t.k === 'relay' ? t.far! : null
    cardBox = null
    if (!id || axis === 'v' || flight) {
      tip.classList.remove('on')
      tip.dataset.box = ''
      return
    }
    const l = L[id]!
    const r = R.get(l.region)!
    // the thing pointed: the level's plate, or the chip of the port pointed (a small plate there)
    const port = t!.k === 'relay' ? portAt(LY, LY.links.find((x) => x.id === t!.link)!, LY.links.find((x) => x.id === t!.link)!.ports.find((p) => p.far === id)!.end, view()) : null
    const n: Node = port ? { ...node(id), x: port[0], y: port[1], size: 'S' } : node(id)
    const sc = scene(LY, view())
    const f = cam.s / view().s
    const pz = paneOf(!!focus && zt)
    const qz = { ...pz, w: pz.w / f, h: pz.h / f, top: pz.top / f, foot: pz.foot / f }
    const toScreen = (b: Box | null) => (b ? (b.map((x) => Math.round(x * f)) as Box) : null)
    const card = `<span class="tip-h"><span class="eyebrow">${esc(r.nom)}</span><span class="num">${l.label}</span></span><b>${esc(l.nom)}</b><span class="tip-s">${l.complexite ? pips(l.complexite) : ''}${l.minutes ? `<span class="num">${l.minutes} min</span>` : ''}<span class="tip-w">${id === briefId ? '' : stateWord(id)}</span></span>`
    probe.className = `tip h${l.hue}`
    probe.innerHTML = card
    const size: [number, number] = [Math.min(CARD.w, probe.offsetWidth || CARD.w), Math.min(CARD.h, probe.offsetHeight || CARD.h)]
    const show = (box: Box) => {
      tip.style.transform = `translate(${box[0]}px,${box[1]}px)`
      tip.dataset.box = box.join(',')
      void tip.offsetWidth
      tip.classList.add('on')
      kick()
    }
    const cb = toScreen(inMap(() => cardAt(n, cam, view(), qz, [size[0] / f, size[1] / f], clearOf(sc, labelsNow(), [], [], cam), cardSegs(sc, cam)).box))
    if (cb) {
      tip.className = `tip h${l.hue}`
      tip.style.width = ''
      tip.innerHTML = card
      cardBox = { id, box: cb }
      return show(cb)
    }
    // the compact tag: TAG.h tall, its width from the metrics (lib/place.ts)
    const nm = DATA.names[id] ?? l.nom
    const w = tagW(l.label, nm)
    tip.className = `tip tag h${l.hue}`
    tip.innerHTML = `<span class="num">${l.label}</span><b>${esc(nm)}</b>`
    tip.style.width = `${w}px`
    // beside the plate (or chip), clear of every label its own included: a tooltip never takes a
    // label's place, so no number ever goes while a level is pointed
    const box = toScreen(inMap(() => tagAt(n, cam, view(), qz, w / f, null, clearOf(sc, labelsNow(), [], [], cam))))
    if (box) return show(box)
    // no free place: beside the thing pointed all the same (right, left, over, under, then a step
    // further out), the first that keeps its own number in sight, in the pane
    const [cx, cy] = scr(n.x, n.y)
    const rr = (reach(n, view()) + 6) * f
    const lb = port ? null : labelsNow()?.at.get(id)
    const mine: Box | null = lb ? [cx + lb.box[0] * f, cy + lb.box[1] * f, cx + lb.box[2] * f, cy + lb.box[3] * f] : null
    const fits = (b: Box) => b[0] >= 8 && b[2] <= pw - 8 && b[1] >= 8 && b[3] <= ph - footOf() - 8
    const clearOfMine = (b: Box) => !mine || !(b[0] < mine[2] && mine[0] < b[2] && b[1] < mine[3] && mine[1] < b[3])
    const spots: Box[] = []
    for (const k of [0, 12, 24, 36])
      spots.push(
        [cx + rr + k, cy - 12, cx + rr + k + w, cy + 12],
        [cx - rr - k - w, cy - 12, cx - rr - k, cy + 12],
        [cx - w / 2, cy - rr - k - 24, cx + w / 2, cy - rr - k],
        [cx - w / 2, cy + rr + k, cx + w / 2, cy + rr + k + 24],
      )
    const pick = spots.find((b) => fits(b) && clearOfMine(b)) ?? spots.find(fits) ?? spots[0]!
    show(pick.map(Math.round) as Box)
  }
  let cardBox: { id: string; box: Box } | null = null
  // THE CAPTION LINE over the track: a chapter pointed at, or a level whose card has no free side.
  const cap = $('#cap')!
  function peek(id: string, btn: string | null) {
    const pk = $('#peek')
    if (!pk) return
    const l = L[id]!
    pk.className = `peek h${l.hue}`
    // the key's slot is fixed: the action, or the key off with the level's state
    pk.innerHTML = `<span class="grip" aria-hidden="true"></span>${mn(id, 40)}<span class="pk-x"><span class="num">${l.label}</span><b>${esc(l.nom)}</b></span>${btn ? `<a class="btn primary h${l.hue}" href="${url(`${id}/`)}"><span>${btn}</span>${glyphSvg('next', 2)}</a>` : badge(id)}`
    $('a.btn', pk)?.addEventListener('click', (e) => {
      e.preventDefault()
      open(id)
    })
  }
  // THE SECTOR BAR, a region in focus: « Carte », the region's tick, name, counter and segments (one
  // per level in its state).
  function syncBar() {
    // the HUD swaps with the size table, at half the flight
    document.body.classList.toggle('zoomed', !!focus && zt)
    if (!focus) return
    const r = R.get(focus)!
    zbar.className = `zbar h${r.hue}`
    $('#zb-n', zbar)!.textContent = r.nom
    $('#zb-c', zbar)!.textContent = counter(focus)
    $('#zb-s', zbar)!.innerHTML = WORLD.order
      .filter((id) => onMap(id) && node(id).reg === focus)
      .map((id) => `<i class="e-${etat(id)}${id === sel ? ' sel' : ''}" data-seg="${id}">${pipSvg}</i>`)
      .join('')
  }
  $('#carte-k', zbar)!.addEventListener('click', () => toWorld())
  // a level's state in a strip: a small octagon (the plate's family), never a square
  // ONE SEGMENT GLYPH for every state: the 12-px octagon (filled cleared, outlined open, its rim's
  // tone opened, dim in the fog); the level chosen is ringed by a 1-px ink octagon, 2 px off
  const pipSvg = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><polygon class="pr" points="5.5,0.5 10.5,0.5 15.5,5.5 15.5,10.5 10.5,15.5 5.5,15.5 0.5,10.5 0.5,5.5"/><polygon class="pf" points="6,2 10,2 14,6 14,10 10,14 6,14 2,10 2,6"/><polygon class="pp" points="6.6,3.5 9.4,3.5 12.5,6.6 12.5,9.4 9.4,12.5 6.6,12.5 3.5,9.4 3.5,6.6"/></svg>'
  // THE HEAD: levels cleared over every level on the map (the course's own total), with a bar of
  // one segment a level in course order, in its state; the primary key's slot is never empty.
  const mapIds = WORLD.order.filter(onMap)
  const flashOn = (el: Element | null) => {
    if (!el || still.matches) return
    el.classList.remove('flash')
    void (el as HTMLElement).offsetWidth
    el.classList.add('flash')
  }
  // during a clear, the head's tally waits for the token (it answers on its arrival)
  let tallyGo = true
  function syncHud() {
    const done = mapIds.filter((id) => S.lus.has(id) && !held.has(id) && (tallyGo || id !== reward?.id)).length
    roll($('#n-lus')!, `${done}/${mapIds.length}`)
    // the counter flashes as a clear lands (each stat once: the map is the level strip)
    if (Number($('#n-lus')!.dataset.n ?? done) < done) flashOn($('#n-lus')!.closest('.count'))
    $('#n-lus')!.dataset.n = String(done)
    const comp = (ch: string) => !held.has(ch) && complete(ch)
    roll($('#n-chap')!, `${chapters.filter(comp).length}/${chapters.length}`)
    // ONE PRIMARY a screen: where the briefing's foot opens the same page, the head's key steps back
    // to a secondary (an outline); a key with nothing to do is never shown with a verb: it hides,
    // keeping its slot
    const nx = next()
    const go = $<HTMLAnchorElement>('#go')!
    const own = briefId && !L[briefId]!.prevu ? briefId : null
    const target = nx ? nx.id : own
    go.hidden = false
    // ONE VERB PER DESTINATION A SCREEN: where the briefing's foot (or the sheet's key) opens the
    // same page, the head's key hides, its slot kept
    go.classList.toggle('off', !target || target === own)
    go.classList.remove('second')
    if (target) {
      go.removeAttribute('aria-disabled')
      go.href = nx ? `${url(`${nx.id}/`)}${nx.s ? '#' + nx.s : ''}` : url(`${own}/`)
      go.querySelector('span')!.textContent = nx ? nx.label : 'Ouvrir la page'
    } else {
      go.setAttribute('aria-disabled', 'true')
      go.removeAttribute('href')
    }
    const hide = go.classList.contains('off')
    if (hide) go.setAttribute('aria-hidden', 'true')
    else go.removeAttribute('aria-hidden')
    go.tabIndex = hide ? -1 : 0
    const qch = L[home]!.chap ?? home
    for (const li of document.querySelectorAll<HTMLElement>('.seg')) {
      const ch = li.dataset.ch!
      const ids = [ch, ...WORLD.order.filter((i) => L[i]!.chap === ch)]
      const n = ids.filter((i) => S.lus.has(i) && !held.has(i)).length
      const f = li.querySelector<HTMLElement>('.seg-f')!
      const was = Number(f.dataset.n ?? n)
      f.style.transform = `scaleX(${n / ids.length})`
      if (n > was) flashOn(li)
      f.dataset.n = String(n)
      li.classList.toggle('here', ch === qch)
      li.classList.toggle('done', n === ids.length)
    }
    syncBar()
  }
  function roll(el: HTMLElement, v: string) {
    if (el.textContent === v) return
    const old = el.textContent ?? ''
    el.textContent = ''
    ;[...v].forEach((ch, i) => {
      const s = document.createElement('span')
      s.textContent = ch
      if (old && old[i] !== ch && !still.matches) {
        s.className = 'roll'
        s.style.animationDelay = `${i * 50}ms`
      }
      el.append(s)
    })
  }
  $('#go')!.addEventListener('click', (e) => {
    const nx = next()
    if (!nx) {
      e.preventDefault()
      if (briefId && !L[briefId]!.prevu) open(briefId)
      return
    }
    e.preventDefault()
    // a key that opens a page skips the region's framing: the q's hop and the page's arrival
    open(nx.id)
  })
  // the track: a segment shows its chapter in the briefing; pointing raises its title
  for (const a of document.querySelectorAll<HTMLAnchorElement>('.seg a')) {
    const ch = a.closest<HTMLElement>('.seg')!.dataset.ch!
    a.addEventListener('click', (e) => {
      e.preventDefault()
      if (onMap(ch)) zoomTo(node(ch).reg, ch)
      else showBrief(ch)
      if (!desk()) setSheet(1)
    })
    a.addEventListener('pointerenter', () => {
      cap.dataset.k = 'ch'
      cap.textContent = L[ch]!.titre
      cap.classList.add('on')
    })
    a.addEventListener('pointerleave', () => cap.classList.remove('on'))
  }

  // ---------------------------------------------------------------- the minimap (the briefing's)
  let miniMap = { k: 1, ox: 0, oy: 0 }
  let miniHov: string | null = null
  function drawMini() {
    if (!mini || !desk()) return
    // the module grows in as a region is zoomed: its canvas follows its box
    const mr = mini.getBoundingClientRect()
    if (mr.height < 8) return
    const d = dpr
    if (mini.width !== Math.round(mr.width * d) || mini.height !== Math.round(mr.height * d)) {
      mini.width = Math.round(mr.width * d)
      mini.height = Math.round(mr.height * d)
    }
    const g = mini.getContext('2d')!
    const mw = mini.width / d
    const mh = mini.height / d
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.fillStyle = HUD
    g.fillRect(0, 0, mini.width, mini.height)
    const [x0, y0, x1, y1] = [LY.box[0] - 0.7, LY.box[1] - 0.7, LY.box[2] + 0.7, LY.box[3] + 0.7]
    const k = Math.min((mw - 16) / (x1 - x0), (mh - 16) / (y1 - y0))
    const ox = (mw - (x1 - x0) * k) / 2 - x0 * k
    const oy = (mh - (y1 - y0) * k) / 2 - y0 * k
    const M = (x: number, y: number): Pt => [Math.round((ox + x * k) * d), Math.round((oy + y * k) * d)]
    miniMap = { k, ox, oy }
    for (const [id, land] of LY.lands) {
      const t = TONES[land.hue]!
      g.beginPath()
      for (const r of land.rings) r.forEach(([x, y], i) => (i ? g.lineTo(...M(x, y)) : g.moveTo(...M(x, y))))
      g.closePath()
      g.fillStyle = id === focus ? mix(GROUND, t.ink, 0.5) : id === miniHov ? mix(GROUND, t.ink, 0.4) : mix(GROUND, t.ink, 0.2)
      g.fill('evenodd')
    }
    for (const n of LY.nodes.values()) {
      const [x, y] = M(n.x, n.y)
      const e = etat(n.id)
      const c = D(2)
      g.fillStyle = e === 'lu' || e === 'dispo' || e === 'prog' ? TONES[n.hue]!.ink : TONES[n.hue]!.dot
      g.fillRect(x - c / 2, y - c / 2, c, c)
    }
    const [qx, qy] = M(node(home).x, node(home).y)
    g.fillStyle = INK
    g.fillRect(qx - D(2), qy - D(2), D(4), D(4))
    const [a, b] = M(Math.max(x0, -cam.tx / cam.s), Math.max(y0, -cam.ty / cam.s))
    const [c2, d2] = M(Math.min(x1, (pw - cam.tx) / cam.s), Math.min(y1, (ph - cam.ty) / cam.s))
    g.strokeStyle = INK
    g.lineWidth = W(1)
    const o = W(1) % 2 ? 0.5 : 0
    g.strokeRect(a + o, b + o, c2 - a - 2 * o, d2 - b - 2 * o)
  }
  const miniHit = (e: PointerEvent | MouseEvent) => {
    const r = mini!.getBoundingClientRect()
    const x = (e.clientX - r.left - miniMap.ox) / miniMap.k
    const y = (e.clientY - r.top - miniMap.oy) / miniMap.k
    for (const [id, land] of LY.lands) if (inRings(land.rings, x, y)) return id
    return null
  }
  $('#mini')?.addEventListener('transitionend', () => drawMini())
  mini?.addEventListener('pointermove', (e) => {
    const h = miniHit(e)
    if (h !== miniHov) {
      miniHov = h
      drawMini()
      point(h ? { k: 'region', id: h } : null)
    }
  })
  mini?.addEventListener('pointerleave', () => {
    miniHov = null
    drawMini()
    point(null)
  })
  mini?.addEventListener('click', (e) => {
    const h = miniHit(e)
    if (h) zoomTo(h)
    else if (focus) toWorld()
  })

  // ---------------------------------------------------------------- the sheet (phone, tablet)
  // Three heights: its peek, half the screen, the whole column. A tap steps it; a drag follows the
  // finger and settles on the nearest height (or the next one, flicked).
  let sheetStep = 0
  let sheetH = 88
  const PEEK = 88
  const heights = () => [PEEK, Math.round(innerHeight * 0.5), Math.round(innerHeight - 56 - (axis === 'v' ? 40 : 40))]
  // THE CAMERA'S SAFE AREA IS THE PANE LESS THE SHEET'S CURRENT DETENT: every detent change flies the
  // view (the world, or the region in focus) to fit what is left, its sizes unchanged
  const setSheet = (k: number) => {
    sheetStep = k
    document.body.dataset.sheet = String(k)
    brief.style.height = ''
    setTimeout(() => {
      sheetH = overlap()
      const to = restCam()
      if (Math.abs(to.tx - cam.tx) > 0.5 || Math.abs(to.ty - cam.ty) > 0.5) {
        const n = node(sel ?? home)
        fly(to, focus, T.camTravel, [n.x, n.y])
      }
      kick()
    }, still.matches ? 0 : T.panelIn + 20)
  }
  let drag: { y0: number; h0: number; t0: number; moved: boolean } | null = null
  const grab = (e: PointerEvent) => {
    if (desk() || (e.target as HTMLElement).closest('a.btn')) return
    if (!(e.target as HTMLElement).closest('.peek')) return
    drag = { y0: e.clientY, h0: brief.getBoundingClientRect().height, t0: performance.now(), moved: false }
    brief.setPointerCapture(e.pointerId)
    brief.classList.add('drag')
  }
  brief.addEventListener('pointerdown', grab)
  brief.addEventListener('pointermove', (e) => {
    if (!drag) return
    const dy = drag.y0 - e.clientY
    if (Math.abs(dy) > 4) drag.moved = true
    if (drag.moved) brief.style.height = `${Math.max(PEEK, Math.min(heights()[2]!, drag.h0 + dy))}px`
  })
  const drop = (e: PointerEvent) => {
    if (!drag) return
    const d0 = drag
    drag = null
    brief.classList.remove('drag')
    if (!d0.moved) {
      if (!(e.target as HTMLElement).closest('a')) setSheet(sheetStep === 0 ? 1 : sheetStep === 1 ? 2 : 0)
      return
    }
    const h = brief.getBoundingClientRect().height
    const vel = (d0.y0 - e.clientY) / Math.max(1, performance.now() - d0.t0)
    const hs = heights()
    let k = hs.reduce((b, x, i) => (Math.abs(x - h) < Math.abs(hs[b]! - h) ? i : b), 0)
    if (Math.abs(vel) > 0.6 && k === sheetStep) k = Math.max(0, Math.min(2, sheetStep + (vel > 0 ? 1 : -1)))
    setSheet(k)
  }
  brief.addEventListener('pointerup', drop)
  brief.addEventListener('pointercancel', drop)
  $('#fold')?.addEventListener('click', () => {
    const o = document.body.classList.toggle('track-open')
    $('#fold')!.setAttribute('aria-expanded', String(o))
    setTimeout(sizePane, 0)
  })

  // ---------------------------------------------------------------- the reward
  // A clear holds what it changes (the cleared level, the levels it opens, its links) until the
  // beats below let each change show.
  let reward: { id: string; opened: string[]; links: string[] } | null = null
  let rewardDone = false
  function playReward(id: string) {
    const before = (() => {
      S.lus.delete(id)
      const m = new Map(WORLD.levels.map((l) => [l.id, etatOf(l.id)]))
      S.lus.add(id)
      return m
    })()
    const opened = WORLD.levels.filter((l) => onMap(l.id) && before.get(l.id) !== etatOf(l.id) && l.id !== id).map((l) => l.id)
    const links = LY.links.filter((l) => l.a === id).map((l) => l.id)
    reward = { id, opened, links }
    rewardDone = false
    tallyGo = still.matches
    held.set(id, before.get(id)!)
    for (const o of opened) held.set(o, before.get(o)!)
    for (const l of links) lit.set(l, 0)
    syncHud()
    if (still.matches) finishReward()
  }
  // 0 anticipation; 120 release, flood, flash, stamp; 300 the charge runs round the frame; 460
  // impact: shockwave, particles, shake, the q's hop, the head's tally; 600 propagation, each
  // opened link charging at 480 px/s, each level it opens popping as the charge arrives (its
  // segment in the sector bar with it); a region completed sweeps its rim; 1500 rest.
  function runReward() {
    if (!reward || rewardDone) return
    const id = reward.id
    const n = node(id)
    const { opened, links } = reward
    const mag = { S: 0, M: 1, L: 2, G: 3 }[n.size]
    tw('pr:' + id, 0.92, 120, out)
    at(120, () => {
      held.delete(id)
      tw('pr:' + id, 1.12, 100, out)
      tw('pr:' + id, 1, 160, back, 1.12, 100)
      tw('flood:' + id, 1, 180, out, 0)
      tw('hit:' + id, 0, 33, linear, 1)
      tw('stamp:' + id, 1, 220, out, 0, 140)
    })
    at(300, () => (charge = { id, t0: now }))
    at(460, () => {
      const [x, y] = scr(n.x, n.y)
      const t = TONES[n.hue]!
      // the burst is sized against the pane, not only the plate: the wave reaches 3.2 × the plate or
      // a sixth of the pane's short side, whichever is larger, so it reads at 1x
      const span0 = Math.min(pw, ph - (focus && zt ? ZBAR : 0))
      waves.push({ x: D(x), y: D(y), F: D(F(n)), col: INK, t0: now, to: Math.max(3.2, span0 / 6 / F(n)) })
      const count = [24, 28, 36, 48][mag]!
      seed = 11
      // the particles' reach scales with the pane, not the plate
      const span = Math.min(pw, ph - (focus && zt ? ZBAR : 0))
      fxMax.span = span
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rnd() * 0.4
        const sp = span * (0.12 + rnd() * 0.14) * dpr
        // particles scale with the plate: 4 px and more, a third of them twice that
        const base = Math.max(4, Math.round(F(n) / 14))
        parts.push({ x: D(x), y: D(y), vx: Math.cos(a) * sp * 3.2, vy: Math.sin(a) * sp * 3.2 - 30 * dpr, sz: D(i % 3 === 0 ? 2 * base : base), col: i % 2 ? t.ink : INK, t0: now, life: 560 + rnd() * 200 })
      }
      shake = { a: [2, 2, 3, 5][mag]!, t0: now, dur: [160, 160, 200, 260][mag]! }
      if (n.size === 'G') flash = now
      if (id === home) {
        tw('qhop', 6, 80, out, 0)
        tw('qhop', 0, 200, back, 6, 80)
      }
      // THE CLEAR CONNECTS THE MAP TO THE HUD: the plate's icon flies to the head's tally (a token
      // in its plate's language); the tally answers on its arrival, the briefing flips the plate to
      // cleared with the same stamp, the toast names the level
      showBrief(briefId ?? id, true)
      fly2hud(id, x, y, () => {
        tallyGo = true
        syncHud()
      })
      toast(id)
    })
    at(600, () => {
      for (const lid of links) {
        const l = LY.links.find((x) => x.id === lid)!
        const len = runsAt(l, LY, view()).reduce((a, p) => a + p.pts.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p.pts[i - 1]![0], q[1] - p.pts[i - 1]![1]) : s), 0), 0) * cam.s
        // three steps a second (480 px/s at a step of 160), the nearer level first, within the beat
        const dur = Math.min(880, (len / cam.s / 3) * 1000)
        const t0 = now
        heads.push({ link: lid, t0, dur })
        const step = () => {
          const p = Math.min(1, (now - t0) / dur)
          lit.set(lid, p)
          if (p < 1) at(0, step)
        }
        at(0, step)
        at(dur, () => {
          heads = heads.filter((h) => h.link !== lid)
          lit.delete(lid)
          if (held.has(l.b)) {
            held.delete(l.b)
            tw('pop:' + l.b, 1.12, 120, out, 0.88)
            tw('pop:' + l.b, 1, 160, back, 1.12, 120)
            tw('hit:' + l.b, 0, 33, linear, 1)
            // every level opened changes for all to see, written or not: a frontier's frame draws
            // round in its region's ink, and « Nouveau » stands over its label
            if (etatOf(l.b) === 'front') tw('dash:' + l.b, 1, T.reveal, out, 0)
            fresh.add(l.b)
            relayout()
            syncBar()
            $(`#zb-s [data-seg="${l.b}"]`)?.classList.add('pop')
          }
        })
      }
    })
    at(1000, () => {
      syncHud()
      const reg = n.reg
      // a REGION CLEARED: the full-pane beat, its rim sweep and a band across the pane naming it
      if (R.get(reg)!.levels.filter(onMap).every((x) => S.lus.has(x))) {
        sweeps.push({ reg, t0: now })
        band(reg)
        flash = now
      }
      if (n.size === 'G') at(300, () => (lap = { t0: now }))
    })
    at(1490, () => {
      for (const o of opened) held.delete(o)
      syncHud()
      // the opened levels' rows turn « Nouveau » in place
      if (briefId) showBrief(briefId, true)
    })
    at(sweepsDue(n.reg) ? 2300 : 1600, () => finishReward())
  }
  function finishReward() {
    if (!reward) return
    queue.length = 0
    held.clear()
    lit.clear()
    heads = []
    charge = null
    set('pr:' + reward.id, 1)
    set('flood:' + reward.id, 1)
    set('stamp:' + reward.id, 1)
    for (const o of reward.opened) set('pop:' + o, 1)
    for (const o of reward.opened) fresh.add(o)
    if (still.matches) {
      toast(reward.id)
      if (sweepsDue(node(reward.id).reg)) band(node(reward.id).reg)
    }
    rewardDone = true
    tallyGo = true
    token?.remove()
    token = null
    rec = next()?.id ?? null
    // ONE RENDER PATH FROM THE SAVE: the beat's end (animated or reduced) redraws every HUD view from
    // the saved state: the briefing on the next level (else the level cleared), the sheet, the bar,
    // the head and the track; both paths end in the same DOM
    sel = rec && onMap(rec) && node(rec).reg === focus ? rec : reward.id
    relayout()
    syncHud()
    showBrief(rec ?? reward.id, true)
    syncBar()
    buildAnchors()
    drawMini()
    remember()
    kick()
  }
  pane.addEventListener('pointerdown', () => {
    if (reward && !rewardDone) finishReward()
  }, true)
  const sweepsDue = (reg: string) => R.get(reg)!.levels.filter(onMap).every((x) => S.lus.has(x))
  // THE TOAST (a level cleared): in the sector bar, the level's mini node, its number, « compris »
  function toast(id: string) {
    const el = $('#zb-toast')
    if (!el) return
    const l = L[id]!
    el.className = `zb-toast h${l.hue}`
    el.innerHTML = `${miniNode(DATA.icons[id] ?? null, l.hue, 'lu', 24)}<span class="num">${l.label}</span><b>compris</b>`
    void el.offsetWidth
    el.classList.add('on')
    toastLog.push(id)
    setTimeout(() => el.classList.remove('on'), still.matches ? 1600 : 1900)
  }
  // THE BAND (a region cleared): across the pane, the region's tick, its name and its counter
  function band(reg: string) {
    const el = $('#band')
    if (!el) return
    const r = R.get(reg)!
    el.className = `band h${r.hue}`
    el.innerHTML = `<i class="zb-tick"></i><span class="eyebrow">${esc(r.nom)}</span><span class="num">${counter(reg)}</span><b>compris</b>`
    void el.offsetWidth
    el.classList.add('on')
    bandLog.push(reg)
    setTimeout(() => el.classList.remove('on'), 1300)
  }
  const toastLog: string[] = []
  // THE TOKEN: the cleared plate's icon (its mini node, cleared) flies from the plate to the head's
  // tally in 420 ms (an ease-in arc, 1 → 0.6 in scale), and calls `then` on arrival.
  let token: HTMLElement | null = null
  const tokenLog: { t: number; at: string }[] = []
  function fly2hud(id: string, x: number, y: number, then: () => void) {
    const goal = $('#n-lus')?.closest('.count') as HTMLElement | null
    if (still.matches || !goal) return then()
    const pr = pane.getBoundingClientRect()
    const gr = goal.getBoundingClientRect()
    token?.remove()
    token = document.createElement('span')
    token.className = 'token'
    token.setAttribute('aria-hidden', 'true')
    token.innerHTML = miniNode(DATA.icons[id] ?? null, L[id]!.hue, 'lu', 32)
    document.body.append(token)
    const x0 = pr.left + x - 16
    const y0 = pr.top + y - 16
    const x1 = gr.left + 12 - 16
    const y1 = gr.top + gr.height / 2 - 16
    tokenLog.push({ t: now, at: 'launch' })
    const a = token.animate(
      [
        { transform: `translate(${x0}px,${y0}px) scale(1)` },
        { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 40}px) scale(0.9)`, offset: 0.45 },
        { transform: `translate(${x1}px,${y1}px) scale(0.6)` },
      ],
      { duration: 420, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'forwards' },
    )
    a.onfinish = () => {
      tokenLog.push({ t: now, at: 'arrive' })
      token?.remove()
      token = null
      then()
    }
  }
  const bandLog: string[] = []

  // ---------------------------------------------------------------- boot
  buildDots()
  addEventListener('popstate', () => {
    const m = location.hash.match(/^#vue-(.+)$/)
    if (m && R.has(m[1]!)) zoomTo(m[1]!, undefined, false)
    else toWorld(false)
  })
  new ResizeObserver(() => sizePane()).observe(pane)
  document.addEventListener('visibilitychange', kick)
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return
    document.body.classList.remove('leaving')
    load()
    kick()
  })
  Promise.all([document.fonts.load(FACE.name.css), document.fonts.load(FACE.eyebrow.css), document.fonts.load(FACE.num.css), document.fonts.load('600 28px "Source Serif 4 Variable"')])
    .catch(() => {})
    .then(() => {
      sizePane()
      const m = location.hash.match(/^#vue-(.+)$/)
      const pending = cleared.filter((id) => onMap(id)).pop()
      const zoomIn = (reg: string, on?: string) => {
        focus = reg
        zt = true
        cam = regionCam(reg, on)
      }
      if (pending) {
        zoomIn(node(pending).reg, pending)
        sel = pending
        showBrief(pending)
        playReward(pending)
        buildAnchors()
        at(260, runReward)
      } else if (m && R.has(m[1]!)) {
        sel = pickIn(m[1]!)
        zoomIn(m[1]!, sel)
        showBrief(sel)
        buildAnchors()
      } else {
        showBrief(rec ?? WORLD.order[0]!)
        buildAnchors()
      }
      syncHud()
      drawMini()
      document.body.classList.add('ready')
      kick()
    })

  // ---------------------------------------------------------------- the audit's hooks (interact.mjs)
  ;(window as unknown as { __map: unknown }).__map = {
    state: () => ({ focus, sel, home, rec, zt, cam, s0: s0(), kind: kind(), world, pw, ph, axis, hov, kf, flight: !!flight, frames, fresh: [...fresh], reward: !!reward && !rewardDone, opened: reward?.opened ?? [], sheet: sheetStep }),
    nodes: () =>
      [...LY.nodes.values()].map((n) => {
        const [x, y] = scr(n.x, n.y)
        const lb = labelsNow()?.at.get(n.id)
        const box: Box | null = lb ? [lb.box[0] + x, lb.box[1] + y, lb.box[2] + x, lb.box[3] + y] : null
        return { id: n.id, x, y, F: F(n), cell: CELL(n), icon: DATA.icons[n.id], size: n.size, etat: etat(n.id), reg: n.reg, reach: reach(n, view()), fade: fades.get(n.id) ?? 1, label: lb && box ? { side: lb.side, form: lb.form, box, lines: lb.lines.map((l) => l.t), lx: lb.lines.map((l) => [x + l.x, textW(l.face === 'eyebrow' ? l.t.toLocaleUpperCase('fr') : l.t, l.face) * (l.k ?? 1)]), fade: fadeOf(box, focus && zt ? ZBAR : 0, ph - footOf()) } : null }
      }),
    ports: () => LY.links.flatMap((l) => l.ports.map((p) => ({ link: l.id, far: p.far, scr: scr(...portAt(LY, l, p.end, view())), size: chipOf(view()) }))),
    links: () => LY.links.map((l) => ({ id: l.id, relay: l.relay, runs: runsAt(l, LY, view()).map((p) => ({ reg: p.reg, pts: p.pts.map((q) => scr(q[0], q[1])) })) })),
    spans: () => spanLog,
    // where each link changes colour, on the screen (zoomed: on the focused rim)
    cuts: () => LY.links.flatMap((l) => {
      const rs = colourRuns(l, LY, view())
      return rs.slice(0, -1).filter((r, i) => !r.b && r.tone !== rs[i + 1]!.tone).map((r) => ({ link: l.id, at: scr(...r.pts[r.pts.length - 1]!) }))
    }),
    camera: () => ({ ...cam }),
    lands: () => [...LY.lands.entries()].map(([id, l]) => ({ id, rings: l.rings.map((r) => r.map((q) => scr(q[0], q[1]))) })),
    labelFaults: () => [...(labelsNow()?.faults ?? [])],
    zoomTo: (r: string) => zoomTo(r),
    toWorld: () => toWorld(),
    point: (k: Tg['k'], id: string) => point(k === 'node' || k === 'region' ? { k, id } : null),
    hit: (x: number, y: number) => hit(x, y),
    renderMs: () => renderMs.splice(0),
    replay: (id: string) => {
      S.lus.add(id)
      store.set('lus', [...S.lus])
      focus = node(id).reg
      zt = true
      flight = null
      cam = regionCam(focus, id)
      sel = id
      showBrief(id)
      buildAnchors()
      playReward(id)
      runReward()
      kick()
    },
    // one node drawn in each state at the world's scale, for the state audit
    stateSheet: (id: string) => {
      const res: { e: Etat; px: number[] }[] = []
      const n = node(id)
      const [x, y] = scr(n.x, n.y)
      const h = Math.ceil(F(n) / 2) + 2
      const was = held.get(id)
      for (const e of ETATS) {
        held.set(id, e)
        if (e === 'prog') S.points[id] = L[id]!.sections.slice(0, Math.ceil(L[id]!.sections.length / 2))
        render()
        const im = ctx.getImageData(Math.round((x - h) * dpr), Math.round((y - h) * dpr), Math.round(2 * h * dpr), Math.round(2 * h * dpr))
        res.push({ e, px: Array.from(im.data) })
      }
      if (was) held.set(id, was)
      else held.delete(id)
      load()
      render()
      return { dpr, out: res }
    },
    tween: (k: string) => val(k, 0),
    chain: () => chainLog,
    fx: () => ({ ...fxMax }),
    corners: () => [...LY.lands].map(([id]) => ({ id, n: 0 })),
    fitAt: (st: number) => {
      const v: View = { axis, kind: kind(), z: false, s: st, focus: null, home }
      const sc = scene(LY, v)
      const lb = labels(sc, course().order, course().text, () => false, faces, fresh)
      return { box: contentBox(sc, lb, []), faults: lb.faults }
    },
    head: () => headLog,
    colour: () => LY.links.map((l) => ({ id: l.id, relay: l.relay, runs: colourRuns(l, LY, view()).map((r) => ({ tone: r.tone, a: r.a, b: r.b, px: runPx(r, l, LY, view()) })) })),
    qbox: () => (qLog ? { box: qBox(F(node(home)), qLog.c), x: qLog.x, y: scr(node(home).x, node(home).y)[1] } : null),
    toasts: () => [...toastLog],
    tokens: () => [...tokenLog],
    bands: () => [...bandLog],
    flashes: () => flashLog.splice(0),
    progEdge: (id: string) => progEdge.get(id) ?? null,
    q: () => qLog,
    ghost: () => ghostLog,
    view: () => ({ s: view().s, cam: cam.s }),
    caption: () => (cap.classList.contains('on') && cap.dataset.k === 'lv' ? cap.textContent : null),
    emitters: () => (rec && !held.size ? 1 : 0) + (home ? 1 : 0) + (sel ? 1 : 0),
  }
}
