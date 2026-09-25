import { CfnOutput, Duration, Stack, Validations, type StackProps } from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'
import type { Construct } from 'constructs'

const GITHUB_OIDC = 'token.actions.githubusercontent.com'

export interface DeployRoleStackProps extends StackProps {
  // The OIDC subject of a GitHub Actions run on a push to main. Repositories
  // created after mid-2026 use GitHub's immutable form, which names the owner
  // and the repo by id: repo:<owner>@<id>/<repo>@<id>:ref:refs/heads/main.
  githubSubject: string
}

// The role deploy.yml assumes through GitHub's OIDC provider: no long-lived keys.
// Deployed ONCE, by hand; deploy.yml never deploys it. Its own policy only
// assumes the CDK bootstrap roles, but those deploy with administrator rights,
// so whatever runs with this role can change any stack in the account.
export class DeployRoleStack extends Stack {
  constructor(scope: Construct, id: string, props: DeployRoleStackProps) {
    super(scope, id, props)

    // The account's GitHub provider already exists; creating another one fails.
    const provider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      'GitHubOidc',
      `arn:${this.partition}:iam::${this.account}:oidc-provider/${GITHUB_OIDC}`,
    )

    const role = new iam.Role(this, 'DeployRole', {
      description: 'GitHub Actions deploy of chqrles.me, pushes to main only',
      assumedBy: new iam.OpenIdConnectPrincipal(provider, {
        StringEquals: { [`${GITHUB_OIDC}:aud`]: 'sts.amazonaws.com', [`${GITHUB_OIDC}:sub`]: props.githubSubject },
      }),
      maxSessionDuration: Duration.hours(1),
      // CDK deploys through the account's bootstrap roles; this role only assumes them.
      inlinePolicies: {
        Deploy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              sid: 'AssumeCdkBootstrapRoles',
              actions: ['sts:AssumeRole'],
              resources: [`arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-*`],
            }),
            new iam.PolicyStatement({ sid: 'ReadStacks', actions: ['cloudformation:DescribeStacks'], resources: ['*'] }),
          ],
        }),
      },
    })

    Validations.of(role).acknowledge(
      {
        id: `AwsSolutions-IAM5[Resource::arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-*]`,
        reason: "The CDK bootstrap roles share this prefix; their full names are CDK's. Assuming them is how CDK deploys.",
      },
      { id: 'AwsSolutions-IAM5[Resource::*]', reason: 'cloudformation:DescribeStacks only reads stack metadata.' },
    )

    new CfnOutput(this, 'DeployRoleArn', { value: role.roleArn, description: 'The GitHub secret AWS_DEPLOY_ROLE_ARN' })
  }
}
