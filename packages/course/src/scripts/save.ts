// THE SAVE and the game's states, shared by every page's script. Each level is in one state,
// computed from what the reader did (the levels they cleared, the checkpoints they reached),
// never from time. The map, the lists and the page's foot all paint the same states.
import type { Level, World } from '../lib/game'
import type { Etat } from '../lib/tree'

// A private window or blocked site data makes any storage call throw: then the page shows a
// first visit, and what this page learns lives in memory.
const memory = new Map<string, string>()
export const store = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem(k)
      return v === null ? d : JSON.parse(v)
    } catch {
      const v = memory.get(k)
      return v === undefined ? d : JSON.parse(v)
    }
  },
  set(k: string, v: unknown) {
    memory.set(k, JSON.stringify(v))
    try {
      localStorage.setItem(k, JSON.stringify(v))
    } catch {}
  },
}

export const WORLD: World = JSON.parse(document.getElementById('monde')!.textContent!)
export const L: Record<string, Level> = Object.fromEntries(WORLD.levels.map((l) => [l.id, l]))
export const written = WORLD.levels.filter((l) => !l.prevu)
export const chapters = WORLD.order.filter((id) => !L[id]!.chap && /^\d+$/.test(L[id]!.label))

// `lus`: the levels the reader says they understood. `points`: the checkpoints reached in each
// level. `ici`: the last level and section read. `vu`: what the map showed last time, to tell
// what is new.
export type Ici = { c: string; s?: string }
export type Vu = { ecrits: string[]; lus: string[]; ouverts: string[] }
export const S = { lus: new Set<string>(), points: {} as Record<string, string[]> }
export function load() {
  S.lus = new Set(store.get<string[]>('lus', []).filter((id) => L[id] && !L[id]!.prevu))
  S.points = store.get<Record<string, string[]>>('points', {})
}
export const reached = (id: string) => (S.points[id] ?? []).filter((s) => L[id]!.sections.includes(s))
export const share = (id: string) => (L[id]!.sections.length ? reached(id).length / L[id]!.sections.length : 0)
// A written level wants its written prerequisites cleared; one not written yet asks nothing,
// since it cannot be read. A planned level is the frontier once all it needs is cleared.
export const missing = (id: string) => L[id]!.prerequis.filter((p) => L[p] && !L[p]!.prevu && !S.lus.has(p))
export function etat(id: string): Etat {
  const l = L[id]!
  if (l.prevu) return l.prerequis.every((p) => S.lus.has(p)) ? 'front' : 'fog'
  if (S.lus.has(id)) return 'lu'
  if (reached(id).length) return 'prog'
  return missing(id).length ? 'soft' : 'dispo'
}
export const ouvert = (id: string) => ['dispo', 'front', 'prog'].includes(etat(id))
// A chapter is complete when it and every notion it lists are cleared.
export const complete = (ch: string) => S.lus.has(ch) && WORLD.levels.filter((l) => l.chap === ch).every((l) => S.lus.has(l.id))
// The level « Continuer » / « Commencer ici » opens: where the reader stopped, else the first
// written level not cleared.
export function next(): { id: string; s?: string; label: string } | null {
  const ici = store.get<Ici | null>('ici', null)
  if (ici && L[ici.c] && !L[ici.c]!.prevu && !S.lus.has(ici.c)) return { id: ici.c, s: ici.s, label: 'Continuer' }
  const after = WORLD.order.find((id) => !L[id]!.prevu && !S.lus.has(id))
  if (!after) return null
  return { id: after, label: S.lus.size ? 'Continuer' : 'Commencer ici' }
}
load()
