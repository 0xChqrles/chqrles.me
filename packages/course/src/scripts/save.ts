// THE SAVE and the game's states, shared by every page's script. Each level is in one state,
// computed by lib/gate.ts from what the reader did (the levels they cleared, the checkpoints they
// reached, the locked levels they chose to read anyway), never from time. The map, the lists and
// the page's foot all paint the same states.
import type { Level, World } from '../lib/game'
import { complete as completeOf, etatOf, missing as missingOf, nextOf, reached as reachedOf, type Ici, type Save } from '../lib/gate'
import type { Etat } from '../lib/tree'
import { saved } from '../lib/base'

// A private window or blocked site data makes any storage call throw: then the page shows a
// first visit, and what this page learns lives in memory.
const memory = new Map<string, string>()
export const store = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem(saved(k))
      return v === null ? d : JSON.parse(v)
    } catch {
      const v = memory.get(k)
      return v === undefined ? d : JSON.parse(v)
    }
  },
  set(k: string, v: unknown) {
    memory.set(k, JSON.stringify(v))
    try {
      localStorage.setItem(saved(k), JSON.stringify(v))
    } catch {}
  },
}

export const WORLD: World = JSON.parse(document.getElementById('monde')!.textContent!)
export const L: Record<string, Level> = Object.fromEntries(WORLD.levels.map((l) => [l.id, l]))
export const written = WORLD.levels.filter((l) => !l.prevu)
export const chapters = WORLD.order.filter((id) => L[id]!.chapitre)

// `lus`: the levels the reader says they understood. `points`: the checkpoints reached in each
// level. `forces`: the locked levels the reader chose to read anyway (« Lire quand même »). `ici`:
// the last level and section read. `vu`: what the map showed last time, to tell what is new.
export type { Ici }
export type Vu = { ecrits: string[]; lus: string[]; ouverts: string[] }
export const S: Save & { lus: Set<string>; forces: Set<string> } = { lus: new Set(), points: {}, forces: new Set() }
const isWritten = (id: string) => !!L[id] && !L[id]!.prevu
export function load() {
  S.lus = new Set(store.get<string[]>('lus', []).filter(isWritten))
  S.points = store.get<Record<string, string[]>>('points', {})
  S.forces = new Set(store.get<string[]>('forces', []).filter(isWritten))
}
// A locked level opened anyway, for good. The reader opened it, no clear did: the map, wherever
// they chose it, does not call it new.
export function force(id: string) {
  S.forces.add(id)
  store.set('forces', [...S.forces])
  const vu = store.get<Vu | null>('vu', null)
  if (vu && !vu.ouverts.includes(id)) store.set('vu', { ...vu, ouverts: [...vu.ouverts, id] })
}
export const reached = (id: string) => reachedOf(L[id]!, S)
export const share = (id: string) => (L[id]!.sections.length ? reached(id).length / L[id]!.sections.length : 0)
export const missing = (id: string) => missingOf(L[id]!, L, S)
export const etat = (id: string): Etat => etatOf(L[id]!, L, S)
export const complete = (ch: string) => completeOf(ch, WORLD.levels, S)
export const next = () => nextOf(WORLD.order, L, S, store.get<Ici | null>('ici', null))
load()
