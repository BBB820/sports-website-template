# Cubao Ballers Club website

The public website of the **Cubao Ballers Club** basketball league (Quezon City). It is the league's
own site, separate from Hooperville; it reads the league's stats from Hooperville and never writes to it.
The owner is non-technical and usually works from a phone: explain in plain language and verify
changes yourself (screenshots on a phone-sized and a desktop screen) rather than asking them to check.

This project has nothing to do with Casa Pards (`BBB820/casapards`); never change that repo from here.

## Where things live

| What | Where |
|---|---|
| Code | https://github.com/BBB820/sports-website-template (`main` deploys) |
| Live site | Railway project `fd86447e-794a-477d-b45d-02b07c8f3bee`, deploys every push to `main` (check with `gh api repos/BBB820/sports-website-template/deployments`) |
| Stats source | Hooperville at **https://hoopr.id** (old address `https://web-production-69499.up.railway.app` kept as fallback). Its code is `BBB820/basketball_stats`, read-only from here; its newest features (logos, season awards) may not be on GitHub yet |
| Preview for the owner | https://claude.ai/artifact/F6Z2XFtV7QpnXEULwaocgW (static, so it always shows the sample data) |

## How it works

- No build step, no dependencies. `server.js` (Node 18+) serves the files and `/api/site-data`.
- `hooperville.js` reads the league from Hooperville's public API (`/api/leagues`, `/api/leagues/:slug`,
  `/api/teams/:id`, `/api/games/:id`, `/api/seasons/:id/playoffs`), converts it to the site's data shape
  (same as `data.js`) and caches it for two minutes. League: `LEAGUE_SLUG` env var, else the first league
  whose name contains "cubao". Address: `HOOPERVILLE_URL`, else hoopr.id, else the old Railway address.
- `index.html` fetches `/api/site-data`; if that fails or finds no league it falls back to the sample in
  `data.js`. The footer says "Live stats from hoopr.id" or "Sample data".
- `app.js` renders every page with hash routing: home, games, standings, stats, playoffs, teams, team/CODE,
  player/CODE-username, game/ID, news. Sample games without a box score get generated box scores that add
  up to the real final score (seeded, so stable). Playoff games are kept out of standings and season stats.
- `data.js` supplies branding (colour, logo emoji, tagline, venue, email) and the `signup` settings even when live.
  Also pictures: `league.photos` (banner slides and news, stock Unsplash photos for now) and `pictures.teams` /
  `pictures.players` (by name, override Hooperville's). Unsplash is blocked from the cloud sandbox, so check those on the live site.
- `signups.js` stores season sign-ups (teams and free agents) in `signups.json` under the Railway volume
  (`RAILWAY_VOLUME_MOUNT_PATH`) or `DATA_DIR`, else `.data/` (lost on redeploy). Public: `POST /api/signups`,
  `GET /api/signups/summary` (counts only). Private: `GET /api/signups` with header `x-passcode` = `SIGNUP_PASSCODE`;
  the organisers' page is `/#signups` (not linked anywhere). Contact details must never appear on a public page.

## Design (settled with the owner after several rounds)

NBA.com-style league site, modern and roomy: black masthead with a slim score strip, team-colour banners
with faint court lines, Barlow Condensed capitals for headlines and numbers, rounded cards with soft
shadows, pill tabs. Home has five blocks: a hero slideshow (league + key numbers + Game of the Week or the champion; then the
closest finish of the last round, the scoring leader, first place, the latest league post; auto-advances every 6s,
photos from `league.photos` in `data.js` go behind the slides), this
week's games, standings beside last week's results, league leader tiles, news. On phones a bottom tab bar
(Home, Games, Standings, Stats, More) replaces the top menu, Home rows swipe sideways, and table name
columns stay pinned. The owner rejected both a busier version and a plainer one; keep to this middle.

## Testing

Run Hooperville locally with its Trial League (`cd basketball_stats && PORT=3299 npm run preview:memory`;
test admin passcode 123456), then `HOOPERVILLE_URL=http://localhost:3299 LEAGUE_SLUG=trial-league node server.js`
and screenshot every page with Playwright at 390px and 1280px. Also check the sample-data fallback, and
that every box score adds up to its final score and quarter scores.
