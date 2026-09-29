import type { Root } from 'hast'
import { visitParents } from 'unist-util-visit-parents'
import type { VFile } from 'vfile'
import { langOfPath } from './urls'

// French typography, applied at render time. The post files are never edited.
// A line must never break before : ; ? ! or inside « », inside a number like
// 10 000, or between a number and % or a currency symbol. Only the spaces the
// author typed are replaced (a line break in the source counts as one): a
// missing space stays missing.

const NBSP = ' ' // espace insécable
const NNBSP = ' ' // espace fine insécable

const RULES: [RegExp, string | ((match: string) => string)][] = [
  [/\s+([;?!])/g, `${NNBSP}$1`],
  [/\s+:/g, `${NBSP}:`],
  [/«\s+/g, `«${NBSP}`],
  [/\s+»/g, `${NBSP}»`],
  // A whole number written in groups of three: 10 000, 1 182e, 3 000 000.
  [/(?<![\d,.])\d{1,3}(?:[   ]\d{3})+(?!\d)/g, (number) => number.replace(/[  ]/g, NNBSP)],
  [/(\d)\s+([%\p{Sc}])/gu, `$1${NBSP}$2`],
]

export function frenchSpacing(text: string): string {
  return RULES.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement as string), text)
}

// Rehype step: applies frenchSpacing to the text of a French post, never
// inside code. The post's language is in its file name (urls.ts).
const VERBATIM = new Set(['code', 'pre', 'kbd', 'samp', 'script', 'style'])

export function rehypeFrenchSpacing() {
  return (tree: Root, file: VFile) => {
    if (langOfPath(file.path) !== 'fr') return
    visitParents(tree, 'text', (node, ancestors) => {
      // An HTML element, or a JSX one in MDX.
      const verbatim = ancestors.some(
        (a) => (a.type === 'element' && VERBATIM.has(a.tagName)) || ('name' in a && typeof a.name === 'string' && VERBATIM.has(a.name)),
      )
      if (!verbatim) node.value = frenchSpacing(node.value)
    })
  }
}
