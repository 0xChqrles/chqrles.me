# CI/CD

- **`ci.yml`** runs on every pull request and on pushes to `main`: install, typecheck,
  tests, the production build, and `cdk synth`. A post with bad frontmatter fails it.
  cdk-nag findings fail the synth. A newer run cancels the one it supersedes.
- **`deploy.yml`** runs on pushes to `main` and on demand. A first job runs the same checks
  and builds, with no AWS access. A second job, on `main` only, installs just the CDK app,
  assumes the AWS role through GitHub's OIDC provider (no long-lived keys) and runs
  `cdk deploy ChqrlesMeSite`. Runs wait in order; none is ever cancelled.

## What the deploy role can do

Its own policy only assumes the CDK bootstrap roles (`cdk-hnb659fds-*`) and reads stacks.
But CDK deploys through `cdk-hnb659fds-cfn-exec-role`, which has AdministratorAccess. So
code running in the deploy job could change any stack in the account, Whippin's and this
role's included. Three things keep that in check: only a push to `main` of this repo can
assume the role; `deploy.yml` deploys `ChqrlesMeSite` and nothing else; and only the last
job, with the CDK app's dependencies alone, holds the token. Narrowing it further would
mean re-bootstrapping the account, which Whippin shares.

## One-time setup (done on 2026-09-25)

1. **Deploy the CI role**, by hand, with account credentials. `deploy.yml` never deploys it.

   ```bash
   pnpm build                                        # the app's synth needs the site build
   pnpm --filter @chqrles/infra run deploy:role      # prints DeployRoleArn
   ```

   It trusts one OIDC subject: pushes to `main` of this repo. GitHub gives repositories
   created after mid-2026 an immutable subject that names the owner and the repo by id
   (`gh api repos/0xChqrles/chqrles.me/actions/oidc/customization/sub`), so the role
   trusts `repo:0xChqrles@19663399/chqrles.me@1387573502:ref:refs/heads/main`
   (`packages/infra/bin/app.ts`).

2. **Store its ARN** as the repository secret `AWS_DEPLOY_ROLE_ARN`:

   ```bash
   gh secret set AWS_DEPLOY_ROLE_ARN --body '<DeployRoleArn>'
   ```

3. **Make CI a required check on `main`**: a pull request can merge only once the `Check`
   job passes. Admins are not held to it, so a direct push to `main` still works; the
   deploy re-runs every check and ships nothing if one fails.

   ```bash
   gh api -X PUT repos/0xChqrles/chqrles.me/branches/main/protection --input - <<'JSON'
   {"required_status_checks": {"strict": false, "checks": [{"context": "Check"}]},
    "enforce_admins": false, "required_pull_request_reviews": null, "restrictions": null}
   JSON
   ```
