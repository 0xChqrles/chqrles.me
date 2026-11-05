import { getEntry } from 'astro:content'
import type { Course } from './course'
import { world as buildWorld, type World } from './game'
import { apos } from './render-card'

// The collection's one entry, as the pages read it.
export async function getCourse(): Promise<Course> {
  const entry = await getEntry('course', 'course')
  if (!entry) throw new Error('No course to render: the loader logged why.')
  const { titre, sousTitre, court } = entry.data.cours
  return { ...entry.data, cours: { ...entry.data.cours, titre: apos(titre), sousTitre: apos(sousTitre), court: apos(court) } }
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
