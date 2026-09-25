import { z } from 'astro/zod'
import { describe, expect, it } from 'vitest'
import { postSchema } from './post-schema'

// Astro's image() helper resolves a file path; a string stands in for it here.
const schema = postSchema(z.string())

const published = {
  title: 'Un titre',
  date: '2026-09-25',
  description: 'Une phrase.',
  image: './header.jpg',
  imageAlt: 'Une image.',
}

function issues(data: unknown) {
  const result = schema.safeParse(data)
  return result.success ? [] : result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
}

function without(key: keyof typeof published) {
  const { [key]: _, ...rest } = published
  return rest
}

describe('post frontmatter', () => {
  it('accepts a published post and fills the defaults', () => {
    expect(schema.parse(published)).toEqual({ ...published, date: new Date('2026-09-25'), lang: 'fr', draft: false })
  })

  it.each(['title', 'date', 'description', 'image', 'imageAlt'] as const)('fails a published post without %s, naming it', (key) => {
    expect(issues(without(key))).toEqual([{ path: key, message: expect.stringMatching(/^required: /) }])
  })

  it('lets a draft go without its header image and alt text', () => {
    const { image: _image, imageAlt: _alt, ...draft } = { ...published, draft: true }
    expect(schema.safeParse(draft).success).toBe(true)
  })

  it('still requires the title, date and description of a draft', () => {
    expect(issues({ draft: true }).map((issue) => issue.path)).toEqual(['title', 'date', 'description'])
  })

  it('accepts only fr and en', () => {
    expect(schema.parse({ ...published, lang: 'en' }).lang).toBe('en')
    expect(issues({ ...published, lang: 'de' }).map((issue) => issue.path)).toEqual(['lang'])
  })

  it('rejects a misspelled or unknown field', () => {
    expect(issues({ ...published, drafts: true }).map((issue) => issue.path)).toEqual([''])
  })

  it('rejects a date that is not a date', () => {
    expect(issues({ ...published, date: 'tomorrow' }).map((issue) => issue.path)).toEqual(['date'])
  })
})
