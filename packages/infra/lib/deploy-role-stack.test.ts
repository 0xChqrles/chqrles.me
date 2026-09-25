import { Match, Template } from 'aws-cdk-lib/assertions'
import { AwsSolutionsChecks } from 'cdk-nag'
import { describe, expect, it } from 'vitest'
import { DeployRoleStack } from './deploy-role-stack'
import { testApp } from './test-app'

const env = { account: '111122223333', region: 'us-east-1' }
const SUBJECT = 'repo:owner@1/repo@2:ref:refs/heads/main'
const app = testApp()
const stack = new DeployRoleStack(app, 'DeployRole', { env, githubSubject: SUBJECT })
const template = Template.fromStack(stack)

describe('the deploy-role stack', () => {
  it('imports the account OIDC provider instead of creating one', () => {
    expect(template.findResources('AWS::IAM::OIDCProvider')).toEqual({})
    expect(template.findResources('Custom::AWSCDKOpenIdConnectProvider')).toEqual({})
  })

  it('trusts only pushes to main of this repo', () => {
    template.resourceCountIs('AWS::IAM::Role', 1)
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRoleWithWebIdentity',
            Effect: 'Allow',
            Principal: { Federated: `arn:aws:iam::${env.account}:oidc-provider/token.actions.githubusercontent.com` },
            Condition: {
              StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com', 'token.actions.githubusercontent.com:sub': SUBJECT },
            },
          },
        ],
      },
    })
  })

  it('may only assume the CDK bootstrap roles and read stacks', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      Policies: [
        {
          PolicyName: 'Deploy',
          PolicyDocument: {
            Statement: [
              { Sid: 'AssumeCdkBootstrapRoles', Effect: 'Allow', Action: 'sts:AssumeRole', Resource: `arn:aws:iam::${env.account}:role/cdk-hnb659fds-*` },
              { Sid: 'ReadStacks', Effect: 'Allow', Action: 'cloudformation:DescribeStacks', Resource: '*' },
            ],
          },
        },
      ],
    })
    expect(template.findResources('AWS::IAM::Policy')).toEqual({})
    expect(template.findResources('AWS::IAM::Role', { Properties: { ManagedPolicyArns: Match.anyValue() } })).toEqual({})
  })

  it('passes cdk-nag', () => {
    const { success, violations } = new AwsSolutionsChecks(app).validateScope(stack)
    expect(violations).toEqual([])
    expect(success).toBe(true)
  })
})
