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

export interface SiteStackProps extends StackProps {
  // The name the site is served at, as is. Its Route 53 zone already exists in
  // the account: this name's own, or `courseOf`'s.
  domainName: string
  // The apex whose zone holds this site's records, for a course at a subdomain of it.
  courseOf?: string
  // The built site (packages/site/dist). The build runs before any synth.
  siteDir: string
}

// A static site: a private bucket behind CloudFront at its own name, with its
// certificate, its DNS records, its security headers and the upload of the build.
export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props)
    const { domainName, courseOf, siteDir } = props
    if (!existsSync(join(siteDir, 'index.html'))) {
      throw new Error(`No site build at ${siteDir}. Run \`pnpm build\` first.`)
    }

    // Holds only the build, which can be rebuilt at will, so it goes with the stack.
    const bucket = new s3.Bucket(this, 'Bucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    // Looked up, never created: a new zone would get new nameservers and break the domain.
    const zone = route53.HostedZone.fromLookup(this, 'Zone', { domainName: courseOf ?? domainName })
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName,
      validation: acm.CertificateValidation.fromDns(zone),
    })

    const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      comment: 'chqrles.me: HSTS, CSP, nosniff, frame and referrer hardening',
      securityHeadersBehavior: {
        // No preload: joining the browsers' preload list is hard to undo.
        strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true },
        contentSecurityPolicy: { contentSecurityPolicy: contentSecurityPolicy(siteDir), override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
      },
    })

    const edgeFunction = (id: string, comment: string, file: string) =>
      new cloudfront.Function(this, id, {
        comment,
        code: cloudfront.FunctionCode.fromFile({ filePath: join(here, '..', 'functions', file) }),
        runtime: cloudfront.FunctionRuntime.JS_2_0,
      })
    const functionAssociations = courseOf
      ? [
          // A course has one language, so it has no redirect to one and no cookie.
          {
            function: edgeFunction('CourseUrls', 'Serves /<page>/ from index.html and redirects other forms', 'course-urls.js'),
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ]
      : [
          // Astro writes /<lang>/<slug>/index.html, and CloudFront's default root object only works at /.
          // The same function sends a path with no language to the visitor's language.
          {
            function: edgeFunction(
              'DirectoryUrls',
              'Serves /<lang>/<slug>/ from index.html, redirects other forms, and a path with no language to the reader\'s',
              'directory-urls.js',
            ),
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
          // Remembers the language of the last page read, for the function above.
          {
            function: edgeFunction('LangCookie', 'Sets the lang cookie on a page in a language', 'lang-cookie.js'),
            eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
          },
        ]

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
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
        // Honours each file's Cache-Control, set by the uploads below.
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: securityHeaders,
        functionAssociations,
      },
      // Not a single-page app: a missing path is a real 404. With Origin Access
      // Control the bucket answers 403 for a missing key, so both map to /404.html.
      errorResponses: [403, 404].map((httpStatus) => ({ httpStatus, responseHttpStatus: 404, responsePagePath: '/404.html' })),
    })

    const target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
    new route53.ARecord(this, 'AliasA', { zone, recordName: domainName, target })
    new route53.AaaaRecord(this, 'AliasAAAA', { zone, recordName: domainName, target })

    // The build is uploaded in two passes that share one asset. Finder's
    // .DS_Store files never leave the laptop.
    const source = s3deploy.Source.asset(siteDir, { exclude: ['.DS_Store'] })
    // Room for image-heavy builds: the upload Lambda unzips the whole site in /tmp.
    const uploads = { sources: [source], destinationBucket: bucket, memoryLimit: 1024, ephemeralStorageSize: Size.gibibytes(2) }
    // Hashed files never change, so browsers keep them a year. Never pruned:
    // a page loaded before a deploy still finds its assets.
    const assets = new s3deploy.BucketDeployment(this, 'UploadAssets', {
      ...uploads,
      exclude: ['*'],
      include: ['_astro/*'],
      prune: false,
      cacheControl: [s3deploy.CacheControl.fromString('public, max-age=31536000, immutable')],
    })
    // Everything else (pages, feed, sitemap) is revalidated on every visit and
    // published last, so a new page never points at a missing asset. It prunes,
    // so a deleted post disappears, and it purges CloudFront's cache.
    const pages = new s3deploy.BucketDeployment(this, 'UploadPages', {
      ...uploads,
      exclude: ['_astro/*'],
      prune: true,
      cacheControl: [s3deploy.CacheControl.fromString('no-cache')],
      distribution,
      distributionPaths: ['/*'],
    })
    pages.node.addDependency(assets)

    Validations.of(bucket).acknowledge({
      id: 'AwsSolutions-S1',
      reason: 'No server access logs: the bucket is private, TLS-only, and read only by CloudFront through Origin Access Control.',
    })
    Validations.of(distribution).acknowledge(
      { id: 'AwsSolutions-CFR1', reason: 'A public blog, served everywhere on purpose: no geo restriction.' },
      { id: 'AwsSolutions-CFR2', reason: 'No WAF: static public files from a private origin; a WAF would cost more than it protects.' },
      { id: 'AwsSolutions-CFR3', reason: 'No CloudFront access logs: Umami counts the visits.' },
    )

    // The upload Lambda and its role are written by CDK, not here.
    const uploader = this.node.children.find((child) => child.node.id.startsWith('Custom::CDKBucketDeployment'))!
    const bucketArn = this.getLogicalId(bucket.node.defaultChild as s3.CfnBucket)
    const uploaderReason = "CDK's upload Lambda syncs the whole build and purges CloudFront; its role is written by CDK, not here."
    Validations.of(uploader).acknowledge(
      { id: 'AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole]', reason: uploaderReason },
      ...['s3:Abort*', 's3:DeleteObject*', 's3:GetBucket*', 's3:GetObject*', 's3:List*'].map((action) => ({
        id: `AwsSolutions-IAM5[Action::${action}]`,
        reason: uploaderReason,
      })),
      ...['*', `<${bucketArn}.Arn>/*`, `arn:${this.partition}:s3:::cdk-hnb659fds-assets-${this.account}-${this.region}/*`].map((resource) => ({
        id: `AwsSolutions-IAM5[Resource::${resource}]`,
        reason: uploaderReason,
      })),
      { id: 'AwsSolutions-L1', reason: "CDK pins the upload Lambda's runtime." },
    )

    new CfnOutput(this, 'SiteUrl', { value: `https://${domainName}` })
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId })
  }
}
