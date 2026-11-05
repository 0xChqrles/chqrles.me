import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'astro/zod'
import { SLUG } from '../../scripts/shape.mjs'
import { apos, cardRenderer, esc, typo } from './render-card'

const id = z.string().regex(SLUG, 'a slug: lowercase letters, digits and single hyphens')
const text = z.string().min(1)

// The contract of outline.json. A misspelled field fails, and the message names it.
const outlineSchema = z.strictObject({
  cours: z.strictObject({
    titre: text,
    sousTitre: text,
    court: text,
    objectif: id,
    macros: z.record(z.string(), z.string()),
  }),
  quartiers: z.array(z.strictObject({ id, nom: text })),
  // The stylesheet has eight line colours.
  lignes: z.array(z.strictObject({ id, nom: text })).max(8),
  cartes: z.array(
    z.strictObject({
      id,
      titre: text,
      court: text.optional(),
      quartier: id,
      chapitre: z.number().int().positive().optional(),
      prerequis: z.array(id),
      notions: z.array(id).optional(),
      resume: text,
      complexite: z.number().positive().optional(),
      importance: z.number().positive().optional(),
      col: z.number().optional(),
      rang: z.number().optional(),
      cote: z.enum(['g', 'd', 'bd']).optional(),
      carte: text.optional(),
      formules: z.literal('gauche').optional(),
    }),
  ),
  aretes: z.array(
    z.strictObject({
      a: id,
      b: id,
      ligne: id,
      via: z.array(z.tuple([z.number(), z.number()])).optional(),
      coupee: z.boolean().optional(),
    }),
  ),
})

export type Outline = z.infer<typeof outlineSchema>

// What the pages need of a card, written or planned.
export type Card = {
  id: string
  titre: string
  court: string | null
  quartier: string
  resume: string
  prerequis: string[]
  suite: string[]
  prevu: boolean
  chapitre: number | null
  n: number | null
  complexite: number | null
  importance: number | null
  col: number | null
  rang: number | null
  cote: string | null
  carte: string | null
  // A written card's reading time and its h2 sections, the checkpoints of the level.
  minutes: number | null
  sections: Section[]
  // A chapter's notions, in the outline's order.
  notions: string[]
}

export type Section = { id: string; titre: string }

// A written card, its strings already HTML.
export type Page = {
  id: string
  quartier: string
  num: string
  titre: string
  resume: string
  meta: string
  html: string
  notions: string
  suite: string
  pn: string
  sections: Section[]
  formules?: 'gauche'
}

export type Course = {
  cours: Outline['cours']
  quartiers: Outline['quartiers']
  lignes: Outline['lignes']
  aretes: Outline['aretes']
  cards: Card[]
  pages: Page[]
  home: string
  styles: Record<string, string>
  // Each level's pixel icon (icones.json): 11 rows of 11 cells, `#` inked, `.` empty.
  icones: Record<string, string[]>
}

// Each h2 and h3 gets an id from its words, so a section can be linked to; the h2s are
// the card's sections.
function addressed(html: string): { html: string; sections: Section[] } {
  const sections: Section[] = []
  const used = new Set<string>()
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level: string, inner: string) => {
    const text = inner.replace(/<span class="katex-mathml">[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '')
    const base =
      text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&[a-z#0-9]+;/g, ' ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'section'
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`
    used.add(id)
    if (level === '2') sections.push({ id, titre: inner })
    return `<h${level} id="${id}">${inner}</h${level}>`
  })
  return { html: out, sections }
}

const words = (s: string) =>
  s
    .replace(/<svg\b[\s\S]*?<\/svg>/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' x ')
    .split(/\s+/)
    .filter(Boolean).length

// Everything a course folder says: the course, or nothing when its outline cannot be
// read, and every fault found. The caller decides what a fault stops.
export function loadCourse(dir: string): { course?: Course; errors: string[]; summary?: string } {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(join(dir, 'outline.json'), 'utf8'))
  } catch (e) {
    return { errors: [`outline.json: ${(e as Error).message}`] }
  }
  const result = outlineSchema.safeParse(raw)
  if (!result.success) {
    return { errors: result.error.issues.map((issue) => `outline.json: ${[...(issue.path.length ? [issue.path.join('.')] : []), issue.message].join(': ')}`) }
  }
  const outline = result.data
  const file = (name: string) => join(dir, 'src', `${name}.md`)
  const written = (name: string) => existsSync(file(name))
  const { errors, styles, err, frontMatter, notion, renderCard, renderHome } = cardRenderer(outline, written)

  const parsed = new Map<string, { html: string; mots: number; sections: Section[] }>()
  for (const c of outline.cartes) {
    if (!written(c.id)) continue
    const [, md] = frontMatter(readFileSync(file(c.id), 'utf8'), c.id)
    parsed.set(c.id, { ...addressed(renderCard(c.id, md)), mots: words(md) })
  }
  const minutesOf = (cid: string) => {
    const p = parsed.get(cid)
    return p ? Math.max(1, Math.round(p.mots / 210)) : null
  }

  const ids = new Set(outline.cartes.map((c) => c.id))
  const cardOf = (cid: string) => outline.cartes.find((c) => c.id === cid)!
  const suite = (cid: string) => outline.cartes.filter((c) => c.prerequis.includes(cid)).map((c) => c.id)
  const chapters = outline.cartes.filter((c) => c.chapitre)
  const chapterOf = (cid: string) => chapters.find((c) => (c.notions ?? []).includes(cid))
  const cards: Card[] = outline.cartes.map((c) => ({
    id: c.id,
    titre: apos(c.titre),
    court: apos(c.court) || null,
    quartier: c.quartier,
    resume: apos(esc(c.resume)),
    prerequis: c.prerequis,
    suite: suite(c.id),
    prevu: !parsed.has(c.id),
    chapitre: c.chapitre || null,
    n: c.chapitre || chapterOf(c.id)?.chapitre || null,
    complexite: c.complexite || null,
    importance: c.importance || null,
    col: c.col ?? null,
    rang: c.rang ?? null,
    cote: c.cote || null,
    carte: c.carte || null,
    minutes: minutesOf(c.id),
    sections: parsed.get(c.id)?.sections ?? [],
    notions: c.notions ?? [],
  }))

  const seen = new Set<string>()
  const lignes = new Set(outline.lignes.map((l) => l.id))
  const quartiers = new Set(outline.quartiers.map((q) => q.id))
  for (const c of outline.cartes) {
    if (seen.has(c.id)) err(c.id, 'carte en double')
    seen.add(c.id)
    if (!quartiers.has(c.quartier)) err(c.id, `quartier inconnu ${c.quartier}`)
    for (const p of c.prerequis) if (!ids.has(p)) err(c.id, `prérequis inconnu ${p}`)
    for (const n of c.notions ?? []) if (!ids.has(n)) err(c.id, `notion inconnue ${n}`)
    if (!c.chapitre && (c.col == null || !c.complexite || !c.importance)) err(c.id, 'notion sans position ou sans notes sur la carte')
  }
  if (!ids.has(outline.cours.objectif)) err('cours', `objectif inconnu ${outline.cours.objectif}`)
  for (const e of outline.aretes) {
    for (const end of [e.a, e.b]) if (!ids.has(end)) err(`${e.a} > ${e.b}`, `carte inconnue ${end}`)
    if (!lignes.has(e.ligne)) err(`${e.a} > ${e.b}`, `ligne inconnue ${e.ligne}`)
  }

  const titleOf = (cid: string) => apos(cardOf(cid).court || cardOf(cid).titre)
  const qName = (q: string) => apos(outline.quartiers.find((x) => x.id === q)?.nom ?? '')
  const list = (xs: string[]) =>
    xs
      .filter((x) => ids.has(x))
      .map((x) => notion(x, titleOf(x)))
      .join(' · ')

  const pages: Page[] = outline.cartes.flatMap((c) => {
    const p = parsed.get(c.id)
    if (!p) return []
    const minutes = minutesOf(c.id)!
    const chapter = chapterOf(c.id)
    const meta = [`${minutes} min`, c.prerequis.length ? `Avant ça : ${list(c.prerequis)}` : 'Aucun prérequis']
    if (chapter) meta.push(`Dans le cours : ${notion(chapter.id, titleOf(chapter.id))}`)
    const next = suite(c.id).filter((x) => !cardOf(x).chapitre)
    const prev = c.chapitre && chapters.find((x) => x.chapitre === c.chapitre! - 1)
    const nxt = c.chapitre && chapters.find((x) => x.chapitre === c.chapitre! + 1)
    const pn = c.chapitre
      ? `<div class="pn">${prev ? notion(prev.id, `‹ ${titleOf(prev.id)}`) : '<span></span>'}${nxt ? notion(nxt.id, `${titleOf(nxt.id)} ›`) : '<span></span>'}</div>`
      : ''
    return [
      {
        id: c.id,
        quartier: qName(c.quartier),
        num: c.chapitre ? String(c.chapitre).padStart(2, '0') : '',
        titre: typo(esc(c.titre)),
        resume: typo(esc(c.resume)),
        meta: meta.join(' · '),
        html: p.html,
        notions: list(c.notions ?? []),
        suite: list(next),
        pn,
        sections: p.sections,
        ...(c.formules && { formules: c.formules }),
      },
    ]
  })

  const icones = readIcons(dir, outline, err)

  let home = ''
  if (existsSync(file('_accueil'))) home = renderHome(readFileSync(file('_accueil'), 'utf8'))
  else err('accueil', 'pas de src/_accueil.md')

  const prevues = outline.cartes.length - pages.length
  const total = [...parsed.values()].reduce((sum, p) => sum + p.mots, 0)
  return {
    course: {
      cours: outline.cours,
      quartiers: outline.quartiers.map((q) => ({ ...q, nom: apos(q.nom) })),
      lignes: outline.lignes.map((l) => ({ ...l, nom: apos(l.nom) })),
      aretes: outline.aretes,
      cards,
      pages,
      home,
      styles,
      icones,
    },
    errors,
    summary: `${pages.length} pages écrites, ${prevues} prévues, ${total} mots, ${errors.length} erreurs`,
  }
}

// THE ICONS: course content, one per level on the map, in icones.json. Each is drawn on one
// grid at whole multiples of its cell, so the rules are the grid's: 11 by 11 cells, the three
// cells of each corner empty (it fits any octagon plate), no cell alone, and a drawing that
// spans 9 cells or more one way. A level with no icon, an icon for no level on the map, and
// an icon that breaks a rule each fail, by name.
export const ICON = 11
function readIcons(dir: string, outline: Outline, err: (id: string, m: string) => void): Record<string, string[]> {
  const onMap = outline.cartes.filter((c) => c.col != null).map((c) => c.id)
  let raw: unknown = {}
  try {
    raw = JSON.parse(readFileSync(join(dir, 'icones.json'), 'utf8'))
  } catch (e) {
    err('icones.json', (e as Error).message)
    return {}
  }
  const icons = z.record(z.string(), z.array(z.string())).safeParse(raw)
  if (!icons.success) {
    err('icones.json', 'an object of level ids, each an array of rows')
    return {}
  }
  const out: Record<string, string[]> = {}
  for (const id of onMap) if (!icons.data[id]) err(id, 'pas d’icône dans icones.json')
  for (const [id, rows] of Object.entries(icons.data)) {
    if (!onMap.includes(id)) {
      err(`icones.json ${id}`, 'pas une carte sur la carte du cours')
      continue
    }
    const fault = iconFault(rows)
    if (fault) err(`icones.json ${id}`, fault)
    else out[id] = rows
  }
  const ids = Object.keys(out)
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const fault = iconPairFault(out[ids[i]!]!, out[ids[j]!]!)
      if (fault) err(`icones.json ${ids[i]} et ${ids[j]}`, fault)
    }
  return out
}
// TWO ICONS must tell apart at the smallest tile (2 pixels a cell): at least ICON_APART.cells
// cells differ, and their silhouettes (each drawing with its holes filled, the shape it reads as
// from afar) differ by at least ICON_APART.shape cells. Two rings, or two blobs, fail.
export const ICON_APART = { cells: 20, shape: 12 }
const silhouette = (rows: string[]): string => {
  const out = new Set<string>()
  const todo: [number, number][] = []
  for (let i = 0; i < ICON; i++) todo.push([i, 0], [i, ICON - 1], [0, i], [ICON - 1, i])
  while (todo.length) {
    const [x, y] = todo.pop()!
    if (x < 0 || y < 0 || x >= ICON || y >= ICON || out.has(`${x},${y}`) || rows[y]![x] === '#') continue
    out.add(`${x},${y}`)
    todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
  return rows.map((r, y) => [...r].map((_, x) => (out.has(`${x},${y}`) ? '.' : '#')).join('')).join('')
}
const apart = (a: string, b: string) => [...a].filter((c, i) => c !== b[i]).length
export function iconPairFault(a: string[], b: string[]): string | null {
  const cells = apart(a.join(''), b.join(''))
  const shape = apart(silhouette(a), silhouette(b))
  if (cells < ICON_APART.cells) return `${cells} cases diffèrent (${ICON_APART.cells} au moins)`
  if (shape < ICON_APART.shape) return `leurs silhouettes diffèrent de ${shape} cases (${ICON_APART.shape} au moins)`
  return null
}
export function iconFault(rows: string[]): string | null {
  if (rows.length !== ICON || rows.some((r) => !new RegExp(`^[#.]{${ICON}}$`).test(r))) return `${ICON} lignes de ${ICON} cases, # ou .`
  const on = (x: number, y: number) => rows[y]?.[x] === '#'
  const edge = ICON - 1
  for (let y = 0; y < ICON; y++)
    for (let x = 0; x < ICON; x++) {
      if (!on(x, y)) continue
      if (Math.min(x, edge - x) + Math.min(y, edge - y) <= 1) return `la case ${x},${y} est dans un coin`
      let alone = true
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && on(x + dx, y + dy)) alone = false
      if (alone) return `la case ${x},${y} est seule`
    }
  const xs = rows.flatMap((r) => [...r].flatMap((c, x) => (c === '#' ? [x] : [])))
  const ys = rows.flatMap((r, y) => (r.includes('#') ? [y] : []))
  if (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 1 < 9) return 'le dessin couvre moins de 9 cases'
  return null
}
