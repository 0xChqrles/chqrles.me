import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { AwsSolutionsChecks } from 'cdk-nag'
import { describe, expect, it } from 'vitest'
import { CourseStack, LEARN, LearnStack } from './learn-stack'
import { APEX, SiteStack } from './site-stack'
import { testApp } from './test-app'

const env = { account: '111122223333', region: 'us-east-1' }
const DOMAIN = APEX

// A stand-in for packages/site/dist, with an inline script to hash and the
// .DS_Store files a laptop leaves behind.
const siteDir = mkdtempSync(join(tmpdir(), 'site-'))
for (const [path, body] of Object.entries({
  'index.html': '<link rel="stylesheet" href="/_astro/page.css"><script>boot()</script>',
  '404.html': '404',
  'post/index.html': 'post',
  '_astro/page.css': 'a{}',
  '.DS_Store': '',
  'post/.DS_Store': '',
})) {
  mkdirSync(join(siteDir, path, '..'), { recursive: true })
  writeFileSync(join(siteDir, path), body)
}

// The zone lookup, as cdk.context.json caches it.
const app = testApp({
  [`hosted-zone:account=${env.account}:domainName=${DOMAIN}:region=${env.region}`]: { Id: '/hostedzone/ZTEST', Name: `${DOMAIN}.` },
})
const stack = new SiteStack(app, 'Site', { env, siteDir })
const template = Template.fromStack(stack)
const [distribution] = Object.values(template.findResources('AWS::CloudFront::Distribution'))
const config = distribution?.Properties.DistributionConfig
const uploads = Object.entries(template.findResources('Custom::CDKBucketDeployment'))

describe('the site stack', () => {
  it('keeps the bucket private, encrypted and TLS-only', () => {
    template.resourceCountIs('AWS::S3::Bucket', 1)
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true },
      BucketEncryption: { ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] },
    })
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([Match.objectLike({ Effect: 'Deny', Condition: { Bool: { 'aws:SecureTransport': 'false' } } })]),
      },
    })
  })

  it('reads the bucket through Origin Access Control only', () => {
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1)
    expect(config.Origins).toHaveLength(1)
    expect(config.Origins[0].OriginAccessControlId).toBeDefined()
    expect(config.Origins[0].S3OriginConfig).toEqual({ OriginAccessIdentity: '' })
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Effect: 'Allow', Action: 's3:GetObject', Principal: { Service: 'cloudfront.amazonaws.com' } }),
        ]),
      },
    })
  })

  it('serves the apex over HTTP/2 and HTTP/3, TLS 1.2 or later, price class 100', () => {
    expect(config).toMatchObject({
      Aliases: [DOMAIN],
      HttpVersion: 'http2and3',
      PriceClass: 'PriceClass_100',
      ViewerCertificate: { MinimumProtocolVersion: 'TLSv1.2_2021', SslSupportMethod: 'sni-only' },
    })
    // The zone is looked up, never created: a new zone would get new nameservers.
    template.resourceCountIs('AWS::Route53::HostedZone', 0)
    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: DOMAIN,
      ValidationMethod: 'DNS',
      DomainValidationOptions: [{ DomainName: DOMAIN, HostedZoneId: 'ZTEST' }],
    })
    for (const Type of ['A', 'AAAA']) {
      template.hasResourceProperties('AWS::Route53::RecordSet', { Type, Name: `${DOMAIN}.`, AliasTarget: Match.objectLike({}) })
    }
  })

  it('attaches the directory-URL function to viewer requests and the language cookie to viewer responses', () => {
    const functions = Object.entries(template.findResources('AWS::CloudFront::Function')) as [string, any][]
    expect(functions).toHaveLength(2)
    const idOf = (file: string) => {
      const code = readFileSync(new URL(`../functions/${file}`, import.meta.url), 'utf8')
      const [id, fn] = functions.find(([, f]) => f.Properties.FunctionCode === code) ?? []
      expect(fn?.Properties.FunctionConfig.Runtime).toBe('cloudfront-js-2.0')
      return id
    }
    expect(config.DefaultCacheBehavior.FunctionAssociations).toEqual([
      { EventType: 'viewer-request', FunctionARN: { 'Fn::GetAtt': [idOf('directory-urls.js'), 'FunctionARN'] } },
      { EventType: 'viewer-response', FunctionARN: { 'Fn::GetAtt': [idOf('lang-cookie.js'), 'FunctionARN'] } },
    ])
  })

  it('answers a missing path with /404.html and a 404 status', () => {
    expect(config.CustomErrorResponses).toEqual([
      { ErrorCode: 403, ResponseCode: 404, ResponsePagePath: '/404.html' },
      { ErrorCode: 404, ResponseCode: 404, ResponsePagePath: '/404.html' },
    ])
  })

  it('allows no third party but Umami in the CSP', () => {
    const [policy] = Object.values(template.findResources('AWS::CloudFront::ResponseHeadersPolicy'))
    const csp: string = policy?.Properties.ResponseHeadersPolicyConfig.SecurityHeadersConfig.ContentSecurityPolicy.ContentSecurityPolicy
    const sources = csp.split(';').flatMap((directive) => directive.trim().split(/\s+/).slice(1))
    expect(sources.filter((source) => !["'self'", "'none'"].includes(source) && !source.startsWith("'sha256-"))).toEqual([
      'https://cloud.umami.is',
      'https://gateway.umami.is',
    ])
    expect(csp).toMatch(/^default-src 'none';/)
  })

  it('sends the security headers, with the CSP read off the build', () => {
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: {
        SecurityHeadersConfig: {
          StrictTransportSecurity: { AccessControlMaxAgeSec: 31536000, IncludeSubdomains: true, Override: true, Preload: Match.absent() },
          ContentSecurityPolicy: { ContentSecurityPolicy: Match.stringLikeRegexp("script-src 'self' https://cloud.umami.is 'sha256-"), Override: true },
          ContentTypeOptions: { Override: true },
          FrameOptions: { FrameOption: 'DENY', Override: true },
          ReferrerPolicy: { ReferrerPolicy: 'strict-origin-when-cross-origin', Override: true },
        },
      },
    })
  })

  it('uploads hashed assets for a year, never pruned', () => {
    const [, assets] = uploads.find(([, upload]) => upload.Properties.Include) ?? []
    expect(assets?.Properties).toMatchObject({
      Exclude: ['*'],
      Include: ['_astro/*'],
      Prune: false,
      SystemMetadata: { 'cache-control': 'public, max-age=31536000, immutable' },
    })
    expect(assets?.Properties.DistributionId).toBeUndefined()
  })

  it('uploads everything else last, revalidated, pruned, and purges the cache', () => {
    const [assetsId] = uploads.find(([, upload]) => upload.Properties.Include) ?? []
    const [, pages] = uploads.find(([, upload]) => !upload.Properties.Include) ?? []
    expect(pages?.Properties).toMatchObject({
      Exclude: ['_astro/*'],
      Prune: true,
      SystemMetadata: { 'cache-control': 'no-cache' },
      DistributionPaths: ['/*'],
    })
    expect(pages?.DependsOn).toContain(assetsId)
  })

  it('never uploads a .DS_Store', () => {
    const staged = readdirSync(app.synth().directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('asset.'))
      .map((entry) => join(entry.parentPath, entry.name))
      .find((dir) => readdirSync(dir).includes('404.html'))
    expect(staged).toBeDefined()
    const files = readdirSync(staged!, { recursive: true }).map(String)
    expect(files).toContain(join('post', 'index.html'))
    expect(files.filter((file) => file.endsWith('.DS_Store'))).toEqual([])
  })

  it('passes cdk-nag', () => {
    const { success, violations } = new AwsSolutionsChecks(app).validateScope(stack)
    expect(violations).toEqual([])
    expect(success).toBe(true)
  })
})

describe('the courses', () => {
  // A stand-in for packages/course/empty: its 404.html is the host's.
  const emptyDir = mkdtempSync(join(tmpdir(), 'empty-'))
  writeFileSync(join(emptyDir, 'index.html'), '')
  writeFileSync(join(emptyDir, '404.html'), '404')
  // The lookup goes to the apex's zone, so it reads the same cached entry.
  const courseApp = testApp({
    [`hosted-zone:account=${env.account}:domainName=${DOMAIN}:region=${env.region}`]: { Id: '/hostedzone/ZTEST', Name: `${DOMAIN}.` },
  })
  const learnStack = new LearnStack(courseApp, 'Learn', { env, courseDir: siteDir, emptyDir })
  const courseStack = new CourseStack(courseApp, 'Course', { env, learn: learnStack, slug: 'demo', siteDir })
  const learn = Template.fromStack(learnStack)
  const course = Template.fromStack(courseStack)
  const learnConfig = Object.values(learn.findResources('AWS::CloudFront::Distribution'))[0]?.Properties.DistributionConfig

  it('serves every course on one host, and nothing else', () => {
    expect(LEARN).toBe(`learn.${DOMAIN}`)
    expect(learnConfig.Aliases).toEqual([LEARN])
  })

  it('gets a certificate for exactly that name, validated in the apex zone', () => {
    learn.resourceCountIs('AWS::CertificateManager::Certificate', 1)
    learn.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: LEARN,
      SubjectAlternativeNames: Match.absent(),
      ValidationMethod: 'DNS',
      DomainValidationOptions: [{ DomainName: LEARN, HostedZoneId: 'ZTEST' }],
    })
  })

  it('writes its A and AAAA records into the apex zone, and creates no zone', () => {
    for (const Type of ['A', 'AAAA']) {
      learn.hasResourceProperties('AWS::Route53::RecordSet', { Type, Name: `${LEARN}.`, HostedZoneId: 'ZTEST', AliasTarget: Match.objectLike({}) })
    }
    learn.resourceCountIs('AWS::Route53::RecordSet', 2)
    learn.resourceCountIs('AWS::Route53::HostedZone', 0)
  })

  it('attaches one function, to viewer requests: no language redirect, no cookie', () => {
    const functions = Object.entries(learn.findResources('AWS::CloudFront::Function')) as [string, any][]
    expect(functions).toHaveLength(1)
    const [id, fn] = functions[0]!
    expect(fn.Properties.FunctionCode).toBe(readFileSync(new URL('../functions/course-urls.js', import.meta.url), 'utf8'))
    expect(fn.Properties.FunctionConfig.Runtime).toBe('cloudfront-js-2.0')
    expect(learnConfig.DefaultCacheBehavior.FunctionAssociations).toEqual([
      { EventType: 'viewer-request', FunctionARN: { 'Fn::GetAtt': [id, 'FunctionARN'] } },
    ])
  })

  it('answers a missing path with the host’s /404.html, uploaded alone and never pruned', () => {
    expect(learnConfig.CustomErrorResponses).toEqual([
      { ErrorCode: 403, ResponseCode: 404, ResponsePagePath: '/404.html' },
      { ErrorCode: 404, ResponseCode: 404, ResponsePagePath: '/404.html' },
    ])
    const ups = Object.values(learn.findResources('Custom::CDKBucketDeployment')) as any[]
    expect(ups).toHaveLength(1)
    expect(ups[0].Properties.Prune).toBe(false)
    expect(ups[0].Properties.Exclude).toEqual(['*'])
    expect(ups[0].Properties.Include).toEqual(['404.html'])
  })

  it('uploads a course under its own path only: pruned and purged there', () => {
    const ups = Object.values(course.findResources('Custom::CDKBucketDeployment')) as any[]
    expect(ups).toHaveLength(2)
    for (const up of ups) expect(up.Properties.DestinationBucketKeyPrefix).toBe('demo/')
    const pages = ups.find((up) => up.Properties.Prune !== false)
    expect(pages.Properties.DistributionPaths).toEqual(['/demo/*'])
    course.resourceCountIs('AWS::S3::Bucket', 0)
    course.resourceCountIs('AWS::CloudFront::Distribution', 0)
  })

  it('passes cdk-nag', () => {
    for (const scope of [learnStack, courseStack]) {
      const { success, violations } = new AwsSolutionsChecks(courseApp).validateScope(scope)
      expect(violations).toEqual([])
      expect(success).toBe(true)
    }
  })
})
