import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse, type DefaultTreeAdapterMap } from 'parse5'

type ParentNode = DefaultTreeAdapterMap['parentNode']
type Element = DefaultTreeAdapterMap['element']

// CloudFront refuses a longer Content-Security-Policy header value.
export const CSP_MAX_LENGTH = 1783

// The site's Content-Security-Policy, read off the build so the two always
// agree. Only the site's own files may load. The inline scripts and styles
// Astro writes for an interactive figure are allowed by their hash. An inline
// style="" or on…="" attribute cannot be allowed that way, so it fails the synth.
export function contentSecurityPolicy(siteDir: string): string {
  const scripts = new Set<string>()
  const styles = new Set<string>()

  for (const file of htmlFiles(siteDir)) {
    // Parsed with scripting off, so what a <noscript> holds is checked too.
    walk(parse(readFileSync(file, 'utf8'), { scriptingEnabled: false }), (element) => {
      for (const { name } of element.attrs) {
        if (name === 'style' || /^on[a-z]+$/.test(name)) {
          throw new Error(
            `${relative(siteDir, file)}: <${element.tagName} ${name}="…"> is inline code the CSP forbids. Move it to a stylesheet or a script file.`,
          )
        }
      }
      if (element.tagName === 'script' && !attribute(element, 'src') && isJavaScript(element)) scripts.add(hash(element))
      if (element.tagName === 'style') styles.add(hash(element))
    })
  }

  const policy = [
    "default-src 'none'",
    ["script-src 'self'", ...[...scripts].sort()].join(' '),
    ["style-src 'self'", ...[...styles].sort()].join(' '),
    "img-src 'self'",
    "font-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ')

  if (policy.length > CSP_MAX_LENGTH) {
    throw new Error(`The CSP is ${policy.length} characters; CloudFront accepts ${CSP_MAX_LENGTH}. Too many distinct inline scripts or styles.`)
  }
  return policy
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name))
}

function walk(node: ParentNode, visit: (element: Element) => void) {
  for (const child of node.childNodes) {
    if (!('tagName' in child)) continue
    visit(child)
    walk(child.tagName === 'template' ? (child as DefaultTreeAdapterMap['template']).content : child, visit)
  }
}

function attribute(element: Element, name: string) {
  return element.attrs.find((attr) => attr.name === name)?.value
}

// Only JSON data blocks (application/json, application/ld+json…) never run.
// Every other inline script (classic, module, importmap, speculationrules, in
// any case) falls under script-src, so it gets a hash.
function isJavaScript(element: Element) {
  const type = (attribute(element, 'type') ?? '').trim().toLowerCase()
  return !/(^|[/+])json$/.test(type)
}

function hash(element: Element) {
  const text = element.childNodes.map((node) => ('value' in node && node.nodeName === '#text' ? node.value : '')).join('')
  return `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`
}
