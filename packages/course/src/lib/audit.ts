// THE BUILD'S AUDIT of the map: the lattice (lib/lattice.ts), the palette, the flight, and the
// placement rules (lib/place.ts) re-run at the reference panes the page lays out. Any fault fails
// the build (pages/index.astro) and names what it found; the notes and flags are for the owner.
import { flightFaults } from './camera'
import type { Course } from './course'
import type { World } from './game'
import { treeOf } from './lattice'
import { paletteFaults } from './palette'
import { audit, GUTTER, ZBAR, type Course as PlaceCourse } from './place'
import { layout, type Axis } from './tree'

// The map's pane at each reference screen, as the page's grid lays it out: the head (56), the
// chapter track (64; 40 under 1200 px), the briefing (384, from 1200 px; under it a sheet whose
// peek of 88 covers the pane's foot).
export const PANES: { name: string; w: number; h: number; foot: number; axis: Axis; desk: boolean }[] = [
  { name: '1440 × 900', w: 1056, h: 780, foot: 0, axis: 'h', desk: true },
  { name: '1280 × 800', w: 896, h: 680, foot: 0, axis: 'h', desk: true },
  { name: '1920 × 1080', w: 1536, h: 960, foot: 0, axis: 'h', desk: true },
  { name: '1024 × 700', w: 1024, h: 604, foot: 88, axis: 'h', desk: false },
  { name: '390 × 844', w: 390, h: 748, foot: 88, axis: 'v', desk: false },
]

export type MapAudit = { faults: string[]; notes: string[]; flags: { pane: string; s0: number; kind: string; off: string[]; untitled: string[]; numOnly: string[]; extra: { ks: Record<string, number>; empty: Record<string, number>; qc: number } }[] }
export function auditMap(course: Course, w: World): MapAudit & { tree: ReturnType<typeof treeOf> } {
  const tree = treeOf(course, w)
  const faults = [...tree.faults, ...paletteFaults(), ...flightFaults()]
  const notes = [...tree.notes]
  const flags: MapAudit['flags'] = []
  const levels = new Map(w.levels.map((l) => [l.id, l]))
  for (const P of PANES) {
    const LY = layout(tree.data, levels, P.axis)
    const g = P.axis === 'v' ? GUTTER.phone : GUTTER.desk
    const gz = P.axis === 'v' ? GUTTER.phone : GUTTER.zoom
    const C: PlaceCourse = {
      order: w.order,
      text: (id) => ({ label: levels.get(id)!.label, name: tree.data.names[id]! }),
      regs: w.regions.filter((r) => r.levels.some((id) => LY.nodes.has(id))).map((r) => ({ id: r.id, nom: r.nom, count: `0/${r.levels.filter((id) => LY.nodes.has(id)).length}` })),
      quest: tree.data.quest,
    }
    const home = w.order.find((id) => LY.nodes.has(id)) ?? null
    const a = audit(LY, { w: P.w, h: P.h, top: 0, foot: P.foot, gutter: g }, { w: P.w, h: P.h, top: ZBAR, foot: P.foot, gutter: gz }, home, C, P.name, P.desk)
    faults.push(...a.faults)
    notes.push(...a.notes)
    flags.push({ pane: P.name, s0: a.s0, kind: a.kind, off: a.flags.off, untitled: a.flags.unnamed, numOnly: a.flags.numOnly, extra: { ks: a.flags.ks, empty: a.flags.empty, qc: a.flags.qc } })
  }
  return { faults, notes, flags, tree }
}
