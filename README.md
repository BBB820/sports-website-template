# Cubao Baller Club

The team website for Cubao Baller Club. It's styled after the Hooperville player app (the light look: white cards, black pill tabs, Cabin and Abel fonts) and laid out like an NBA team site.

- **Home**: team card with league rank for PPG, RPG, APG, FG%, 3PT% and OPPG; next game with countdown; latest results; team leaders; standings; club news
- **Schedule**: upcoming games and results. Tap a game to open it.
- **Game page**: a played game shows score by quarter, player of the game, top performers, team stats side by side, and Cubao's box score. A game not yet played shows tale of the tape, recent form and head to head.
- **Roster**: players and staff. Tap a player to see their season averages and game log.
- **Stats**: every player's numbers, per game or totals. Tap a column to sort.
- **Standings**: W, L, PCT, GB, PF, PA and streak.

Phone first, wider on a computer, light and dark.

## Make it yours

Everything is in `data.js`:

- `team`: name, colour, logo emoji, home court, coach, email
- `league`: league name, season, city
- `teams`: the other teams' colours and logo emoji
- `roster`: number, name, position, height, captain
- `schedule`: every league game. Add `score: [home, away]` once it's played.
- `news`: club posts

**The league, opponents, schedule, results and stats here are sample data.** The roster uses names from the Hooperville trial data.

When a Cubao game has no `box`, the site makes up a box score that adds up to the real final score, and the numbers stay the same on every visit. To use real numbers, give the game a `box` list with one line per player:

```js
box: [{ no: "3", name: "Bernard Lopez", min: 30, pts: 14, fgm: 5, fga: 11, tpm: 2, tpa: 5, ftm: 2, fta: 2,
        reb: 3, ast: 6, stl: 1, blk: 0, tov: 2, pf: 2 }, ...]
```

## Run locally

`npm start`, then open http://localhost:8080. Or just open `index.html`.

## Hosting on Railway

`server.js` is a small web server with no dependencies, and `railway.json` tells Railway to run it.

1. In Railway: **New Project → Deploy from GitHub repo → `sports-website-template`**.
2. When the deploy finishes: the service's **Settings → Networking → Generate Domain**.

Every push to `main` deploys again.
