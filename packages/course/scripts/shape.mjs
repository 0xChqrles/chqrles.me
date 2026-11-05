import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// The same rule as a post's folder (packages/site/src/lib/urls.ts): a test keeps them in step.
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const CODE = /^code\/(?:Cargo\.toml|Cargo\.lock|rust-toolchain\.toml|(?:src|tests)\/.+\.rs)$/

// The courses a build reads: the one it names, or every folder of courses/. That folder
// holds courses and nothing else, so a file there fails the build and is named.
export function pickCourses(courses, named) {
  const entries = existsSync(courses) ? readdirSync(courses, { withFileTypes: true }).filter((entry) => entry.name !== '.DS_Store') : []
  const stray = entries.filter((entry) => !entry.isDirectory()).map((entry) => entry.name)
  if (stray.length) throw new Error(`${courses}: not a course: ${stray.join(', ')}`)
  const slugs = named === undefined ? entries.map((entry) => entry.name) : [named]
  for (const slug of slugs) {
    if (!SLUG.test(slug)) {
      throw new Error(`courses/${slug}: a course's folder name is its subdomain, so it may only hold lowercase letters, digits and single hyphens.`)
    }
    if (!entries.some((entry) => entry.name === slug)) throw new Error(`courses/${slug}: no such course.`)
  }
  return slugs
}

// A course folder holds what makes a course and nothing else. Any other file fails the
// build and is named, so a stray file stops here.
export function checkShape(dir, cardIds) {
  const known = new Set(['outline.json', 'icones.json', 'src/_accueil.md', ...cardIds.map((id) => `src/${id}.md`)])
  const stray = []
  const walk = (folder) => {
    for (const entry of readdirSync(join(dir, folder), { withFileTypes: true })) {
      const path = folder ? `${folder}/${entry.name}` : entry.name
      if (entry.name === '.DS_Store' || path === 'code/target') continue
      if (entry.isDirectory()) walk(path)
      else if (!entry.isFile() || !(known.has(path) || CODE.test(path))) stray.push(path)
    }
  }
  walk('')
  if (stray.length) throw new Error(`${dir}: not part of a course: ${stray.join(', ')}`)
}
