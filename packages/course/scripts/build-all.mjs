import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkShape, pickCourses } from './shape.mjs'

// One build per course, each with its own site, into dist/<slug>: the course named on
// the command line, or every folder of courses/.
const root = fileURLToPath(new URL('..', import.meta.url))
const courses = join(root, '..', '..', 'courses')

// Every course is served at https://learn.chqrles.me/<slug>/ (astro.config.ts sets the path).
const COURSES_SITE = 'https://learn.chqrles.me'

const [named, ...others] = process.argv.slice(2)
if (others.length) throw new Error('Name one course at most.')

for (const slug of pickCourses(courses, named)) {
  const dir = join(courses, slug)
  const outline = JSON.parse(readFileSync(join(dir, 'outline.json'), 'utf8'))
  checkShape(dir, outline.cartes.map((card) => card.id))
  execFileSync('pnpm', ['exec', 'astro', 'build', '--force', '--site', COURSES_SITE, '--outDir', `dist/${slug}`], {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'production', COURSE_SLUG: slug },
    stdio: 'inherit',
  })
}
