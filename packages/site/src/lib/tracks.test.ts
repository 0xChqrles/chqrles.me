import { describe, expect, it } from 'vitest'
import { groupTracks, versionIn } from './tracks'

const post = (id: string, date: string) => ({ id, data: { date: new Date(date) } })

describe('tracks', () => {
  it('numbers the posts in the order they were published, the first being 01', () => {
    const tracks = groupTracks([post('fr/b', '2026-10-01'), post('fr/a', '2026-09-25'), post('fr/c', '2026-11-01')])
    expect(tracks.map((t) => [t.slug, t.number])).toEqual([['c', 3], ['b', 2], ['a', 1]])
  })

  it('makes one track of a post and its translations', () => {
    const tracks = groupTracks([post('fr/a', '2026-09-25'), post('en/a', '2026-10-05'), post('fr/b', '2026-10-01')])
    expect(tracks.map((t) => [t.slug, t.number, t.versions.length])).toEqual([['b', 2, 1], ['a', 1, 2]])
  })

  it('takes a track’s place from its French original, not from a later translation', () => {
    const tracks = groupTracks([post('fr/a', '2026-09-25'), post('en/a', '2026-12-01'), post('fr/b', '2026-10-01')])
    expect(tracks.map((t) => t.slug)).toEqual(['b', 'a'])
    expect(tracks[1]!.original.id).toBe('fr/a')
  })

  it('takes the only version as the original of a post with no French one', () => {
    const [only] = groupTracks([post('en/a', '2026-10-05')])
    expect(only!.original.id).toBe('en/a')
    expect(versionIn(only!, 'fr').id).toBe('en/a')
  })

  it('gives a reader the post in their language, else the original', () => {
    const [both, frOnly] = groupTracks([post('fr/b', '2026-10-01'), post('fr/a', '2026-09-25'), post('en/a', '2026-10-05')]).reverse() as [never, never]
    expect(versionIn(both, 'en').id).toBe('en/a')
    expect(versionIn(both, 'fr').id).toBe('fr/a')
    expect(versionIn(frOnly, 'en').id).toBe('fr/b')
  })
})
