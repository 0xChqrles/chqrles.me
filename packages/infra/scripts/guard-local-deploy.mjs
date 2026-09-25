// Production deploys go through CI: a push or merge to main runs deploy.yml,
// which calls `cdk deploy` directly and never runs this script. This guard
// stops an accidental deploy of a laptop's working tree. For a deliberate
// break-glass deploy:
//
//   ALLOW_LOCAL_DEPLOY=1 pnpm --filter @chqrles/infra run deploy

if (process.env.ALLOW_LOCAL_DEPLOY === '1') process.exit(0)

process.stderr.write(
  '\nLocal deploy refused.\n\n' +
    'The site deploys through CI: push or merge to main and deploy.yml ships it.\n' +
    'For a deliberate break-glass deploy, run it again with ALLOW_LOCAL_DEPLOY=1.\n\n',
)
process.exit(1)
