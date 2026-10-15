# Cubao Baller Club

The website for the Cubao Baller Club basketball league, in an NBA.com style: black masthead with a score strip, team-colour banners, tall condensed capitals. Light mode is NBA.com, dark mode is the NBA app.

- **Home**: league banner with Game of the Week, league numbers, last week's scores, this week's games, league leaders, standings, teams, news
- **Games**: every game by week, upcoming and results
- **Game page**: scoreboard split between the two team colours, score by quarter; Summary (player of the game, game leaders, team stats) and both teams' box scores. A game not yet played shows tale of the tape, players to watch, form and head to head.
- **Standings**: W, L, PCT, GB, PPG, OPPG, last five, streak, and the playoff line
- **Stats**: top five in points, rebounds, assists, steals, blocks and efficiency; team rankings; every player, sortable, with a team filter
- **Teams**: a card per team; each team page has its record, six numbers with league rank, roster and schedule
- **Player page**: season numbers and game log
- **News**

Phone first, wider on a computer.

## Make it yours

Everything is in `data.js`:

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

## Run locally

`npm start`, then open http://localhost:8080. Or just open `index.html`.

## Hosting on Railway

`server.js` is a small web server with no dependencies, and `railway.json` tells Railway to run it.

1. In Railway: **New Project → Deploy from GitHub repo → `sports-website-template`**.
2. When the deploy finishes: the service's **Settings → Networking → Generate Domain**.

Every push to `main` deploys again.
