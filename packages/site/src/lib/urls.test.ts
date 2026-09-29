import { describe, expect, it } from 'vitest'
import { assertPostFiles, languagePath, langOfPath, parseEntry, postId, postPath } from './urls'

describe('post URLs', () => {
  it('takes the slug from the folder name, for .md and .mdx alike', () => {
    expect(parseEntry('cemantix/index.md').slug).toBe('cemantix')
    expect(parseEntry('word-vectors-2/index.mdx').slug).toBe('word-vectors-2')
  })

  it.each(['Mon-Post', 'mon post', 'mon_post', 'été', '-mon-post', 'mon--post', 'mon-post-', ''])(
    'refuses the folder name %j with a message naming the folder',
    (name) => {
      expect(() => parseEntry(`${name}/index.md`)).toThrow(`posts/${name}: a post's folder name is its URL`)
    },
  )

  it('takes the language from the file name, French when it names none', () => {
    expect(parseEntry('cemantix/index.md').lang).toBe('fr')
    expect(parseEntry('cemantix/index.mdx').lang).toBe('fr')
    expect(parseEntry('cemantix/index.en.md').lang).toBe('en')
    expect(parseEntry('cemantix/index.en.mdx').lang).toBe('en')
    expect(parseEntry('cemantix/index.fr.md').lang).toBe('fr')
  })

  it('refuses a language the site does not have, and a file that is not a post', () => {
    expect(() => parseEntry('cemantix/index.de.md')).toThrow('"de" is not a language of the site (fr, en)')
    expect(() => parseEntry('cemantix/index-old.md')).toThrow('posts/cemantix/index-old.md: a post file is index.md')
    expect(() => parseEntry('cemantix/index.en.old.md')).toThrow('a post file is index.md')
  })

  it('holds a folder to one file per language, and to file names it can read', () => {
    expect(() => assertPostFiles('cemantix', ['index.mdx', 'index.en.md', 'pigeon.jpg', 'notes.md'])).not.toThrow()
    expect(() => assertPostFiles('cemantix', ['index.md', 'index.mdx'])).toThrow('posts/cemantix: index.md and index.mdx are both in fr. Keep one.')
    expect(() => assertPostFiles('cemantix', ['index.mdx', 'index.fr.md'])).toThrow('are both in fr')
    expect(() => assertPostFiles('cemantix', ['index.en.md', 'index.en.mdx'])).toThrow('are both in en')
    for (const name of ['index-en.md', 'index_en.md', 'index.en.markdown', 'index-old.md', 'index.en.old.md']) {
      expect(() => assertPostFiles('cemantix', ['index.mdx', name])).toThrow(`posts/cemantix/${name}: a post file is index.md`)
    }
    expect(() => assertPostFiles('cemantix', ['index.mdx', 'index.EN.md'])).toThrow('"EN" is not a language of the site')
  })

  it('reads the language off a file path, for the markdown plugins', () => {
    expect(langOfPath('/repo/posts/cemantix/index.mdx')).toBe('fr')
    expect(langOfPath('/repo/posts/cemantix/index.en.mdx')).toBe('en')
    expect(langOfPath(undefined)).toBe('fr')
  })

  it('puts a post at /<lang>/<slug>/, with the trailing slash', () => {
    expect(postId(parseEntry('cemantix/index.en.mdx'))).toBe('en/cemantix')
    expect(postPath('fr/cemantix')).toBe('/fr/cemantix/')
    expect(languagePath('en')).toBe('/en/')
  })
})
