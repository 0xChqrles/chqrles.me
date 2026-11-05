import { createHash } from 'node:crypto'

// KaTeX writes a style attribute on most of its spans, and the CSP forbids one. Each
// becomes data-k, keyed by a hash of its value, and a rule in /math.css.
export function extractStyles(html: string, styles: Record<string, string>): string {
  return html.replace(/ style="([^"]*)"/g, (_, css: string) => {
    const key = createHash('sha256').update(css).digest('hex').slice(0, 8)
    styles[key] = css
    return ` data-k="${key}"`
  })
}

// !important, because an inline style beats KaTeX's own classes and a rule does not.
export function mathCss(styles: Record<string, string>): string {
  return Object.keys(styles)
    .sort()
    .map((key) => {
      const declarations = styles[key]!.split(';').filter(Boolean)
      return `[data-k="${key}"]{${declarations.map((declaration) => `${declaration}!important`).join(';')}}`
    })
    .join('\n')
}
