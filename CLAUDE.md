# Bro League website

The public website of the **Bro League** basketball league (Quezon City), shown from Hooperville's
`bro-league` (Season 7 at the switch, Oct 2026). Until then it was branded Cubao Ballers Club, but Hooperville has
no Cubao league (only Bro League and YBL), so it showed sample data; the owner chose "Bro League only". It is the league's
own site, separate from Hooperville; it reads the league's stats from Hooperville and never writes to it.
The owner is non-technical and usually works from a phone: explain in plain language and verify
changes yourself (screenshots on a phone-sized and a desktop screen) rather than asking them to check.

This project has nothing to do with Casa Pards (`BBB820/casapards`); never change that repo from here.

## Where things live

| What | Where |
|---|---|
| Code | https://github.com/BBB820/sports-website-template (`main` deploys) |
| Live site | **https://sports-website-template-production.up.railway.app** (editor: `/#admin`; not reachable from the cloud sandbox). Railway project `fd86447e-794a-477d-b45d-02b07c8f3bee`, deploys every push to `main` (check with `gh api repos/BBB820/sports-website-template/deployments`) |
| Stats source | Hooperville at **https://hoopr.id** (old address `https://web-production-69499.up.railway.app` kept as fallback; the sandbox reaches only the old one, and Node needs `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` to go through the proxy). Its code is `BBB820/basketball_stats`, read-only from here; its newest features (logos, season awards) may not be on GitHub yet |
| Preview for the owner | https://claude.ai/artifact/F6Z2XFtV7QpnXEULwaocgW (static, so it always shows the sample data) |

## How it works

- No build step, no dependencies. `server.js` (Node 18+) serves the files and `/api/site-data`.
- `hooperville.js` reads the league from Hooperville's public API (`/api/leagues`, `/api/leagues/:slug`,
  `/api/teams/:id`, `/api/games/:id`, `/api/seasons/:id/playoffs`), converts it to the site's data shape
  (same as `data.js`) and caches it for two minutes. League: `LEAGUE_SLUG` env var, else `bro-league`
  (else the first league whose name contains "bro"). Address: `HOOPERVILLE_URL`, else hoopr.id, else the old Railway address.
  Since Nov 6 Hooperville's player site has an early-access lock (API answers 401 "hoopr.id is in early access" to anyone without the code; the
  stats and logos stop loading). Set `HOOPERVILLE_EARLY_CODE` (the early-access code, kept in Hooperville's gitignored `.env.early-access.txt`) on this
  site's Railway service and every request to Hooperville carries the pass cookie. Without it the site shows its last cached data or the sample.
- `index.html` fetches `/api/site-data`; if that fails or finds no league it falls back to the sample in
  `data.js`. The footer says "Live stats from hoopr.id" or "Sample data".
- `app.js` renders every page with hash routing: home, games, standings, stats, playoffs, teams, team/CODE,
  player/CODE-username, game/ID, news. Sample games without a box score get generated box scores that add
  up to the real final score (seeded, so stable). Playoff games are kept out of standings and season stats.
- `data.js` supplies branding (gold accent `#d4a017` on black, logo emoji, tagline, venue; no email or founding year, so the footer leaves them out) and the `signup` settings even when live (sign-ups are closed: `signup.open: false` hides the band, menu links and form).
  Also pictures: `league.photos` (banner slides and news) and `league.championPhoto` (first slide once there is a
  champion, with CSS confetti), empty until real photos are added to `photos/` (outside image
  hosts are blocked in the sandbox and in the preview, so keep pictures in the repo); `pictures.teams` / `pictures.players`
  by name override Hooperville's.
- `signups.js` stores season sign-ups (teams and free agents) in `signups.json` under the Railway volume
  (`RAILWAY_VOLUME_MOUNT_PATH`) or `DATA_DIR`, else `.data/` (lost on redeploy). Public: `POST /api/signups`,
  `GET /api/signups/summary` (counts only). Private: `GET /api/signups` with header `x-passcode` = `SIGNUP_PASSCODE`;
  the organisers' page is `/#signups` (not linked anywhere). Contact details must never appear on a public page.
- `content.js` stores what the organisers write in `content.json` (same folder) and their pictures in `uploads/`:
  slideshow order (automatic slides `league`, `closest`, `leader`, `standings`, `news` mixed with their own picture
  slides, each with on/off, link and show-from/until dates; `logos` = team name to uploaded logo, `leagueLogo`), articles (`#article/ID`) and photo albums (`#photos`,
  `#album/ID`, full-screen viewer). Public: `GET /api/content` (switched-on and published only). Private, header
  `x-passcode` = `SIGNUP_PASSCODE`: `GET`/`PUT /api/admin/content`, `POST /api/admin/upload` (JPEG/PNG/WebP, checked
  by first bytes; the editor shrinks photos to 2000px JPEG on the phone first). The editor is `/#admin` (`admin.js`,
  loaded only there; not linked anywhere). Games are referenced as `date|home team`, players by site id.

## Design (settled with the owner after several rounds)

**Professional, modern, restrained** (owner, Nov 2026: the earlier "matchday programme" with tape, tickets, slab type and marquee "looks
kiddish/childish -- make it professional modern"; before that "dull and too AI"). Do not bring back playful devices: no tilted or taped labels,
hard offset shadows, barcodes, ticket notches, marquee, confetti, emoji, clip-art trophies or marker highlights. Think broadcast graphics and
a good sports app: flat white surfaces, 1px hairline borders (`--hair`), almost no shadow, generous whitespace, tabular numerals, thin motion.
White page by default (owner's earlier request): it does NOT follow a phone's dark mode, and dark is only an opt-in toggle stored in the browser.

- **Palette**: near-black `--ink #0b0d12`, white, cool greys; gold is the only accent and stays small (`--hl #e3b13a` on dark surfaces, `--team`
  = the league colour for the nav underline and rules, `--team-ink` for gold-ish text on white). Team colours live in logos, thin top rules on
  Home leader tiles, banner glows and roster/team card colour fields, never as big flat fills behind body text.
- **Banner and stage surfaces** (owner, Nov 2026: "make the banner white too ... light for the eyes"): white with a soft team-colour tint, via the `--stage/--on/--on-2/--on-3` tokens (dark only under the dark toggle). The Home banner (`hero()` in `app.js`) is white with a faint glow in the team's colour. Matchups
  (`poster()`): the two teams either side of a hairline, each with a soft glow in its own colour, large logo, condensed name, a small VS or FINAL
  pill in the middle, an info bar underneath with the button. Title slide: "Road to the title" (or "Chase for the crown" / the champion)
  beside a small "Top seeds" table. Scoring leader: his number huge and faint, a row of four stats divided by hairlines. First place: the top four
  as flat bars. Numbered tab bar underneath (01 THE TITLE, 02 SEMIFINAL…) with a thin line that fills over the 6 s each slide shows.
- **Games** (`gameCard`, class `ticket` kept for the code): white card, stage in small caps, two team rows with logos, big tabular scores, a quiet
  footer with date and a "Box score →" link. **Cards** (roster `.pcard`, home `.ltile`, teams `.tcard`): white cards with a colour field or a
  thin team-colour top rule. **Tables**: light grey header row in small caps, hairline rows. **Standings** (`.ladder`): a clean table with large
  rank numbers, last-five squares and a "Playoff line" band. **Tabs** (`.seg`): a grey segmented control with a white active pill.
- Section heads: condensed title over a hairline with a quiet "ALL GAMES →" link; page heads: eyebrow + large condensed title. Buttons: solid
  near-black (`.btn`) or white on dark (`.hero-link`); outline for secondary.

### Type, colour and logos (Oct 2026 pass, "NBA feel")

- Fonts are self-hosted in `fonts/` (`manrope-var.woff2`, @font-face at the top of `styles.css`, preloaded in `index.html`), so no
  request leaves the site. One family: **Manrope** (variable 400-800), the only family, for everything. Headings are sentence case at weight 700 with normal letter-spacing (owner, Nov 2026: "font is too tight"); small uppercase labels only for metadata. Do not add a second family or go back to condensed type.
  Class names to avoid reusing: `.seed` is the bracket's seed number (the Home panel uses `.seed-row`); table rows are `tr.link`.
- Accent as text on white must use `--team-ink` (a darkened accent), never `--team` (gold on white fails contrast);
  `--on-team` is the text colour on top of the accent (set from the accent's brightness in `app.js`). Banners and posters darken the
  team colour so white text stays readable on light team colours (mint, gold, grey).
- Do not reuse the class name `link` for new things: table rows are `tr.link`; the text-button style is scoped to `button.link, a.link`.
- Team logos (`logo()` in `app.js`): an uploaded picture if there is one (Hooperville's `img`, `pictures.teams` in `data.js`, or the
  editor's Logos tab, in that increasing priority; Hooperville's come in as `img` from `/api/team-logos`), else a designed SVG crest: the team colour plus a monogram (initials of the
  first two words, the whole name if 3 letters or fewer, the 3-letter code if two teams would share a monogram) on one of five
  shapes assigned by the team's alphabetical position, so neighbours differ. The league's own mark is `leagueCrest()`
  (black disc, gold ring, `L.short`). Hooperville DOES have team logos, but not in the team objects: `GET /api/team-logos` returns
  `{ teamId: "/api/teams/<id>/logo?v=…" }`, and a league's logo is the static file `/logos/<slug>.webp` (the front end
  hard-codes which leagues have one). `hooperville.js` reads both and `server.js` serves them as `/hv-logo/<teamId|league>`
  (raster images only, cached six hours in memory, last copy kept if Hooperville is down), so the site data carries
  `/hv-logo/…` addresses. Logos are 256px squares and fill the round badge (`object-fit: cover`). The crests remain for any
  team without a logo. Hooperville has no player photos.

### Game order (owner's request, Oct 2026)

Games always go upcoming first (soonest first), then finished (latest first): the score strip along the top (live, up to 8 upcoming,
then up to 8 finished, a rule marks where finished ones begin), the Games page (one page with an Upcoming section then a Finished
section, no tabs; `#games/results` scrolls to Finished), and Home ("Coming up" then the latest results). Playoff games are included
everywhere under their stage's name (they used to be missing from the Games page and Home).

### Box sizes

Stats leader boards, roster (player) cards, team cards, Home leader tiles and tables were slimmed on purpose (owner: "too big").
Player names in the players table stay on one line on phones. Keep new boxes in the same compact range.

### Quality checks that were run (Oct 2026)

A scripted audit visits every page (all teams, a spread of games and players, editor, closed sign-up page) at 390px and 1280px
in white and in the dark toggle, and checks JS errors, failed requests, sideways overflow, broken images, stray
"undefined/NaN/null", and axe-core WCAG A/AA (contrast, keyboard access). It was clean. Re-run it after visual changes.
Contrast rules: text on a team colour uses `readable()`/`legible()` in `app.js` (never a fixed white), team colours as text on white use
`onWhite()`, in the dark toggle `onDark()`. Scrolling tables and clickable rows are keyboard-focusable. A game Hooperville marks "live"
shows as live only within 2h before to 8h after its start (a test game switched to live days early is shown as scheduled).
Page titles name the page (team, player, game score, article). Tab icons: `favicon.png`, `apple-touch-icon.png` (the league logo).

## Testing

Run Hooperville locally with its Trial League (`cd basketball_stats && PORT=3299 npm run preview:memory`;
test admin passcode 123456), then `HOOPERVILLE_URL=http://localhost:3299 LEAGUE_SLUG=trial-league node server.js`
and screenshot every page with Playwright at 390px and 1280px. Also check the sample-data fallback, and
that every box score adds up to its final score and quarter scores.
