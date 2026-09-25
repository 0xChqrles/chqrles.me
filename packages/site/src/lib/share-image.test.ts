import { describe, expect, it } from 'vitest'
import { assertShareable } from './share-image'

describe('the header image', () => {
  it('is at least the 1200×630 share crop', () => {
    expect(() => assertShareable('ok', { width: 1200, height: 630 })).not.toThrow()
    expect(() => assertShareable('small', { width: 1000, height: 700 })).toThrow(
      'posts/small: the header image must be at least 1200×630 for the share preview; this one is 1000×700.',
    )
    expect(() => assertShareable('flat', { width: 1600, height: 600 })).toThrow('this one is 1600×600')
  })
})
