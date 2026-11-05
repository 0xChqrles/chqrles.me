import { describe, expect, it } from 'vitest'
import type { Outline } from './course'
import { apos, breakable, cardRenderer, esc, typo } from './render-card'

const outline: Outline = {
  cours: { titre: 'T', sousTitre: 'S', court: 'C', objectif: 'a', macros: { '\\Ent': '\\mathbb{N}' } },
  quartiers: [{ id: 'q', nom: 'Q' }],
  lignes: [],
  cartes: [
    { id: 'a', titre: 'Écrite', court: "L'écrite", quartier: 'q', prerequis: [], resume: 'r' },
    { id: 'b', titre: 'Prévue', quartier: 'q', prerequis: [], resume: 'r' },
  ],
  aretes: [],
}
const SVG = (attrs: string, body = '') => `<svg ${attrs}>${body}</svg>`
const GOOD = 'viewBox="0 0 480 100" role="img" aria-label="Douze lettres au moins"'

function render(md: string) {
  const renderer = cardRenderer(outline, (id) => id === 'a')
  return { html: renderer.renderCard('x', md), errors: renderer.errors, styles: renderer.styles, renderer }
}

describe('text', () => {
  it('sets French spacing and apostrophes on text, never in code or tags', () => {
    expect(typo(`<p title="a : b">l'eau : « oui » 10 000 m 5 min 90 %</p>`)).toBe(
      '<p title="a : b">l’eau : « oui » 10 000 m 5 min 90 %</p>',
    )
    expect(typo(`<code>l'eau : 10 000</code><pre>a ; b</pre><svg>a ; b</svg>`)).toBe(`<code>l'eau : 10 000</code><pre>a ; b</pre><svg>a ; b</svg>`)
  })

  it('escapes markup and curls apostrophes', () => {
    expect(esc('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d')
    expect(apos("l'eau")).toBe('l’eau')
    expect(apos(undefined)).toBeUndefined()
  })
})

describe('links', () => {
  it('links a written card by its path, with its short title by default', () => {
    expect(render('[[a]]').html).toContain('<a class="c" href="/a/" data-c="a">L’écrite</a>')
    expect(render('[[a|ici]]').html).toContain('<a class="c" href="/a/" data-c="a">ici</a>')
  })

  it('keeps a planned card a span that holds focus, with no link', () => {
    const { html } = render('[[b|plus tard]]')
    expect(html).toContain('<span class="c prevu" tabindex="0" data-c="b">plus tard</span>')
    expect(html).not.toContain('href')
  })

  it('holds math first, so a formula with brackets works inside a link', () => {
    const { html, errors } = render('[[a|$x \\in [1, 2]$]]')
    expect(errors).toEqual([])
    expect(html).toMatch(/<a class="c" href="\/a\/" data-c="a"><span class="katex">/)
  })

  it('maps hash links to paths, and leaves the others', () => {
    const { html } = render('[début](#accueil) [carte](#a) [plus bas](#suite)')
    expect(html).toContain('<a href="/">début</a>')
    expect(html).toContain('<a href="/a/">carte</a>')
    expect(html).toContain('<a href="#suite">plus bas</a>')
  })

  it('maps hash links on a home page written as HTML', () => {
    const renderer = cardRenderer(outline, () => true)
    expect(renderer.renderHome('<p>l\'eau <a href="#a">x</a> <a href="#liste">y</a></p>')).toBe('<p>l’eau <a href="/a/">x</a> <a href="#liste">y</a></p>')
    expect(renderer.errors).toEqual([])
  })

  it('leaves a link in a code block alone', () => {
    expect(render('```html\n<a href="#a">x</a>\n```').html).toContain('&quot;#a&quot;')
  })
})

describe('math', () => {
  it('renders on the server with the course macros, and no style attribute', () => {
    const { html, styles, errors } = render('$\\Ent$ $\\texttt{x}$\n\n$$\\begin{aligned}a &= b\\end{aligned}$$')
    expect(errors).toEqual([])
    expect(html).toContain('mathbb')
    expect(html).toContain('texttt')
    expect(html).not.toContain('style=')
    expect(Object.keys(styles).length).toBeGreaterThan(0)
  })

  it('reads neither code nor an escaped dollar as math', () => {
    const { html } = render('`$a$` et 5\\$ puis 6\\$')
    expect(html).toContain('<code>$a$</code>')
    expect(html).not.toContain('katex')
  })

  it('keeps French punctuation with a short formula', () => {
    expect(render('Soit $x$ : la suite.').html).toMatch(/<span class="nb"><span class="katex">.* :<\/span>/)
  })

  it('lets a long tuple break, but not an environment', () => {
    const items = Array.from({ length: 16 }, (_, i) => `a_{${i}}`).join(', ')
    expect(render(`$$(${items})$$`).html).toContain('allowbreak')
    expect(render(`$$\\begin{aligned}${items}\\end{aligned}$$`).html).not.toContain('allowbreak')
  })

  it('keeps a thick space with the comma before it, and a plain semicolon is no space', () => {
    const tail = 'b'.repeat(40)
    expect(breakable(`a,\\;${tail}`)).toBe(`a,\\;\\allowbreak ${tail}`)
    expect(breakable(`a;;${tail}`)).toBe(`a;\\allowbreak ;\\allowbreak ${tail}`)
  })

  it('names a formula that fails', () => {
    expect(render('$\\nope$').errors[0]).toMatch(/^x: math: .*in «\\nope»$/)
  })
})

describe('directives', () => {
  it('renders each directive, with its default label', () => {
    const { html, errors } = render(':::derivation\nd\n:::\n\n:::piege\np\n:::\n\n:::note Titre\nn\n:::\n\n:::incertain\ni\n:::\n\n:::code\nc\n:::\n\n:::marge\nm\n:::')
    expect(errors).toEqual([])
    expect(html).toContain('<details class="der"><summary>La dérivation complète</summary><div><p>d</p>')
    expect(html).toContain('<div class="bloc piege"><span class="tag">Piège</span><p>p</p>')
    expect(html).toContain('<div class="bloc note"><span class="tag">Titre</span><p>n</p>')
    expect(html).toContain('<div class="bloc incertain"><span class="tag">Pas vérifié</span>')
    expect(html).toContain('<div class="bloc code"><span class="tag">Dans le code</span>')
    expect(html).toContain('<aside class="marge"><p>m</p>')
  })

  it('nests', () => {
    const { html, errors } = render(':::derivation\n:::piege\n:::note\ndedans\n:::\n:::\n:::')
    expect(errors).toEqual([])
    expect(html).toMatch(/<details class="der">.*<div class="bloc piege">.*<div class="bloc note">.*dedans.*<\/div><\/div>.*<\/details>/s)
  })

  it.each([
    [':::bloc\na\n:::', 'directive inconnue bloc'],
    ['a\n:::', 'fermeture ::: en trop'],
    [':::note\na', 'directive note non fermée'],
  ])('refuses %j', (md, fault) => {
    expect(render(md).errors).toEqual([`x: ${fault}`])
  })

  it('wraps a table so it can scroll', () => {
    expect(render('|a|\n|-|\n|1|').html).toContain('<div class="tw"><table>')
  })
})

describe('figures', () => {
  const figure = (svg: string, caption = 'Une légende') => render(`:::figure ${caption}\n${svg}\n:::`)

  it('keeps inline SVG and its caption', () => {
    const { html, errors } = figure(SVG(GOOD, '<circle r="1"></circle>'), 'Une `légende`')
    expect(errors).toEqual([])
    expect(html).toBe(`<figure class="fig">${SVG(GOOD, '<circle r="1"></circle>')}<figcaption>Une <code>légende</code></figcaption></figure>`)
  })

  it.each([
    ['no viewBox', '<svg role="img" aria-label="Douze lettres au moins"></svg>', 'figure sans <svg viewBox'],
    ['too wide', SVG('viewBox="0 0 481 100" role="img" aria-label="Douze lettres au moins"'), 'figure trop large (481 > 480)'],
    ['no role', SVG('viewBox="0 0 480 100" aria-label="Douze lettres au moins"'), 'figure sans role="img"'],
    ['a short label', SVG('viewBox="0 0 480 100" role="img" aria-label="court"'), 'figure sans role="img"'],
    ['a style element', SVG(GOOD, '<style></style>'), 'figure avec style'],
    ['a script', SVG(GOOD, '<script></script>'), 'figure avec style'],
    ['a foreignObject', SVG(GOOD, '<foreignObject></foreignObject>'), 'figure avec style'],
  ])('refuses a figure with %s', (_, svg, fault) => {
    expect(figure(svg).errors.join('\n')).toContain(fault)
  })

  it('refuses a figure with no caption', () => {
    expect(figure(SVG(GOOD), '').errors).toEqual(['x: figure sans légende'])
  })
})

describe('faults', () => {
  it('refuses a link to an unknown card and keeps its text', () => {
    const { html, errors } = render('[[nope|texte]]')
    expect(errors).toEqual(['x: lien vers carte inconnue nope'])
    expect(html).toContain('texte')
  })

  it('refuses a hash link to a planned card and names it, where a concept link stays a span', () => {
    expect(render('[plus tard](#b)').errors).toEqual(['x: lien vers carte prévue b'])
    expect(render('[[b|plus tard]]').errors).toEqual([])
    const renderer = cardRenderer(outline, (id) => id === 'a')
    renderer.renderHome('<p><a href="#b">x</a></p>')
    expect(renderer.errors).toEqual(['accueil: lien vers carte prévue b'])
  })

  it('refuses a data-widget attribute, in a card and on the home page', () => {
    expect(render('<div data-widget="x"></div>').errors).toEqual(['x: attribut data-widget'])
    const renderer = cardRenderer(outline, () => true)
    renderer.renderHome('<div data-widget="x"></div>')
    expect(renderer.errors).toEqual(['accueil: attribut data-widget'])
  })

  it('takes a card out of its front matter, and refuses a card with none', () => {
    const { renderer } = render('')
    expect(renderer.frontMatter('---\nid: a\n---\nbody', 'a')).toEqual([{ id: 'a' }, 'body'])
    expect(renderer.frontMatter('body', 'a')).toEqual([{}, 'body'])
    expect(renderer.errors).toEqual(['a: no front matter'])
  })
})
