# Cubao Baller Club

The team website for Cubao Baller Club: a modern take on 90s basketball. Cream paper, thick black outlines with hard shadows, wide slanted capitals, outlined jersey numbers and one orange-teal-purple stripe. Light and dark.

- **Home**: club name and record, the six team numbers with league rank, next game, last game, team leaders, standings, news
- **Schedule**: upcoming games and results by month
- **Game page**: scoreboard and score by quarter; Summary (player of the game, team stats) and Box score. A game not yet played shows tale of the tape, form and head to head.
- **Roster**: player cards. Tap one for the player page (season numbers and game log).
- **Stats**: every player's numbers, sortable, per game or totals
- **Standings** and **News**

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
