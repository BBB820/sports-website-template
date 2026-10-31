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

NBA.com-style league site, modern and roomy: black masthead with a slim score strip, team-colour banners
with faint court lines, Barlow Condensed capitals for headlines and numbers, rounded cards with soft
shadows, pill tabs. Home has five blocks: a hero slideshow (a black-and-gold championship banner: "Chase for the crown" with the top four, "Road to the title" in the playoffs, the champion with confetti once crowned or once every game is played; then Game of the Week, the
closest finish of the last round, the scoring leader, first place, the latest league post; auto-advances every 6s,
photos from `league.photos` in `data.js` go behind the slides), this
week's games, standings beside last week's results, league leader tiles, news. On phones a bottom tab bar
(Home, Games, Standings, Stats, More) replaces the top menu, Home rows swipe sideways, and table name
columns stay pinned. The owner rejected both a busier version and a plainer one; keep to this middle.

### Type, colour and logos (Oct 2026 pass, "NBA feel")

- Fonts: Barlow Condensed (600/700/800) for headlines, scores, numbers, team names and the nav; Roboto for body text,
  small labels, table headers, tabs and form text (small caps in the condensed face were hard to read).
- Hierarchy: page title (`.phead h1`) about 3.6rem max; section headers (`.sh h2`) 1.6rem with a gold bar and a hairline; card
  titles 1.2-1.4rem; small labels 0.7rem Roboto uppercase. Keep the accent for bars, underlines and buttons only.
- Accent as text on white must use `--team-ink` (a darkened accent), never `--team` (gold on white fails contrast);
  `--on-team` is the text colour on top of the accent (set from the accent's brightness in `app.js`). Banners darken the
  team colour (`--depth`) so white text stays readable on light team colours (mint, gold, grey).
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

## Testing

Run Hooperville locally with its Trial League (`cd basketball_stats && PORT=3299 npm run preview:memory`;
test admin passcode 123456), then `HOOPERVILLE_URL=http://localhost:3299 LEAGUE_SLUG=trial-league node server.js`
and screenshot every page with Playwright at 390px and 1280px. Also check the sample-data fallback, and
that every box score adds up to its final score and quarter scores.
