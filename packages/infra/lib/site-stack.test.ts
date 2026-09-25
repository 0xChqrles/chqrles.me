import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { AwsSolutionsChecks } from 'cdk-nag'
import { describe, expect, it } from 'vitest'
import { SiteStack } from './site-stack'
import { testApp } from './test-app'

const env = { account: '111122223333', region: 'us-east-1' }
const DOMAIN = 'example.com'

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
const stack = new SiteStack(app, 'Site', { env, domainName: DOMAIN, siteDir })
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
    template.hasResourceProperties('AWS::CertificateManager::Certificate', { DomainName: DOMAIN, ValidationMethod: 'DNS' })
    for (const Type of ['A', 'AAAA']) {
      template.hasResourceProperties('AWS::Route53::RecordSet', { Type, Name: `${DOMAIN}.`, AliasTarget: Match.objectLike({}) })
    }
  })

  it('attaches the directory-URL function to viewer requests', () => {
    const [[id, fn]] = Object.entries(template.findResources('AWS::CloudFront::Function')) as [[string, any]]
    expect(fn.Properties.FunctionConfig.Runtime).toBe('cloudfront-js-2.0')
    expect(fn.Properties.FunctionCode).toBe(readFileSync(new URL('../functions/directory-urls.js', import.meta.url), 'utf8'))
    expect(config.DefaultCacheBehavior.FunctionAssociations).toEqual([
      { EventType: 'viewer-request', FunctionARN: { 'Fn::GetAtt': [id, 'FunctionARN'] } },
    ])
  })

  it('answers a missing path with /404.html and a 404 status', () => {
    expect(config.CustomErrorResponses).toEqual([
      { ErrorCode: 403, ResponseCode: 404, ResponsePagePath: '/404.html' },
      { ErrorCode: 404, ResponseCode: 404, ResponsePagePath: '/404.html' },
    ])
  })

  it('sends the security headers, with the CSP read off the build', () => {
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: {
        SecurityHeadersConfig: {
          StrictTransportSecurity: { AccessControlMaxAgeSec: 31536000, IncludeSubdomains: true, Override: true, Preload: Match.absent() },
          ContentSecurityPolicy: { ContentSecurityPolicy: Match.stringLikeRegexp("script-src 'self' 'sha256-"), Override: true },
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
