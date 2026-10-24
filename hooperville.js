// Reads the league from Hooperville (the scoring app) and turns it into the site's data format,
// the same shape as data.js. Everything it reads is public in Hooperville; no login is needed.
//
// Settings (Railway → the service → Variables):
//   HOOPERVILLE_URL  the Hooperville player app, default https://web-production-69499.up.railway.app
//   LEAGUE_SLUG      the league's address in Hooperville (the part after /l/). If unset, the first
//                    league whose name contains "cubao" is used.

const BASE = (process.env.HOOPERVILLE_URL || "https://web-production-69499.up.railway.app").replace(/\/+$/, "");
const SLUG = process.env.LEAGUE_SLUG || "";
const CACHE_MS = 2 * 60 * 1000;
const TIMEZONE = "Asia/Manila";

const MASCOTS = [
  [/tiger/, "🐯"], [/lion/, "🦁"], [/panther|jaguar|leopard|cheetah/, "🐆"], [/wolf|wolves/, "🐺"], [/bear|grizzl/, "🐻"], [/fox/, "🦊"],
  [/eagle|hawk|falcon/, "🦅"], [/raven|crow|bird/, "🐦"], [/\bowl/, "🦉"], [/shark/, "🦈"], [/dolphin/, "🐬"], [/bull/, "🐂"],
  [/horse|mustang|stallion|bronco|colt/, "🐎"], [/\brams?\b/, "🐏"], [/cobra|viper|snake|python/, "🐍"], [/dragon/, "🐉"],
  [/\bbees?\b|hornet|wasp/, "🐝"], [/gator|croc/, "🐊"], [/\bking|royal|queen|monarch/, "👑"], [/viking/, "🪓"], [/knight|warrior|spartan|gladiator/, "⚔️"],
  [/comet|meteor/, "☄️"], [/rocket/, "🚀"], [/\bstar/, "⭐"], [/\bsuns?\b/, "☀️"], [/thunder|bolt|lightning/, "⚡"],
  [/storm|hurricane|cyclone/, "🌪️"], [/fire|flame|blaze|heat/, "🔥"], [/wave|tide|surf/, "🌊"], [/pirate|buccaneer/, "🏴‍☠️"],
  [/wizard|magic/, "🪄"], [/\bace/, "♠️"], [/diamond|gem/, "💎"], [/hoop|baller|dunk/, "🏀"]
];
const PALETTE = ["#e67e22", "#27ae60", "#3498db", "#8e44ad", "#e74c3c", "#1f3a5f", "#16a085", "#c0392b", "#2c3e50", "#d35400"];
const POINTS = { fg2_made: 2, fg3_made: 3, ft_made: 1 };

const mascot = (name) => MASCOTS.find(([re]) => re.test(name.toLowerCase())) || null;

// Three letters, unique within the league: "Bayside Bulls" → BAY, "Cubao Baller Club" → CBC.
function shortCodes(names) {
  const used = new Set();
  return Object.fromEntries(names.map((name) => {
    const words = name.split(/\s+/).filter(Boolean);
    const tries = [
      words.length >= 3 ? words.map((w) => w[0]).join("").slice(0, 3) : (words[0] || "").slice(0, 3),
      words.map((w) => w[0]).join("").slice(0, 3),
      (words[0] || "").slice(0, 2) + (words[1] || "").slice(0, 1),
      name.replace(/\s+/g, "").slice(0, 3)
    ].map((s) => s.toUpperCase()).filter((s) => s.length >= 2);
    let code = tries.find((s) => !used.has(s)) || tries[0];
    for (let n = 2; used.has(code); n++) code = tries[0].slice(0, 2) + n;
    used.add(code);
    return [name, code];
  }));
}

// "2026-10-17T12:00:00Z" → "2026-10-17T20:00", the league's own clock.
function localTime(iso) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

async function get(path) {
  const res = await fetch(BASE + "/api" + path, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Hooperville ${path}: ${res.status}`);
  return res.json();
}

// Run jobs a few at a time so Hooperville is not flooded.
async function inBatches(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

async function findSlug() {
  if (SLUG) return SLUG;
  const leagues = await get("/leagues");
  const match = leagues.find((l) => /cubao/i.test(l.name));
  return match ? match.slug : null;
}

async function build() {
  const slug = await findSlug();
  if (!slug) return null;
  const league = await get(`/leagues/${encodeURIComponent(slug)}`);
  // The current season: the newest one that has teams.
  const season = (league.seasons || []).find((s) => s.teams && s.teams.length) || null;
  if (!season) return null;

  const names = season.teams.map((t) => t.name);
  const codes = shortCodes(names);
  const details = await inBatches(season.teams, 4, (t) => get(`/teams/${t.id}`));

  const teams = {};
  season.teams.forEach((t, i) => {
    const m = mascot(t.name);
    const members = (details[i].members || []).filter((p) => p.isPlayer);
    // Captain first, then by jersey number, as Hooperville lists them.
    members.sort((a, b) => (b.canManage - a.canManage));
    teams[t.name] = {
      short: codes[t.name],
      color: t.color || PALETTE[i % PALETTE.length],
      logo: m ? m[1] : "🏀",
      roster: members.map((p) => ({
        key: p.username, no: p.jerseyNumber ?? "", name: p.displayName, pos: p.position || "", ht: p.heightCm || null, captain: !!p.canManage
      }))
    };
  });

  // Regular-season games only: Hooperville keeps playoff games out of standings and stats too.
  const regular = (season.games || []).filter((g) => g.playoffRound == null);
  const finals = regular.filter((g) => g.status === "final");
  const full = await inBatches(finals, 4, (g) => get(`/games/${g.id}`));
  const byId = Object.fromEntries(full.map((g) => [g.id, g]));

  const line = (p) => ({
    key: p.username, no: p.jerseyNumber ?? "", name: p.displayName, min: Math.round((p.seconds || 0) / 60),
    pts: p.pts, fgm: p.fgm, fga: p.fga, tpm: p.tpm, tpa: p.tpa, ftm: p.ftm, fta: p.fta,
    reb: p.reb, ast: p.ast, stl: p.stl, blk: p.blk, tov: p.tov, pf: p.pf, pm: p.plusMinus
  });

  const schedule = regular.map((g) => {
    const game = { date: localTime(g.startsAt), home: g.home.name, away: g.away.name };
    if (g.venue) game.venue = g.venue;
    if (g.status === "live") game.live = [g.homeScore, g.awayScore];
    const d = byId[g.id];
    if (g.status === "final" && d) {
      game.score = [g.homeScore, g.awayScore];
      game.box = { [g.home.name]: d.home.players.map(line), [g.away.name]: d.away.players.map(line) };
      // Score by period, added up from the play log (made shots only).
      const periods = Math.max(4, ...d.events.map((e) => e.period || 1));
      const q = [g.home.id, g.away.id].map(() => Array(periods).fill(0));
      for (const e of d.events) {
        const pts = POINTS[e.type];
        if (!pts || !e.period) continue;
        const side = e.teamId === g.home.id ? 0 : e.teamId === g.away.id ? 1 : -1;
        if (side >= 0) q[side][e.period - 1] += pts;
      }
      // Only trust it when it adds up to the final score.
      if (q[0].reduce((a, b) => a + b, 0) === g.homeScore && q[1].reduce((a, b) => a + b, 0) === g.awayScore) game.quarters = q;
      if (d.potgUserId) {
        const p = [...d.home.players, ...d.away.players].find((x) => x.userId === d.potgUserId);
        if (p) game.potg = p.username;
      }
    }
    return game;
  });

  return {
    source: { name: "Hooperville", league: league.name, slug, season: season.name, url: `${BASE}/l/${slug}`, updated: new Date().toISOString() },
    league: { name: league.name, season: season.name, city: league.location || "" },
    teams,
    schedule
  };
}

let cache = null;
let cachedAt = 0;
let pending = null;

/** The league as site data, or null when Hooperville has no matching league. Cached for two minutes. */
async function siteData() {
  if (cachedAt && Date.now() - cachedAt < CACHE_MS) return cache;
  if (!pending) {
    pending = build()
      .then((data) => { cache = data; cachedAt = Date.now(); return data; })
      .finally(() => { pending = null; });
  }
  try {
    return await pending;
  } catch (err) {
    // Hooperville unreachable: keep serving the last good copy if there is one.
    if (cachedAt) return cache;
    throw err;
  }
}

module.exports = { siteData, BASE };
