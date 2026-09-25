import type { ShikiConfig } from '@astrojs/markdown-remark'
import type { Element, Root } from 'hast'
import { visit } from 'unist-util-visit'

// Code is highlighted from the palette, by value, weight and slant, never by
// hue: the ink for code, a softer ink for strings and numbers, the muted ink
// for comments and punctuation; keywords are bold, comments italic.
const INK = '#e4e2dc'
const SOFT = '#bdb8ad'
const MUTED = '#999489'

export const codeTheme: Exclude<NonNullable<ShikiConfig['theme']>, string> = {
  name: 'chqrles',
  type: 'dark',
  colors: { 'editor.background': '#1b1a18', 'editor.foreground': INK },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: MUTED, fontStyle: 'italic' } },
    { scope: ['string', 'constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: SOFT } },
    { scope: ['keyword', 'storage', 'variable.language', 'support.type.primitive'], settings: { foreground: INK, fontStyle: 'bold' } },
    { scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: MUTED, fontStyle: '' } },
  ],
}

// Shiki writes each token's colour in a style="" attribute, which the site's
// CSP forbids. This rehype step, which runs after Shiki, turns them into
// classes (styled in site.css). A colour the theme does not use fails the
// build, so the theme and the stylesheet never drift apart.
const CLASSES: Record<string, string> = { [INK]: 'code-ink', [SOFT]: 'code-soft', [MUTED]: 'code-muted' }

export function rehypeCodeClasses() {
  return (tree: Root) => {
    visit(tree, 'element', (pre) => {
      if (pre.tagName !== 'pre' || !classList(pre).includes('astro-code')) return
      visit(pre, 'element', (node) => {
        const style = node.properties.style
        if (typeof style !== 'string') return
        delete node.properties.style
        if (node === pre) return
        for (const declaration of style.split(';')) {
          const [property, value] = declaration.split(':').map((part) => part.trim().toLowerCase())
          if (property === 'color') {
            const name = value && CLASSES[value]
            if (!name) throw new Error(`Code colour ${value} is not in the theme (src/lib/code-theme.ts).`)
            addClass(node, name)
          } else if (property === 'font-style' && value === 'italic') addClass(node, 'code-italic')
          else if (property === 'font-weight' && value === 'bold') addClass(node, 'code-bold')
        }
      })
    })
  }
}

// Shiki's nodes carry `class`, hast's own carry `className`: read both.
function classList(node: Element): string[] {
  const value = node.properties.className ?? node.properties.class
  return Array.isArray(value) ? value.map(String) : typeof value === 'string' ? value.split(/\s+/).filter(Boolean) : []
}

function addClass(node: Element, name: string) {
  const list = classList(node)
  delete node.properties.class
  node.properties.className = [...list, name]
}

// Marks words in a code block, from its info string: ```text /chat/ marks every
// `chat`; ```text /chat/2 marks only the second; ```text /a/ /b/1,3 combines.
// The words stay the author's own text: a marked word is a class (code-mark).
const MARK = /\/((?:\\.|[^/])+)\/((?:\d+,)*\d+)?/g

type ShikiTransformer = NonNullable<ShikiConfig['transformers']>[number]

export function transformerMarkWords(): ShikiTransformer {
  return {
    name: 'chqrles:mark-words',
    preprocess(code, options) {
      const meta = this.options.meta?.__raw
      if (!meta) return
      const ranges: [number, number][] = []
      for (const [, raw, only] of meta.matchAll(MARK)) {
        const word = raw!.replace(/\\(.)/g, '$1')
        const wanted = only?.split(',').map(Number)
        let index = code.indexOf(word)
        for (let n = 1; index !== -1; n++, index = code.indexOf(word, index + word.length)) {
          if (!wanted || wanted.includes(n)) ranges.push([index, index + word.length])
        }
      }
      // Marks that touch or overlap become one: Shiki refuses overlapping
      // decorations, and a refused .md post would ship with an empty body.
      ranges.sort((p, q) => p[0] - q[0])
      const merged: [number, number][] = []
      for (const [start, end] of ranges) {
        const last = merged.at(-1)
        if (last && start <= last[1]) last[1] = Math.max(last[1], end)
        else merged.push([start, end])
      }
      options.decorations ||= []
      for (const [start, end] of merged) options.decorations.push({ start, end, properties: { class: 'code-mark' } })
    },
  }
}
