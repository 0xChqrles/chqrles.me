import type { Card, Course } from './course'
import { courseOrder, gates } from './gate'
import { cellsOf, runs } from './pixels'

// The course as a world of levels. Everything here is derived from outline.json:
// a level's number, its region's ink, and the order the course is read in.

// A level as the pages and the browser read it.
export type Level = {
  id: string
  titre: string
  nom: string
  resume: string
  hue: number
  region: string
  label: string
  // A chapter's number; null for a notion.
  chapitre: number | null
  // A notion's chapter; null for a chapter.
  chap: string | null
  prevu: boolean
  // Its gate (lib/gate.ts): the levels to understand before it opens; and the levels whose gate
  // holds it.
  need: string[]
  unlocks: string[]
  complexite: number | null
  importance: number | null
  minutes: number | null
  sections: string[]
  // Its pixel icon (icones.json) as one path of 11 x 11 cells; none while icones.json lacks it (a
  // fault the build names).
  icon: string | null
}

export type World = {
  levels: Level[]
  regions: { id: string; nom: string; hue: number; levels: string[] }[]
  order: string[]
  objectif: string
}

export const nom = (c: Card) => (c.court || c.titre).replace(/^\d+\.\s*/, '')

export function world(course: Course): World {
  const { cards, quartiers, cours } = course
  const notions = new Map(cards.filter((c) => c.chapitre).map((c) => [c.id, c.notions]))
  const hue = (q: string) => Math.max(0, quartiers.findIndex((x) => x.id === q))
  const chapters = cards.filter((c) => c.chapitre).sort((a, b) => a.chapitre! - b.chapitre!)
  const chapOf = (id: string) => chapters.find((ch) => (notions.get(ch.id) ?? []).includes(id)) ?? null
  const label = (c: Card) => {
    if (c.chapitre) return String(c.chapitre)
    const ch = chapOf(c.id)
    return ch ? `${ch.chapitre}-${notions.get(ch.id)!.indexOf(c.id) + 1}` : ''
  }
  const order = courseOrder(cards)
  const need = gates(cards)
  const unlocks = (id: string) => order.filter((x) => need.get(x)!.includes(id))

  const levels: Level[] = cards.map((c) => ({
    id: c.id,
    titre: c.titre,
    nom: nom(c),
    resume: c.resume,
    hue: hue(c.quartier),
    region: c.quartier,
    label: label(c),
    chapitre: c.chapitre,
    chap: c.chapitre ? null : (chapOf(c.id)?.id ?? null),
    prevu: c.prevu,
    need: need.get(c.id)!,
    unlocks: unlocks(c.id),
    complexite: c.complexite,
    importance: c.importance,
    minutes: c.minutes,
    sections: c.sections.map((s) => s.id),
    icon: course.icones[c.id] ? runs(cellsOf(course.icones[c.id]!)) : null,
  }))
  const regions = quartiers
    .map((q) => ({ id: q.id, nom: q.nom, hue: hue(q.id), levels: cards.filter((c) => c.quartier === q.id).map((c) => c.id) }))
    .filter((r) => r.levels.length)
  return { levels, regions, order, objectif: cours.objectif }
}

// The written levels before and after this one, in the course's order.
export function around(w: World, id: string): { prev: Level | null; next: Level | null } {
  const written = w.order.map((i) => w.levels.find((l) => l.id === i)!).filter((l) => !l.prevu)
  const i = written.findIndex((l) => l.id === id)
  return { prev: written[i - 1] ?? null, next: written[i + 1] ?? null }
}
