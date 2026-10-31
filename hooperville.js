// Reads the league from Hooperville (the scoring app) and turns it into the site's data format,
// the same shape as data.js. Everything it reads is public in Hooperville; no login is needed.
//
// Settings (Railway → the service → Variables):
//   HOOPERVILLE_URL  where Hooperville lives. Default https://hoopr.id, with the old Railway address
//                    as a backup when hoopr.id does not answer.
//   LEAGUE_SLUG      the league's address in Hooperville (the part after /l/). Default bro-league;
//                    if that is missing, the first league whose name contains "bro".

const OLD_ADDRESS = "https://web-production-69499.up.railway.app";
const ADDRESSES = [...new Set([process.env.HOOPERVILLE_URL, "https://hoopr.id", OLD_ADDRESS]
  .filter(Boolean).map((u) => u.replace(/\/+$/, "")))];
let BASE = ADDRESSES[0];
const SLUG = process.env.LEAGUE_SLUG || "bro-league";
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

// Hooperville's newer versions carry pictures (league and team logos, player photos). Pick up any field that
// looks like one, whatever it is called, so the site shows them without knowing the exact name.
function pictureOf(obj) {
  if (!obj || typeof obj !== "object") return null;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== "string" || !/logo|image|badge|crest|photo|picture|avatar/i.test(key)) continue;
    if (/^data:image\//.test(value) || /^https?:\/\//.test(value)) return value;
    if (value.startsWith("/")) return BASE + value;
  }
  return null;
}

// Logos live apart from the team data: GET /api/team-logos gives { teamId: "/api/teams/<id>/logo?v=…" }, and a league's
// logo is the file /logos/<slug>.webp. The site serves them itself (/hv-logo/<key>, see server.js) so they keep loading
// when Hooperville is slow, and so a browser never has to know where Hooperville lives.
const LOGO_SOURCES = {};
const LOGO_TTL = 6 * 60 * 60 * 1000;
const logoCache = new Map();
function registerLogo(key, path) {
  try {
    const url = new URL(path, BASE);
    if (url.origin !== new URL(BASE).origin) return null;
    LOGO_SOURCES[key] = url.href;
    return `/hv-logo/${key}?v=${encodeURIComponent(url.searchParams.get("v") || "1")}`;
  } catch { return null; }
}
async function leagueLogo(slug) {
  const path = `/logos/${encodeURIComponent(slug)}.webp`;
  try {
    const res = await fetch(BASE + path, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    if (res.ok && /^image\//.test(res.headers.get("content-type") || "")) return registerLogo("league", path);
  } catch { /* no league logo */ }
  return null;
}
/** A logo's picture: raster images only (never SVG, which can carry scripts), fetched once and kept for six hours. */
async function logoFile(key) {
  const src = LOGO_SOURCES[key];
  if (!src) return null;
  const hit = logoCache.get(key);
  if (hit && hit.src === src && Date.now() - hit.at < LOGO_TTL) return hit;
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(15000) });
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!res.ok || !/^image\/(png|jpeg|webp|gif)$/.test(type)) throw new Error(`logo ${key}: ${res.status} ${type}`);
    const body = Buffer.from(await res.arrayBuffer());
    if (body.length > 3 * 1024 * 1024) throw new Error(`logo ${key}: too big`);
    const entry = { src, type, body, at: Date.now() };
    logoCache.set(key, entry);
    return entry;
  } catch (err) {
    if (hit) return hit;   // Hooperville unreachable: keep showing the last copy
    throw err;
  }
}
const hasLogos = () => Object.keys(LOGO_SOURCES).length > 0;

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

// Use the first address that answers with Hooperville's league list.
async function connect() {
  let lastError;
  for (const base of ADDRESSES) {
    try {
      const res = await fetch(base + "/api/leagues", { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) });
      const list = res.ok ? await res.json() : null;
      if (Array.isArray(list)) { BASE = base; return list; }
      lastError = new Error(`${base}: no league list`);
    } catch (err) { lastError = err; }
  }
  throw lastError;
}

async function findSlug(leagues) {
  if (leagues.some((l) => l.slug === SLUG)) return SLUG;
  const match = leagues.find((l) => /\bbro\b/i.test(l.name));
  return match ? match.slug : null;
}

async function build() {
  const slug = await findSlug(await connect());
  if (!slug) return null;
  const league = await get(`/leagues/${encodeURIComponent(slug)}`);
  // The current season: the newest one that has teams.
  const season = (league.seasons || []).find((s) => s.teams && s.teams.length) || null;
  if (!season) return null;

  const names = season.teams.map((t) => t.name);
  const codes = shortCodes(names);
  const details = await inBatches(season.teams, 4, (t) => get(`/teams/${t.id}`));
  const logoPaths = await get("/team-logos").catch(() => ({}));

  const teams = {};
  season.teams.forEach((t, i) => {
    const m = mascot(t.name);
    const members = (details[i].members || []).filter((p) => p.isPlayer);
    // Captain first, then by jersey number, as Hooperville lists them.
    members.sort((a, b) => (b.canManage - a.canManage));
    const picture = (logoPaths[t.id] && registerLogo(t.id, logoPaths[t.id])) || pictureOf(t) || pictureOf(details[i]);
    teams[t.name] = {
      ...(picture ? { img: picture } : {}),
      short: codes[t.name],
      color: t.color || PALETTE[i % PALETTE.length],
      logo: m ? m[1] : "🏀",
      roster: members.map((p) => ({
        key: p.username, no: p.jerseyNumber ?? "", name: p.displayName, pos: p.position || "", ht: p.heightCm || null, captain: !!p.canManage,
        ...(pictureOf(p) ? { photo: pictureOf(p) } : {})
      }))
    };
  });

  // Playoff games are marked so the site keeps them out of standings and season stats, as Hooperville does.
  const regular = (season.games || []).slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const finals = regular.filter((g) => g.status === "final");
  const full = await inBatches(finals, 4, (g) => get(`/games/${g.id}`));
  const byId = Object.fromEntries(full.map((g) => [g.id, g]));

  const line = (p) => ({
    key: p.username, no: p.jerseyNumber ?? "", name: p.displayName, min: Math.round((p.seconds || 0) / 60),
    pts: p.pts, fgm: p.fgm, fga: p.fga, tpm: p.tpm, tpa: p.tpa, ftm: p.ftm, fta: p.fta,
    reb: p.reb, ast: p.ast, stl: p.stl, blk: p.blk, tov: p.tov, pf: p.pf, pm: p.plusMinus
  });

  const index = Object.fromEntries(regular.map((g, i) => [g.id, i]));
  const schedule = regular.map((g) => {
    const game = { date: localTime(g.startsAt), home: g.home.name, away: g.away.name };
    if (g.playoffRound != null) game.playoff = { round: g.playoffRound, slot: g.playoffSlot, stage: g.stage || null };
    if (g.venue) game.venue = g.venue;
    // "Live" only counts near the game's own time. A game switched to live days ahead (a test) or left live for a day
    // is shown as the scheduled or finished game it really is, not as a score that fans would think is on right now.
    const sinceStart = Date.now() - new Date(g.startsAt).getTime();
    if (g.status === "live" && sinceStart > -2 * 3600 * 1000 && sinceStart < 8 * 3600 * 1000) game.live = [g.homeScore, g.awayScore];
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

  // The bracket, champion and Finals MVP, when the season has playoffs.
  let playoffs = null;
  const view = await get(`/seasons/${season.id}/playoffs`).catch(() => null);
  if (view && view.rounds) {
    const side = (x) => (x ? { team: x.team.name, seed: x.seed } : null);
    const series = (x) => x && {
      round: x.round, slot: x.slot, format: x.format, bye: !!x.bye, a: side(x.a), b: side(x.b),
      winsA: x.winsA, winsB: x.winsB, needA: x.needA, needB: x.needB,
      winner: x.winnerTeamId ? (season.teams.find((t) => t.id === x.winnerTeamId) || {}).name || null : null,
      games: (x.games || []).map((g) => index[g.id]).filter((i) => i !== undefined)
    };
    playoffs = {
      rounds: view.rounds.map((r) => ({ round: r.round, name: r.name, format: r.format, series: r.series.map(series) })),
      third: series(view.third),
      champion: view.champion ? view.champion.name : null,
      mvp: view.mvp ? { key: view.mvp.username, name: view.mvp.displayName } : null
    };
  }

  const leagueLogoUrl = (await leagueLogo(slug)) || pictureOf(league);
  return {
    playoffs,
    source: { name: BASE === OLD_ADDRESS ? "Hooperville" : new URL(BASE).host, league: league.name, slug, season: season.name, url: `${BASE}/l/${slug}`, updated: new Date().toISOString() },
    league: { name: league.name, season: season.name, city: league.location || "", ...(leagueLogoUrl ? { img: leagueLogoUrl } : {}) },
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

module.exports = { siteData, logoFile, hasLogos };
