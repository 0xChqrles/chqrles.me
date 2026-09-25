import type { Paragraph, Parent, Root } from 'mdast'
import { visitParents } from 'unist-util-visit-parents'

// A fenced block whose language is `figure` holds a note for a figure that is
// not built yet. It renders as a visible placeholder, never as code:
// <figure class="placeholder"><pre>the note</pre></figure>.
export function remarkFigurePlaceholders() {
  return (tree: Root) => {
    visitParents(tree, 'code', (node, ancestors) => {
      if (node.lang !== 'figure') return
      const parent = ancestors.at(-1) as Parent
      // A paragraph, because the code handler would wrap the figure in a <pre>.
      const placeholder: Paragraph = {
        type: 'paragraph',
        children: [],
        data: {
          hName: 'figure',
          hProperties: { className: ['placeholder'] },
          hChildren: [{ type: 'element', tagName: 'pre', properties: {}, children: [{ type: 'text', value: node.value }] }],
        },
      }
      parent.children[parent.children.indexOf(node)] = placeholder
    })
  }
}
