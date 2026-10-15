# Matchday — sports website

A no-build static site with four parts in one:

- **Home** — next-match countdown, latest results, standings, headlines
- **Scores** — your club's fixtures/table, or live results and tables for major leagues (EPL, NBA, NFL, La Liga) via [TheSportsDB](https://www.thesportsdb.com)'s free API; falls back to club data when offline
- **Team** — schedule, club facts, roster with position filter, contact form (opens the visitor's email app)
- **News** — searchable stories
- **Fan Zone** — score prediction, player-of-the-month poll, club history, fan wall

Light/dark mode and phone layouts included.

## Make it yours

All content lives in `data.js`: club name, colors, schedule, table, roster, news, history, and which live leagues appear in the Scores dropdown. Nothing else needs editing.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

## Publish (GitHub Pages)

Repo **Settings → Pages → Deploy from a branch → `main` / root**. The site appears at `https://<user>.github.io/sports-website/`.

## Limitations

- Fan Zone predictions, votes and wall posts are stored **per browser** (localStorage). Other visitors don't see them. Sharing them needs a backend (e.g. Supabase, Firebase).
- TheSportsDB's free key (`3`) is rate-limited and returns a limited set of events; get a paid key for production use.
