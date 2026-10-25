# Cubao Baller Club

The website for the Cubao Baller Club basketball league, in an NBA.com style: black masthead with a score strip, team-colour banners, tall condensed capitals. Light mode is NBA.com, dark mode is the NBA app.

- **Home**: a sliding banner (the league and Game of the Week, last week's closest game, the scoring leader, first place, the latest news; add photos with `photos` in `data.js`), league numbers, last week's scores, this week's games, league leaders, standings, teams, news
- **Games**: every game by week, upcoming and results
- **Game page**: scoreboard split between the two team colours, score by quarter; Summary (player of the game, game leaders, team stats) and both teams' box scores. A game not yet played shows tale of the tape, players to watch, form and head to head.
- **Standings**: W, L, PCT, GB, PPG, OPPG, last five, streak, and the playoff line
- **Stats**: top five in points, rebounds, assists, steals, blocks and efficiency; team rankings; every player, sortable, with a team filter
- **Teams**: a card per team; each team page has its record, six numbers with league rank, roster and schedule
- **Player page**: season numbers and game log
- **News**

Phone first, wider on a computer.

## Live stats from Hooperville

The site reads the league live from **Hooperville**, the scoring app the table committee uses. Scores, both box scores, quarter scores, the Player of the Game, standings and leaders all come from what is recorded at the scorer's table. News becomes automatic game recaps. The footer shows **Live stats from hoopr.id** when it is connected and **Sample data** when it is not.

How it works: `hooperville.js` (on the site's own server) reads Hooperville's public pages for the league, its teams and every finished game, turns them into the site's format and keeps them for two minutes, so Hooperville gets a handful of requests every two minutes no matter how many people visit. If Hooperville cannot be reached, the last good copy is kept; with none, the site shows the sample in `data.js`.

Settings, in Railway under the service's **Variables**:

| Variable | What it does | Default |
|---|---|---|
| `LEAGUE_SLUG` | The league's address in Hooperville, the part after `/l/` | the first league whose name contains "cubao" |
| `HOOPERVILLE_URL` | Where Hooperville lives | `https://hoopr.id`, falling back to the old `https://web-production-69499.up.railway.app` if hoopr.id does not answer |

Playoffs come through too: the bracket, series results, champion and Finals MVP, plus Season MVP (best efficiency per game) and Defensive Player (most steals plus blocks per game). Playoff games are kept out of standings and season stats, as Hooperville does. The league's name, and its logo and team logos when Hooperville has them, come from Hooperville. The colour, tagline, venue and email come from `data.js`.

## Season sign-ups

When `signup.open` is true in `data.js`, the site shows a **Sign-ups are open** band on Home and a **Sign up** page:
captains register a team (name, colour, captain, mobile, email, 5–15 players) and players without a team sign up
as free agents (position, height, level). Each gets a reference code. Duplicate team names are refused, and
there is a bot trap and a limit of 5 sign-ups per connection every 10 minutes.

Sign-ups are saved in `signups.json` on the server and are **never shown publicly**. Organisers open
`/#signups`, enter the passcode, see every team and free agent, tap a number to call, and download a spreadsheet.

Two settings on Railway (service → **Variables**, and service → **Volume**):

| Setting | Why |
|---|---|
| `SIGNUP_PASSCODE` variable | The passcode for `/#signups`. Without it the list stays locked. |
| A **Volume** on the service | Keeps sign-ups when the site redeploys. Railway sets `RAILWAY_VOLUME_MOUNT_PATH` and the site uses it. Without one, sign-ups are lost on every deploy, and the admin page warns about it. |

To close sign-ups, set `open: false`. To start the following season, change `season`, `starts` and `deadline`.

## Make it yours

Without Hooperville, everything is in `data.js`. With Hooperville connected, only `league` (the branding) is read from it:

- `league`: name, colour, logo emoji, season, city, venue, email
- `teams`: each team's three-letter code, colour, logo emoji and roster (number, name, position, height; captain first, first five are starters)
- `schedule`: every game. Add `score: [home, away]` once it's played.
- `news`: league posts. A recap can link to its game with `game: "YYYY-MM-DD", team: "Team name"`.

**The teams, players, schedule and results are sample data**, taken from the Hooperville Trial League.

When a game has no `box`, the site makes up box scores that add up to the real final score, and the numbers stay the same on every visit. To use real numbers, give the game a `box` with one list per team:

```js
box: {
  "Riverside Sharks": [{ no: "3", name: "Josh Valdez", min: 30, pts: 14, fgm: 5, fga: 11, tpm: 2, tpa: 5, ftm: 2, fta: 2,
                         reb: 3, ast: 6, stl: 1, blk: 0, tov: 2, pf: 2 }, ...],
  "Westgate Wolves": [...]
}
```

## Pictures

- **Banner and news photos**: `league.photos` in `data.js`, a list of picture addresses used in turn behind the Home slides and the news stories. Put the files in a `photos` folder and list them as `"photos/name.jpg"`; empty means plain team colours. Once a champion is crowned, the first slide shows `league.championPhoto` (a trophy celebration) with falling confetti.
- **Team logos and player photos**: Hooperville's are used when it has them. To add or override, list them by name in `pictures` in `data.js`: `teams: { "Team name": "photos/logo.png" }`, `players: { "Player name": "photos/face.jpg" }`.
- A picture that cannot load falls back to the team colour, initials or emoji.

## Organisers' editor

Open **/#admin** on the live site and enter the organisers' passcode (the same one as the sign-ups list, `SIGNUP_PASSCODE` on Railway). There you can:

- **Slideshow**: put the home banner's slides in any order, switch any off, and add your own slides with a picture, headline, short text, a button and where it goes (an article, a photo album, a game's box score, a team, a player, the sign-up page or any web address). A slide can show only between two dates.
- **Articles**: write stories with a picture, summary and paragraphs, linked to a game if you like. They appear on the News page and on Home.
- **Photos**: make albums from several photos at once, with captions. They get their own Photos page.

Photos are shrunk on the phone before they are sent. Everything is kept on the Railway volume, like the sign-ups; without a volume it is lost on every redeploy (the editor warns about this).

## Run locally

`npm start`, then open http://localhost:8080. Or just open `index.html`.

## Hosting on Railway

`server.js` is a small web server with no dependencies, and `railway.json` tells Railway to run it.

1. In Railway: **New Project → Deploy from GitHub repo → `sports-website-template`**.
2. When the deploy finishes: the service's **Settings → Networking → Generate Domain**.

Every push to `main` deploys again.
