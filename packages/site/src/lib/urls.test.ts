import { describe, expect, it } from 'vitest'
import { postPath, slugOf } from './urls'

describe('post URLs', () => {
  it('takes the slug from the folder name, for .md and .mdx alike', () => {
    expect(slugOf('cemantix/index.md')).toBe('cemantix')
    expect(slugOf('word-vectors-2/index.mdx')).toBe('word-vectors-2')
  })

  it.each(['Mon-Post', 'mon post', 'mon_post', 'été', '-mon-post', 'mon--post', 'mon-post-', ''])(
    'refuses the folder name %j with a message naming the folder',
    (name) => {
      expect(() => slugOf(`${name}/index.md`)).toThrow(`posts/${name}: a post's folder name is its URL`)
    },
  )

  it('puts a post at /<slug>/, with the trailing slash', () => {
    expect(postPath('cemantix')).toBe('/cemantix/')
  })
})
