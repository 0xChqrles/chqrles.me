import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CfnOutput, Duration, RemovalPolicy, Size, Stack, Validations, type StackProps } from 'aws-cdk-lib'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as targets from 'aws-cdk-lib/aws-route53-targets'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import type { Construct } from 'constructs'
import { contentSecurityPolicy } from './csp'

const here = dirname(fileURLToPath(import.meta.url))

// The apex whose Route 53 zone already exists in the account: every name served here
// writes its records into it.
export const APEX = 'chqrles.me'

export function needBuild(dir: string) {
  if (!existsSync(join(dir, 'index.html'))) throw new Error(`No build at ${dir}. Run the build first.`)
}

export function edgeFunction(stack: Stack, id: string, comment: string, file: string) {
  return new cloudfront.Function(stack, id, {
    comment,
    code: cloudfront.FunctionCode.fromFile({ filePath: join(here, '..', 'functions', file) }),
    runtime: cloudfront.FunctionRuntime.JS_2_0,
  })
}

export interface HostProps {
  // The name served, as is.
  domainName: string
  // A fixed bucket name, for a bucket other stacks upload into; else CloudFormation names it.
  bucketName?: string
  // Read off a build: every page served must keep to it.
  csp: string
  functionAssociations: cloudfront.FunctionAssociation[]
}

// A private bucket behind CloudFront at its own name, with its certificate, its DNS
// records and its security headers. What goes in the bucket is the uploads' business.
export function host(stack: Stack, { domainName, bucketName, csp, functionAssociations }: HostProps) {
  // Holds only builds, which can be rebuilt at will, so it goes with the stack.
  const bucket = new s3.Bucket(stack, 'Bucket', {
    bucketName,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    encryption: s3.BucketEncryption.S3_MANAGED,
    enforceSSL: true,
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  })

  // Looked up, never created: a new zone would get new nameservers and break the domain.
  const zone = route53.HostedZone.fromLookup(stack, 'Zone', { domainName: APEX })
  const certificate = new acm.Certificate(stack, 'Certificate', {
    domainName,
    validation: acm.CertificateValidation.fromDns(zone),
  })

  const securityHeaders = new cloudfront.ResponseHeadersPolicy(stack, 'SecurityHeaders', {
    comment: `${domainName}: HSTS, CSP, nosniff, frame and referrer hardening`,
    securityHeadersBehavior: {
      // No preload: joining the browsers' preload list is hard to undo.
      strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true },
      contentSecurityPolicy: { contentSecurityPolicy: csp, override: true },
      contentTypeOptions: { override: true },
      frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
      referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
    },
  })

  const distribution = new cloudfront.Distribution(stack, 'Distribution', {
    comment: domainName,
    domainNames: [domainName],
    certificate,
    httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    defaultBehavior: {
      origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      // Honours each file's Cache-Control, set by the uploads.
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      responseHeadersPolicy: securityHeaders,
      functionAssociations,
    },
    // Not a single-page app: a missing path is a real 404. With Origin Access
    // Control the bucket answers 403 for a missing key, so both map to /404.html.
    errorResponses: [403, 404].map((httpStatus) => ({ httpStatus, responseHttpStatus: 404, responsePagePath: '/404.html' })),
  })

  const target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
  new route53.ARecord(stack, 'AliasA', { zone, recordName: domainName, target })
  new route53.AaaaRecord(stack, 'AliasAAAA', { zone, recordName: domainName, target })

  Validations.of(bucket).acknowledge({
    id: 'AwsSolutions-S1',
    reason: 'No server access logs: the bucket is private, TLS-only, and read only by CloudFront through Origin Access Control.',
  })
  Validations.of(distribution).acknowledge(
    { id: 'AwsSolutions-CFR1', reason: 'Public pages, served everywhere on purpose: no geo restriction.' },
    { id: 'AwsSolutions-CFR2', reason: 'No WAF: static public files from a private origin; a WAF would cost more than it protects.' },
    { id: 'AwsSolutions-CFR3', reason: 'No CloudFront access logs: Umami counts the visits.' },
  )

  new CfnOutput(stack, 'SiteUrl', { value: `https://${domainName}` })
  new CfnOutput(stack, 'DistributionId', { value: distribution.distributionId })
  return { bucket, distribution }
}

export interface UploadProps {
  bucket: s3.IBucket
  distribution: cloudfront.IDistribution
  // The build to upload.
  dir: string
  // Where it goes in the bucket: '' for the whole bucket, or `<slug>/`. Pruning and the
  // cache purge stay inside it.
  prefix: string
}

// A build is uploaded in two passes that share one asset. Finder's .DS_Store files never
// leave the laptop.
export function upload(stack: Stack, { bucket, distribution, dir, prefix }: UploadProps) {
  const source = s3deploy.Source.asset(dir, { exclude: ['.DS_Store'] })
  // Room for image-heavy builds: the upload Lambda unzips the whole build in /tmp.
  const uploads = {
    sources: [source],
    destinationBucket: bucket,
    destinationKeyPrefix: prefix || undefined,
    memoryLimit: 1024,
    ephemeralStorageSize: Size.gibibytes(2),
  }
  // Hashed files never change, so browsers keep them a year. Never pruned:
  // a page loaded before a deploy still finds its assets.
  const assets = new s3deploy.BucketDeployment(stack, 'UploadAssets', {
    ...uploads,
    exclude: ['*'],
    include: ['_astro/*'],
    prune: false,
    cacheControl: [s3deploy.CacheControl.fromString('public, max-age=31536000, immutable')],
  })
  // Everything else (pages, feed, sitemap) is revalidated on every visit and
  // published last, so a new page never points at a missing asset. It prunes,
  // so a deleted page disappears, and it purges CloudFront's cache.
  const pages = new s3deploy.BucketDeployment(stack, 'UploadPages', {
    ...uploads,
    exclude: ['_astro/*'],
    prune: true,
    cacheControl: [s3deploy.CacheControl.fromString('no-cache')],
    distribution,
    distributionPaths: [`/${prefix}*`],
  })
  pages.node.addDependency(assets)
  acknowledgeUploader(stack, bucket)
}

// The upload Lambda and its role are written by CDK, not here.
export function acknowledgeUploader(stack: Stack, bucket: s3.IBucket) {
  const uploader = stack.node.children.find((child) => child.node.id.startsWith('Custom::CDKBucketDeployment'))!
  // the bucket's objects: its logical id where it is made, its name where it is imported
  const bucketArn = bucket instanceof s3.Bucket ? `<${stack.getLogicalId(bucket.node.defaultChild as s3.CfnBucket)}.Arn>/*` : `arn:aws:s3:::${bucket.bucketName}/*`
  const reason = "CDK's upload Lambda syncs the build and purges CloudFront; its role is written by CDK, not here."
  Validations.of(uploader).acknowledge(
    { id: 'AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole]', reason },
    ...['s3:Abort*', 's3:DeleteObject*', 's3:GetBucket*', 's3:GetObject*', 's3:List*'].map((action) => ({ id: `AwsSolutions-IAM5[Action::${action}]`, reason })),
    ...[...new Set(['*', bucketArn, `arn:${stack.partition}:s3:::cdk-hnb659fds-assets-${stack.account}-${stack.region}/*`])].map((resource) => ({
      id: `AwsSolutions-IAM5[Resource::${resource}]`,
      reason,
    })),
    { id: 'AwsSolutions-L1', reason: "CDK pins the upload Lambda's runtime." },
  )
}

export interface SiteStackProps extends StackProps {
  // The built site (packages/site/dist). The build runs before any synth.
  siteDir: string
}

// The blog, at the apex.
export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props)
    const { siteDir } = props
    needBuild(siteDir)
    const { bucket, distribution } = host(this, {
      domainName: APEX,
      csp: contentSecurityPolicy(siteDir),
      functionAssociations: [
        // Astro writes /<lang>/<slug>/index.html, and CloudFront's default root object only works at /.
        // The same function sends a path with no language to the visitor's language.
        {
          function: edgeFunction(
            this,
            'DirectoryUrls',
            "Serves /<lang>/<slug>/ from index.html, redirects other forms, and a path with no language to the reader's",
            'directory-urls.js',
          ),
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        },
        // Remembers the language of the last page read, for the function above.
        {
          function: edgeFunction(this, 'LangCookie', 'Sets the lang cookie on a page in a language', 'lang-cookie.js'),
          eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
        },
      ],
    })
    upload(this, { bucket, distribution, dir: siteDir, prefix: '' })
  }
}
