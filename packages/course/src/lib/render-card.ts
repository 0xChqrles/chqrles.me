import katex from 'katex'
import { marked } from 'marked'
import type { Outline } from './course'
import { extractStyles } from './math-styles'
import { url } from './base'

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const apos = <S extends string | undefined>(s: S) => (s && s.replace(/'/g, '’')) as S

// KaTeX breaks a formula only after a top-level relation or binary operator. Long tuples and
// \qquad-separated statements need more, or they cannot fit a phone column.
export function breakable(tex: string): string {
  if (tex.length < 40 || tex.includes('\\begin')) return tex
  let depth = 0
  let pending = false
  let out = ''
  for (const tok of tex.match(/\\[a-zA-Z]+|\\[^a-zA-Z]|[^\\]/g) ?? []) {
    const glue = /^(\s|\\ |\\,|\\;|\\quad|\\qquad)$/.test(tok)
    if (pending && !glue) {
      out += '\\allowbreak '
      pending = false
    }
    out += tok
    if (tok === '{' || tok === '\\left') depth++
    else if (tok === '}' || tok === '\\right') depth--
    else if (depth === 0 && [',', ';', '\\|', '\\quad', '\\qquad'].includes(tok)) pending = true
  }
  return out
}

// French typography on text nodes only (never in code, pre, svg, or tags).
export function typo(html: string): string {
  const parts = html.split(/(<[^>]+>)/)
  let skip = 0
  return parts
    .map((p) => {
      if (p.startsWith('<')) {
        const t = p.match(/^<(\/?)(code|pre|svg|script|style|textarea)\b/i)
        if (t) skip += t[1] ? -1 : 1
        return p
      }
      if (skip > 0) return p
      return p
        .replace(/'|&#39;/g, '’')
        .replace(/ ([:;?!%»])/g, ' $1')
        .replace(/« /g, '« ')
        .replace(/(?<=\d) (?=\d{3}(?:\D|$))/g, ' ')
        .replace(/(\d) (Mo|Go|Ko|ko|Mio|Gio|min|ms|s|h|bits|bit|\$|€)(?=[\s.,;:!?)]|$)/g, '$1 $2')
    })
    .join('')
}

const LABELS: Record<string, string> = { piege: 'Piège', note: 'En passant', incertain: 'Pas vérifié', code: 'Dans le code' }

type Block = { type: string; arg?: string; buf: string[]; hasRep?: boolean }

// The renderer of one course: links need its cards, math needs its macros. `written`
// says which cards have a file. Faults pile up in `errors`, and the math's styles in `styles`.
export function cardRenderer(outline: Outline, written: (id: string) => boolean) {
  const errors: string[] = []
  const styles: Record<string, string> = {}
  const err = (id: string, m: string) => void errors.push(`${id}: ${m}`)
  const ids = new Set(outline.cartes.map((c) => c.id))
  const cardOf = (id: string) => outline.cartes.find((c) => c.id === id)!

  function frontMatter(raw: string, file: string): [Record<string, string>, string] {
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (!m) {
      err(file, 'no front matter')
      return [{}, raw]
    }
    const meta: Record<string, string> = {}
    for (const line of m[1]!.split('\n')) {
      const k = line.match(/^([a-z_]+):\s*(.*)$/)
      if (k) meta[k[1]!] = k[2]!.trim()
    }
    return [meta, m[2]!]
  }

  // A card with no source file is planned: it stays on the map with its definition, but it has no page yet.
  const notion = (id: string, text: string) =>
    written(id) ? `<a class="c" href="${url(`${id}/`)}" data-c="${id}">${text}</a>` : `<span class="c prevu" tabindex="0" data-c="${id}">${text}</span>`

  function renderMath(id: string, tex: string, display: boolean): string {
    try {
      const html = katex.renderToString(breakable(tex), {
        displayMode: display,
        throwOnError: true,
        macros: outline.cours.macros,
        strict: 'ignore',
        output: 'html',
        trust: false,
      })
      return extractStyles(html, styles)
    } catch (e) {
      err(id, `math: ${(e as Error).message.slice(0, 160)} in «${tex.slice(0, 80)}»`)
      return `<code>${esc(tex)}</code>`
    }
  }

  // Every card is its own page, so a link written as a hash becomes a path. A planned
  // card has no page, so a hash link to one is a fault. The hashes that name no card
  // stay: they point inside the page.
  function finish(id: string, html: string): string {
    if (/data-widget=["']/.test(html)) err(id, 'attribut data-widget')
    return html.replace(/href="#([^"]*)"/g, (link, target: string) => {
      if (target === 'accueil') return `href="${url()}"`
      if (!ids.has(target)) return link
      if (written(target)) return `href="${url(`${target}/`)}"`
      err(id, `lien vers carte prévue ${target}`)
      return link
    })
  }

  function renderCard(id: string, md: string): string {
    const maths: [string, boolean][] = []
    const hold = (tex: string, display: boolean) => {
      maths.push([tex, display])
      return `⦃${maths.length - 1}⦄`
    }
    // Protect fenced code and inline code before reading math.
    const codes: string[] = []
    const keep = (m: string) => {
      codes.push(m)
      return `⦅${codes.length - 1}⦆`
    }
    const restore = (text: string) => text.replace(/⦅(\d+)⦆/g, (_, i: string) => codes[+i]!)
    let s = md.replace(/^```[\s\S]*?^```/gm, keep)
    s = s.replace(/`[^`\n]+`/g, keep)
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t: string) => `\n\n${hold(t.trim(), true)}\n\n`)
    s = s.replace(/(^|[^\\$])\$(?!\s)((?:[^$\\\n]|\\.)+?)(?<!\s)\$(?!\d)/g, (_, b: string, t: string) => b + hold(t, false))
    s = s.replace(/\\\$/g, '$')
    // Concept links.
    s = s.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, cid: string, text?: string) => {
      if (!ids.has(cid)) {
        err(id, `lien vers carte inconnue ${cid}`)
        return text || cid
      }
      return notion(cid, text || apos(cardOf(cid).court || cardOf(cid).titre))
    })
    // Directives.
    const blocks: string[] = []
    let exo = 0
    const stack: Block[] = [{ type: 'root', buf: [] }]
    const close = () => {
      const b = stack.pop()!
      const inner = restore(b.buf.join('\n').trim())
      const top = stack[stack.length - 1]!
      if (b.type === 'reponse') top.hasRep = true
      let html: string
      const body = b.type === 'figure' ? '' : (marked.parse(inner) as string)
      const arg = b.arg ? (marked.parseInline(restore(b.arg)) as string) : ''
      if (b.type === 'figure') {
        const vb = inner.match(/<svg\b[^>]*viewBox="0 0 (\d+) (\d+)"/)
        if (!vb) err(id, 'figure sans <svg viewBox="0 0 W H">')
        else if (+vb[1]! > 480) err(id, `figure trop large (${vb[1]} > 480)`)
        if (!/<svg\b[^>]*role="img"[^>]*aria-label="[^"]{12,}"/.test(inner)) err(id, 'figure sans role="img" et aria-label')
        if (/<(style|script|foreignObject)\b/.test(inner)) err(id, 'figure avec style, script ou foreignObject')
        if (!arg) err(id, 'figure sans légende')
        html = `<figure class="fig">${inner}<figcaption>${arg}</figcaption></figure>`
      } else if (b.type === 'exercice') {
        if (!b.hasRep) err(id, `exercice ${exo + 1} sans réponse`)
        html = `<div class="bloc exo"><span class="tag">Exercice ${++exo}${arg ? ' ' + arg : ''}</span>${body}</div>`
      } else if (b.type === 'reponse') html = `<details class="der rep"><summary>${arg || 'Réponse'}</summary><div>${body}</div></details>`
      else if (b.type === 'quiz') html = `<div class="bloc quiz"><span class="tag">${arg || 'Quiz'}</span>${body}</div>`
      else if (b.type === 'derivation') html = `<details class="der"><summary>${arg || 'La dérivation complète'}</summary><div>${body}</div></details>`
      else if (b.type === 'marge') html = `<aside class="marge">${body}</aside>`
      else if (LABELS[b.type]) html = `<div class="bloc ${b.type}"><span class="tag">${arg || LABELS[b.type]}</span>${body}</div>`
      else {
        err(id, `directive inconnue ${b.type}`)
        html = body
      }
      blocks.push(html)
      top.buf.push('', `⦇${blocks.length - 1}⦈`, '')
    }
    for (const l of s.split('\n')) {
      const open = l.match(/^:::([a-z]+)\s*(.*)$/)
      if (open) stack.push({ type: open[1]!, arg: open[2]!.trim(), buf: [] })
      else if (/^:::\s*$/.test(l)) {
        if (stack.length > 1) close()
        else err(id, 'fermeture ::: en trop')
      } else stack[stack.length - 1]!.buf.push(l)
    }
    while (stack.length > 1) {
      err(id, `directive ${stack[stack.length - 1]!.type} non fermée`)
      close()
    }
    let html = marked.parse(restore(stack[0]!.buf.join('\n'))) as string
    // Inside html blocks, code placeholders were restored as raw backticks; marked handled the outer level only.
    for (let n = 0; n < 4 && html.includes('⦇'); n++) {
      html = html
        .replace(/<p>⦇(\d+)⦈<\/p>\n?/g, (_, i: string) => blocks[+i]!)
        .replace(/⦇(\d+)⦈/g, (_, i: string) => blocks[+i]!)
    }
    html = html.replace(/<table>/g, '<div class="tw"><table>').replace(/<\/table>/g, '</table></div>')
    html = typo(html)
    // A formula followed by French punctuation must not leave the punctuation alone on the next line.
    html = html.replace(/⦃(\d+)⦄([  ][:;?!%»])?/g, (_, i: string, tail?: string) => {
      const [tex, display] = maths[+i]!
      const m = renderMath(id, tex, display)
      return tail && !display && tex.length < 40 ? `<span class="nb">${m}${tail}</span>` : m + (tail || '')
    })
    return finish(id, html)
  }

  // The home page is either plain HTML or a card's Markdown.
  const renderHome = (home: string) => (home.trimStart().startsWith('<') ? finish('accueil', typo(home)) : renderCard('accueil', home))

  return { errors, styles, err, frontMatter, notion, renderCard, renderHome }
}
