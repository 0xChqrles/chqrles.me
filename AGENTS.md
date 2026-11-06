# AGENTS.md — chqrles.me

> The source of https://chqrles.me, a static blog that holds articles and nothing else, and
> of its courses, each a static site under its own path on https://learn.chqrles.me, in one
> monorepo.
> Posts are Markdown files; CI builds the site and deploys it to AWS. A course is a folder
> of Markdown files too, and it deploys only when the owner runs its workflow by hand.
> `CLAUDE.md` is a symlink to this file: edit **AGENTS.md**.
>
> This file records DECISIONS: the rule, its constants and where they live, and one line
> of why. The **code is ground truth**: if a rule here contradicts the code, trust the code
> and surface the conflict rather than silently "fixing" either side.

```
posts/<slug>/       one folder per post: index.md (or index.mdx), index.en.md for its English
                    version, and their images
courses/<slug>/     one folder per course: outline.json, src/ (its Markdown), code/ (its Rust
                    crate, optional)
packages/site/      the Astro site: content schema, pages, feed, sitemap
packages/course/    the Astro app of a course, built once per course, and its test course
packages/design/    what the site and the courses share: tokens, palette, fonts, mark, icon
packages/infra/     the AWS CDK app: the site stack, the courses' host, a stack per course
                    and CI's deploy role
.github/workflows/  ci.yml (checks), deploy.yml (checks, then deploy) and deploy-course.yml
                    (one course, by hand)
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
- **Publishing a course is the owner's act.** Agents never run `deploy-course.yml`.
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

## Courses

### The contract

- **Every course is on one host, and a course's folder name is its path**:
  `courses/<slug>/` is served at `https://learn.chqrles.me/<slug>/`. A slug follows a post's rule (`SLUG` in
  `packages/course/scripts/shape.mjs`, kept in step with `urls.ts` by a test); any other
  name fails the build. `courses/` holds folders only: a file beside them fails it too.
  **A live slug and a published card id never change.**
- **A file enters `courses/` only when the owner says so**, by its name.
- **A course folder holds this and nothing else** (`checkShape` in
  `packages/course/scripts/shape.mjs`). Any other file, or a symbolic link, fails the
  build, and the message names it. `.DS_Store` and `code/target/` are skipped.

  | Path | What |
  |---|---|
  | `outline.json` | required, the course: its titles, its cards and the map |
  | `src/_accueil.md` | required, the home page, in Markdown or HTML |
  | `src/<card-id>.md` | a written card, for a card of the outline |
  | `code/` | optional, a Rust crate: `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `src/**/*.rs`, `tests/**/*.rs` |

- **`outline.json` is validated** (`packages/course/src/lib/course.ts`). Any other field
  fails the build, and the message names it. Its keys are `cours` (`titre`, `sousTitre`,
  `court`, `objectif` the card the map leads to, `macros` the KaTeX macros), `quartiers`,
  `lignes` (8 at most), `cartes` and `aretes`. Every id is a slug, and every reference names
  something that exists. A card's optional `formules: "gauche"` sets its formulas on the
  left. One build names every fault.
- **A card file means written.** With no file, a card is planned: it stays on the map, a
  `[[link]]` to it is a span, a hash link to it fails the build, and it has no page. There
  is no draft flag, for a course or for a card.
- **A card** (`packages/course/src/lib/render-card.ts`) is a front matter block, then
  Markdown, with `$…$` and `$$…$$` math, `[[id|text]]` links to a card, and the directives
  `:::figure`, `:::derivation`, `:::piege`, `:::note`, `:::incertain`, `:::code`,
  `:::marge`, `:::exercice`, `:::reponse` (folded) and `:::quiz`, which nest. An exercise
  without an answer inside it fails the build. A figure is inline SVG, its `viewBox` at most 480 wide, with `role="img"`,
  an `aria-label` and a caption, and no `style`, `script` or `foreignObject`. A broken
  rule fails the build.
- **The map never moves under the pointer** (`packages/course/src/scripts/map/map.ts`): a
  region pointed at, or one of its levels, brightens in place, so its links stay whole.
- **The map is laid out once and a camera moves over it**: a drag pans, the wheel or two
  fingers zoom about the point under them; only the minimap (and a region's own key in its
  summary) flies the camera to a region.
  A zoom places nothing again: the camera's scale is a pixel ratio over the layout, so every
  plate, chip, label and line grows and shrinks together on whole device pixels, and the
  pane's edge cuts the map like any map. The camera ranges from the world at rest (a phone's at
  a step of 72 at the least) to 4 times the world's step.
- **A press never moves the camera.** A level pressed, on its plate or on a link chip that shows
  it, is chosen (its reticle there, its briefing or sheet); pressed again, it opens. A region's
  land pressed is chosen the same way (its rim in the ink, its summary). The ground pressed lets
  either go. The keyboard reaches every region, then every level in course order.
- **Pointing only shows the tooltip** (its card, else its tag, beside the plate or chip pointed,
  never in a label's place: every number stays in sight): the briefing, the sheet and the sector
  bar change on a press, never on a point.
- **A region has no name on the map**: no title, no counter, no tab, since not every region has
  room for one. It is named by its sector bar once in focus, and by its link for the keyboard.
- **A link shows its direction where it plugs in**: an arrowhead, its tip on the edge of the
  level it opens, in the colour of the route's last run (lit, or on a chain, as the route is);
  a stub out of its level ends with the head on its chip's edge. Nothing is drawn along a route.
- **Link chips never stack** (`portsAt` in `packages/course/src/lib/place.ts`, `PORT_GAP` in
  `packages/course/src/lib/lattice.ts`): each cut link into a level comes in from its own side,
  and the audit fails two chips that meet or a chip over a plate.
- **The engine (`packages/course`) holds no course-specific name.** Titles, macros and the
  card the map leads to live in `outline.json`. A line is `data-ligne="n"`, its place in `lignes`.
- **A course is French only**: no language segment, no redirect to a language, because it
  has one language. **A course sets no cookie.**

### URLs

- `https://learn.chqrles.me/<slug>/` is the home page and the map, `/<slug>/<card-id>/` a
  written card, and `/<slug>/tout/` every written card, so a card named `tout` fails the
  build. The other URLs are files under `/<slug>/`: `_astro/*`, `math.css`, `search.js`,
  `favicon.svg`, `apple-touch-icon.png`, `share.png`, and each written card's
  `<card-id>/share.png`.
- **Every URL a course writes goes through `url`** (`packages/course/src/lib/base.ts`), which
  puts the course's path in front (Astro's `base`, set in `packages/course/astro.config.ts`
  from the folder's name). **Every key a course saves goes through `saved`**, under the same
  path, since the courses share one origin and so one storage.
- **A missing path is a real 404**, from the host's one `/404.html`
  (`packages/course/empty/404.html`), marked `noindex`. A planned card's URL is one.
  `https://learn.chqrles.me/` itself has no page.

### Building

- **One Astro app, built once per course** (`packages/course/scripts/build-all.mjs`), into
  `packages/course/dist/<slug>`: one `site` per build gives each page its canonical URL.
  `pnpm build:courses` builds every folder of `courses/`, or only the one it names, and
  each folder passes the shape check first. With no folder and no name, it does nothing.
- **What a run reads** (`packages/course/src/lib/course-dir.ts`): `courses/<slug>`, from
  `COURSE_SLUG`, a name and never a path, or else the test course
  `packages/course/fixture`, never deployed. `COURSE_DIR` previews any folder under
  `pnpm dev:course` when no course is named, and a build ignores it.
- **The design is shared** through `@chqrles/design` (`packages/design`), read as source
  with no build step. A course's own styles are in `packages/course/src/styles/course.css`.
  `site.css`, the figures and the blog's rendering stay in `packages/site`.
- **Every written card is its own page, and reads without JavaScript**: the math and the
  map are drawn at build time.
- **Every page but the 404 unfurls into a share card** (`packages/course/src/lib/share-card.ts`),
  1200 × 630, drawn at build time and named by `og:image` and `twitter:image`
  (`summary_large_image`), by absolute URL. The home's, which `tout` shares, is
  `/<slug>/share.png`: the q and the course's title, and the whole map as large as it goes
  without touching them, reaching over the title's column where its ground is empty. A written card's is
  `/<slug>/<card-id>/share.png`: the q and the course's title, then its region, plate, number
  and title, beside the map framed on its level at twice the world's step, the level chosen
  (open, lifted, its chain lit, the reticle round it); a chapter, off the map, is framed on its
  notions, and a card with neither on the map, on the whole world. The map is the page's own at a first
  visit, laid out at the 1280 × 800 desk pane and drawn by the same rules
  (`packages/course/src/lib/share-map.ts`). The words are the course's own, drawn as outlines
  from static WOFF cuts and set as the pages set them, so the build needs no font installed; the
  alt text is those words. A title or region name too long for the card, or a character its
  faces lack, fails the build.
- **KaTeX's styles go through `data-k`** (`packages/course/src/lib/math-styles.ts`): each
  `style` it writes becomes a `data-k` attribute and an `!important` rule in `/math.css`,
  because the CSP forbids a style attribute. So a course's policy, read off its own build,
  holds no hash.
- **Search loads `/search.js` on the first keystroke**: the CSP lets a script load, not a
  `fetch`.

### Publishing a course

1. Add its files to `courses/<slug>/`, by name.
2. Merge to `main`. This publishes nothing: `deploy.yml` never deploys a course.
3. The owner runs `deploy-course.yml` (see *CI/CD*). A card merged later goes live at the
   next run.

## Design

Chosen 2026-09-25: **Face B**, the blog as a record sleeve and its liner notes, with the
dither and the pixel q of the *Instrument* direction. It carries Whippin's DNA
(one flat near-black ground, near-white ink, colour only where it means something, mono
chrome, one pixel face spent once) without its parts. No light theme. No Whippin face,
colour, icon or furniture is reused.

- **Tokens** live in `:root` of `packages/design/src/tokens.css`; the favicon and the
  share image read the same values from `packages/design/src/palette.ts` (keep both in
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
- **Three voices, strict roles** (`packages/design/src/fonts.css`, all self-hosted):
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
- **The mark is a pixel q** (`packages/design/src/mark.ts`), 5×7 cells at 3px (4px on a
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

- **One CDK app in TypeScript** (`packages/infra/bin/app.ts`), its stacks all in account
  `879381243389` and `us-east-1`, where CloudFront needs its certificate:
  `ChqrlesMeSite` (the site), `ChqrlesMeDeployRole` (CI's role), `ChqrlesMeLearn` (the
  courses' host) and one `ChqrlesMeCourse-<slug>` per built course. The account is pinned, so CI synthesizes
  without credentials from the committed `cdk.context.json`.
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
- **The courses' host, `ChqrlesMeLearn`** (`packages/infra/lib/learn-stack.ts`): the site
  stack's bucket, distribution, security headers and records, for exactly
  `learn.chqrles.me`, with one certificate for that name and A and AAAA records in the
  existing zone. No wildcard. Its bucket is named `chqrles-me-learn-<account>`, so each
  course's stack names it plainly. It holds no course: it uploads only `/404.html`, never
  pruned. Its CSP is read off a course's build, and every course's is the same, since it
  holds no hash.
- **A course has its own stack, `ChqrlesMeCourse-<slug>`**: its build uploaded into the
  host's bucket under `<slug>/`, as the site stack uploads (assets a year and never pruned,
  the rest revalidated), pruning and purging only `/<slug>/*`, so a deploy never touches
  another course. It depends on the host, so deploying it deploys the host first.
  `packages/infra/bin/app.ts` creates the host and the course stacks only where a build
  exists, in `packages/course/dist/<slug>`, so a source folder alone creates nothing and the
  blog's deploy has no course in its app.
- **Course URLs** (`packages/infra/functions/course-urls.js`, a CloudFront Function on
  viewer request, the host's only one): `/<slug>/<page>/` serves `<slug>/<page>/index.html`;
  `/<slug>/<page>` and `/<slug>/<page>/index.html` redirect (301) to `/<slug>/<page>/`, the query string kept; a path
  whose last segment has a dot is a file and passes through. Repeated slashes collapse
  first, so a redirect never leaves the site.
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
- **Umami Cloud counts the visits**: its official script on every page of the blog
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
  a run on `main` of this repo, in GitHub's immutable form (repos created after mid-2026):
  `repo:0xChqrles@19663399/chqrles.me@1387573502:ref:refs/heads/main`. It may only assume
  the CDK bootstrap roles (`cdk-hnb659fds-*`) and call `cloudformation:DescribeStacks`.
  Those bootstrap roles deploy with administrator rights, so the deploy job can change any
  stack in the account: only `main` reaches it, and only the last deploy job holds it.
- **A local deploy refuses** unless `ALLOW_LOCAL_DEPLOY=1` is set
  (`packages/infra/scripts/guard-local-deploy.mjs`).

## CI/CD

- **`ci.yml`** runs on pull requests and pushes to `main`: install, typecheck (`astro check`,
  `tsc`), tests, the production build, every course's build, `cargo test --locked` in each
  course's `code/`, and `cdk synth`. A newer run cancels the one it supersedes.
- **`deploy.yml`** runs on pushes to `main` and on demand: a job runs the typecheck, the
  tests and the blog's build without AWS access; a second job, on `main` only, installs
  just the CDK app and runs `cdk deploy ChqrlesMeSite` with OIDC credentials. Runs wait in
  order (`queue: max`), never cancel. It never deploys `ChqrlesMeDeployRole`. It never
  builds a course of `courses/`, so its app has no course stack and a merge cannot
  publish one.
- **`deploy-course.yml`** runs by hand only (`workflow_dispatch`), for the one course it
  is given: `gh workflow run deploy-course.yml -f course=<slug>`. A first job checks the
  name, runs the typecheck, the tests and `cargo test --locked` in that course's `code/`
  alone, so another course cannot stop it, and builds the blog (the app's synth needs it)
  and that course alone, without AWS access. A second job, on `main` only, installs just
  the CDK app and runs `cdk deploy ChqrlesMeCourse-<slug>` with OIDC credentials, which
  deploys `ChqrlesMeLearn` first. Runs of
  one course wait in order (`queue: max`), never cancel.
- **Takedown runs through the same workflow**, with `-f empty=true`:
  `packages/course/empty/` replaces the build, so every page goes and the cache is purged.
  Only the hashed `_astro/*` files stay. It needs the course's stack to exist, so a
  mistyped name creates nothing, and works even if the course's folder is gone.
- **Never `--all` or a stack glob in a workflow, and never a GitHub `environment` on a
  job**: an environment changes the OIDC subject, and the role refuses it.
- **One-time steps, by hand** (done 2026-09-25; see `.github/workflows/README.md`): deploy
  `ChqrlesMeDeployRole`, store its ARN in the secret `AWS_DEPLOY_ROLE_ARN`, make the `Check`
  job a required status check on `main`.

## Testing

- **Test contracts, never cosmetics** (figures and code marks are cosmetic). The contracts are the frontmatter schema, the URL
  functions (the site's slug and file-name rules, the CloudFront Functions with their
  choice of language), the infra assertions
  (including the CSP builder and cdk-nag), the French-spacing transform, and for a course:
  the outline and its folder's shape, the folder a run reads, the card renderer's rules,
  `/math.css`, what can deploy (`packages/infra/lib/deploy-gate.test.ts`) and a real build
  of the test course under the CSP (`packages/infra/lib/course-build.test.ts`, never run
  beside a course dev server). Assert against the rules in this file, not the
  implementation.
- **A failing contract test is a real regression**: fix the code, never weaken the test.
- **The build is the content check.** A post with bad frontmatter fails `pnpm typecheck`
  and `pnpm build`; a missing or undersized image fails `pnpm build`. A course with a
  fault in its outline or a card, or a stray file, fails `pnpm build:courses`.

## Do NOT

- Don't edit the author's prose beyond the typo fixes the author asked for, each one reported.
- Don't rename a published post's folder without keeping its old name in `aliases`: its URL is permanent.
- Don't deploy the site or a course from a laptop. The one by-hand deploy is `ChqrlesMeDeployRole`.
- Don't run `deploy-course.yml`, or give it a trigger other than `workflow_dispatch`.
- Don't copy a folder into `courses/`: each file enters by its name.
- Don't create a Route 53 zone or a GitHub OIDC provider: both already exist.
- Don't let CI deploy `ChqrlesMeDeployRole`.
- Don't put an inline `style=""` or `on…=""` attribute in a page: the CSP cannot allow it,
  and the synth fails. An inline `<script>` or `<style>` element is allowed by its hash,
  but each one spends part of the 1,783-character CSP budget.
- Don't let KaTeX's `style=` reach a page: it goes through `data-k` and `/math.css`.
- Don't add a widget loader, or any loader that scans a folder: a `data-widget` attribute
  fails the build.
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
pnpm synth       # cdk synth (needs pnpm build first), a stack per built course included
pnpm --filter @chqrles/infra run deploy:role   # by hand, once: CI's deploy role

pnpm dev:course                      # the test course, at http://localhost:4322
COURSE_SLUG=<slug> pnpm dev:course   # a course of courses/
COURSE_DIR=<path> pnpm dev:course    # any folder, as a preview
pnpm build:courses                   # every course, in packages/course/dist/<slug>
pnpm build:courses <slug>            # that course alone
```

`pnpm-workspace.yaml` approves `esbuild`'s build script (`allowBuilds`); pnpm blocks the
others. `dev` and `build` pass `--force`: Astro caches rendered Markdown in `.astro/`, and
a changed Markdown plugin would otherwise not show.
