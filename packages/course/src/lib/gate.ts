// THE GATES AND THE STATES: what a level needs before it opens, and the state the reader's save
// puts it in. Both are derived, never written in outline.json: the gates from `chapitre` and
// `notions`, the states from the save. The map, the lists, the page, the share cards and the map
// without a script all read this one rule. It imports nothing: it ships in the page's bundle.
import type { Etat } from './tree'

// THE COURSE'S ORDER: each chapter by its number, then the notions it lists, in its order; then
// whatever no chapter lists (the build fails such a card).
type Outlined = { id: string; chapitre: number | null; notions: string[]; prerequis: string[] }
export function courseOrder(cards: Outlined[]): string[] {
  const order: string[] = []
  for (const ch of cards.filter((c) => c.chapitre).sort((a, b) => a.chapitre! - b.chapitre!)) order.push(ch.id, ...ch.notions)
  return [...new Set([...order, ...cards.map((c) => c.id)])]
}

// THE GATE of each level: chapter N needs chapter N-1 and every notion of chapter N-1; a notion
// needs its chapter and its own prerequisites; chapter 1 needs nothing.
export function gates(cards: Outlined[]): Map<string, string[]> {
  const chapters = new Map(cards.filter((c) => c.chapitre).map((c) => [c.chapitre!, c]))
  const chapterOf = (id: string) => [...chapters.values()].find((ch) => ch.notions.includes(id))
  return new Map(
    cards.map((c) => {
      if (c.chapitre) {
        const prev = chapters.get(c.chapitre - 1)
        return [c.id, prev ? [prev.id, ...prev.notions] : []]
      }
      const ch = chapterOf(c.id)
      return [c.id, [...new Set([...(ch ? [ch.id] : []), ...c.prerequis])]]
    }),
  )
}

// What the state rule reads of a level, and of the save.
export type Gated = { id: string; prevu: boolean; need: string[]; sections: string[]; chap: string | null }
export type Save = { lus: ReadonlySet<string>; points: Record<string, string[]>; forces: ReadonlySet<string> }
export const EMPTY: Save = { lus: new Set(), points: {}, forces: new Set() }

// The checkpoints reached in a level, those it still has.
export const reached = (l: Gated, s: Save) => (s.points[l.id] ?? []).filter((x) => l.sections.includes(x))
// What still bars a level: its gate's written levels not understood. A planned level cannot be
// ticked, so it never bars one.
export const missing = (l: Gated, L: Record<string, Gated>, s: Save) => l.need.filter((p) => L[p] && !L[p]!.prevu && !s.lus.has(p))
// A level's state. A planned one is at the front once its gate is met, else in the fog. A written
// one, by precedence: understood (lu), begun (prog), open (dispo: its gate met, or the reader chose
// « Lire quand même »), else locked (verrou).
export function etatOf(l: Gated, L: Record<string, Gated>, s: Save): Etat {
  if (l.prevu) return missing(l, L, s).length ? 'fog' : 'front'
  if (s.lus.has(l.id)) return 'lu'
  if (reached(l, s).length) return 'prog'
  if (s.forces.has(l.id) || !missing(l, L, s).length) return 'dispo'
  return 'verrou'
}
// A chapter is complete when it and every written notion it lists are understood.
export const complete = (ch: string, levels: Gated[], s: Save) => s.lus.has(ch) && levels.filter((l) => l.chap === ch && !l.prevu).every((l) => s.lus.has(l.id))

// The level « Continuer » / « Commencer ici » opens: where the reader stopped, else the first
// written level not understood, in the course's order; never a locked one.
export type Ici = { c: string; s?: string }
export function nextOf(order: string[], L: Record<string, Gated>, s: Save, ici: Ici | null): { id: string; s?: string; label: string } | null {
  const open = (id: string) => L[id] && !L[id]!.prevu && !s.lus.has(id) && etatOf(L[id]!, L, s) !== 'verrou'
  if (ici && open(ici.c)) return { id: ici.c, s: ici.s, label: 'Continuer' }
  const after = order.find(open)
  if (!after) return null
  return { id: after, label: s.lus.size ? 'Continuer' : 'Commencer ici' }
}
