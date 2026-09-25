import type { Element, ElementContent, Root } from 'hast'
import { visitParents } from 'unist-util-visit-parents'
import type { VFile } from 'vfile'
import { formatDuration, secondsFor, trackNumber } from './duration'

// Rehype step: every ## section opens with a cue, its number and the reading
// time elapsed to reach it:
// <h2 data-t="70"><span class="cue">…</span><span class="heading">…</span></h2>.
// It runs after the heading ids are set, so a cue never leaks into an id.
// The post's whole length lands in its frontmatter as `seconds`, which
// render() hands back as remarkPluginFrontmatter. A figure placeholder is a
// note, not reading, so it does not count.
export function rehypeSectionCues() {
  return (tree: Root, file: VFile) => {
    let words = 0
    let section = 0
    visitParents(tree, (node, ancestors) => {
      if (node.type === 'text') {
        if (!ancestors.some(isPlaceholder)) words += countWords(node.value)
        return
      }
      if (node.type !== 'element' || node.tagName !== 'h2') return
      section += 1
      const seconds = secondsFor(words)
      node.properties = { ...node.properties, dataT: seconds }
      words += countWords(textOf(node))
      node.children = [
        cue(trackNumber(section), formatDuration(seconds)),
        { type: 'element', tagName: 'span', properties: { className: ['heading'] }, children: node.children },
      ]
      // The heading is counted; the cue's own text must not be.
      return 'skip'
    })
    const astro = (file.data.astro ??= {}) as { frontmatter?: Record<string, unknown> }
    astro.frontmatter ??= {}
    astro.frontmatter.seconds = secondsFor(words)
  }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length
}

function textOf(node: ElementContent): string {
  if (node.type === 'text') return node.value
  return node.type === 'element' ? node.children.map(textOf).join('') : ''
}

function isPlaceholder(node: { type: string }): boolean {
  if (node.type !== 'element') return false
  const { tagName, properties } = node as Element
  const className = properties?.className
  return tagName === 'figure' && Array.isArray(className) && className.includes('placeholder')
}

function cue(number: string, elapsed: string): Element {
  const span = (className: string, text: string): ElementContent => ({
    type: 'element',
    tagName: 'span',
    properties: { className: [className] },
    children: [{ type: 'text', value: text }],
  })
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: ['cue'], ariaHidden: 'true' },
    children: [span('cue-n', number), span('cue-t', elapsed)],
  }
}
