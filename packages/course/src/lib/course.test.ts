import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadCourse } from './course'
import { world } from './game'

const FIXTURE = join(import.meta.dirname, '..', '..', 'fixture')
const temporary: string[] = []

afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true })
})

// The fixture with its outline changed, or with one of its sources.
function variant(change: (outline: any) => void = () => {}, files: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'course-'))
  temporary.push(dir)
  cpSync(FIXTURE, dir, { recursive: true })
  const outline = JSON.parse(readFileSync(join(dir, 'outline.json'), 'utf8'))
  change(outline)
  writeFileSync(join(dir, 'outline.json'), JSON.stringify(outline))
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, 'src', name), text)
  return loadCourse(dir)
}

describe('the fixture', () => {
  const { course, errors, summary } = loadCourse(FIXTURE)
  const page = (id: string) => course!.pages.find((p) => p.id === id)!
  const card = (id: string) => course!.cards.find((c) => c.id === id)!

  it('loads with no fault', () => {
    expect(errors).toEqual([])
    expect(summary).toMatch(/^4 pages écrites, 3 prévues, \d+ mots, 0 erreurs$/)
  })

  it('renders every feature a card may use', () => {
    const html = course!.pages.map((p) => p.html).join('\n')
    expect(html).toContain('texttt')
    expect(html).toContain('mathbb')
    expect(html).toContain('mtable')
    expect(page('braquet').html).toMatch(/<details class="der">.*<div class="bloc piege">.*<div class="bloc note">/s)
    expect(page('developpement').html).toContain('<figure class="fig"><svg')
    expect(page('braquet').html).toMatch(/<a class="c" href="\/rapport\/" data-c="rapport">rapport <span class="katex">/)
    expect(page('braquet').html).toContain('<span class="c prevu" tabindex="0" data-c="vitesse">la vitesse</span>')
  })

  it('leaves no style attribute and no hash link to a card', () => {
    const html = [course!.home, ...course!.pages.map((p) => p.html)].join('\n')
    expect(html).not.toContain('style=')
    expect(html).not.toContain('href="#accueil"')
    expect(html).not.toContain('href="#braquet"')
    expect(course!.home).toContain('href="#chapitres"')
    for (const [, key] of html.matchAll(/data-k="([^"]+)"/g)) expect(course!.styles[key!]).toBeDefined()
  })

  it('gives a planned card no page, and keeps it on the map', () => {
    for (const id of ['cadence', 'roue', 'vitesse']) {
      expect(card(id).prevu).toBe(true)
      expect(course!.pages.some((p) => p.id === id)).toBe(false)
    }
    expect(card('braquet').prevu).toBe(false)
    expect(card('roue').col).toBe(0)
  })

  it('finds what a card opens and the chapter it belongs to', () => {
    expect(world(course!).levels.find((l) => l.id === 'braquet')!.unlocks).toEqual(['dents', 'rapport', 'developpement'])
    expect(card('dents').n).toBe(1)
    expect(card('roue').n).toBe(2)
    expect(card('developpement').n).toBe(2)
  })

  it('carries the fields a page reads', () => {
    expect(card('rapport').resume).toBe('Les dents du plateau &lt; divisées par &gt; celles du pignon.')
    expect(card('braquet').titre).toBe('Ce que fait un braquet')
    expect(card('developpement').titre).toBe('La distance d’un tour de pédales')
    expect(course!.lignes[1]!.nom).toBe('L’asphalte')
    expect(page('dents').formules).toBe('gauche')
    expect(page('braquet').formules).toBeUndefined()
    expect(page('braquet').num).toBe('01')
    expect(page('dents').num).toBe('')
    expect(page('dents').quartier).toBe('La transmission')
    expect(page('braquet').meta).toBe('1 min')
    expect(page('dents').meta).toBe('1 min · Avant ça : <a class="c" href="/braquet/" data-c="braquet">1. Le braquet</a>')
    expect(page('developpement').meta).toContain('Avant ça : <a class="c" href="/braquet/" data-c="braquet">1. Le braquet</a> · ')
    expect(page('developpement').meta).toContain('href="/rapport/"')
    expect(page('braquet').notions).toContain('href="/dents/"')
    expect(page('braquet').suite).toBe('<a class="c" href="/developpement/" data-c="developpement">2. Le développement</a>')
  })

  it('links chapters to each other, and only chapters', () => {
    expect(page('braquet').pn).toBe('<div class="pn"><span></span><a class="c" href="/developpement/" data-c="developpement">2. Le développement ›</a></div>')
    expect(page('developpement').pn).toContain('‹ 1. Le braquet')
    expect(page('developpement').pn).toContain('<span class="c prevu" tabindex="0" data-c="cadence">3. La cadence ›</span>')
    expect(page('dents').pn).toBe('')
  })
})

describe('reading time', () => {
  const minutes = (mots: number, svg = '') => {
    const source = `---\nid: dents\n---\n${'mot '.repeat(mots)}${svg}`
    return variant(undefined, { 'dents.md': source }).course!.pages.find((p) => p.id === 'dents')!.meta.split(' · ')[0]
  }

  it('reads 210 words a minute, a page taking one at least', () => {
    expect(minutes(10)).toBe('1 min')
    expect(minutes(420)).toBe('2 min')
  })

  it('skips figures', () => {
    expect(minutes(420, `<svg>${'mot '.repeat(420)}</svg>`)).toBe('2 min')
  })
})

describe('faults in an outline', () => {
  it('reports an outline that cannot be read', () => {
    const dir = mkdtempSync(join(tmpdir(), 'course-'))
    temporary.push(dir)
    const { course, errors } = loadCourse(dir)
    expect(course).toBeUndefined()
    expect(errors[0]).toMatch(/^outline\.json: /)
  })

  it.each<[string, (outline: any) => void, string]>([
    ['a misspelled top-level field', (o) => (o.ligne = []), 'Unrecognized key: "ligne"'],
    ['a misspelled card field', (o) => (o.cartes[0].titer = 'x'), 'cartes.0'],
    ['a misspelled course field', (o) => (o.cours.macro = {}), 'cours'],
    ['a missing course key', (o) => delete o.cours, 'cours'],
    ['nine lines', (o) => (o.lignes = Array.from({ length: 9 }, (_, i) => ({ id: `l${i}`, nom: 'x' }))), 'lignes'],
    ['a card id that is no slug', (o) => (o.cartes[0].id = 'Mon_Id'), 'cartes.0.id'],
    ['an unknown formula side', (o) => (o.cartes[3].formules = 'droite'), 'cartes.3.formules'],
  ])('fails on %s and names it', (_, change, field) => {
    const { course, errors } = variant(change)
    expect(course).toBeUndefined()
    expect(errors.join('\n')).toContain(`outline.json: ${field}`)
  })

  it.each<[string, (outline: any) => void, string]>([
    ['an unknown goal', (o) => (o.cours.objectif = 'nope'), 'cours: objectif inconnu nope'],
    ['an unknown prerequisite', (o) => o.cartes[0].prerequis.push('nope'), 'braquet: prérequis inconnu nope'],
    ['an unknown notion', (o) => o.cartes[0].notions.push('nope'), 'braquet: notion inconnue nope'],
    ['an unknown district', (o) => (o.cartes[3].quartier = 'nope'), 'dents: quartier inconnu nope'],
    ['a notion off the map', (o) => delete o.cartes[3].col, 'dents: sans position ou sans notes sur la carte'],
    ['a chapter off the map', (o) => delete o.cartes[0].col, 'braquet: sans position ou sans notes sur la carte'],
    ['a card with no row', (o) => delete o.cartes[3].rang, 'dents: sans position ou sans notes sur la carte'],
    ['a notion with no rating', (o) => delete o.cartes[3].complexite, 'dents: sans position ou sans notes sur la carte'],
    ['a gap in the chapters', (o) => (o.cartes[2].chapitre = 4), 'chapitres: pas de chapitre 3'],
    ['two chapters with one number', (o) => (o.cartes[2].chapitre = 2), 'chapitres: chapitre 2 en double'],
    ['a chapter with prerequisites', (o) => (o.cartes[1].prerequis = ['braquet']), 'developpement: des prérequis sur un chapitre'],
    ['a chapter among notions', (o) => o.cartes[0].notions.push('developpement'), 'braquet: le chapitre developpement dans ses notions'],
    ['a notion in no chapter', (o) => (o.cartes[0].notions = ['dents']), 'rapport: dans aucun chapitre'],
    ['a notion in two chapters', (o) => o.cartes[1].notions.push('dents'), 'dents: dans plusieurs chapitres : braquet, developpement'],
    ['notions listed by a notion', (o) => (o.cartes[3].notions = ['rapport']), 'dents: des notions hors d’un chapitre'],
    ['a notion outside its chapter’s district', (o) => (o.cartes[3].quartier = 'route'), 'dents: quartier route hors de celui de son chapitre, transmission'],
    ['a prerequisite later in the course', (o) => o.cartes[3].prerequis.push('roue'), 'dents: prérequis roue pas avant elle dans le cours'],
    ['a card its own prerequisite', (o) => o.cartes[3].prerequis.push('dents'), 'dents: prérequis dents pas avant elle dans le cours'],
    ['an edge to an unknown card', (o) => (o.aretes[0].b = 'nope'), 'braquet > nope: carte inconnue nope'],
    ['an edge on an unknown line', (o) => (o.aretes[0].ligne = 'nope'), 'braquet > dents: ligne inconnue nope'],
    ['a card written twice', (o) => o.cartes.push(o.cartes[0]), 'braquet: carte en double'],
  ])('reports %s and still gives the course', (_, change, fault) => {
    const { course, errors } = variant(change)
    expect(course).toBeDefined()
    expect(errors).toContain(fault)
  })

  it('names every fault of a card at once', () => {
    const { errors } = variant(undefined, { 'dents.md': '[[nope]]\n\n$\\nope$' })
    expect(errors.filter((e) => e.startsWith('dents: '))).toHaveLength(3)
    expect(errors).toContain('dents: no front matter')
  })

  it('reports a home page that is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'course-'))
    temporary.push(dir)
    cpSync(FIXTURE, dir, { recursive: true })
    rmSync(join(dir, 'src', '_accueil.md'))
    expect(loadCourse(dir).errors).toEqual(['accueil: pas de src/_accueil.md'])
  })
})
