# CI/CD

- **`ci.yml`** runs on every pull request and on pushes to `main`: install, typecheck,
  tests, the production build, and `cdk synth`. The build is the content check: a post
  with bad frontmatter fails it. cdk-nag findings fail the synth.
- **`deploy.yml`** runs on pushes to `main` and on demand. It runs the same checks, builds,
  then deploys the site stack (`ChqrlesMeSite`) with `cdk deploy`. It assumes an AWS role
  through GitHub's OIDC provider: no long-lived keys. Runs queue; they never cancel each
  other.

## One-time setup (done on 2026-09-25)

1. **Deploy the CI role**, by hand, with account credentials. The role can only assume
   the CDK bootstrap roles and read stacks, so CI can never deploy or widen it.

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
