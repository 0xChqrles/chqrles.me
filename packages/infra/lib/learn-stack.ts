import { Stack, type StackProps } from 'aws-cdk-lib'
import type * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import { FunctionEventType } from 'aws-cdk-lib/aws-cloudfront'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import type { Construct } from 'constructs'
import { contentSecurityPolicy } from './csp'
import { acknowledgeUploader, APEX, edgeFunction, host, needBuild, upload } from './site-stack'

// Every course is served at https://learn.chqrles.me/<slug>/.
export const LEARN = `learn.${APEX}`
// The host's bucket has a fixed name, so each course's stack names it plainly.
export const learnBucket = (account: string) => `chqrles-me-learn-${account}`

export interface LearnStackProps extends StackProps {
  // A course's build: its policy is every course's, since a course's holds no hash.
  courseDir: string
  // The empty build (packages/course/empty): its 404.html answers a missing path.
  emptyDir: string
}

// The host every course shares. It holds no course: each one's own stack uploads it under
// its own path.
export class LearnStack extends Stack {
  readonly bucket: s3.IBucket
  readonly distribution: cloudfront.IDistribution

  constructor(scope: Construct, id: string, props: LearnStackProps) {
    super(scope, id, props)
    needBuild(props.courseDir)
    const { bucket, distribution } = host(this, {
      domainName: LEARN,
      bucketName: learnBucket(this.account),
      csp: contentSecurityPolicy(props.courseDir),
      functionAssociations: [
        // A course has one language, so it has no redirect to one and no cookie.
        {
          function: edgeFunction(this, 'CourseUrls', 'Serves /<course>/<page>/ from index.html and redirects other forms', 'course-urls.js'),
          eventType: FunctionEventType.VIEWER_REQUEST,
        },
      ],
    })
    // The one file at the root: never pruned, so the courses beside it stay.
    new s3deploy.BucketDeployment(this, 'UploadNotFound', {
      sources: [s3deploy.Source.asset(props.emptyDir)],
      destinationBucket: bucket,
      exclude: ['*'],
      include: ['404.html'],
      prune: false,
      cacheControl: [s3deploy.CacheControl.fromString('no-cache')],
    })
    acknowledgeUploader(this, bucket)
    this.bucket = bucket
    this.distribution = distribution
  }
}

export interface CourseStackProps extends StackProps {
  learn: LearnStack
  // The course's folder name: its path on the host.
  slug: string
  // Its build (packages/course/dist/<slug>), or the empty build to take it down.
  siteDir: string
}

// One course: its build, uploaded under /<slug>/. Its pruning and its cache purge stay
// there, so a deploy never touches another course.
export class CourseStack extends Stack {
  constructor(scope: Construct, id: string, props: CourseStackProps) {
    super(scope, id, props)
    needBuild(props.siteDir)
    const bucket = s3.Bucket.fromBucketName(this, 'Bucket', learnBucket(this.account))
    upload(this, { bucket, distribution: props.learn.distribution, dir: props.siteDir, prefix: `${props.slug}/` })
  }
}
