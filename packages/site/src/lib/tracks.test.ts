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

  it('collects the names a post used to have, from any of its files', () => {
    const tracks = groupTracks([
      { ...post('fr/a', '2026-09-25'), data: { date: new Date('2026-09-25'), aliases: ['old-a'] } },
      { ...post('en/a', '2026-10-05'), data: { date: new Date('2026-10-05'), aliases: ['old-a', 'older-a'] } },
      post('fr/b', '2026-10-01'),
    ])
    expect(tracks.find((t) => t.slug === 'a')!.aliases).toEqual(['old-a', 'older-a'])
    expect(tracks.find((t) => t.slug === 'b')!.aliases).toEqual([])
  })

  it('refuses an alias that is a post’s own name, another post’s, or claimed twice', () => {
    const aliased = (id: string, date: string, aliases: string[]) => ({ id, data: { date: new Date(date), aliases } })
    expect(() => groupTracks([aliased('fr/a', '2026-09-25', ['a'])])).toThrow('posts/a: the alias "a" is its own name')
    expect(() => groupTracks([aliased('fr/a', '2026-09-25', ['b']), post('fr/b', '2026-10-01')])).toThrow('posts/a: the alias "b" is the name of posts/b.')
    // The newest track is checked first, so the older one owns the alias.
    expect(() => groupTracks([aliased('fr/a', '2026-09-25', ['old']), aliased('fr/b', '2026-10-01', ['old'])])).toThrow('posts/a: the alias "old" is already an alias of posts/b.')
  })

  it('gives a reader the post in their language, else the original', () => {
    const [both, frOnly] = groupTracks([post('fr/b', '2026-10-01'), post('fr/a', '2026-09-25'), post('en/a', '2026-10-05')]).reverse() as [never, never]
    expect(versionIn(both, 'en').id).toBe('en/a')
    expect(versionIn(both, 'fr').id).toBe('fr/a')
    expect(versionIn(frOnly, 'en').id).toBe('fr/b')
  })
})
