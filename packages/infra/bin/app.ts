import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { App, Validations } from 'aws-cdk-lib'
import { AwsSolutionsChecks } from 'cdk-nag'
import { DeployRoleStack } from '../lib/deploy-role-stack'
import { SiteStack } from '../lib/site-stack'

const here = dirname(fileURLToPath(import.meta.url))
const app = new App()

// cdk-nag's AWS Solutions rules run on every synth. A finding without a
// written acknowledgement fails it.
Validations.of(app).addPlugins(new AwsSolutionsChecks(app))

// The account that also runs Whippin, in us-east-1, where CloudFront needs its
// certificate. Pinned so a synth without credentials (CI) resolves the cached
// zone lookup, and so a deploy with other credentials fails instead of
// landing elsewhere.
const env = { account: '879381243389', region: 'us-east-1' }
// Stack tags: CloudFormation copies them onto every resource that takes tags,
// including the ones CDK creates for its own helpers.
const tags = { Project: 'chqrles.me', ManagedBy: 'cdk' }

new SiteStack(app, 'ChqrlesMeSite', {
  env,
  tags,
  domainName: 'chqrles.me',
  siteDir: join(here, '..', '..', 'site', 'dist'),
})

new DeployRoleStack(app, 'ChqrlesMeDeployRole', {
  env,
  tags,
  githubSubject: 'repo:0xChqrles@19663399/chqrles.me@1387573502:ref:refs/heads/main',
})
