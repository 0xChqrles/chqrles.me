import { describe, expect, it } from 'vitest'
import { extractStyles, mathCss } from './math-styles'

describe('math styles', () => {
  it('turns each style attribute into a key, the same style sharing one', () => {
    const styles: Record<string, string> = {}
    const html = extractStyles('<span style="height:1em;"></span><i style="top:-2em;left:0"></i><span style="height:1em;"></span>', styles)
    expect(html).not.toContain('style=')
    expect(Object.values(styles).sort()).toEqual(['height:1em;', 'top:-2em;left:0'])
    expect(html.match(/data-k="[0-9a-f]{8}"/g)).toHaveLength(3)
    for (const key of Object.keys(styles)) expect(html).toContain(`data-k="${key}"`)
  })

  it('writes one rule per key, every declaration !important', () => {
    const styles: Record<string, string> = {}
    extractStyles('<i style="top:-2em;left:0;"></i>', styles)
    const [key] = Object.keys(styles)
    expect(mathCss(styles)).toBe(`[data-k="${key}"]{top:-2em!important;left:0!important}`)
  })
})
