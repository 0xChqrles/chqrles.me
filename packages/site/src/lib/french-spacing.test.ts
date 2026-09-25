import type { Element, Root } from 'hast'
import { VFile } from 'vfile'
import { describe, expect, it } from 'vitest'
import { frenchSpacing, rehypeFrenchSpacing } from './french-spacing'

const NBSP = ' '
const NNBSP = ' '

describe('frenchSpacing', () => {
  it.each([
    ['Pourquoi ?', `Pourquoi${NNBSP}?`],
    ['Bravo !', `Bravo${NNBSP}!`],
    ['un ; deux', `un${NNBSP}; deux`],
    ['la question :', `la question${NBSP}:`],
    ['« Bravo, à demain. »', `«${NBSP}Bravo, à demain.${NBSP}»`],
    ['10 000 mots', `10${NNBSP}000 mots`],
    ['la 1 182e place', `la 1${NNBSP}182e place`],
    ['100 % et 0,13 $', `100${NBSP}% et 0,13${NBSP}$`],
    ['3 000 000 £', `3${NNBSP}000${NNBSP}000${NBSP}£`],
    ['une question\n?', `une question${NNBSP}?`],
  ])('keeps %j on one line', (input, output) => {
    expect(frenchSpacing(input)).toBe(output)
  })

  it('replaces a space the author typed, whatever its kind, and never adds one', () => {
    expect(frenchSpacing(`quoi${NBSP}?`)).toBe(`quoi${NNBSP}?`)
    expect(frenchSpacing('échouaient?')).toBe('échouaient?')
    expect(frenchSpacing('https://chqrles.me')).toBe('https://chqrles.me')
  })

  it('leaves numbers that are not thousands alone', () => {
    expect(frenchSpacing('de 2 à 300 dimensions, 0,45 et 0,88')).toBe('de 2 à 300 dimensions, 0,45 et 0,88')
    expect(frenchSpacing('En 2026 100 personnes, 0,5 000')).toBe('En 2026 100 personnes, 0,5 000')
  })
})

describe('rehypeFrenchSpacing', () => {
  const tree = (): Root => ({
    type: 'root',
    children: [
      { type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: 'Et alors ?' }] },
      { type: 'element', tagName: 'pre', properties: {}, children: [{ type: 'text', value: 'Phrase : ok ?' }] },
      {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [{ type: 'element', tagName: 'code', properties: {}, children: [{ type: 'text', value: 'a ? b' }] }],
      },
      // <code> written as JSX in an MDX post.
      {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [{ type: 'mdxJsxTextElement', name: 'code', attributes: [], children: [{ type: 'text', value: 'c ? d' }] } as never],
      },
    ],
  })
  const texts = (root: Root) => root.children.map((node) => JSON.stringify((node as Element).children))

  function run(lang?: string) {
    const root = tree()
    const file = new VFile()
    file.data.astro = { frontmatter: lang ? { lang } : {} }
    rehypeFrenchSpacing()(root, file)
    return root
  }

  it('applies to French text, the default, and never inside code', () => {
    const [p, pre, code, jsx] = texts(run())
    expect(p).toContain(`Et alors${NNBSP}?`)
    expect(pre).toContain('Phrase : ok ?')
    expect(code).toContain('a ? b')
    expect(jsx).toContain('c ? d')
  })

  it('leaves an English post alone', () => {
    expect(texts(run('en'))[0]).toContain('Et alors ?')
  })
})
