import { readFileSync } from 'node:fs'
import { App } from 'aws-cdk-lib'

// A test app with the feature flags of cdk.json, so tests see the template the
// real synth produces.
export function testApp(context: Record<string, unknown> = {}) {
  const { context: flags } = JSON.parse(readFileSync(new URL('../cdk.json', import.meta.url), 'utf8'))
  return new App({ context: { ...flags, ...context } })
}
