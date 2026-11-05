import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { SLUG as SITE_SLUG } from '../../site/src/lib/urls'
import { checkShape, pickCourses, SLUG } from './shape.mjs'

const temporary: string[] = []

afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true })
})

function folder(files: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'shape-'))
  temporary.push(dir)
  for (const file of files) {
    mkdirSync(dirname(join(dir, file)), { recursive: true })
    writeFileSync(join(dir, file), '')
  }
  return dir
}

describe('the shape of a course folder', () => {
  it('keeps the slug rule in step with the blog', () => {
    expect(SLUG.source).toBe(SITE_SLUG.source)
  })

  it('accepts everything a course is made of', () => {
    const dir = folder([
      'outline.json',
      'src/_accueil.md',
      'src/card.md',
      'code/Cargo.toml',
      'code/Cargo.lock',
      'code/rust-toolchain.toml',
      'code/src/lib.rs',
      'code/src/deep/er.rs',
      'code/tests/one.rs',
    ])
    expect(() => checkShape(dir, ['card', 'planned'])).not.toThrow()
  })

  it('accepts the fixture', () => {
    const fixture = join(import.meta.dirname, '..', 'fixture')
    const { cartes } = JSON.parse(readFileSync(join(fixture, 'outline.json'), 'utf8'))
    expect(() => checkShape(fixture, cartes.map((card: { id: string }) => card.id))).not.toThrow()
  })

  it('skips what a laptop leaves behind', () => {
    const dir = folder(['outline.json', '.DS_Store', 'src/.DS_Store', 'code/target/debug/out.txt'])
    expect(() => checkShape(dir, [])).not.toThrow()
  })

  it.each([
    'notes.txt',
    'index.html',
    'src/unknown-card.md',
    'src/card.txt',
    'src/images/a.png',
    'other/outline.json',
    'code/README.md',
    'code/src/data.json',
    'code/tests/data.txt',
    'code/target.txt',
  ])('fails on %s and names it', (file) => {
    const dir = folder(['outline.json', 'src/card.md', file])
    expect(() => checkShape(dir, ['card'])).toThrow(file)
  })

  it('names every stray file at once', () => {
    const dir = folder(['a.txt', 'src/b.txt'])
    expect(() => checkShape(dir, [])).toThrow('a.txt, src/b.txt')
  })

  it('fails on a symbolic link, which could read outside the folder', () => {
    const dir = folder(['outline.json'])
    mkdirSync(join(dir, 'src'))
    symlinkSync('/etc/hosts', join(dir, 'src', 'card.md'))
    expect(() => checkShape(dir, ['card'])).toThrow('src/card.md')
  })
})

describe('the courses a build reads', () => {
  it('has nothing to do without the folder', () => {
    expect(pickCourses(join(tmpdir(), 'no-such-folder'))).toEqual([])
  })

  it('reads every folder, or only the one named', () => {
    const dir = folder(['one/outline.json', 'two/outline.json', '.DS_Store'])
    expect(pickCourses(dir).sort()).toEqual(['one', 'two'])
    expect(pickCourses(dir, 'two')).toEqual(['two'])
  })

  it('fails on a file beside the courses and names it, with or without a name', () => {
    const dir = folder(['one/outline.json', 'notes.txt'])
    expect(() => pickCourses(dir)).toThrow('notes.txt')
    expect(() => pickCourses(dir, 'one')).toThrow('notes.txt')
  })

  it('fails on a folder name that cannot be a subdomain', () => {
    const dir = folder(['Not_A_Slug/outline.json'])
    expect(() => pickCourses(dir)).toThrow('courses/Not_A_Slug')
  })

  it.each(['absent', '../one', '', 'Two'])('refuses the name %j', (name) => {
    const dir = folder(['one/outline.json'])
    expect(() => pickCourses(dir, name)).toThrow(`courses/${name}:`)
  })
})
