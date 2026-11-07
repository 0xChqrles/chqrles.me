import { getEntry } from 'astro:content'
import type { Course } from './course'
import { world as buildWorld, type World } from './game'
import { treeOf } from './lattice'
import { shareCard } from './share-card'
import type { TreeData } from './tree'
import { apos, typo } from './render-card'

// The collection's one entry, as the pages read it: the same object while the entry is, so the
// world and the map built from it are built once.
let read: { data: unknown; course: Course } | undefined
export async function getCourse(): Promise<Course> {
  const entry = await getEntry('course', 'course')
  if (!entry) throw new Error('No course to render: the loader logged why.')
  if (read?.data !== entry.data) {
    const { titre, sousTitre, court } = entry.data.cours
    read = { data: entry.data, course: { ...entry.data, cours: { ...entry.data.cours, titre: apos(titre), sousTitre: apos(sousTitre), court: apos(court) } } }
  }
  return read.course
}

// A card's strings are HTML. An attribute or the search needs the words alone.
export const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

// JSON for a <script> block: a "<" in it could otherwise close the block.
export const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

let cached: { course: Course; world: World } | undefined
// The course as a world of levels, built once per course.
export async function getWorld(): Promise<World> {
  const course = await getCourse()
  if (cached?.course !== course) cached = { course, world: buildWorld(course) }
  return cached.world
}

let tree: { world: World; data: TreeData } | undefined
// The map's lattice, built once per course (the home audits it at the reference panes).
export async function getTree(): Promise<TreeData> {
  const w = await getWorld()
  if (tree?.world !== w) tree = { world: w, data: treeOf(await getCourse(), w).data }
  return tree.data
}

// A page's share image (lib/share-card.ts): the home's, or a level's.
export async function sharePng(id: string | null): Promise<Response> {
  const { cours } = await getCourse()
  const w = await getWorld()
  const T = await getTree()
  const l = id ? w.levels.find((x) => x.id === id)! : null
  // set as the pages set them (lib/render-card.ts typo): no line starts with « : » or splits « 10 000 »
  const png = await shareCard(T, w, typo(cours.titre), l && { id: l.id, label: l.label, titre: typo(apos(l.titre)), region: typo(apos(w.regions.find((r) => r.id === l.region)!.nom)), hue: l.hue, icon: T.icons[l.id]! })
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } })
}

// What a page's share image shows, as its alt text: the words printed on it.
export const shareAlt = (course: string, level?: { label: string; titre: string; region: string }) =>
  level ? `${course} · ${level.region} · ${level.label} ${level.titre}` : course
