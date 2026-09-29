# AGENTS.md — chqrles.me

> The source of https://chqrles.me: a static blog that holds articles and nothing else.
> Posts are Markdown files; CI builds the site and deploys it to AWS. `CLAUDE.md` is a
> symlink to this file: edit **AGENTS.md**.
>
> This file records DECISIONS: the rule, its constants and where they live, and one line
> of why. The **code is ground truth**: if a rule here contradicts the code, trust the code
> and surface the conflict rather than silently "fixing" either side.

```
posts/<slug>/       one folder per post: index.md (or index.mdx), index.en.md for its English
                    version, and their images
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
- **Never edit the author's prose, except to fix typos when the author asks** (spelling,
  agreement, elision, punctuation, typography), and then report every fix. Anything more
  (a repeated passage, a broken sentence, a style choice) is listed for the author, never
  rewritten. Structural changes (frontmatter, heading levels, figures, code-block marks)
  are fine.
- **Never switch the git checkout back to `main` on your own.** Branch from whatever is
  checked out.
- **Show, don't tell.** The site explains nothing: no tagline, no welcome line, no helper copy.
- **One branch and one PR per change, and the owner reviews and merges every PR.** Never
  merge one yourself. No agent or tool branding in branch names or PR titles. PR
  descriptions stay short: what changed, how to verify.

## Posts

### The contract

- **One folder per post**: `posts/<slug>/index.md`, or `index.mdx` when the post has a
  figure. Its images sit beside the text.
- **The language is the file's name** (`packages/site/src/lib/urls.ts`): `index.md` (or
  `.mdx`) is French, `index.<lang>.md` is the post in that language, like `index.en.md`.
  A folder holds at most one file per language (`index.md` beside `index.mdx` fails), a
  language the site does not have fails the build, and so does a markdown file named
  `index…` that is none of these (a mistyped `index-en.md` never goes unnoticed). Each file has its own frontmatter
  (title, description and image alt in its language) and may point at the same image.
- **The URL is the language and the folder name**: `https://chqrles.me/<lang>/<slug>/`,
  with the trailing slash. A slug is lowercase letters, digits and single hyphens (`SLUG`
  in `packages/site/src/lib/urls.ts`); any other folder name fails the build, a folder
  starting with a dot included. **A published
  URL never stops working**: to rename a published post's folder, list its old name in
  `aliases` (below), and `/<lang>/<old-slug>/` keeps redirecting to it. The URL without a
  language, `https://chqrles.me/<slug>/`, is how the first post was published and stays a
  way in: the edge sends it to the reader's language (see *Infrastructure*).
- **The frontmatter is validated** (`packages/site/src/lib/post-schema.ts`). A post that
  breaks it fails the build, and the message names the field:

  | Field | Rule |
  |---|---|
  | `title` | required |
  | `date` | required, the publication date, a day written `2026-09-25` |
  | `description` | required, one or two sentences, used by previews and the feed |
  | `image` | required, the header image, a file in the post's folder, at least 1200×630 |
  | `imageAlt` | required, the header image's alt text |
  | `aliases` | optional, on the French file: the slugs the post had before its folder was renamed, oldest first; each redirects to it, in every language, and its share image and the feed's guid stay as they were (a name that is the post's own, another post's, or another alias, fails the build) |
  | `draft` | optional, default `false` |

  Any other field fails the build, so a misspelled field never passes silently (`lang`
  included: the file's name says it). One build names every field at fault.
- **A draft** renders under `pnpm dev` and never reaches a production build: not its page,
  not its images, not the feed, not the sitemap. A production build still validates it,
  then drops it (`packages/site/src/content.config.ts`). Only a draft may omit `image` and
  `imageAlt`.
- **The header image** opens the article and is the share preview: the build prints it on
  the post's 1200×630 share card (see *Share images*) for `og:image` and `twitter:image`
  (`summary_large_image`), by absolute URL. The build never enlarges an image, so a header
  smaller than 1200×630 fails the build (`packages/site/src/lib/share-image.ts`). The header itself is served responsive, in AVIF
  and WebP, with its width and height set.
- **Every page carries** its title and description, and its canonical URL, except the 404
  page: it answers any missing URL, so it has none and is marked `noindex`. A page that
  comes in several languages also lists each one as an `hreflang` alternate.

### Languages

- **The site has two languages, `fr` and `en`**, French by default (`LANGS` and
  `DEFAULT_LANG` in `packages/site/src/lib/lang.ts`; the edge functions keep a copy, and a
  test keeps them in step). Every page lives under its language: `/<lang>/`,
  `/<lang>/<slug>/`, `/<lang>/rss.xml`. `<html lang>` and how dates and numbers are
  written follow the post's language.
- **A path without a language is redirected** to the same path under the visitor's
  language: the last one they read, else their browser's, else French (see
  *Infrastructure*). A page is never served without its language.
- **Every post has a page in every language.** Where it is not translated (or its
  translation is a draft), `/<lang>/<slug>/` redirects to the original
  (`packages/site/src/pages/[lang]/[slug].astro`). The original is the French file, else
  the earliest. A track's number and place come from the original, so they are the same
  on every page.
- **Each language has its own index and feed**, listing every post: in that language when
  it is translated, in its own when it is not (then marked with its `lang`). The reading
  time is that of the version shown. The sitemap lists the pages that have content, each
  with its `hreflang` alternates (`packages/site/src/pages/sitemap.xml.ts`).
- **A renamed post's old names stay pages** (`aliases`): for each language and each alias,
  `/<lang>/<alias>/` redirects at once to the post's page in that language, and
  `/<lang>/<alias>/share.png` is the same card, so an old link or preview still works. The
  feed item of the original keeps the URL of its first alias as its guid, so a reader does not
  see the renamed post as new.
- **A post's share image is per language** (`/<lang>/<slug>/share.png`, it carries the
  title); the index's is one for both (`/share.png`).
- **The words the site itself says** (`SITE_DESCRIPTION` in `packages/site/src/site.ts`,
  for the index, the feeds and the 404 page's meta description; the language names in
  `packages/site/src/lib/lang.ts`) are written in each language.

### Writing and publishing a post

1. Create the folder `posts/<slug>/`.
2. Write `index.md` with the frontmatter above.
3. Drop the header image in the same folder and point `image:` at it (`./header.jpg`).
4. To translate it, write `index.en.md` beside it, with its own frontmatter and the same image.
5. Push to `main`.

That is all: nothing else to touch. To keep it unpublished, set `draft: true`; a draft
translation leaves the original published.

### Rendering

- **French typography is applied at render time**, never in the post files
  (`packages/site/src/lib/french-spacing.ts`): a line never breaks before `: ; ? !`,
  inside `« »`, inside a number like `10 000`, or between a number and `%` or a currency
  symbol. Only spaces the author typed are replaced (a line break in the source counts as
  one). Code is never touched. It applies to titles, descriptions and the feed too.
  Posts in another language (`index.en.md`) are left alone.
- **A fenced block with the language `figure`** is a figure that is not built yet. It
  renders as a visible placeholder, never as code
  (`packages/site/src/lib/figure-placeholders.ts`).
- **Words in a code block are marked from its info string**
  (`packages/site/src/lib/code-theme.ts`): ```` ```text /chat/ ```` marks every `chat`,
  ```` ```text /:/2 ```` only the second `:`, and marks combine (`/a/ /b/1,3`). The text
  stays the author's own. Mark what the prose points at: the word under study, the one
  that changes, the one the model reads. In a block with marks, the rest of the code steps
  back to the muted ink; marked words stay in the ink, bold, and never break across two
  lines. A code block's wrapped line hangs two characters in.
- **Inline code is a word held up as a word** (`packages/site/src/styles/site.css`): the
  ink, regular weight, on the code mark's step of value (`--line`), its 1px × 3px padding
  laid out so the chip never covers a neighbouring space or apostrophe; upright even in a
  quotation, never broken across two lines. Bold stays the code mark's.

### Figures

- **A figure is a general-purpose component in `packages/site/src/figures/`, never a
  drawing made for one article.** A post passes it data, with no import (the article
  page hands the components to the post); the figure's code never lives in the post. A
  post with a figure is `index.mdx`.
- **The components**, each in the figure frame (one step of value, then `FIG. 0N` and a
  caption; a caption may quote a word as `` `code` ``):
  - `<Plane>`: points on two axes. `points`, or `states` (arrangements of the same point
    ids the reader switches between); `links` (with `distance` written live on the
    link's middle, level, the line breaking around it, and `accent` for the one segment a figure
    is about); `arrows` (vectors from the origin);
    `mean` (the points' mean as a dashed ink vector, a string labels it past its tip; while
    it is drawn the other vectors step back to the muted ink); `ticks` (the grid's values
    on the edges); `coordinates` (beside each point); `move` (drag, or arrow keys);
    `domain`; `digits` (decimals written, 1 by default).
  - `<Bars>`: labelled values as bars, every value 0 or more (a negative one fails the
    build). `rows` (`label`, `value`, `mark`), `unit="%"`, `digits`.
  - `<Arcs>`: a sequence of tokens with weighted arcs from one to others, or to itself (a
    small loop). `tokens`, `from`, `to` (`token`, `weight` 0 to 1, `accent`), `mask="causal"` (what
    comes after `from` is out of reach), `sum` (the weighted sum it ends up with). Too
    many tokens for the column: the figure scrolls sideways, never the page. An arc rises
    with its reach, the farthest one in the figure to the top.
- **The exhibits** draw the post's own words, so they sit in a code block's panel, with
  its spacing and mono, and have no number and no caption: the sentence before them
  introduces them. Marks follow the code block's rule (every occurrence, in the ink, bold;
  the rest of that part steps back to the muted ink).
  - `<Words>`: words under study. `sentence`, `lists`, or both (`label` optional,
    `words`; several lists stand in columns, one word a line, a column that does not fit
    going under the others), `marks`. A mark in the
    sentence mutes the sentence; a mark in the lists mutes the lists.
  - `<Flow>`: steps one under the other at every width, an arrow into each. `steps` and
    optionally `loop` (the last step leads back to the first), or `chains` (two,
    `name` and `steps`, aligned row by row; `null` where a chain has no step, its line
    running through), `marks`.
- **A figure runs in the browser only when the reader can act on it** (a React island,
  `client:visible`, so only once it scrolls into view); every other figure is plain HTML
  and SVG. Rendered on the server first, each one reads fully without JavaScript: a
  `<Plane>` with `states` then draws every arrangement, one under the other.
- **Every figure and exhibit**: a caption (figures only); keyboard-reachable when interactive; reduced motion lands
  at once; fits a 360px phone; drawn with the site's tokens and attributes only (no inline
  `style`, which the CSP forbids); numbers written in the post's language (`1,4`,
  `90 %`). The accent marks the point the reader holds; beyond that, only a specific thing
  the figure is about (see the palette).

## Design

Chosen 2026-09-25: **Face B**, the blog as a record sleeve and its liner notes, with the
dither and the pixel q of the *Instrument* direction. It carries Whippin's DNA
(one flat near-black ground, near-white ink, colour only where it means something, mono
chrome, one pixel face spent once) without its parts. No light theme. No Whippin face,
colour, icon or furniture is reused.

- **Tokens** live in `:root` of `packages/site/src/styles/site.css`; the favicon and the
  share image read the same values from `packages/site/src/lib/palette.ts` (keep both in
  step). Ground `#121110`, raise `#1b1a18` (one step of value: code, placeholders, the
  sleeve's card), hairlines `#2c2a27` and `#6f6a62`, muted `#999489`, ink `#e4e2dc`, the
  body text a step under it, `#d0ccc3` (titles and bold keep the ink), and
  **vermilion `#ff5a1f`, the one accent**: "where you are" (the playhead, hover, the
  favicon, the point a reader holds). A figure may also accent one specific thing it is
  about, only when the colour says what nothing else in the figure already says (not its
  thickness, position, label, written number or alignment, nor the value step between
  the ink and the muted ink): if the accent takes an argument, it is decoration. Never a
  concept it shows in general: the distance between words, how attention spreads, a set
  of vectors. Every text colour is at least 4.5:1 on the ground.
- **Letters are drawn as designed**: `-webkit-font-smoothing: antialiased`, because macOS
  otherwise thickens light text on a dark ground.
- **Three voices, strict roles** (`packages/site/src/styles/fonts.css`, all self-hosted):
  Source Serif 4 for every title and the body (21/33.6 on desktop, 19/30 on a phone, a 660px
  column), chosen for its taller lowercase: on a dark ground small letters cost the most;
  IBM Plex Mono for the chrome (11px, uppercase, tracked 0.12em, hierarchy by
  weight only) and code; Jersey 15, a pixel face, for track numbers only, at 27px (its
  pixel grid) or 54px, never scaled otherwise.
- **The index is a tracklist**: number, title, date, and the reading time as a duration
  (220 words a minute, `packages/site/src/lib/duration.ts`), newest first.
- **The header image is the sleeve** (`packages/site/src/components/Sleeve.astro`): the
  photo in its own shape, held between 3:4 and 2:1 and cut on its subject past that
  (`packages/site/src/lib/sleeve.ts`), printer's crop marks at the corners, printed in one
  ink by a CSS filter: its shadows on the ground, its lights in the ink. It stays a photo
  so it reads at any size; the dither is for the share images. The screen scales it
  whole, never crops it: an empty SVG in its shape (the trim) holds that shape before the
  photo loads, because the CSP forbids giving the ratio inline.
- **The first screen stacks, at every width** (`packages/site/src/styles/site.css`): the
  whole photo in the column, no taller than 60svh (a portrait narrows); the credits as a
  caption line along its foot, the date at its left edge, the length and the language at
  its right; then the track number and the title across the column, the number hanging in
  the left margin from 1040px. The title keeps the column's width, so even a long one
  stays at a few lines instead of a stack of short ones.
- **The mark is a pixel q** (`packages/site/src/lib/mark.ts`), 5×7 cells at 3px (4px on a
  wide screen): the only link home. The favicon is the same q in vermilion.
- **The languages are two codes in the chrome voice** (`packages/site/src/components/LangSwitch.astro`):
  the one you are in in the ink, each other a link to the same page in that language, and
  only where the page has one. On the index they stand at the masthead's right edge; on an
  article, in its credits, where its language stood.
- **Totals** (an article's length, the index's runtime) are written in the ink, bold. In
  an article's credits the length also stands on one ink hairline, as wide as its figures.
  Never a double rule.
- **Edge furniture**, from 1040px only: a timeline down the right edge, a tick per section
  placed by reading time, with the vermilion playhead. Below that, the playhead is a
  hairline along the top.
- **Motion**: section numbers decode as they reach the reading line. Reduced motion shows
  them settled. The page reads fully without JavaScript.
- **Code** is highlighted from the palette by value, weight and slant, never by hue
  (`packages/site/src/lib/code-theme.ts`); Shiki's inline colours become classes.
- **Share images** are drawn at build time (`packages/site/src/lib/share-card.ts`): the
  post's photo cropped square on its centre (the subject-finding crop cut the pigeon's
  knife), printed as a one-bit 8×8 ordered dither in the ink in 2px cells
  (`packages/site/src/lib/dither.ts`), trimmed by crop marks; on its left, the mark and the
  post's title, as on the page (Source Serif 4, weight 500, balanced lines), its last
  baseline on the photo's foot, 52px or smaller to keep to six lines. The title is on the
  card because some previews (X's) show the image alone. It is drawn as outlines with
  fontkit, from the static weight-500 WOFF (fontkit cannot vary a WOFF2), so the build
  needs no font installed. A post's is `/<lang>/<slug>/share.png`; the index's is `/share.png`,
  the newest post's photo beside the mark alone.
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
- **Directory URLs and languages** (`packages/infra/functions/directory-urls.js`, a
  CloudFront Function on viewer request): under a language, `/<lang>/<slug>/` serves
  `<lang>/<slug>/index.html`; `/<lang>/<slug>` and `/<lang>/<slug>/index.html` redirect
  (301) to `/<lang>/<slug>/`; a path whose last segment has a dot is a file and passes
  through. A path with no language (`/`, `/<slug>/`, `/rss.xml`, `/<slug>/share.png`)
  redirects (302: it depends on who asks) to the same path under the visitor's language,
  the query string kept: the language in the `lang` cookie, else the first language of the
  `Accept-Language` header that the site has (weights honoured, `fr-CH` is `fr`), else
  French. The files every language shares (`_astro/*`, `favicon.svg`,
  `apple-touch-icon.png`, `robots.txt`, `share.png`, `sitemap.xml`, `404.html`) are served
  as they are. Repeated slashes collapse first, so a redirect never leaves the site.
- **The `lang` cookie** (`packages/infra/functions/lang-cookie.js`, a CloudFront Function
  on viewer response) is the "last language used": every page under a language (a folder
  or its `index.html`, answered 200 or 304) sets it to that language, for a year,
  `Secure; HttpOnly; SameSite=Lax`. So reading a post that is not translated sets the
  language of the original. Nothing else reads or writes it.
- **A missing path is a real 404**: the bucket's 403 and 404 both map to `/404.html` with
  status 404. Not a single-page app.
- **Security headers**: HSTS for a year with subdomains and without preload, the CSP,
  `nosniff`, frames denied, `strict-origin-when-cross-origin`.
- **The CSP is read off the build** (`packages/infra/lib/csp.ts`): `default-src 'none'`;
  scripts, styles, images and fonts from the site itself, plus the hash of each inline
  script or style; Umami's script (`https://cloud.umami.is`) and where it sends
  (`connect-src https://gateway.umami.is`), the only third party; `base-uri`,
  `form-action` and `frame-ancestors` `'none'`. An inline
  `style=""` or `on…=""` attribute fails the synth, and so does a policy longer than
  CloudFront's 1,783 characters. So pages carry no inline style attributes, and the build
  keeps every script and stylesheet in a file (`packages/site/astro.config.ts`), except the
  island loader Astro inlines on a page with an interactive figure (two scripts and one
  style, the same on every page, allowed by hash).
- **Umami Cloud counts the visits**: its official script on every page
  (`packages/site/src/layouts/Base.astro`), page views only, no cookies. `data-domains`
  keeps it to the live site, so `pnpm dev` and `pnpm preview` send nothing. The website
  id sits in `packages/site/src/site.ts`: every page carries it anyway. Loaded straight
  from Umami, not proxied through CloudFront: through a proxy Umami sees CloudFront's
  address instead of the reader's, which blurs visitors and places.
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

- **Test contracts, never cosmetics** (figures and code marks are cosmetic). The contracts are the frontmatter schema, the URL
  functions (the site's slug and file-name rules, the CloudFront Functions with their
  choice of language), the infra assertions
  (including the CSP builder and cdk-nag) and the French-spacing transform. Assert against
  the rules in this file, not the implementation.
- **A failing contract test is a real regression**: fix the code, never weaken the test.
- **The build is the content check.** A post with bad frontmatter fails `pnpm typecheck`
  and `pnpm build`; a missing or undersized image fails `pnpm build`.

## Do NOT

- Don't edit the author's prose beyond the typo fixes the author asked for, each one reported.
- Don't rename a published post's folder without keeping its old name in `aliases`: its URL is permanent.
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
