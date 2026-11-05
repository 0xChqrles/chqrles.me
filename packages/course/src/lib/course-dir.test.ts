import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { courseDir } from './course-dir'

const fixture = join(import.meta.dirname, '..', '..', 'fixture')
const courses = join(import.meta.dirname, '..', '..', '..', '..', 'courses')

describe('the folder a run reads', () => {
  it('reads the preview folder in dev only', () => {
    const env = { COURSE_DIR: '/elsewhere/course' }
    expect(courseDir({ dev: true, env })).toBe('/elsewhere/course')
    expect(courseDir({ dev: false, env })).toBe(fixture)
  })

  it('ignores the preview folder in a build of a named course', () => {
    const env = { COURSE_DIR: '/elsewhere/course', COURSE_SLUG: 'demo' }
    expect(courseDir({ dev: false, env })).toBe(join(courses, 'demo'))
    expect(courseDir({ dev: true, env })).toBe(join(courses, 'demo'))
  })

  it('reads courses/<slug> by name, and the fixture when none is named', () => {
    expect(courseDir({ dev: false, env: { COURSE_SLUG: 'demo' } })).toBe(join(courses, 'demo'))
    expect(courseDir({ dev: true, env: { COURSE_SLUG: 'demo' } })).toBe(join(courses, 'demo'))
    expect(courseDir({ dev: false, env: {} })).toBe(fixture)
  })

  it.each(['../../secret', '/etc', 'demo/..', 'Demo', '.demo'])('refuses the name %j', (slug) => {
    expect(() => courseDir({ dev: false, env: { COURSE_SLUG: slug } })).toThrow('COURSE_SLUG')
  })
})
