import { z } from 'astro/zod'
import { describe, expect, it } from 'vitest'
import { postSchema } from './post-schema'

// Astro's image() helper resolves a path in the post folder; a string stands in for it here.
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
const paths = (data: unknown) => issues(data).map((issue) => issue.path)

function without(key: keyof typeof published) {
  const { [key]: _, ...rest } = published
  return rest
}

describe('post frontmatter', () => {
  it('accepts a published post and fills the defaults', () => {
    expect(schema.parse(published)).toEqual({ ...published, date: new Date('2026-09-25T00:00:00Z'), lang: 'fr', draft: false })
  })

  it.each(['title', 'date', 'description', 'image', 'imageAlt'] as const)('fails a published post without %s, naming it', (key) => {
    expect(issues(without(key))).toEqual([{ path: key, message: expect.stringMatching(/^required: /) }])
  })

  it('names every missing field at once', () => {
    expect(paths({ date: '2026-09-25', description: 'Une phrase.' })).toEqual(['title', 'image', 'imageAlt'])
  })

  it('lets a draft go without its header image and alt text', () => {
    const { image: _image, imageAlt: _alt, ...draft } = { ...published, draft: true }
    expect(schema.safeParse(draft).success).toBe(true)
  })

  it('still requires the title, date and description of a draft', () => {
    expect(paths({ draft: true })).toEqual(['title', 'date', 'description'])
  })

  it('accepts only fr and en', () => {
    expect(schema.parse({ ...published, lang: 'en' }).lang).toBe('en')
    expect(paths({ ...published, lang: 'de' })).toEqual(['lang'])
  })

  it('rejects a misspelled or unknown field', () => {
    expect(paths({ ...published, drafts: true })).toEqual([''])
  })

  it('reads a day as UTC midnight, whether YAML gives a string or a date', () => {
    expect(schema.parse({ ...published, date: new Date('2026-01-01T00:00:00Z') }).date).toEqual(new Date('2026-01-01T00:00:00Z'))
    expect(schema.parse({ ...published, date: '2026-01-01' }).date).toEqual(new Date('2026-01-01T00:00:00Z'))
  })

  it.each([null, 20260101, true, 'tomorrow', '2026-1-5', '2026/01/05', '2026-01-01T00:30:00+01:00', new Date('2026-01-01T09:00:00Z')])(
    'rejects the date %j',
    (date) => {
      expect(paths({ ...published, date })).toEqual(['date'])
    },
  )
})
