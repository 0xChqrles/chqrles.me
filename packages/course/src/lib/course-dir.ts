import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SLUG } from '../../scripts/shape.mjs'

const PACKAGE = fileURLToPath(new URL('../..', import.meta.url))

// The folder a run reads. COURSE_SLUG is a name, not a path, so a named course is read
// inside courses/ and nowhere else, whatever else is set. COURSE_DIR is a preview, so
// only dev honours it, and only when no course is named.
export function courseDir({ dev, env }: { dev: boolean; env: Record<string, string | undefined> }): string {
  if (env.COURSE_SLUG) {
    if (!SLUG.test(env.COURSE_SLUG)) throw new Error(`COURSE_SLUG: "${env.COURSE_SLUG}" is not a course's folder name.`)
    return join(PACKAGE, '..', '..', 'courses', env.COURSE_SLUG)
  }
  if (dev && env.COURSE_DIR) return resolve(env.COURSE_DIR)
  return join(PACKAGE, 'fixture')
}
