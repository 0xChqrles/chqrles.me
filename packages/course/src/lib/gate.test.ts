import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadCourse } from './course'
import { world } from './game'
import { complete, EMPTY, etatOf, gates, nextOf, type Gated, type Ici, type Save } from './gate'

// The test course: chapter 1 `braquet` (notions `dents`, `rapport`), chapter 2 `developpement`
// (notion `roue`, planned), chapter 3 `cadence` (planned, notion `vitesse`, planned).
const w = world(loadCourse(join(import.meta.dirname, '..', '..', 'fixture')).course!)
const L: Record<string, Gated> = Object.fromEntries(w.levels.map((l) => [l.id, l]))
const level = (id: string) => w.levels.find((l) => l.id === id)!
const save = (lus: string[] = [], o: { points?: Record<string, string[]>; forces?: string[] } = {}): Save => ({ lus: new Set(lus), points: o.points ?? {}, forces: new Set(o.forces ?? []) })
const states = (s: Save) => Object.fromEntries(w.order.map((id) => [id, etatOf(L[id]!, L, s)]))

describe('the gates', () => {
  it('opens chapter 1 on nothing', () => expect(level('braquet').need).toEqual([]))

  it('asks of chapter N chapter N-1 and every notion of it', () => {
    expect(level('developpement').need).toEqual(['braquet', 'dents', 'rapport'])
    expect(level('cadence').need).toEqual(['developpement', 'roue'])
  })

  it('asks of a notion its chapter and its own prerequisites, once each', () => {
    expect(level('dents').need).toEqual(['braquet'])
    expect(level('rapport').need).toEqual(['braquet', 'dents'])
    expect(level('vitesse').need).toEqual(['cadence', 'roue', 'rapport'])
  })

  it('lists, for each level, the levels it gates, in course order', () => {
    expect(level('braquet').unlocks).toEqual(['dents', 'rapport', 'developpement'])
    expect(level('roue').unlocks).toEqual(['cadence', 'vitesse'])
    expect(level('vitesse').unlocks).toEqual([])
  })

  it('tells a chapter by its number, not its label', () => {
    expect(level('braquet').chapitre).toBe(1)
    expect(level('dents').chapitre).toBeNull()
  })

  it('derives nothing from a chapter’s own prerequisites, and keeps a notion off every chapter to its own', () => {
    const g = gates([
      { id: 'a', chapitre: 1, notions: ['x'], prerequis: [] },
      { id: 'b', chapitre: 2, notions: [], prerequis: ['x'] },
      { id: 'x', chapitre: null, notions: [], prerequis: [] },
      { id: 'y', chapitre: null, notions: [], prerequis: ['x'] },
    ])
    expect(g.get('b')).toEqual(['a', 'x'])
    expect(g.get('y')).toEqual(['x'])
  })
})

describe('the states', () => {
  it('locks at a first visit every written level but chapter 1, and keeps planned ones in the fog', () => {
    expect(states(EMPTY)).toEqual({ braquet: 'dispo', dents: 'verrou', rapport: 'verrou', developpement: 'verrou', roue: 'fog', cadence: 'fog', vitesse: 'fog' })
  })

  it('opens a level once its gate is understood', () => {
    expect(states(save(['braquet']))).toMatchObject({ braquet: 'lu', dents: 'dispo', rapport: 'verrou', developpement: 'verrou' })
    expect(states(save(['braquet', 'dents', 'rapport']))).toMatchObject({ developpement: 'dispo', roue: 'fog' })
  })

  it('never lets a planned level bar a gate', () => {
    // chapter 3 needs `roue`, planned: chapter 2 understood is enough
    expect(states(save(['braquet', 'dents', 'rapport', 'developpement']))).toMatchObject({ roue: 'front', cadence: 'front', vitesse: 'front' })
  })

  it('opens a locked level the reader chose to read anyway, and only that one', () => {
    expect(states(save([], { forces: ['rapport'] }))).toMatchObject({ dents: 'verrou', rapport: 'dispo' })
  })

  describe('by precedence: understood, begun, open, locked', () => {
    const P: Record<string, Gated> = {
      a: { id: 'a', prevu: false, need: [], sections: ['s'], chap: null },
      b: { id: 'b', prevu: false, need: ['a'], sections: ['t'], chap: null },
    }
    const b = (s: Save) => etatOf(P.b!, P, s)
    it('locks a level whose gate is unmet', () => expect(b(save())).toBe('verrou'))
    it('opens it anyway once escaped', () => expect(b(save([], { forces: ['b'] }))).toBe('dispo'))
    it('shows it begun over the lock and the escape', () => {
      expect(b(save([], { points: { b: ['t'] } }))).toBe('prog')
      expect(b(save([], { points: { b: ['t'] }, forces: ['b'] }))).toBe('prog')
    })
    it('counts only checkpoints the level still has', () => expect(b(save([], { points: { b: ['gone'] } }))).toBe('verrou'))
    it('shows it understood over everything', () => expect(b(save(['b'], { points: { b: ['t'] }, forces: ['b'] }))).toBe('lu'))
  })

  it('completes a chapter with it and its written notions understood', () => {
    expect(complete('braquet', w.levels, save(['braquet', 'dents']))).toBe(false)
    expect(complete('braquet', w.levels, save(['braquet', 'dents', 'rapport']))).toBe(true)
    expect(complete('developpement', w.levels, save(['developpement']))).toBe(true)
  })
})

describe('« Continuer »', () => {
  const next = (s: Save, ici: Ici | null = null) => nextOf(w.order, L, s, ici)

  it('begins at chapter 1', () => expect(next(EMPTY)).toEqual({ id: 'braquet', label: 'Commencer ici' }))

  it('goes back where the reader stopped', () => expect(next(save(['braquet']), { c: 'dents', s: 'x' })).toEqual({ id: 'dents', s: 'x', label: 'Continuer' }))

  it('never lands on a locked level, unless the reader escaped it', () => {
    expect(next(EMPTY, { c: 'rapport' })).toEqual({ id: 'braquet', label: 'Commencer ici' })
    expect(next(save([], { forces: ['rapport'] }), { c: 'rapport', s: 'x' })).toEqual({ id: 'rapport', s: 'x', label: 'Continuer' })
  })

  it('takes the next written level not understood, and ends when there is none', () => {
    expect(next(save(['braquet']), { c: 'braquet' })).toEqual({ id: 'dents', label: 'Continuer' })
    expect(next(save(['braquet', 'dents', 'rapport', 'developpement']))).toBeNull()
  })
})
