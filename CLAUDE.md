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

**A matchday programme** (owner, Nov 2026: "dull and too AI, where's the creative design"). The site is made of arena paper: games are
ticket stubs, players are trading cards, the league table is a scoreboard, the top banner is a set of posters. Keep that idea; do not slide
back to generic white cards with soft shadows. White page by default (owner's earlier request): it does NOT follow a phone's dark mode, and
dark is only an opt-in toggle stored in the browser.

- **Signature moves**: heavy slab headlines (Alfa Slab One) with a yellow marker run under section titles and a tilted yellow label behind
  page titles, with the season stamped huge and hollow ("S7") behind them; yellow torn "tape" for stage labels; hard offset shadows
  (`--shadow`, no blur) and 2px black outlines; a black score strip on top (upcoming games first, yellow times); a scrolling yellow marquee under
  the slideshow; the league's name outlined across the footer.
- **Home slideshow** (`hero()` in `app.js`): each slide is a poster. Matchups split in the two teams' colours with a yellow slash and a VS
  or FINAL badge (`poster()`; colours too alike get gold or black via `posterColors`); scoring leader = his number huge and hollow; first place =
  the top four as podium bars; title slide = trophy over spinning rays; champion = confetti. Underneath is a numbered tab bar (01 THE TITLE,
  02 SEMIFINAL…) whose yellow line fills over the 6 s each slide shows. The organisers' own slides keep their picture and words.
- **Tickets** (`gameCard`): coloured edge, tape stage label, torn stub with date and barcode. **Cards** (roster `.pcard`, home leaders `.ltile`):
  paper cards with a striped colour field, big number, dashed dividers, a shine on hover. **Standings** (`.ladder`): black scoreboard, big
  yellow rank numbers, last-five squares, a yellow underline sized by win percentage, a "Playoff line" tape. Other tables: black header row.
- Colours: `--hl` yellow `#ffc933` is the house colour for tape, marker, buttons and the marquee; `--edge`/`--pop-c` black outlines and shadows;
  `--ticket` warm paper. Team colours do the rest. Dark toggle swaps outlines to grey and shadows to yellow.

### Type, colour and logos (Oct 2026 pass, "NBA feel")

- Fonts are self-hosted in `fonts/` (Latin subsets as woff2, @font-face at the top of `styles.css`, the three main ones preloaded in
  `index.html`), so no request leaves the site. **Alfa Slab One** = headlines, brand name, big numbers on tabs and badges; **Big Shoulders
  Display** (variable 700-900) = team names, scores, table numbers, nav; **Bricolage Grotesque** (variable) = body text; **DM Mono** = small
  labels, table headers, tags (always small caps with letter-spacing). Do not add a fifth family.
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
