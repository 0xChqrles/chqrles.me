import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const folder = join(import.meta.dirname, '..', '..', '..', '.github', 'workflows')
const workflow = (name: string) => readFileSync(join(folder, name), 'utf8')
const workflows = readdirSync(folder)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => [name, workflow(name)] as const)

// The events under a workflow's `on:`, read as text: every line at the first indent, as
// written. A trigger written on the `on:` line itself, or as a quoted or spaced key, comes
// back as that line, so it never passes for one.
function triggers(yaml: string) {
  const block = yaml.match(/^on:(.*)\n((?:[ #].*\n|\n)*)/m)!
  return block[1]!.trim() ? [block[1]!.trim()] : [...block[2]!.matchAll(/^ {2}(?![ #])(.+)$/gm)].map((match) => match[1]!.trim())
}

describe('what can deploy', () => {
  it('runs deploy-course.yml by hand only', () => {
    expect(triggers(workflow('deploy-course.yml'))).toEqual(['workflow_dispatch:'])
  })

  it.each(['  push:', '  "push":', "  'push':", '  push :', '  ? push'])('sees the trigger %j', (line) => {
    const yaml = workflow('deploy-course.yml').replace(/^concurrency:/m, `${line}\n\nconcurrency:`)
    expect(triggers(yaml)).not.toEqual(['workflow_dispatch:'])
  })

  it('takes down a live course only', () => {
    const deploy = workflow('deploy-course.yml')
    const check = deploy.indexOf('        if: ${{ inputs.empty }}\n        run: aws cloudformation describe-stacks --stack-name "ChqrlesMeCourse-$COURSE"')
    expect(check).toBeGreaterThan(deploy.indexOf('aws-actions/configure-aws-credentials'))
    expect(check).toBeLessThan(deploy.indexOf('cdk deploy'))
  })

  it('keeps deploy.yml to the blog', () => {
    const deploy = workflow('deploy.yml')
    expect(deploy.match(/cdk deploy .*/g)).toEqual(['cdk deploy ChqrlesMeSite --require-approval never'])
    expect(deploy).not.toMatch(/course/i)
  })

  it('deploys the one course it is given', () => {
    expect(workflow('deploy-course.yml').match(/cdk deploy .*/g)).toEqual(['cdk deploy "ChqrlesMeCourse-$COURSE" --require-approval never'])
  })

  it.each(workflows)('never names every stack in %s', (_, yaml) => {
    expect(yaml).not.toContain('--all')
    for (const command of yaml.match(/cdk deploy .*/g) ?? []) expect(command).not.toContain('*')
  })

  it.each(workflows)('never gives a job an environment in %s, which the role would refuse', (_, yaml) => {
    expect(yaml).not.toMatch(/^\s+environment:/m)
  })

  it('lets the inputs reach a shell through env only', () => {
    for (const line of workflow('deploy-course.yml').split('\n')) {
      if (line.includes('${{') && line.includes('inputs.')) expect(line).toMatch(/^\s*(COURSE|EMPTY|group|path|if):/)
    }
  })
})
