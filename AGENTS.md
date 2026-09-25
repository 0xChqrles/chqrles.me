# AGENTS.md — chqrles.me

> The source of https://chqrles.me: a static blog that holds articles and nothing else.
> Posts are Markdown files; CI builds the site and deploys it to AWS. `CLAUDE.md` is a
> symlink to this file: edit **AGENTS.md**.
>
> This file records DECISIONS: the rule, its constants and where they live, and one line
> of why. The **code is ground truth**: if a rule here contradicts the code, trust the code
> and surface the conflict rather than silently "fixing" either side.

```
posts/<slug>/       one folder per post: index.md (or index.mdx) and its images
packages/site/      the Astro site: content schema, pages, feed, sitemap
packages/infra/     the AWS CDK app: the site stack and CI's deploy role
.github/workflows/  ci.yml (checks) and deploy.yml (checks, then deploy)
```

## Maintaining these files

- **You are a SCRIBE of the user's decisions, not an author of them.** Update this file
  only when the user has explicitly decided something that changes a rule, a contract, a
  command or the architecture. Never record a rule you inferred or think is a good idea.
- **Record the decision, not its history.** A rule, its constants, where it lives, and one
  line of why. No chronology, no measurements.
- **Surface every edit in your reply.** When in doubt, do not edit: ask.

## How to work

- **Talk in plain words.** Short sentences, one idea each, no jargon without a definition.
  For a problem: what is wrong, why it matters, what to change.
- **Challenge a request that is bad practice.** Name the tradeoff and recommend the better path.
- **Production deploys go through CI only.** A push or merge to `main` runs the deploy
  workflow. Never deploy the site from a laptop.
- **Build the simplest thing that fully meets the need.** No speculative options, config
  or abstractions. No backward-compatibility layers: remove obsolete paths.
- **Grow in layers.** The smallest working end-to-end version first, then each capability
  on top of something that works.
- **Prefer established, maintained libraries**, and check their current docs rather than
  memory: versions move.
- **Keep checks proportional.** One decisive check per change (the build, the relevant
  tests, one screenshot), not a battery.
- **Never edit the author's prose.** Not a typo, not a repeated passage, not a broken
  sentence: list them for the author instead. Structural changes (frontmatter, heading
  levels, figure markup) are fine.
- **Never switch the git checkout back to `main` on your own.** Branch from whatever is
  checked out.
- **Show, don't tell.** The site explains nothing: no tagline, no welcome line, no helper copy.
- **One branch and one PR per change.** No agent or tool branding in branch names or PR
  titles. PR descriptions stay short: what changed, how to verify.

## Posts

### The contract

- **One folder per post**: `posts/<slug>/index.md`, or `index.mdx` when the post has a
  figure. Its images sit beside the text.
- **The folder name is the URL**: `https://chqrles.me/<slug>/`, with the trailing slash.
  A slug is lowercase letters, digits and single hyphens (`SLUG` in
  `packages/site/src/lib/urls.ts`); any other folder name fails the build, a folder
  starting with a dot included. A folder holding both `index.md` and `index.mdx` fails
  too, and so does a post named after a page (`404`). **A published URL never changes**:
  never rename a published post's folder.
- **The frontmatter is validated** (`packages/site/src/lib/post-schema.ts`). A post that
  breaks it fails the build, and the message names the field:

  | Field | Rule |
  |---|---|
  | `title` | required |
  | `date` | required, the publication date, a day written `2026-09-25` |
  | `description` | required, one or two sentences, used by previews and the feed |
  | `image` | required, the header image, a file in the post's folder, at least 1200×630 |
  | `imageAlt` | required, the header image's alt text |
  | `lang` | `fr` or `en`, default `fr`; sets `<html lang>` and how dates are written |
  | `draft` | optional, default `false` |

  Any other field fails the build, so a misspelled field never passes silently. One build
  names every field at fault.
- **A draft** renders under `pnpm dev` and never reaches a production build: not its page,
  not its images, not the feed, not the sitemap. A production build still validates it,
  then drops it (`packages/site/src/content.config.ts`). Only a draft may omit `image` and
  `imageAlt`.
- **The header image** opens the article and is the share preview: the build crops it to
  1200×630 for `og:image` and `twitter:image` (`summary_large_image`), by absolute URL.
  The build never enlarges an image, so a smaller header fails the build
  (`packages/site/src/lib/share-image.ts`). The header itself is served responsive, in AVIF
  and WebP, with its width and height set.
- **Every page carries** its title and description, and its canonical URL, except the 404
  page: it answers any missing URL, so it has none and is marked `noindex`.

### Writing and publishing a post

1. Create the folder `posts/<slug>/`.
2. Write `index.md` with the frontmatter above.
3. Drop the header image in the same folder and point `image:` at it (`./header.jpg`).
4. Push to `main`.

That is all: nothing else to touch. To keep it unpublished, set `draft: true`.

### Rendering

- **French typography is applied at render time**, never in the post files
  (`packages/site/src/lib/french-spacing.ts`): a line never breaks before `: ; ? !`,
  inside `« »`, inside a number like `10 000`, or between a number and `%` or a currency
  symbol. Only spaces the author typed are replaced (a line break in the source counts as
  one). Code is never touched. It applies to titles, descriptions and the feed too.
  English posts (`lang: en`) are left alone.
- **A fenced block with the language `figure`** is a figure that is not built yet. It
  renders as a visible placeholder, never as code
  (`packages/site/src/lib/figure-placeholders.ts`).

## Design

Chosen 2026-09-25: **Face B**, the blog as a record sleeve and its liner notes, with the
dithered sleeve and the pixel q of the *Instrument* direction. It carries Whippin's DNA
(one flat near-black ground, near-white ink, colour only where it means something, mono
chrome, one pixel face spent once) without its parts. No light theme. No Whippin face,
colour, icon or furniture is reused.

- **Tokens** live in `:root` of `packages/site/src/styles/site.css`; the favicon and the
  share image read the same values from `packages/site/src/lib/palette.ts` (keep both in
  step). Ground `#121110`, raise `#1b1a18` (one step of value: code, placeholders, the
  sleeve's card), hairlines `#2c2a27` and `#6f6a62`, muted `#999489`, ink `#e4e2dc`, and
  **vermilion `#ff5a1f`, which only ever means "where you are"** (the playhead, hover, the
  favicon). Every text colour is at least 4.5:1 on the ground.
- **Three voices, strict roles** (`packages/site/src/styles/fonts.css`, all self-hosted):
  Newsreader for every title and the body (21/33.6 on desktop, 19/30 on a phone, a 600px
  column); IBM Plex Mono for the chrome (11px, uppercase, tracked 0.12em, hierarchy by
  weight only) and code; Jersey 15, a pixel face, for track numbers only, at 27px (its
  pixel grid) or 54px, never scaled otherwise.
- **The index is a tracklist**: number, title, date, and the reading time as a duration
  (220 words a minute, `packages/site/src/lib/duration.ts`), newest first.
- **The header image is the sleeve** (`packages/site/src/components/Sleeve.astro`): a
  square crop on the photo's subject, printer's crop marks at the corners, printed as a
  one-bit 8×8 ordered dither in the ink that develops once on load
  (`packages/site/src/lib/dither.ts`, `packages/site/src/scripts/plate.ts`). Without
  JavaScript, the photo printed in one ink.
- **The mark is a pixel q** (`packages/site/src/lib/mark.ts`), 5×7 cells at 3px (4px on a
  wide screen): the only link home. The favicon is the same q in vermilion.
- **One emphasis gesture**: the ledger double rule, under a sum (an article's length).
- **Edge furniture**, from 1040px only: a timeline down the right edge, a tick per section
  placed by reading time, with the vermilion playhead. Below that, the playhead is a
  hairline along the top.
- **Motion**: the sleeve develops, section numbers decode as they reach the reading line.
  Reduced motion shows both settled. The page reads fully without JavaScript.
- **Code** is highlighted from the palette by value, weight and slant, never by hue
  (`packages/site/src/lib/code-theme.ts`); Shiki's inline colours become classes.
- **Share images**: a post's is the 1200×630 crop of its header photo; the index's is
  `/share.png`, drawn at build time from the mark and the newest post's dithered sleeve
  (`packages/site/src/lib/share-card.ts`). No words: link previews print the title.
- **Never**: textures, gradients, glows, shadows, a radius above 2px, a second accent, a
  pixel face at a size that is not a whole multiple of its grid, helper copy.

## Infrastructure

- **One CDK app in TypeScript** (`packages/infra/bin/app.ts`), two stacks, both in account
  `879381243389` and `us-east-1`, where CloudFront needs its certificate:
  `ChqrlesMeSite` (the site) and `ChqrlesMeDeployRole` (CI's role). The account is pinned,
  so CI synthesizes without credentials from the committed `cdk.context.json`.
- **The account also runs Whippin.** IAM role and CloudFront policy names are account-wide:
  never reuse Whippin's (`Whippin*Stack`, `whippin-github-deploy`,
  `WhippinSiteSecurityHeaders`, `WhippinCardHeaders`). Stacks here start with `ChqrlesMe`;
  CloudFormation generates the other names.
- **The Route 53 zone `chqrles.me` already exists** (`Z0042204385C8H6YBG2CC`; the domain is
  registered at Hostinger, pointing at its nameservers). It is looked up with
  `HostedZone.fromLookup`, never created: a new zone gets new nameservers and silently
  breaks the domain.
- **The GitHub OIDC provider already exists** in the account: imported, never created.
- **cdk-nag's AWS Solutions checks run on every synth.** A finding without a written reason
  (`Validations.of(construct).acknowledge`, cdk-nag 3) fails it.
- **Everything is tagged** `Project=chqrles.me`, `ManagedBy=cdk` (stack tags).
- **The site stack** (`packages/infra/lib/site-stack.ts`): a private bucket (public access
  blocked, TLS only, S3-managed encryption, destroyed with the stack); CloudFront with
  Origin Access Control, HTTP/2 and HTTP/3, TLS 1.2_2021, price class 100; a
  DNS-validated certificate for the apex; A and AAAA aliases at the apex. No `www`.
- **Directory URLs** (`packages/infra/functions/directory-urls.js`, a CloudFront Function
  on viewer request): `/<slug>/` serves `<slug>/index.html`; `/<slug>` and
  `/<slug>/index.html` redirect (301) to `/<slug>/`; a path whose last segment has a dot
  is a file and passes through. Repeated slashes collapse first, so a redirect never
  leaves the site.
- **A missing path is a real 404**: the bucket's 403 and 404 both map to `/404.html` with
  status 404. Not a single-page app.
- **Security headers**: HSTS for a year with subdomains and without preload, the CSP,
  `nosniff`, frames denied, `strict-origin-when-cross-origin`.
- **The CSP is read off the build** (`packages/infra/lib/csp.ts`): `default-src 'none'`;
  scripts, styles, images and fonts from the site itself, plus the hash of each inline
  script or style; `base-uri`, `form-action` and `frame-ancestors` `'none'`. An inline
  `style=""` or `on…=""` attribute fails the synth, and so does a policy longer than
  CloudFront's 1,783 characters. So pages carry no inline style attributes, and the build
  keeps every script and stylesheet in a file (`packages/site/astro.config.ts`).
- **Uploads**: two passes over one asset. `_astro/*` (hashed) is cached a year,
  `immutable`, never pruned. Everything else is `no-cache`, published last, pruned (a
  deleted post disappears), and purges CloudFront (`/*`). `.DS_Store` never leaves the
  laptop. The upload Lambda has 1,024 MB and 2 GiB of disk.
- **The deploy role** (`packages/infra/lib/deploy-role-stack.ts`) trusts one OIDC subject,
  a push to `main` of this repo, in GitHub's immutable form (repos created after mid-2026):
  `repo:0xChqrles@19663399/chqrles.me@1387573502:ref:refs/heads/main`. It may only assume
  the CDK bootstrap roles (`cdk-hnb659fds-*`) and call `cloudformation:DescribeStacks`.
  Those bootstrap roles deploy with administrator rights, so the deploy job can change any
  stack in the account: only `main` reaches it, and only the last deploy job holds it.
- **A local deploy refuses** unless `ALLOW_LOCAL_DEPLOY=1` is set
  (`packages/infra/scripts/guard-local-deploy.mjs`).

## CI/CD

- **`ci.yml`** runs on pull requests and pushes to `main`: install, typecheck (`astro check`,
  `tsc`), tests, the production build, `cdk synth`. A newer run cancels the one it supersedes.
- **`deploy.yml`** runs on pushes to `main` and on demand: a job runs the same checks and
  the build without AWS access; a second job, on `main` only, installs just the CDK app and
  runs `cdk deploy ChqrlesMeSite` with OIDC credentials. Runs wait in order
  (`queue: max`), never cancel. It never deploys `ChqrlesMeDeployRole`.
- **One-time steps, by hand** (done 2026-09-25; see `.github/workflows/README.md`): deploy
  `ChqrlesMeDeployRole`, store its ARN in the secret `AWS_DEPLOY_ROLE_ARN`, make the `Check`
  job a required status check on `main`.

## Testing

- **Test contracts, never cosmetics.** The contracts are the frontmatter schema, the URL
  functions (the site's slug rule and the CloudFront Function), the infra assertions
  (including the CSP builder and cdk-nag) and the French-spacing transform. Assert against
  the rules in this file, not the implementation.
- **A failing contract test is a real regression**: fix the code, never weaken the test.
- **The build is the content check.** A post with bad frontmatter fails `pnpm typecheck`
  and `pnpm build`; a missing or undersized image fails `pnpm build`.

## Do NOT

- Don't edit the author's prose, not even to fix a typo.
- Don't rename a published post's folder: its URL is permanent.
- Don't deploy the site from a laptop. The one by-hand deploy is `ChqrlesMeDeployRole`.
- Don't create a Route 53 zone or a GitHub OIDC provider: both already exist.
- Don't let CI deploy `ChqrlesMeDeployRole`.
- Don't put an inline `style=""` or `on…=""` attribute in a page: the CSP cannot allow it,
  and the synth fails. An inline `<script>` or `<style>` element is allowed by its hash,
  but each one spends part of the 1,783-character CSP budget.
- Don't give the deploy job's AWS token to more code than it needs.
- Don't add a tagline, a welcome line or helper copy to the site.
- Don't add a light theme or reuse anything of Whippin's (face, colour, icon, furniture).

## Commands

pnpm workspaces (`pnpm-workspace.yaml`); pnpm is pinned by the root `packageManager` field.

```bash
pnpm install     # all packages
pnpm dev         # the site, drafts included, at http://localhost:4321
pnpm build       # the production site in packages/site/dist, drafts excluded
pnpm preview     # serve that build
pnpm typecheck   # astro check and tsc
pnpm test        # the contract tests (Vitest)
pnpm synth       # cdk synth (needs pnpm build first)
pnpm --filter @chqrles/infra run deploy:role   # by hand, once: CI's deploy role
```

`pnpm-workspace.yaml` approves `esbuild`'s build script (`allowBuilds`); pnpm blocks the
others. `dev` and `build` pass `--force`: Astro caches rendered Markdown in `.astro/`, and
a changed Markdown plugin would otherwise not show.
