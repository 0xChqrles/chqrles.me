# AGENTS.md — chqrles.me

> The source of https://chqrles.me: a static blog that holds articles and nothing else.
> Posts are Markdown files; CI checks them and builds the site. `CLAUDE.md` is a symlink
> to this file: edit **AGENTS.md**.
>
> This file records DECISIONS: the rule, its constants and where they live, and one line
> of why. The **code is ground truth**: if a rule here contradicts the code, trust the code
> and surface the conflict rather than silently "fixing" either side.

```
posts/<slug>/       one folder per post: index.md (or index.mdx) and its images
packages/site/      the Astro site: content schema, pages, feed, sitemap
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

## Testing

- **Test contracts, never cosmetics.** The contracts are the frontmatter schema, the URL
  function and the French-spacing transform. Assert against the rules in this file, not
  the implementation.
- **A failing contract test is a real regression**: fix the code, never weaken the test.
- **The build is the content check.** A post with bad frontmatter fails `pnpm typecheck`
  and `pnpm build`; a missing or undersized image fails `pnpm build`.

## Do NOT

- Don't edit the author's prose, not even to fix a typo.
- Don't rename a published post's folder: its URL is permanent.
- Don't deploy from a laptop.
- Don't add a tagline, a welcome line or helper copy to the site.

## Commands

pnpm workspaces (`pnpm-workspace.yaml`); pnpm is pinned by the root `packageManager` field.

```bash
pnpm install     # all packages
pnpm dev         # the site, drafts included, at http://localhost:4321
pnpm build       # the production site in packages/site/dist, drafts excluded
pnpm preview     # serve that build
pnpm typecheck   # astro check
pnpm test        # the contract tests (Vitest)
```

`pnpm-workspace.yaml` approves `esbuild`'s build script (`allowBuilds`); pnpm blocks the
others. `dev` and `build` pass `--force`: Astro caches rendered Markdown in `.astro/`, and
a changed Markdown plugin would otherwise not show.
