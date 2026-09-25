import type { Root } from 'hast'
import { visitParents } from 'unist-util-visit-parents'
import type { VFile } from 'vfile'

// French typography, applied at render time. The post files are never edited.
// A line must never break before : ; ? ! or inside « », nor inside a number
// like 10 000 or 100 %. Only spaces the author typed are replaced: a missing
// space stays missing.

const NBSP = ' ' // espace insécable
const NNBSP = ' ' // espace fine insécable
const SPACES = '[ \\u00A0\\u202F]+'

const RULES: [RegExp, string][] = [
  [new RegExp(`${SPACES}([;?!])`, 'g'), `${NNBSP}$1`],
  [new RegExp(`${SPACES}:`, 'g'), `${NBSP}:`],
  [new RegExp(`«${SPACES}`, 'g'), `«${NBSP}`],
  [new RegExp(`${SPACES}»`, 'g'), `${NBSP}»`],
  [/(\d)[   ](?=\d{3}(?!\d))/g, `$1${NNBSP}`],
  [new RegExp(`(\\d)${SPACES}([%$€])`, 'g'), `$1${NBSP}$2`],
]

export function frenchSpacing(text: string): string {
  return RULES.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text)
}

// Rehype step: applies frenchSpacing to the text of a French post, never
// inside code. A post's `lang` reaches the plugin through its frontmatter.
const VERBATIM = new Set(['code', 'pre', 'kbd', 'samp', 'script', 'style'])

export function rehypeFrenchSpacing() {
  return (tree: Root, file: VFile) => {
    const astro = file.data.astro as { frontmatter?: { lang?: string } } | undefined
    if ((astro?.frontmatter?.lang ?? 'fr') !== 'fr') return
    visitParents(tree, 'text', (node, ancestors) => {
      if (ancestors.some((a) => a.type === 'element' && VERBATIM.has(a.tagName))) return
      node.value = frenchSpacing(node.value)
    })
  }
}
