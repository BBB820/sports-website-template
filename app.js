(() => {
  const S = window.SITE;
  const L = S.league;
  const app = document.getElementById("app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem("cbc:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("cbc:" + k, JSON.stringify(v)); } catch { /* private mode */ } }
  };

  // ---------- teams ----------
  const TEAMS = S.teams;
  const teamNames = Object.keys(TEAMS);
  // Pictures added in data.js win over Hooperville's: team logos and player photos by name.
  const PIC = S.pictures || {};
  teamNames.forEach((t) => { if (PIC.teams && PIC.teams[t]) TEAMS[t].img = PIC.teams[t]; });
  const short = (team) => TEAMS[team]?.short || team.slice(0, 3).toUpperCase();
  const byShort = Object.fromEntries(teamNames.map((t) => [short(t), t]));
  // A team's logo: the league's own picture when there is one, else a designed crest.
  const logo = (name, size = "sm") => {
    const t = TEAMS[name], img = t ? t.img : L.img;
    if (img) return `<span class="logo ${size} pic" data-logo="${t ? esc(name) : ""}" style="--c:${esc(t ? t.color : L.color)}" aria-hidden="true"><img src="${esc(img)}" alt=""></span>`;
    return `<span class="logo ${size} crest" aria-hidden="true">${t ? crest(name) : leagueCrest()}</span>`;
  };

  // If a logo picture cannot be loaded (Hooperville down or slow), swap in the designed crest instead of a broken icon.
  document.addEventListener("error", (e) => {
    const im = e.target, box = im && im.tagName === "IMG" && im.closest ? im.closest(".logo.pic") : null;
    if (!box) return;
    const n = box.getAttribute("data-logo");
    box.classList.remove("pic"); box.classList.add("crest");
    box.innerHTML = n && TEAMS[n] ? crest(n) : leagueCrest();
  }, true);

  // ---------- crests: badges drawn from each team's colour and initials, until real logos are added ----------
  const hexParts = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); const n = m ? parseInt(m[1], 16) : 0x888888; return [n >> 16, (n >> 8) & 255, n & 255]; };
  const toHex = (r) => "#" + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  const shade = (hex, to, k) => toHex(hexParts(hex).map((v) => v + ((to - v) * k)));
  // WCAG contrast, to pick readable text on any team colour and a team colour that stays readable on white.
  const lumOf = (hex) => { const c = hexParts(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lumOf(a), lumOf(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const readable = (bg) => (ratio(bg, "#ffffff") >= ratio(bg, "#111418") ? "#ffffff" : "#111418");
  // A fill and text colour that read well together: the team colour itself when it can, else nudged until it does.
  const legible = (bg) => {
    const fg = readable(bg), to = fg === "#ffffff" ? 0 : 255;
    let c = bg, k = 0;
    while (ratio(c, fg) < 4.6 && k < 14) c = shade(bg, to, ++k * 0.04);
    return { bg: c, fg };
  };
  const onDark = (hex) => { let c = hex, k = 0; while (ratio(c, "#15171a") < 4.6 && k < 20) c = shade(hex, 255, ++k * 0.05); return c; };
  const onWhite = (hex) => { let c = hex, k = 0; while (ratio(c, "#ffffff") < 4.6 && k < 20) c = shade(hex, 0, ++k * 0.05); return c; };
  const bright = (hex) => { const [r, g, b] = hexParts(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  // One to three letters: the initials of the first two words ("Electro Lab" → EL), or the whole name when it is short.
  const MONO = (() => {
    const base = Object.fromEntries(teamNames.map((t) => {
      const w = t.replace(/[^A-Za-z0-9 .]/g, "").split(/[\s.]+/).filter(Boolean);
      return [t, (w.length === 1 ? (w[0].length <= 3 ? w[0] : w[0][0]) : w.slice(0, 2).map((x) => x[0]).join("")).toUpperCase()];
    }));
    const count = {};
    Object.values(base).forEach((m) => (count[m] = (count[m] || 0) + 1));
    return Object.fromEntries(teamNames.map((t) => [t, count[base[t]] > 1 ? short(t) : base[t]]));
  })();
  const CREST_ORDER = [...teamNames].sort();
  const crestCache = {};
  function crest(name) {
    if (crestCache[name]) return crestCache[name];
    const p = TEAMS[name].color, light = readable(p) === "#111418", dark = bright(p) < 0.16;
    const ink = light ? "#111418" : "#ffffff";                     // letters and trim
    const trim = dark ? L.color : ink;                              // near-black teams get the league's gold trim
    const deep = shade(p, 0, 0.38), glow = shade(p, 255, 0.22);
    const m = MONO[name], size = m.length === 1 ? 56 : m.length === 2 ? 46 : 34;
    const text = (y, fill = dark ? L.color : ink, k = 1) => `<text x="50" y="${y}" text-anchor="middle" dominant-baseline="central" fill="${fill}" style="font-family:var(--display);font-weight:800;font-size:${Math.round(size * k)}px;letter-spacing:.5px"${m.length === 3 ? ' textLength="58" lengthAdjust="spacingAndGlyphs"' : ""}>${esc(m)}</text>`;
    const shape = CREST_ORDER.indexOf(name) % 5;
    let svg;
    if (shape === 0) svg = `<circle cx="50" cy="50" r="48" fill="${p}"/><g transform="rotate(-16 50 50)"><polygon points="5.6,62 94.4,62 89.2,75 10.8,75" fill="${trim}"/><polygon points="10.8,75 89.2,75 83,83 17,83" fill="${deep}"/></g>${text(42)}<circle cx="50" cy="50" r="45" fill="none" stroke="${trim}" stroke-width="3"/>`;
    else if (shape === 1) svg = `<path d="M50 3 L91 15 V50 C91 75 72 90 50 98 C28 90 9 75 9 50 V15 Z" fill="${p}"/><path d="M9 15 L50 3 L91 15 V34 H9 Z" fill="${deep}"/><path d="M50 9 L85 19 V50 C85 71 69 84 50 91 C31 84 15 71 15 50 V19 Z" fill="none" stroke="${trim}" stroke-width="3"/>${text(62)}`;
    else if (shape === 2) svg = `<circle cx="50" cy="50" r="48" fill="${p}"/><path d="M4.75 68 A48 48 0 0 0 95.25 68 Z" fill="${deep}"/><circle cx="50" cy="50" r="42" fill="none" stroke="${trim}" stroke-width="4"/>${text(42)}`;
    else if (shape === 3) svg = `<polygon points="50,2 92,26 92,74 50,98 8,74 8,26" fill="${p}"/><polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="${deep}"/><polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="none" stroke="${dark ? L.color : "#fff"}" stroke-width="3"/>${text(51, dark ? L.color : "#fff")}`;
    else svg = `<circle cx="50" cy="50" r="48" fill="${p}"/><circle cx="50" cy="50" r="40" fill="none" stroke="${trim}" stroke-width="5"/><polygon points="50,13 53,21 62,21 55,26 58,34 50,29 42,34 45,26 38,21 47,21" fill="${trim}"/>${text(61, undefined, 0.86)}`;
    return (crestCache[name] = `<svg viewBox="0 0 100 100" focusable="false">${svg}</svg>`);
  }
  document.documentElement.style.setProperty("--on-team", readable(L.color));
  // The league's own mark: black disc, gold ring, BRO in gold.
  function leagueCrest() {
    const g = L.color, mark = (L.short || L.name.slice(0, 3)).toUpperCase().slice(0, 3);
    return `<svg viewBox="0 0 100 100" focusable="false"><circle cx="50" cy="50" r="48" fill="#0b0b0d"/><circle cx="50" cy="50" r="43" fill="none" stroke="${g}" stroke-width="5"/>
      <path d="M50 7 V93 M7 50 H93" stroke="${g}" stroke-width="1.6" opacity=".28"/><path d="M20 20 C40 38 40 62 20 80 M80 20 C60 38 60 62 80 80" fill="none" stroke="${g}" stroke-width="1.6" opacity=".28"/>
      <text x="50" y="52" text-anchor="middle" dominant-baseline="central" fill="${g}" style="font-family:var(--display);font-weight:800;font-size:${mark.length > 2 ? 33 : 42}px;letter-spacing:1px">${esc(mark)}</text></svg>`;
  }
  document.documentElement.style.setProperty("--team", L.color);
  // Logos the organisers upload win over Hooperville's and over the designed badges.
  const baseImg = Object.fromEntries(teamNames.map((t) => [t, TEAMS[t].img]));
  const baseLeagueImg = L.img;
  function applyLogos() {
    const c = S.content || {};
    teamNames.forEach((t) => { TEAMS[t].img = (c.logos && c.logos[t]) || baseImg[t]; });
    L.img = c.leagueLogo || baseLeagueImg;
  }
  applyLogos();

  // ---------- seeded random (sample numbers stay the same on every visit) ----------
  const seedOf = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const rng = (str) => { let a = seedOf(str); return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const between = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

  // Split total into parts by weight so the parts add up exactly.
  function split(total, weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    const raw = weights.map((w) => (w / sum) * total);
    const out = raw.map(Math.floor);
    const left = total - out.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - out[i], i]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, i]) => out[i]++);
    return out;
  }

  // Points → made shots that add up: threes, free throws, twos.
  function shots(r, pts, threeRate) {
    const m3 = Math.min(Math.floor(pts / 3), Math.floor(r() * (pts * threeRate / 3 + 1)));
    const rest = pts - 3 * m3;
    let ftm = rest % 2 ? (rest >= 3 && r() < 0.4 ? 3 : 1) : (rest >= 2 && r() < 0.5 ? 2 : 0);
    if (ftm > rest) ftm = rest % 2;
    const m2 = (rest - ftm) / 2;
    const a2 = m2 + between(r, Math.ceil(m2 * 0.6), Math.ceil(m2 * 1.2) + 1);
    const a3 = m3 + between(r, Math.ceil(m3 * 1.2), Math.ceil(m3 * 2) + 1);
    const fta = ftm + (r() < 0.6 ? between(r, 0, 2) : 0);
    return { fgm: m2 + m3, fga: a2 + a3, tpm: m3, tpa: a3, ftm, fta };
  }

  // ---------- games ----------
  // Every game, then the regular season on its own: playoff games stay out of standings and season stats.
  const ALL = S.schedule.map((g, id) => ({ ...g, id, played: Array.isArray(g.score) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const games = ALL.filter((g) => !g.playoff);
  const pgames = ALL.filter((g) => g.playoff);
  const PO = S.playoffs && S.playoffs.rounds && S.playoffs.rounds.length ? S.playoffs : null;
  const byId = Object.fromEntries(ALL.map((g) => [g.id, g]));
  const played = games.filter((g) => g.played);
  const upcoming = games.filter((g) => !g.played);
  const scoreOf = (g, team) => (g.home === team ? g.score[0] : g.score[1]);
  const opp = (g, team) => (g.home === team ? g.away : g.home);
  const won = (g, team) => scoreOf(g, team) > scoreOf(g, opp(g, team));
  const winner = (g) => (g.score[0] > g.score[1] ? g.home : g.away);
  const teamGames = (team) => games.filter((g) => g.home === team || g.away === team);
  const dates = [...new Set(games.map((g) => g.date.slice(0, 10)))];
  const weekOf = (g) => dates.indexOf(g.date.slice(0, 10)) + 1;
  const roundName = (r) => (PO && PO.rounds.find((x) => x.round === r) || {}).name || "Playoffs";
  const stageOf = (g) => (g.playoff ? g.playoff.stage || roundName(g.playoff.round) : `Week ${weekOf(g)}`);

  // ---------- players ----------
  const ROLE = {
    PG: { reb: 0.6, ast: 2.2, three: 0.45 }, SG: { reb: 0.7, ast: 1.1, three: 0.5 },
    SF: { reb: 1, ast: 0.9, three: 0.35 }, PF: { reb: 1.5, ast: 0.6, three: 0.15 }, C: { reb: 1.9, ast: 0.5, three: 0.05 }
  };
  const ROSTERS = Object.fromEntries(teamNames.map((t) => [t, TEAMS[t].roster.map((p, i) => ({
    ...p, photo: (PIC.players && PIC.players[p.name]) || p.photo || null, team: t, id: `${short(t)}-${p.key || p.no}`, captain: p.captain ?? i === 0, starter: i < 5,
    talent: (i < 5 ? 1.4 : 0.8) + rng("talent:" + t + p.name)() * 0.6
  }))]));
  const PLAYERS = teamNames.flatMap((t) => ROSTERS[t]);
  const playerById = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));

  const boxCache = {};
  function boxScore(g, team) {
    const key = g.id + "|" + team;
    if (boxCache[key]) return boxCache[key];
    if (g.box && g.box[team]) return (boxCache[key] = g.box[team]);
    const roster = ROSTERS[team];
    const r = rng("box:" + g.date + team);
    const pts = scoreOf(g, team);
    // Five on the floor for 40 minutes: starters about 30 each, bench about 10.
    const mins = split(200, roster.map((p) => (p.starter ? 1 + r() * 0.25 : 0.32 + r() * 0.12)));
    const share = split(pts, roster.map((p, i) => mins[i] * p.talent * (0.5 + r())));
    return (boxCache[key] = roster.map((p, i) => {
      const role = ROLE[p.pos] || ROLE.SF;
      const m = mins[i] / 30;
      return {
        no: p.no, name: p.name, min: mins[i], pts: share[i], ...shots(r, share[i], role.three),
        reb: Math.round(m * role.reb * between(r, 3, 8)), ast: Math.round(m * role.ast * between(r, 1, 4)),
        stl: Math.round(m * between(r, 0, 2)), blk: Math.round(m * (p.pos === "C" || p.pos === "PF" ? between(r, 0, 3) : between(r, 0, 1) * 0.5)),
        tov: Math.round(m * between(r, 0, 3)), pf: between(r, 0, 4)
      };
    }));
  }

  // A box line counts as an appearance with minutes or any stat (real games may not run the clock).
  const appeared = (l) => l && (l.min > 0 || ["pts", "reb", "ast", "stl", "blk", "tov", "pf", "fga", "fta"].some((k) => l[k] > 0));
  const lineOf = (lines, p) => lines.find((b) => (p.key ? b.key === p.key : b.no === p.no));
  const lineId = (team, l) => `${short(team)}-${l.key || l.no}`;

  const SUM_KEYS = ["pts", "fgm", "fga", "tpm", "tpa", "ftm", "fta", "reb", "ast", "stl", "blk", "tov", "pf"];
  const total = (lines) => Object.fromEntries(SUM_KEYS.map((k) => [k, lines.reduce((a, l) => a + (l[k] || 0), 0)]));
  const teamLine = (g, team) => total(boxScore(g, team));

  function quarters(g) {
    if (g.quarters) return g.quarters;
    const r = rng("q:" + g.date + g.home);
    return [g.home, g.away].map((t) => split(scoreOf(g, t), [0, 1, 2, 3].map(() => 0.75 + r() * 0.5)));
  }

  const eff = (l) => l.pts + l.reb + l.ast + l.stl + l.blk - (l.fga - l.fgm) - (l.fta - l.ftm) - l.tov;
  const pct = (m, a) => (a ? (100 * m / a).toFixed(1) : "0.0");
  const avg = (v, n) => (n ? (v / n).toFixed(1) : "0.0");
  const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");

  // ---------- standings & team numbers ----------
  const TABLE = teamNames.map((team) => {
    const gs = teamGames(team).filter((g) => g.played);
    const res = gs.map((g) => (won(g, team) ? "W" : "L"));
    const t = total(gs.map((g) => teamLine(g, team)));
    let streak = "";
    if (res.length) { const last = res[res.length - 1]; let n = 0; for (let i = res.length - 1; i >= 0 && res[i] === last; i--) n++; streak = last + n; }
    const w = res.filter((x) => x === "W").length, n = gs.length || 1;
    const pa = gs.reduce((a, g) => a + scoreOf(g, opp(g, team)), 0);
    return { team, gp: gs.length, w, l: gs.length - w, pf: t.pts, pa, ppg: t.pts / n, oppg: pa / n, rpg: t.reb / n, apg: t.ast / n,
      fg: t.fga ? t.fgm / t.fga : 0, tp: t.tpa ? t.tpm / t.tpa : 0, stl: t.stl / n, blk: t.blk / n, tov: t.tov / n, last5: res.slice(-5), streak };
  }).sort((a, b) => b.w - a.w || a.l - b.l || (b.pf - b.pa) - (a.pf - a.pa));
  TABLE.forEach((r, i) => { r.rank = i + 1; r.gb = ((TABLE[0].w - r.w) + (r.l - TABLE[0].l)) / 2; });
  const rowOf = (team) => TABLE.find((r) => r.team === team);
  const rankIn = (team, key, low = false) => [...TABLE].sort((a, b) => (low ? a[key] - b[key] : b[key] - a[key])).findIndex((r) => r.team === team) + 1;
  const SIX = [["PPG", "ppg"], ["RPG", "rpg"], ["APG", "apg"], ["FG%", "fg"], ["3PT%", "tp"], ["OPPG", "oppg", true]];
  const fmtSix = (key, v) => (key === "fg" || key === "tp" ? (v * 100).toFixed(1) : v.toFixed(1));

  // ---------- player season numbers ----------
  const SEASON = Object.fromEntries(PLAYERS.map((p) => {
    const log = teamGames(p.team).filter((g) => g.played).map((g) => ({ g, l: lineOf(boxScore(g, p.team), p) })).filter((x) => appeared(x.l));
    const t = total(log.map((x) => x.l));
    t.min = log.reduce((a, x) => a + x.l.min, 0);
    t.eff = log.reduce((a, x) => a + eff(x.l), 0);
    return [p.id, { p, gp: log.length, t, log }];
  }));
  const perGame = (s, k) => (s.gp ? s.t[k] / s.gp : 0);
  const leadersIn = (key, n = 5) => Object.values(SEASON).filter((s) => s.gp).sort((a, b) => perGame(b, key) - perGame(a, key)).slice(0, n);

  // ---------- formatting ----------
  const dfmt = (iso, o) => new Date(iso).toLocaleString(undefined, o);
  const day = (iso) => dfmt(iso, { weekday: "short", month: "short", day: "numeric" });
  const mon = (iso) => dfmt(iso, { month: "short", day: "numeric" });
  const wkday = (iso) => dfmt(iso, { weekday: "short" });
  const time = (iso) => dfmt(iso, { hour: "numeric", minute: "2-digit" });
  const record = (team) => { const r = rowOf(team); return `${r.w}-${r.l}`; };
  const nameParts = (n) => { const w = n.trim().split(/\s+/); return w.length > 2 && /^(de|dela|del|van|von|da|di|la)$/i.test(w[w.length - 2]) ? [w.slice(0, -2).join(" "), w.slice(-2).join(" ")] : [w.slice(0, -1).join(" "), w[w.length - 1]]; };
  const initials = (n) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const avatar = (p) => p.photo
    ? `<span class="avatar pic" style="--c:${esc(TEAMS[p.team].color)}"><img src="${esc(p.photo)}" alt="" loading="lazy"></span>`
    : (() => { const l = legible(TEAMS[p.team].color); return `<span class="avatar" style="--c:${esc(l.bg)};color:${l.fg}">${esc(initials(p.name))}</span>`; })();
  // A CSS background from a picture address; the team colour underneath shows if it fails to load.
  const bgUrl = (u) => `url('${esc(encodeURI(u).replace(/'/g, "%27"))}')`;
  const POOL = (L.photos || []).filter(Boolean);
  const plink = (p) => `#player/${encodeURIComponent(p.id)}`;
  const tlink = (team) => `#team/${encodeURIComponent(short(team))}`;

  function countdown(iso) {
    const ms = new Date(iso) - new Date();
    // Past tip-off with no score entered yet: live for about three hours, then waiting on the result.
    if (ms <= 0) return ms > -3 * 36e5 ? "Live" : "Result pending";
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    return d >= 1 ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
  }

  const sh = (title, link, label) => `<div class="sh"><h2>${title}</h2>${link ? `<a class="more" href="${link}">${label} <i aria-hidden="true">→</i></a>` : label ? `<span class="more mute">${label}</span>` : ""}</div>`;
  const head = (eyebrow, title) => `<section class="phead"><span class="label">${esc(eyebrow)}</span><h1>${esc(title)}</h1></section>`;
  const seg = (items, current, attr = "data-go") => `<div class="seg" role="tablist">${items.map(([v, label, go]) => `<button role="tab" aria-selected="${v === current}" ${attr}="${esc(go ?? v)}">${esc(label)}</button>`).join("")}</div>`;

  // ---------- shared pieces ----------
  // A game as a ticket stub: stage on top, the two teams, then the torn-off stub with the date and a barcode.
  function gameCard(g) {
    const sc = g.played ? g.score : g.live;
    const line = (t, i) => {
      const lose = g.played && g.score[i] < g.score[1 - i];
      return `<div class="tl${lose ? " lose" : ""}">${logo(t, "md")}<span class="nm"><b>${esc(t)}</b><small>${esc(record(t))}</small></span>${sc ? `<span class="pts">${sc[i]}</span>` : ""}</div>`;
    };
    const stamp = g.played ? `<span class="stamp">Final</span>` : g.live ? `<span class="stamp live">Live</span>` : `<span class="count" data-countdown="${esc(g.date)}">${esc(countdown(g.date))}</span>`;
    const c = g.played ? TEAMS[winner(g)].color : TEAMS[g.home].color;
    return `<a class="ticket" style="--c:${esc(c)}" href="#game/${g.id}">
      <div class="tk-top"><span class="eyebrow">${esc(stageOf(g))}</span>${stamp}</div>
      <div class="tk-body">${line(g.home, 0)}${line(g.away, 1)}</div>
      <div class="tk-stub"><span>${esc(day(g.date))} · ${esc(time(g.date))}</span><em>${g.played ? "Box score" : "Preview"} →</em></div></a>`;
  }

  function leaderBoard(label, key, unit, n = 5, compact = false) {
    const list = leadersIn(key, n);
    return `<div class="card board-list"><div class="bl-head"><span class="label">${label}</span><span class="label">${unit}</span></div>
      ${list.map((s, i) => `<a class="bl-row${i === 0 ? " first" : ""}" href="${plink(s.p)}">
        <span class="rk">${i + 1}</span>${i === 0 && !compact ? avatar(s.p) : logo(s.p.team)}
        <span class="nm">${esc(s.p.name)}<small>${[short(s.p.team), s.p.no !== "" && "#" + s.p.no, s.p.pos].filter(Boolean).map(esc).join(" · ")}</small></span>
        <span class="num">${avg(s.t[key], s.gp)}</span></a>`).join("")}</div>`;
  }

  // The league table as a scoreboard: win-percentage bars behind the rows, the form of the last five games, and a
  // tag where the playoff line falls.
  function standingsTable(compact) {
    const cols = compact ? 5 : 11;  // (on phones the .ph columns are hidden)
    const row = (r) => `<tr class="link" data-go="${tlink(r.team)}" style="--p:${r.gp ? Math.round((100 * r.w) / r.gp) : 0}%"><td class="rk">${r.rank}</td>
        <td class="l sticky"><span class="tc">${logo(r.team)}<b>${compact ? `<span class="wide">${esc(r.team)}</span><span class="narrow">${esc(short(r.team))}</span>` : esc(r.team)}</b></span></td><td>${r.w}</td><td>${r.l}</td>
        ${compact ? "" : `<td>${r.gp ? (r.w / r.gp).toFixed(3).replace(/^0/, "") : ".000"}</td><td class="ph">${r.gb ? r.gb : "–"}</td><td class="ph">${r.ppg.toFixed(1)}</td><td class="ph">${r.oppg.toFixed(1)}</td><td class="ph"><span class="fm" role="img" aria-label="Last five: ${r.last5.join(" ")}">${r.last5.map((x) => `<i class="${x}"></i>`).join("")}</span></td>`}
        <td class="stk ${r.streak ? r.streak[0] : ""}">${r.streak || "–"}</td></tr>`;
    const body = TABLE.map((r) => row(r) + (r.rank === 4 && TABLE.length > 4 ? `<tr class="cut" aria-hidden="true"><td colspan="${cols}"><span>Playoff line</span></td></tr>` : "")).join("");
    return `<div class="ladder scroll"><table>
      <thead><tr><th>#</th><th class="l sticky">Team</th><th>W</th><th>L</th>${compact ? "" : "<th>PCT</th><th class=\"ph\">GB</th><th class=\"ph\">PPG</th><th class=\"ph\">OPPG</th><th class=\"ph\">L5</th>"}<th>Strk</th></tr></thead>
      <tbody>${body}</tbody></table></div>`;
  }

  // With live data there is no written news: recap the latest results instead.
  if (!S.news || !S.news.length) {
    S.news = ALL.filter((g) => g.played).reverse().slice(0, 6).map((g) => {
      const w = winner(g), l = opp(g, w);
      const best = boxScore(g, w).filter(appeared).sort((a, b) => b.pts - a.pts)[0];
      return {
        date: g.date.slice(0, 10), tag: stageOf(g), game: g.date.slice(0, 10), team: w,
        title: `${w} beat ${l} ${Math.max(...g.score)}–${Math.min(...g.score)}`,
        body: best ? `${best.name} led ${short(w)} with ${best.pts} points, ${best.reb} rebounds and ${best.ast} assists.` : `${w} improve to ${record(w)}.`
      };
    });
  }

  // The organisers' content (slides, articles, albums), read fresh so the editor's saves show at once.
  const C = () => S.content || { slides: [], articles: [], albums: [] };
  const gameKey = (g) => g.date + "|" + g.home;
  const gameByKey = (k) => k && ALL.find((g) => gameKey(g) === k);
  const articleById = (aid) => C().articles.find((a) => a.id === aid);
  const albumById = (aid) => C().albums.find((a) => a.id === aid);
  // Articles first by date, then the league's posts and automatic recaps.
  const newsItems = () => [...C().articles.map((a) => ({ article: a.id, date: a.date, tag: a.tag || "News", title: a.title, body: a.summary, photo: a.image, focus: a.focus, gameRef: a.game })), ...S.news]
    .sort((a, b) => b.date.localeCompare(a.date));
  // Where a slide's link goes, and the button words it gets unless the organisers wrote their own.
  function linkOf(l) {
    const t = l && l.target, none = { href: "", label: "", ext: "" };
    switch (l && l.type) {
      case "article": return articleById(t) ? { href: `#article/${t}`, label: "Read story", ext: "" } : none;
      case "album": return albumById(t) ? { href: `#album/${t}`, label: "See photos", ext: "" } : none;
      case "game": { const g = gameByKey(t); return g ? { href: `#game/${g.id}`, label: g.played ? "Box score" : "Game preview", ext: "" } : none; }
      case "team": return TEAMS[t] ? { href: tlink(t), label: "Team page", ext: "" } : none;
      case "player": return playerById[t] ? { href: plink(playerById[t]), label: "Player page", ext: "" } : none;
      case "signup": return SU ? { href: "#signup", label: "Sign up", ext: "" } : none;
      case "url": return /^https?:\/\//i.test(t || "") ? { href: t, label: "Learn more", ext: ' target="_blank" rel="noopener"' } : none;
      default: return none;
    }
  }
  const recapGame = (n) => n.game && ALL.find((x) => x.played && x.date.startsWith(n.game) && (!n.team || x.home === n.team || x.away === n.team));
  function newsCards(items) {
    return `<div class="newsgrid">${items.map((n) => {
      const g = n.article ? null : recapGame(n);
      const pic = n.photo || (POOL.length ? POOL[(S.news.indexOf(n) + 1) % POOL.length] : null);
      const ph = pic ? ` photo${n.article ? " own" : ""}" style="--photo:${bgUrl(pic)};${n.focus ? `--pos:${+n.focus.x}% ${+n.focus.y}%;` : ""}` : `" style="`;
      const art = g
        ? `<div class="art${ph}--c:${esc(TEAMS[winner(g)].color)}"><span class="vsart">${logo(g.home, "md")}<b class="num">${g.score[0]}–${g.score[1]}</b>${logo(g.away, "md")}</span></div>`
        : `<div class="art${ph}"><span class="big-logo">${pic ? "" : logo(null, "lg")}</span></div>`;
      const inner = `${art}<div class="story"><div class="row"><span class="chip">${esc(n.tag)}</span><span class="label">${esc(day(n.date))}</span></div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></div>`;
      const href = n.article ? `#article/${esc(n.article)}` : g ? `#game/${g.id}` : "";
      return href ? `<a class="card ncard" href="${href}">${inner}</a>` : `<div class="card ncard">${inner}</div>`;
    }).join("")}</div>`;
  }

  // The coming round's best matchup by combined record.
  function gameOfTheWeek() {
    if (!upcoming.length) return null;
    const d = upcoming[0].date.slice(0, 10);
    return upcoming.filter((g) => g.date.startsWith(d)).sort((a, b) => (rowOf(b.home).w + rowOf(b.away).w) - (rowOf(a.home).w + rowOf(a.away).w))[0];
  }

  // ---------- home banner: matchday posters in a slideshow ----------
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const colorGap = (a, b) => { const p = hexParts(a), q = hexParts(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
  // A poster splits in the two teams' colours; two teams too alike to tell apart get gold or black as the second.
  const posterColors = (home, away) => {
    const a = TEAMS[home].color;
    let b = TEAMS[away].color;
    if (colorGap(a, b) < 110) b = bright(a) < 0.5 ? "#e9b61b" : "#1b1b1f";
    return [a, b];
  };

  // One matchup as a poster: the two teams either side of a diagonal, big names, and the score once it is played.
  function poster({ g, tag, nav, foot, href, cta, scores }) {
    const [a, b] = posterColors(g.home, g.away);
    const side = (t, i, cls) => `<div class="pz-side ${cls}${scores && scores[i] < scores[1 - i] ? " lose" : ""}">${logo(t, "xl")}<h2 class="pz-name">${esc(t)}</h2>${scores ? `<b class="pz-score">${scores[i]}</b>` : `<span class="pz-rec">${esc(record(t))} · ${ordinal(rowOf(t).rank)}</span>`}</div>`;
    return { c: a, cls: "poster", nav, body: `<div class="pz" style="--a:${esc(a)};--b:${esc(b)}">
      <span class="eyebrow pz-tape">${esc(tag)}</span>${side(g.home, 0, "l")}<span class="pz-vs" aria-hidden="true">${scores ? "Final" : "VS"}</span>${side(g.away, 1, "r")}
      <div class="pz-foot"><span class="pz-info">${foot}</span><a class="hero-link" href="${href}">${cta} →</a></div></div>` };
  }

  // The automatic slides besides the title one: the closest game of the last round, the scoring leader,
  // first place and the latest article or league post.
  function heroSlides(lastRound) {
    const out = {};
    const close = [...lastRound].sort((a, b) => Math.abs(a.score[0] - a.score[1]) - Math.abs(b.score[0] - b.score[1]))[0];
    if (close) {
      const w = winner(close), l = opp(close, w);
      const all = [close.home, close.away].flatMap((t) => boxScore(close, t).map((x) => ({ ...x, team: t })));
      const star = (close.potg && all.find((x) => x.key === close.potg)) || [...all].sort((a, b) => eff(b) - eff(a))[0];
      out.closest = poster({ g: close, tag: `${stageOf(close)} · Closest finish`, nav: "Closest finish", scores: close.score, href: `#game/${close.id}`, cta: "Box score",
        foot: star ? `<b>${esc(star.name)}</b> (${esc(short(star.team))}) · ${star.pts} PTS · ${star.reb} REB · ${star.ast} AST` : `${esc(w)} beat ${esc(l)} by ${Math.abs(close.score[0] - close.score[1])}` });
    }
    const s = leadersIn("pts", 1)[0];
    if (s) {
      const [f, last] = nameParts(s.p.name);
      out.leader = { c: TEAMS[s.p.team].color, cls: "leader-slide", nav: "Top scorer", body: `<div class="ld">
        ${s.p.no !== "" ? `<b class="ld-no" aria-hidden="true">${esc(s.p.no)}</b>` : ""}
        <div class="ld-copy"><span class="eyebrow">Scoring leader</span>
          <h2 class="ld-name"><small>${esc(f)}</small>${esc(last)}</h2>
          <p class="ld-meta">${logo(s.p.team)}<span>${[s.p.team, s.p.no !== "" && "#" + s.p.no, s.p.pos].filter(Boolean).map(esc).join(" · ")}</span></p>
          <dl class="ld-stats">${[["PPG", "pts"], ["RPG", "reb"], ["APG", "ast"], ["EFF", "eff"]].map(([l, k]) => `<div><dt>${l}</dt><dd>${avg(s.t[k], s.gp)}</dd></div>`).join("")}</dl>
          <a class="hero-link" href="${plink(s.p)}">Player page →</a></div></div>` };
    }
    if (played.length) {
      const top = TABLE[0], four = TABLE.slice(0, 4), maxW = Math.max(1, ...four.map((r) => r.w));
      const meta = [top.streak && `${top.streak[0] === "W" ? "Won" : "Lost"} ${top.streak.slice(1)} straight`, TABLE[1] && (TABLE[1].gb ? `${plural(TABLE[1].gb, "game")} clear of ${TABLE[1].team}` : `level with ${TABLE[1].team}`)].filter(Boolean).map(esc).join(" · ");
      out.standings = { c: TEAMS[top.team].color, cls: "podium-slide", nav: "Top four", body: `<div class="pd">
        <div class="pd-copy"><span class="eyebrow">First place</span>
          <h2 class="pd-name">${esc(top.team)}</h2>
          <p class="pd-meta">${meta}</p>
          <dl class="ld-stats"><div><dt>Record</dt><dd>${top.w}-${top.l}</dd></div><div><dt>PPG</dt><dd>${top.ppg.toFixed(1)}</dd></div><div><dt>OPPG</dt><dd>${top.oppg.toFixed(1)}</dd></div><div><dt>Last 5</dt><dd>${top.last5.filter((x) => x === "W").length}-${top.last5.filter((x) => x === "L").length}</dd></div></dl>
          <a class="hero-link" href="#standings">Standings →</a></div>
        <ol class="pd-bars">${four.map((r) => `<li style="--h:${Math.round(96 + 150 * r.w / maxW)}px;--c:${esc(TEAMS[r.team].color)};--fg:${readable(TEAMS[r.team].color)}"><a href="${tlink(r.team)}" aria-label="${esc(r.team)}, ${r.w}-${r.l}">${logo(r.team, "md")}<b>${esc(short(r.team))}</b><span class="pd-bar"><i>${r.rank}</i></span><em>${r.w}-${r.l}</em></a></li>`).join("")}</ol></div>` };
    }
    const post = newsItems().find((n) => n.article || !recapGame(n));
    if (post) out.news = { c: L.color, img: post.photo, focus: post.focus, cls: "story-slide", nav: "News", body: `<div class="st">
        <div class="st-copy"><span class="eyebrow">${esc(post.tag || "News")} · ${esc(day(post.date))}</span>
          <h2 class="st-title">${esc(post.title)}</h2>
          <p class="st-text">${esc(post.body)}</p>
          <a class="hero-link" href="${post.article ? `#article/${esc(post.article)}` : "#news"}">${post.article ? "Read story" : "All news"} →</a></div>
        ${post.photo ? "" : `<div class="st-mark" aria-hidden="true">${logo(null, "xl")}</div>`}</div>` };
    return out;
  }

  // The first slide: the title race. The race for the crown during the season, the road to it in the playoffs,
  // and the champion once crowned. Beside it, the top four as a small table.
  function seedsPanel(heading) {
    if (!played.length) return "";
    return `<div class="seeds"><div class="seeds-head"><span>${esc(heading)}</span><span>W-L</span></div>${TABLE.slice(0, 4).map((r) => `<a class="seed-row" href="${tlink(r.team)}"><b>${r.rank}</b>${logo(r.team, "md")}<span>${esc(r.team)}</span><em>${r.w}-${r.l}</em></a>`).join("")}</div>`;
  }
  function titleSlide() {
    // The playoff champion; with no playoffs, first place once every game is played.
    const done = !PO && played.length && !upcoming.length;
    const t = PO && PO.champion ? PO.champion : done ? TABLE[0].team : null;
    if (t) {
      const mvp = PO && PO.mvp && playerByKey(PO.mvp.key), [a, ...b] = t.split(" "), r = TEAMS[t] && rowOf(t);
      return { c: TEAMS[t] ? TEAMS[t].color : L.color, champ: true, cls: "title-slide crowned", noPool: true, nav: "Champions", body: `<div class="ts"><div class="ts-copy"><span class="eyebrow">${esc(L.season)} champions</span>
        <h1>${b.length ? `${esc(a)} <span class="hl">${esc(b.join(" "))}</span>` : `<span class="hl">${esc(a)}</span>`}</h1>
        <p class="ts-meta">${PO && PO.mvp ? `Finals MVP <b>${esc(mvp ? mvp.name : PO.mvp.name)}</b>${r ? " · " : ""}` : ""}${r ? `${r.w}-${r.l} ${PO ? "in the regular season" : "· first place"}` : ""}</p>
        <a class="hero-link" href="${PO ? "#playoffs" : "#standings"}">${PO ? "The playoffs" : "Final standings"} →</a></div>
        <div class="crown">${TEAMS[t] ? logo(t, "xl") : ""}<span>Champions</span></div></div>` };
    }
    if (PO) {
      const next = pgames.find((g) => !g.played), round = [...PO.rounds].reverse().find((x) => x.series.some((y) => y.a || y.b)) || PO.rounds[0];
      return { c: L.color, cls: "title-slide", noPool: true, nav: "The title", body: `<div class="ts"><div class="ts-copy"><span class="eyebrow">${esc(L.season)} · Playoffs</span>
        <h1>Road to the <span class="hl">title</span></h1>
        <p class="ts-meta">${esc(round.name)}${next ? ` · Next: <b>${esc(short(next.home))} vs ${esc(short(next.away))}</b>, ${esc(day(next.date))} ${esc(time(next.date))}` : ""}</p>
        <a class="hero-link" href="#playoffs">The bracket →</a></div>${seedsPanel("Top seeds")}</div>` };
    }
    const left = dates.length - new Set(played.map((g) => g.date.slice(0, 10))).size;
    return { c: L.color, cls: "title-slide", noPool: true, nav: "The title", body: `<div class="ts"><div class="ts-copy"><span class="eyebrow">${esc(L.season)} · Championship</span>
      <h1>Chase for the <span class="hl">crown</span></h1>
      <p class="ts-meta">${left > 0 ? `${plural(left, "week")} left in the regular season.` : "The regular season is done."} Who lifts the trophy?</p>
      <a class="hero-link" href="#standings">Standings →</a></div>${seedsPanel("Top four")}</div>` };
  }

  // A slide the organisers made in the editor: their picture, words and where it leads.
  function customSlide(s) {
    const to = linkOf(s.link);
    const button = s.button || to.label;
    return { c: L.color, img: s.image, focus: s.focus, custom: true, nav: s.label || s.headline.slice(0, 22) || "Highlight", body: `<div class="cs">${s.label ? `<span class="eyebrow">${esc(s.label)}</span>` : ""}
      ${s.headline ? `<h2 class="cs-title">${to.href ? `<a href="${esc(to.href)}"${to.ext}>${esc(s.headline)}</a>` : esc(s.headline)}</h2>` : ""}
      ${s.text ? `<p class="cs-text">${esc(s.text)}</p>` : ""}
      ${to.href && button ? `<a class="hero-link" href="${esc(to.href)}"${to.ext}>${esc(button)} →</a>` : ""}</div>` };
  }
  const today = () => new Date().toISOString().slice(0, 10);
  const showing = (s) => s.on !== false && (!s.from || s.from <= today()) && (!s.until || s.until >= today());
  const DEFAULT_ORDER = ["league", "gotw", "closest", "leader", "standings", "news"].map((auto) => ({ auto, on: true }));

  // Game of the Week (or the next playoff game) as a poster of its own.
  function gotwSlide(g) {
    return poster({ g, tag: g.playoff ? stageOf(g) : `Game of the week · ${stageOf(g)}`, nav: g.playoff ? stageOf(g) : "Game of the week", href: `#game/${g.id}`, cta: "Game preview",
      foot: `${esc(day(g.date))} · ${esc(time(g.date))} · ${esc(g.venue || L.venue)} <span class="count" data-countdown="${esc(g.date)}">${esc(countdown(g.date))}</span>` });
  }

  // The slides, then a numbered bar underneath to jump between them. Photos from league.photos sit behind
  // the slides that take one, darkened so the words stay readable.
  function hero(slides) {
    const pic = (i) => slides[i].img || (slides[i].champ && L.championPhoto) || (slides[i].custom || slides[i].noPool || slides[i].cls === "poster" ? "" : POOL[i % POOL.length]);
    const pos = (f) => (f ? `;--pos:${+f.x || 0}% ${+f.y || 0}%` : "");
    const bg = (i) => `${slides[i].cls ? " " + slides[i].cls : ""}${slides[i].champ ? " champ-slide" : ""}${slides[i].custom ? " custom" : ""}${pic(i) ? ` photo" style="--team:${esc(slides[i].c)};--photo:${bgUrl(pic(i))}${pos(slides[i].focus)}` : `" style="--team:${esc(slides[i].c)}`}`;
    const tabs = slides.length < 2 ? "" : `<div class="hero-tabs"><div class="hero-tablist" role="tablist" aria-label="Highlights">
      ${slides.map((x, i) => `<button type="button" role="tab" class="hero-tab" data-hero-dot="${i}" aria-selected="${i === 0}" aria-current="${i === 0}"><b>${String(i + 1).padStart(2, "0")}</b><span>${esc(x.nav || "Highlight")}</span></button>`).join("")}</div>
      <span class="hero-arrows"><button type="button" class="hero-arrow" data-hero="-1" aria-label="Previous slide">‹</button><button type="button" class="hero-arrow" data-hero="1" aria-label="Next slide">›</button></span></div>`;
    return `<section class="hero band" aria-roledescription="carousel" aria-label="Highlights">
      <div class="hero-track" tabindex="0" role="region" aria-label="Highlight slides">${slides.map((x, i) => `<div class="slide${bg(i)}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}">${x.body}</div>`).join("")}</div>
      ${tabs}</section>`;
  }

  // Moves on every 6 seconds; waits while the pointer is over it, and stops once someone swipes or taps the arrows.
  let heroTimer = null;
  function startHero() {
    clearInterval(heroTimer);
    const el = app.querySelector(".hero");
    const track = el && el.querySelector(".hero-track");
    if (!track || track.children.length < 2) return;
    const n = track.children.length, tabs = [...el.querySelectorAll(".hero-tab")], bar = el.querySelector(".hero-tabs");
    const at = () => Math.round(track.scrollLeft / track.clientWidth);
    track.addEventListener("scroll", () => {
      const i = at();
      tabs.forEach((d, k) => { d.setAttribute("aria-current", String(k === i)); d.setAttribute("aria-selected", String(k === i)); });
      if (bar && tabs[i] && bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: tabs[i].offsetLeft - 12, behavior: "smooth" });
    }, { passive: true });
    let hover = false, stopped = false, seen = true;
    // Don't rotate slides while the banner is scrolled out of sight (or mostly off the screen).
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { seen = e.intersectionRatio > 0.5; }, { threshold: [0, 0.5, 1] }).observe(el);
    el.go = (i) => track.scrollTo({ left: ((i + n) % n) * track.clientWidth, behavior: "smooth" });
    el.stop = () => { stopped = true; el.classList.add("paused"); };
    el.addEventListener("mouseenter", () => { hover = true; el.classList.add("paused"); });
    el.addEventListener("mouseleave", () => { hover = false; if (!stopped) el.classList.remove("paused"); });
    el.addEventListener("focusin", () => { hover = true; el.classList.add("paused"); });
    el.addEventListener("focusout", () => { hover = false; if (!stopped) el.classList.remove("paused"); });
    track.addEventListener("touchstart", el.stop, { passive: true });
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) el.classList.add("paused");
    else heroTimer = setInterval(() => { if (!hover && !stopped && seen && !document.hidden) el.go(at() + 1); }, 6000);
  }

  // ---------- playoffs & awards ----------
  // Small line icons (instead of emoji) for awards and the champion.
  const ICO = {
    medal: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.4 6 3h4l2 4.5L14 3h4l-2.5 7.4"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5.5c0 4.3 2.9 7.7 7 9.5 4.1-1.8 7-5.2 7-9.5V6z"/></svg>',
    cup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4c0 3 1 4.5 3.2 5M17 6h3c0 3-1 4.5-3.2 5M12 14v4M8.5 20h7"/></svg>'
  };
  const playerByKey = (key) => PLAYERS.find((p) => p.key === key);
  function championPanel() {
    const mvp = PO.mvp && playerByKey(PO.mvp.key);
    return `<a class="nextpanel champ" href="#playoffs">
      <div class="np-top"><span class="label">${esc(L.season)} champions</span><span class="trophy" aria-hidden="true">${ICO.cup}</span></div>
      <div class="champ-team">${logo(PO.champion, "lg")}<b>${esc(PO.champion)}</b></div>
      ${PO.mvp ? `<div class="np-top"><span class="label">Finals MVP</span><b class="champ-mvp">${esc(mvp ? mvp.name : PO.mvp.name)}</b></div>` : ""}</a>`;
  }
  function seriesCard(x) {
    if (!x) return "";
    const row = (sd, wins) => sd
      ? `<a class="sr${x.winner && x.winner !== sd.team ? " lose" : ""}${x.winner === sd.team ? " won" : ""}" href="${tlink(sd.team)}">${sd.seed ? `<span class="seed">${sd.seed}</span>` : `<span class="seed"></span>`}${logo(sd.team)}<b>${esc(sd.team)}</b><span class="num">${x.bye ? "" : x.winsA + x.winsB ? wins : x.winner === sd.team ? "✓" : ""}</span></a>`
      : `<div class="sr tbd"><span class="seed"></span><span class="logo sm" style="--c:var(--hair)"></span><b>${x.bye ? "Bye" : "To be decided"}</b><span class="num"></span></div>`;
    const fmt = { single: "One game", bo3: "Best of 3", twice: "Twice to beat", ttb: "Twice to beat" }[x.format] || "";
    const gl = (x.games || []).map((i) => byId[i]).filter(Boolean);
    return `<div class="card series">${row(x.a, x.winsA)}${row(x.b, x.winsB)}
      <div class="series-foot"><span class="label">${esc(x.bye ? "Bye" : fmt)}</span>${gl.map((g, n) => `<a class="label" href="#game/${g.id}">G${n + 1}${g.played ? " " + g.score[0] + "–" + g.score[1] : ""} →</a>`).join("")}</div></div>`;
  }
  // Season awards worked out the way Hooperville does: best efficiency, and steals plus blocks, per game.
  function awards() {
    const most = Math.max(0, ...Object.values(SEASON).map((s) => s.gp));
    const pool = Object.values(SEASON).filter((s) => s.gp && s.gp >= Math.ceil(most / 2));
    const best = (f) => [...pool].sort((a, b) => f(b) - f(a))[0];
    const mvp = best((s) => s.t.eff / s.gp), dpoy = best((s) => (s.t.stl + s.t.blk) / s.gp);
    const item = (label, icon, s, val) => s ? `<a class="award" href="${plink(s.p)}"><span class="award-icon" aria-hidden="true">${icon}</span>
      <span><span class="label">${label}</span><b>${esc(s.p.name)}</b><small>${esc(s.p.team)}</small></span><span class="num">${val}</span></a>` : "";
    const fm = PO && PO.mvp && playerByKey(PO.mvp.key);
    return `<div class="card awards">
      ${PO && PO.mvp ? item("Finals MVP", ICO.medal, fm ? SEASON[fm.id] : null, "") : ""}
      ${item("Season MVP", ICO.star, mvp, mvp ? (mvp.t.eff / mvp.gp).toFixed(1) + " EFF" : "")}
      ${item("Defensive player", ICO.shield, dpoy, dpoy ? ((dpoy.t.stl + dpoy.t.blk) / dpoy.gp).toFixed(1) + " STL+BLK" : "")}</div>`;
  }

  // ---------- season sign-ups ----------
  const SU = S.signup && S.signup.open ? S.signup : null;
  const deadline = SU && SU.deadline ? dfmt(SU.deadline + "T12:00", { weekday: "short", month: "long", day: "numeric" }) : "";
  const POS = ["PG", "SG", "SF", "PF", "C"];
  function signupBand() {
    if (!SU) return "";
    return `<section class="card su-band">
      <div><span class="label">${esc(SU.season)}${SU.starts ? ` · starts ${esc(SU.starts)}` : ""}</span>
        <h2>Sign-ups are open</h2>
        <p>${esc(SU.note || "")}${deadline ? ` Register by ${esc(deadline)}.` : ""}</p></div>
      <div class="su-actions"><a class="btn" href="#signup/team">Register a team</a><a class="btn ghost" href="#signup/player">Join as a free agent</a></div>
    </section>`;
  }
  const field = (name, label, attrs = "", hint = "") => `<label class="fld"><span>${label}</span><input name="${name}" ${attrs}>${hint ? `<small>${hint}</small>` : ""}</label>`;
  const select = (name, label, options, hint = "") => `<label class="fld"><span>${label}</span><select name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select>${hint ? `<small>${hint}</small>` : ""}</label>`;
  const consent = `<label class="check"><input type="checkbox" name="agree" required> <span>The league may contact me about ${esc(SU ? SU.season : "the season")} by phone or email. My details are only seen by the organisers.</span></label>
    <input class="trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">`;
  function teamForm() {
    return `<form class="card su-form" data-signup="team" novalidate>
      <h3>Team</h3>
      <div class="fld-row">${field("teamName", "Team name", 'required maxlength="40" autocomplete="off"')}
        <label class="fld fld-color"><span>Team colour</span><input type="color" name="color" value="#ff6f00"></label></div>
      <h3>Captain</h3>
      ${field("captain", "Captain's name", 'required maxlength="60" autocomplete="name"')}
      <div class="fld-row">${field("phone", "Mobile number", 'required inputmode="tel" autocomplete="tel" placeholder="0917 123 4567"')}${field("email", "Email (optional)", 'type="email" autocomplete="email"')}</div>
      <h3>Roster <small class="soft">at least 5, up to 15</small></h3>
      <div class="roster-rows">${Array.from({ length: 15 }, (_, i) => `<div class="rr${i >= 8 ? " extra" : ""}"><span class="rr-n">${i + 1}</span>
        <input name="p${i}name" placeholder="Player name" maxlength="60" aria-label="Player ${i + 1} name">
        <input name="p${i}no" placeholder="#" inputmode="numeric" maxlength="2" aria-label="Player ${i + 1} jersey number">
        <select name="p${i}pos" aria-label="Player ${i + 1} position"><option value="">Pos</option>${POS.map((x) => `<option>${x}</option>`).join("")}</select></div>`).join("")}</div>
      <button type="button" class="link more-rows" data-more-rows>+ More players</button>
      <label class="fld"><span>Anything else? (optional)</span><textarea name="notes" maxlength="500" rows="3"></textarea></label>
      ${consent}
      <p class="form-error" role="alert" hidden></p>
      <button class="btn" type="submit">Register team</button>
    </form>`;
  }
  function playerForm() {
    return `<form class="card su-form" data-signup="player" novalidate>
      <h3>About you</h3>
      ${field("name", "Full name", 'required maxlength="60" autocomplete="name"')}
      <div class="fld-row">${field("phone", "Mobile number", 'required inputmode="tel" autocomplete="tel" placeholder="0917 123 4567"')}${field("email", "Email (optional)", 'type="email" autocomplete="email"')}</div>
      <div class="fld-row">${select("position", "Position", [["Any", "Any"], ...POS.map((x) => [x, x])])}${field("height", "Height in cm (optional)", 'inputmode="numeric" maxlength="3" placeholder="178"')}</div>
      ${select("level", "Playing level", [["", "Choose one"], ["Beginner", "Beginner"], ["Casual", "Casual"], ["Competitive", "Competitive"], ["Former varsity / pro", "Former varsity / pro"]])}
      <label class="fld"><span>Anything else? (optional)</span><textarea name="notes" maxlength="500" rows="3" placeholder="Days you can play, friends you want to team up with…"></textarea></label>
      ${consent}
      <p class="form-error" role="alert" hidden></p>
      <button class="btn" type="submit">Sign up as a free agent</button>
    </form>`;
  }
  async function sendSignup(form) {
    const kind = form.dataset.signup, f = new FormData(form), err = form.querySelector(".form-error"), btn = form.querySelector('[type="submit"]');
    const body = { kind, season: SU.season, agree: form.agree.checked, website: f.get("website") || "", email: f.get("email") || "", phone: f.get("phone") || "", notes: f.get("notes") || "" };
    if (kind === "team") {
      Object.assign(body, { teamName: f.get("teamName") || "", color: f.get("color") || "", captain: f.get("captain") || "",
        players: Array.from({ length: 15 }, (_, i) => ({ name: f.get(`p${i}name`) || "", no: f.get(`p${i}no`) || "", pos: f.get(`p${i}pos`) || "" })) });
    } else Object.assign(body, { name: f.get("name") || "", position: f.get("position"), height: f.get("height") || "", level: f.get("level") || "" });
    err.hidden = true; btn.disabled = true; btn.textContent = "Sending…";
    try {
      const res = await fetch("/api/signups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "Sign-ups only work on the live website.");
      form.outerHTML = `<div class="card su-done"><span class="su-check" aria-hidden="true">✓</span><h3>${kind === "team" ? "Team registered" : "You're signed up"}</h3>
        <p>Thanks${kind === "team" ? ", " + esc(body.captain.split(" ")[0]) : ", " + esc(body.name.split(" ")[0])}! The league will contact you on ${esc(body.phone)}${deadline ? ` after sign-ups close on ${esc(deadline)}` : ""}.</p>
        <p class="label">Reference ${esc(out.id)}</p><a class="btn ghost" href="#home">Back to home</a></div>`;
      window.scrollTo(0, 0);
    } catch (e) {
      err.textContent = e.message; err.hidden = false; btn.disabled = false; btn.textContent = kind === "team" ? "Register team" : "Sign up as a free agent";
    }
  }

  // The organisers' list. The passcode stays in this browser tab only.
  const memo = { get() { try { return sessionStorage.getItem("cbc:su") || ""; } catch { return ""; } }, set(v) { try { sessionStorage.setItem("cbc:su", v); } catch { /* private mode */ } } };
  async function loadSignups(passcode) {
    const box = document.getElementById("su-admin");
    box.innerHTML = `<p class="card empty">Loading…</p>`;
    try {
      const res = await fetch("/api/signups", { headers: { "x-passcode": passcode } });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "Could not load sign-ups");
      memo.set(passcode);
      box.innerHTML = signupsView(out);
    } catch (e) {
      box.innerHTML = passForm(e.message);
    }
  }
  const passForm = (msg = "") => `<form class="card su-form narrow-form" data-passcode><h3>Organisers only</h3>
    ${field("passcode", "Passcode", 'type="password" required autocomplete="current-password"')}
    ${msg ? `<p class="form-error" role="alert">${esc(msg)}</p>` : ""}<button class="btn" type="submit">Open</button></form>`;
  let lastList = [];
  function signupsView({ persistent, signups }) {
    lastList = signups;
    const seasons = [...new Set(signups.map((x) => x.season))];
    const teams = signups.filter((x) => x.kind === "team"), players = signups.filter((x) => x.kind === "player");
    const when = (iso) => dfmt(iso, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    return `${persistent ? "" : `<p class="card warn">Sign-ups are not on a storage disk yet, so they are lost whenever the website redeploys. Add a Volume to the service on Railway.</p>`}
      <div class="su-stats"><div class="card"><b class="num">${teams.length}</b><span class="label">Teams</span></div><div class="card"><b class="num">${players.length}</b><span class="label">Free agents</span></div>
        <button class="btn ghost" type="button" data-csv>Download spreadsheet</button></div>
      ${seasons.length > 1 ? `<p class="note">Seasons: ${seasons.map(esc).join(", ")}</p>` : ""}
      <section>${sh("Teams")}<div class="card scroll"><table><thead><tr><th class="l sticky">Team</th><th class="l">Captain</th><th class="l">Mobile</th><th class="l">Email</th><th>Players</th><th class="l">Signed up</th><th>Ref</th></tr></thead>
        <tbody>${teams.map((x) => `<tr><td class="l sticky"><span class="tc"><span class="logo sm" style="--c:${esc(x.color || "#888")}"></span><b>${esc(x.teamName)}</b></span></td><td class="l">${esc(x.captain)}</td><td class="l"><a href="tel:${esc(x.phone.replace(/[^\d+]/g, ""))}">${esc(x.phone)}</a></td><td class="l">${esc(x.email || "–")}</td>
          <td><details><summary>${x.players.length}</summary><ol class="mini-roster">${x.players.map((p) => `<li>${p.no ? `#${esc(p.no)} ` : ""}${esc(p.name)}${p.pos ? ` · ${esc(p.pos)}` : ""}</li>`).join("")}</ol></details></td>
          <td class="l">${esc(when(x.createdAt))}</td><td>${esc(x.id)}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">No teams yet.</td></tr>`}</tbody></table></div></section>
      <section>${sh("Free agents")}<div class="card scroll"><table><thead><tr><th class="l sticky">Name</th><th>Pos</th><th>Ht</th><th class="l">Level</th><th class="l">Mobile</th><th class="l">Email</th><th class="l">Notes</th><th>Ref</th></tr></thead>
        <tbody>${players.map((x) => `<tr><td class="l sticky">${esc(x.name)}</td><td>${esc(x.position)}</td><td>${x.height || "–"}</td><td class="l">${esc(x.level || "–")}</td><td class="l"><a href="tel:${esc(x.phone.replace(/[^\d+]/g, ""))}">${esc(x.phone)}</a></td><td class="l">${esc(x.email || "–")}</td><td class="l note-cell">${esc(x.notes || "")}</td><td>${esc(x.id)}</td></tr>`).join("") || `<tr><td colspan="8" class="empty">No free agents yet.</td></tr>`}</tbody></table></div></section>`;
  }
  function downloadCsv() {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Ref", "Type", "Season", "Signed up", "Team / Name", "Captain", "Mobile", "Email", "Position", "Height", "Level", "Players", "Notes"]];
    for (const x of lastList) rows.push([x.id, x.kind === "team" ? "Team" : "Free agent", x.season, x.createdAt, x.teamName || x.name, x.captain || "", x.phone, x.email, x.position || "", x.height || "", x.level || "",
      (x.players || []).map((p) => `${p.no ? "#" + p.no + " " : ""}${p.name}${p.pos ? " (" + p.pos + ")" : ""}`).join("; "), x.notes]);
    const blob = new Blob(["\ufeff" + rows.map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bro-league-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- photo albums ----------
  function albumCards(list) {
    return `<div class="albumgrid">${list.map((a) => `<a class="card acard" href="#album/${esc(a.id)}">
      <span class="acard-pic">${a.photos.slice(0, 3).map((p) => `<img src="${esc(p.src)}" alt="" loading="lazy">`).join("")}</span>
      <span class="acard-txt"><b>${esc(a.title)}</b><span class="label">${esc(day(a.date))} · ${plural(a.photos.length, "photo")}</span></span></a>`).join("")}</div>`;
  }
  // Full-screen viewer: swipe or arrows to move, Esc or ✕ to close.
  let box = null;
  function openPhoto(a, i) {
    closePhoto();
    box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", a.title);
    const show = (k) => {
      i = (k + a.photos.length) % a.photos.length;
      const p = a.photos[i];
      box.innerHTML = `<button type="button" class="lb-close" data-lb="close" aria-label="Close">✕</button>
        <div class="lb-track"><img src="${esc(p.src)}" alt="${esc(p.caption)}"></div>
        ${a.photos.length > 1 ? `<button type="button" class="lb-nav prev" data-lb="-1" aria-label="Previous photo">‹</button><button type="button" class="lb-nav next" data-lb="1" aria-label="Next photo">›</button>` : ""}
        <p class="lb-cap">${p.caption ? esc(p.caption) + " · " : ""}<span>${i + 1} / ${a.photos.length}</span></p>`;
    };
    show(i);
    box.addEventListener("click", (e) => { const b = e.target.closest("[data-lb]"); if (b) b.dataset.lb === "close" ? closePhoto() : show(i + +b.dataset.lb); else if (e.target === box) closePhoto(); });
    let x0 = null;
    box.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    box.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
    box.keys = (e) => { if (e.key === "Escape") closePhoto(); if (e.key === "ArrowRight") show(i + 1); if (e.key === "ArrowLeft") show(i - 1); };
    document.addEventListener("keydown", box.keys);
    document.body.appendChild(box);
    document.body.style.overflow = "hidden";
  }
  function closePhoto() { if (!box) return; document.removeEventListener("keydown", box.keys); box.remove(); box = null; document.body.style.overflow = ""; }

  // The organisers' editor lives in admin.js, loaded only when someone opens #admin.
  function loadAdmin() {
    if (document.getElementById("admin-js")) return;
    const s = document.createElement("script");
    s.id = "admin-js";
    s.src = "admin.js";
    s.onload = () => window.CBCAdmin && window.CBCAdmin.mount();
    document.body.appendChild(s);
  }

  // ---------- pages ----------
  const pages = {
    home() {
      const nextPlayoff = pgames.find((g) => !g.played);
      const feature = PO && PO.champion ? null : nextPlayoff || gameOfTheWeek();
      // Playoff games count too: the coming round and the latest results are whatever was played or is next, in any stage.
      const playedAll = ALL.filter((g) => g.played), upcomingAll = ALL.filter((g) => !g.played);
      const lastDay = playedAll.length ? playedAll[playedAll.length - 1].date.slice(0, 10) : null;
      const lastRound = playedAll.filter((g) => g.date.startsWith(lastDay));
      const nextDay = upcomingAll.length ? upcomingAll[0].date.slice(0, 10) : null;
      const nextRound = upcomingAll.filter((g) => g.date.startsWith(nextDay));
      const result = (g) => {
        const side = (t, i) => `<span class="rs-team${g.score[i] < g.score[1 - i] ? " lose" : ""}">${logo(t)}<b>${esc(short(t))}</b><span class="num">${g.score[i]}</span></span>`;
        return `<a class="rs" href="#game/${g.id}">${side(g.home, 0)}${side(g.away, 1)}<span class="rs-end label">Final →</span></a>`;
      };
      const tile = (label, key, unit) => {
        const s = leadersIn(key, 1)[0];
        return s ? `<a class="ltile" style="--c:${esc(TEAMS[s.p.team].color)}" href="${plink(s.p)}"><span class="lt-top"><span class="eyebrow">${label}</span>${logo(s.p.team)}</span>
          <b class="ltile-val">${avg(s.t[key], s.gp)}<small>${unit}</small></b>
          <span class="ltile-who">${avatar(s.p)}<span><b>${esc(s.p.name)}</b><small>${esc(s.p.team)}</small></span></span></a>` : "";
      };
      const autos = { ...heroSlides(lastRound), league: titleSlide(), gotw: feature ? gotwSlide(feature) : null };
      // Picture slides the organisers add in the editor win; else the league's own banner slides in data.js (current season only);
      // else the automatic slides in the order the editor saved (or the default order).
      const shownSeason = (S.seasons || []).find((x) => x.shown);
      const leagueSlides = !shownSeason || shownSeason.current ? (L.slides || []) : [];
      const saved = C().slides || [];
      const order = saved.some((s) => !s.auto) ? saved : leagueSlides.length ? leagueSlides : saved.length ? saved : DEFAULT_ORDER;
      const slides = order.filter(showing).map((s) => (s.auto ? autos[s.auto] : customSlide(s))).filter(Boolean);
      return `${hero(slides.length ? slides : [autos.league])}
        ${signupBand()}
        ${nextRound.length ? `<section>${sh(`Coming up`, "#games", "All games")}<p class="sub">${esc(stageOf(nextRound[0]))} · ${esc(dfmt(nextDay + "T12:00", { weekday: "long", month: "long", day: "numeric" }))} · ${esc(nextRound[0].venue || L.venue)}</p><div class="games-grid swipe">${nextRound.map(gameCard).join("")}</div></section>` : ""}
        <div class="two">
          <section>${sh("Standings", "#standings", "Full table")}${standingsTable(true)}</section>
          ${lastRound.length ? `<section>${sh(`${stageOf(lastRound[0])} results`, "#games/results", "All results")}<div class="card rs-list">${lastRound.map(result).join("")}</div></section>` : ""}
        </div>
        ${(PO && PO.champion) || (!upcoming.length && played.length) ? `<section>${sh("Season awards", PO ? "#playoffs" : null, PO ? "Playoffs" : esc(L.season))}${awards()}</section>` : ""}
        <section>${sh("League leaders", "#stats", "All stats")}<div class="ltiles">${tile("Points", "pts", "ppg")}${tile("Rebounds", "reb", "rpg")}${tile("Assists", "ast", "apg")}${tile("Efficiency", "eff", "eff")}</div></section>
        ${C().albums.length ? `<section>${sh("Photos", "#photos", "All albums")}${albumCards(C().albums.slice(0, 3)).replace('class="albumgrid"', 'class="albumgrid swipe"')}</section>` : ""}
        <section>${sh("News", "#news", "All news")}${newsCards(newsItems().slice(0, 3)).replace('class="newsgrid"', 'class="newsgrid swipe"')}</section>`;
    },

    games(tab) {
      // Upcoming first (soonest first), then finished (latest first). Playoff games are listed too, under their stage's name.
      const days = (list) => { const out = []; list.forEach((g) => { const d = g.date.slice(0, 10); const last = out[out.length - 1]; last && last.d === d ? last.gs.push(g) : out.push({ d, gs: [g] }); }); return out; };
      const block = ({ d, gs }) => `<section class="dayblock"><div class="dayhead"><b>${esc(stageOf(gs[0]))}</b><span>${esc(dfmt(d + "T12:00", { weekday: "long", month: "long", day: "numeric" }))} · ${esc(gs[0].venue || L.venue)}</span></div><div class="games-grid">${gs.map(gameCard).join("")}</div></section>`;
      const coming = ALL.filter((g) => !g.played);
      const doneAll = ALL.filter((g) => g.played);
      const GL = 16, allGames = store.get("gamesAll", false);
      const done = allGames ? doneAll : doneAll.slice(-GL);
      if (tab === "results") setTimeout(() => { const el = document.getElementById("results"); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140 }); }, 0);
      return head(`${L.name} · ${L.season}`, "Games") + `<div class="stack">
        ${coming.length ? `<section id="upcoming">${sh("Upcoming", null, `${coming.length} to play`)}<div class="stack">${days(coming).map(block).join("")}</div></section>` : ""}
        <section id="results">${sh("Finished", null, `${doneAll.length} played`)}<div class="stack">${days(done).reverse().map(block).join("") || `<p class="card empty">No games played yet.</p>`}</div>
          ${doneAll.length > GL ? `<button class="btn ghost more-btn" data-showgames="${allGames ? "0" : "1"}">${allGames ? "Show latest " + GL : "Show all " + doneAll.length + " games"}</button>` : ""}</section>
      </div>`;
    },

    standings() {
      return head(`${L.season} · ${L.city}`, "Standings") + `<div class="stack">${standingsTable(false)}
        <p class="note">Top four make the playoffs (line under 4th). GB: games behind first. L5: last five games. Strk: current streak.</p></div>`;
    },

    stats(tab) {
      const which = tab === "players" ? "players" : "leaders";
      const tabs = seg([["leaders", "Leaders", "#stats"], ["players", "All players", "#stats/players"]], which);
      if (which === "leaders") {
        const cats = [["Points", "pts", "PPG"], ["Rebounds", "reb", "RPG"], ["Assists", "ast", "APG"], ["Steals", "stl", "SPG"], ["Blocks", "blk", "BPG"], ["Efficiency", "eff", "EFF"]];
        return head(L.season, "Stats") + `<div class="stack">${tabs}<div class="leaders-grid wide-grid">${cats.map(([l, k, u]) => leaderBoard(l, k, u)).join("")}</div>
          <section>${sh("Team rankings")}${teamRankTable()}</section></div>`;
      }
      const sortKey = store.get("sort", "pts");
      const filter = store.get("teamFilter", "all");
      const cols = [["MIN", "min"], ["PTS", "pts"], ["REB", "reb"], ["AST", "ast"], ["STL", "stl"], ["BLK", "blk"], ["TOV", "tov"], ["FG%", "fgp"], ["3P%", "tpp"], ["FT%", "ftp"], ["EFF", "eff"]];
      const phoneCol = (k) => !["pts", "reb", "ast", "eff"].includes(k) ? " ph" : "";   // phones show only these four
      const val = (s, k) => {
        if (k === "fgp") return s.t.fga ? s.t.fgm / s.t.fga : 0;
        if (k === "tpp") return s.t.tpa ? s.t.tpm / s.t.tpa : 0;
        if (k === "ftp") return s.t.fta ? s.t.ftm / s.t.fta : 0;
        return perGame(s, k);
      };
      const show = (s, k) => (["fgp", "tpp", "ftp"].includes(k) ? (val(s, k) * 100).toFixed(1) : val(s, k).toFixed(1));
      const everyone = Object.values(SEASON).filter((s) => filter === "all" || short(s.p.team) === filter).sort((a, b) => val(b, sortKey) - val(a, sortKey));
      const LIMIT = 25, all = store.get("showAll", false);
      const rows = all ? everyone : everyone.slice(0, LIMIT);
      return head(L.season, "Stats") + `<div class="stack">${tabs}
        <label class="filter"><span class="label">Team</span><select data-filter>${[["all", "All teams"], ...teamNames.map((t) => [short(t), t])].map(([v, l]) => `<option value="${esc(v)}"${v === filter ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
        <div class="card scroll"><table>
          <thead><tr><th>#</th><th class="l sticky">Player</th><th class="ph">Team</th><th class="ph">GP</th>${cols.map(([l, k]) => `<th class="${(k === sortKey ? "on" : "") + phoneCol(k)}"><button data-sort="${k}" aria-pressed="${k === sortKey}">${l}</button></th>`).join("")}</tr></thead>
          <tbody>${rows.map((s, i) => `<tr class="link" data-go="${plink(s.p)}"><td>${i + 1}</td><td class="l sticky">${esc(s.p.name)}<small class="pt">${esc(short(s.p.team))} · ${s.gp} GP</small></td><td class="ph"><span class="tc">${logo(s.p.team)}${esc(short(s.p.team))}</span></td><td class="ph">${s.gp}</td>${cols.map(([, k]) => `<td class="${(k === sortKey ? "on" : "") + phoneCol(k)}">${show(s, k)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>
        ${everyone.length > LIMIT ? `<button class="btn ghost more-btn" data-showall="${all ? "0" : "1"}">${all ? "Show top " + LIMIT : "Show all " + everyone.length + " players"}</button>` : ""}
        <p class="note">Per game. Tap a column to sort, or a player for their game log.</p></div>`;
    },

    teams() {
      return head(`${L.season} · ${teamNames.length} teams`, "Teams") + `<section class="team-grid">${TABLE.map((r) => {
        const t = TEAMS[r.team];
        return `<a class="card tcard" style="--c:${esc(t.color)}" href="${tlink(r.team)}">
          <div class="tcard-top">${logo(r.team, "lg")}<span class="rank-sticker" aria-label="${ordinal(r.rank)} place, ${r.w}-${r.l}"><b>${r.rank}</b><small>${r.w}-${r.l}</small></span></div>
          <div class="tcard-body"><b>${esc(r.team)}</b><span class="label">${esc(t.short)} · Captain ${esc(ROSTERS[r.team][0].name)}</span></div>
          <div class="mini"><div><b class="num">${r.ppg.toFixed(1)}</b><span class="label">PPG</span></div><div><b class="num">${r.oppg.toFixed(1)}</b><span class="label">OPPG</span></div><div><b class="num">${r.streak || "–"}</b><span class="label">Strk</span></div></div>
        </a>`;
      }).join("")}</section>`;
    },

    team(code) {
      const team = byShort[code];
      if (!team) return pages.teams();
      const r = rowOf(team), t = TEAMS[team];
      const tab = store.get("teamTab", "roster");
      const gs = teamGames(team);
      const body = tab === "schedule"
        ? `<div class="games-grid">${gs.map(gameCard).join("")}</div>`
        : `<section class="cards">${ROSTERS[team].map((p) => {
            const s = SEASON[p.id];
            const [first, last] = nameParts(p.name);
            return `<a class="pcard" style="--c:${esc(t.color)}" href="${plink(p)}">
              <span class="pc-field"><b class="pc-no">${esc(p.no)}</b>${p.captain ? `<span class="eyebrow">Captain</span>` : ""}<span class="pc-face">${avatar(p)}</span></span>
              <span class="pc-name"><small>${esc(first)}</small>${esc(last)}</span>
              <span class="pc-meta">${[p.pos, p.ht && p.ht + " cm"].filter(Boolean).map(esc).join(" · ") || esc(short(p.team))}</span>
              <span class="pc-stats"><span><b>${avg(s.t.pts, s.gp)}</b>PPG</span><span><b>${avg(s.t.reb, s.gp)}</b>RPG</span><span><b>${avg(s.t.ast, s.gp)}</b>APG</span></span>
            </a>`;
          }).join("")}</section>`;
      return `<section class="top band" style="--team:${esc(t.color)}"><span class="watermark" aria-hidden="true">${esc(t.logo)}</span>
          <div><span class="label">${esc(L.name)} · ${esc(L.season)}</span>
            <h1>${esc(team)}</h1>
            <p class="meta"><b>${r.w}-${r.l}</b> · ${ordinal(r.rank)} in the league${r.streak ? ` · ${r.streak[0] === "W" ? "Won" : "Lost"} ${r.streak.slice(1)} straight` : ""}</p></div>
          ${logo(team, "xl")}
        </section>
        <section class="scoreboard">${SIX.map(([label, key, low]) => `<div><span class="label">${label}</span><b class="num">${fmtSix(key, r[key])}</b><i style="--rk:${onWhite(t.color)};--rk-dark:${onDark(t.color)}">${ordinal(rankIn(team, key, low))}<span class="wide"> in league</span></i></div>`).join("")}</section>
        <div class="stack">${seg([["roster", "Roster"], ["schedule", "Schedule"]], tab, "data-teamtab")}${body}</div>`;
    },

    playoffs() {
      if (!PO) return head(L.season, "Playoffs") + `<p class="card empty">The playoffs have not started yet.</p>`;
      return head(`${L.name} · ${L.season}`, "Playoffs") + `<div class="stack">
        ${PO.champion ? `<section class="champ-band">${championPanel()}</section>` : ""}
        <div class="bracket" style="--rounds:${PO.rounds.length}">${PO.rounds.map((r) => `<section class="bracket-round"><h3 class="label">${esc(r.name)}</h3>${r.series.map(seriesCard).join("")}</section>`).join("")}</div>
        ${PO.third ? `<section>${sh("Third place")}<div class="series-grid">${seriesCard(PO.third)}</div></section>` : ""}
        ${PO.champion ? `<section>${sh("Season awards")}${awards()}</section>` : ""}
        ${pgames.length ? `<section>${sh("Playoff games")}<div class="games-grid">${pgames.map(gameCard).join("")}</div></section>` : ""}
      </div>`;
    },

    signup(tab) {
      if (!SU) return head(L.name, "Sign up") + `<p class="card empty">Sign-ups for the next season are closed. Check back soon.</p>`;
      const which = tab === "player" ? "player" : "team";
      return head(`${SU.season}${SU.starts ? " · starts " + SU.starts : ""}`, "Sign up") + `<div class="stack su-page">
        <p class="sub">${esc(SU.note || "")}${deadline ? ` Sign-ups close ${esc(deadline)}.` : ""}${SU.fee ? ` Fee: ${esc(SU.fee)}.` : ""}</p>
        ${seg([["team", "Register a team", "#signup/team"], ["player", "Free agent", "#signup/player"]], which)}
        <p class="note">${which === "team" ? "Captains: register your whole team. You can change the roster later with the league." : "No team? Sign up and the league will place you on one."}</p>
        ${which === "team" ? teamForm() : playerForm()}
      </div>`;
    },

    signups() {
      setTimeout(() => { const p = memo.get(); if (p) loadSignups(p); }, 0);
      return head(SU ? SU.season : L.name, "Sign-ups") + `<div class="stack" id="su-admin">${memo.get() ? `<p class="card empty">Loading…</p>` : passForm()}</div>`;
    },

    news() {
      return head(L.name, "News") + newsCards(newsItems());
    },

    article(aid) {
      const a = articleById(aid);
      if (!a) return head(L.name, "News") + `<p class="card empty">That story is no longer on the site. <a href="#news">All news →</a></p>`;
      const g = gameByKey(a.game);
      const paras = a.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
      const more = newsItems().filter((n) => n.article !== a.id).slice(0, 3);
      return `<section class="art-top band${a.image ? " photo" : ""}" style="${a.image ? `--photo:${bgUrl(a.image)};--pos:${+a.focus.x}% ${+a.focus.y}%` : ""}">
          <button class="back" data-back aria-label="Back">←</button>
          <div class="art-head"><span class="label">${esc(a.tag || "News")} · ${esc(dfmt(a.date + "T12:00", { weekday: "long", month: "long", day: "numeric", year: "numeric" }))}</span>
          <h1>${esc(a.title)}</h1>${a.summary ? `<p class="meta">${esc(a.summary)}</p>` : ""}</div></section>
        <article class="art-body">${paras || ""}
          ${g ? `<div class="art-game"><span class="label">The game</span>${gameCard(g)}</div>` : ""}</article>
        ${more.length ? `<section>${sh("More news", "#news", "All news")}${newsCards(more)}</section>` : ""}`;
    },

    photos() {
      const list = C().albums;
      return head(L.name, "Photos") + (list.length ? albumCards(list) : `<p class="card empty">No photo albums yet.</p>`);
    },

    album(aid) {
      const a = albumById(aid);
      if (!a) return head(L.name, "Photos") + `<p class="card empty">That album is no longer on the site. <a href="#photos">All albums →</a></p>`;
      const g = gameByKey(a.game);
      return `${head(`${dfmt(a.date + "T12:00", { month: "long", day: "numeric", year: "numeric" })} · ${plural(a.photos.length, "photo")}`, a.title)}
        <div class="stack">${g ? `<div class="album-game">${gameCard(g)}</div>` : ""}
        <div class="gallery">${a.photos.map((p, i) => `<button type="button" class="gal-item" data-photo="${i}" aria-label="Open photo ${i + 1}"><img src="${esc(p.src)}" alt="${esc(p.caption)}" loading="lazy"></button>`).join("")}</div></div>`;
    },

    admin() {
      setTimeout(() => (window.CBCAdmin ? window.CBCAdmin.mount() : loadAdmin()), 0);
      return head(L.name, "Organisers") + `<div class="stack" id="admin"><p class="card empty">Loading…</p></div>`;
    },

    game(id) {
      const g = byId[id];
      if (!g) return pages.home();
      const lose = (i) => g.played && g.score[i] < g.score[1 - i];
      const side = (t) => `<a class="bteam" href="${tlink(t)}">${logo(t, "lg")}<b>${esc(t)}</b><small>${esc(record(t))}</small></a>`;
      const score = g.played
        ? `<div class="bscore"><div class="row"><span class="num${lose(0) ? " lose" : ""}">${g.score[0]}</span><span class="label">–</span><span class="num${lose(1) ? " lose" : ""}">${g.score[1]}</span></div><span class="label">Final</span></div>`
        : `<div class="bscore"><span class="vs">VS</span><span class="count" data-countdown="${esc(g.date)}">${esc(countdown(g.date))}</span></div>`;
      const q = g.played ? quarters(g) : null;
      const linescore = q ? `<div class="linescore scroll"><table>
          <thead><tr><th class="l">Team</th>${q[0].map((_, i) => `<th>${i < 4 ? "Q" + (i + 1) : "OT" + (q[0].length > 5 ? i - 3 : "")}</th>`).join("")}<th>T</th></tr></thead>
          <tbody>${[g.home, g.away].map((t, i) => `<tr><td class="l"><span class="tc">${logo(t)}<b>${esc(short(t))}</b></span></td>${q[i].map((v) => `<td>${v}</td>`).join("")}<td><b>${g.score[i]}</b></td></tr>`).join("")}</tbody></table></div>` : "";
      return `<section class="stack"><div class="crumb"><button class="back" data-back aria-label="Back">←</button><span class="label">${esc(stageOf(g))} · ${esc(day(g.date))} · ${esc(time(g.date))} · ${esc(g.venue || L.venue)}</span></div>
        <div class="card"><div class="board" style="--h:${esc(TEAMS[g.home].color)};--a:${esc(TEAMS[g.away].color)}">${side(g.home)}${score}${side(g.away)}</div>${linescore}</div></section>
        ${g.played ? gamePlayed(g) : gamePreview(g)}`;
    },

    player(pid) {
      const p = playerById[pid];
      if (!p) return pages.teams();
      const s = SEASON[p.id], t = s.t;
      const [first, last] = nameParts(p.name);
      const six = [["PPG", avg(t.pts, s.gp)], ["RPG", avg(t.reb, s.gp)], ["APG", avg(t.ast, s.gp)], ["FG%", pct(t.fgm, t.fga)], ["3P%", pct(t.tpm, t.tpa)], ["MIN", avg(t.min, s.gp)]];
      return `<section class="player-top band" style="--team:${esc(TEAMS[p.team].color)}"><button class="back" data-back aria-label="Back">←</button>${p.photo ? `<span class="player-photo"><img src="${esc(p.photo)}" alt="${esc(p.name)}"><b class="num">${esc(p.no)}</b></span>` : `<span class="jersey" aria-hidden="true">${esc(p.no)}</span>`}
          <div><a class="label" href="${tlink(p.team)}">${[p.team, p.pos, p.ht && p.ht + " cm", p.captain && "Captain"].filter(Boolean).map(esc).join(" · ")}</a>
            <h1><small>${esc(first)}</small>${esc(last)}</h1></div></section>
        <section class="scoreboard">${six.map(([l, v]) => `<div><span class="label">${l}</span><b class="num">${v}</b></div>`).join("")}</section>
        <section>${sh("Game log", null, L.season)}
          <div class="card scroll"><table>
            <thead><tr><th class="l sticky">Game</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG</th><th>3P</th><th>FT</th></tr></thead>
            <tbody>${[...s.log].reverse().map(({ g, l }) => { const w = won(g, p.team) ? "W" : "L"; return `<tr class="link" data-go="#game/${g.id}"><td class="l sticky"><span class="wl ${w}">${w}</span>${esc(mon(g.date))} ${g.home === p.team ? "vs" : "@"} ${esc(short(opp(g, p.team)))}</td>
              <td>${l.min}</td><td class="on">${l.pts}</td><td>${l.reb}</td><td>${l.ast}</td><td>${l.stl}</td><td>${l.blk}</td><td>${l.tov}</td><td>${l.fgm}-${l.fga}</td><td>${l.tpm}-${l.tpa}</td><td>${l.ftm}-${l.fta}</td></tr>`; }).join("") || `<tr><td colspan="11" class="empty">No games yet.</td></tr>`}</tbody>
          </table></div></section>`;
    }
  };

  function teamRankTable() {
    const cols = [["PPG", "ppg"], ["OPPG", "oppg", true], ["RPG", "rpg"], ["APG", "apg"], ["FG%", "fg"], ["3PT%", "tp"], ["STL", "stl"], ["BLK", "blk"], ["TOV", "tov", true]];
    return `<div class="card scroll"><table>
      <thead><tr><th class="l sticky">Team</th>${cols.map(([l]) => `<th>${l}</th>`).join("")}</tr></thead>
      <tbody>${TABLE.map((r) => `<tr class="link" data-go="${tlink(r.team)}"><td class="l sticky"><span class="tc">${logo(r.team)}<b>${esc(short(r.team))}</b></span></td>${cols.map(([, k, low]) => `<td class="${rankIn(r.team, k, low) === 1 ? "on" : ""}">${fmtSix(k, r[k])}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div><p class="note">Best in each column is highlighted.</p>`;
  }

  function cmpRow(g, label, hv, av, disp = (v) => v, low = false, ranks) {
    const hw = low ? hv < av : hv > av, aw = low ? av < hv : av > hv;
    const tot = (hv + av) || 1;
    const [rh, ra] = ranks || ["", ""];
    return `<div class="cmp"><div class="cmp-nums"><span class="num${aw ? " lose" : ""}">${disp(hv)}${rh ? `<small>${rh}</small>` : ""}</span><span class="label">${label}</span><span class="num${hw ? " lose" : ""}">${ra ? `<small>${ra}</small>` : ""}${disp(av)}</span></div>
      <div class="cmp-bar" style="--l:${(hv / tot) * 100}fr;--r:${(av / tot) * 100}fr"><i class="${hw ? "win" : ""}" style="--c:${esc(TEAMS[g.home].color)}"></i><i class="${aw ? "win" : ""}" style="--c:${esc(TEAMS[g.away].color)}"></i></div></div>`;
  }
  const cmpHead = (g) => `<div class="cmp-head"><span class="tc">${logo(g.home)}<b>${esc(short(g.home))}</b></span><span class="tc"><b>${esc(short(g.away))}</b>${logo(g.away)}</span></div>`;

  function boxTable(g, team) {
    const box = boxScore(g, team).filter(appeared);
    const t = total(box);
    const mins = box.reduce((a, l) => a + (l.min || 0), 0);
    return `<section>${sh(`<span class="tc">${logo(team)} ${esc(team)}</span>`, null, g.home === team ? "Home" : "Away")}
      <div class="card scroll"><table>
        <thead><tr><th class="l sticky">Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>FG</th><th>3P</th><th>FT</th><th>EFF</th></tr></thead>
        <tbody>${[...box].sort((a, b) => b.min - a.min).map((l) => `<tr class="link" data-go="#player/${encodeURIComponent(lineId(team, l))}"><td class="l sticky"><span class="soft">${esc(l.no)}</span>&nbsp; ${esc(l.name)}</td><td>${l.min}</td><td class="on">${l.pts}</td><td>${l.reb}</td><td>${l.ast}</td><td>${l.stl}</td><td>${l.blk}</td><td>${l.tov}</td><td>${l.pf}</td><td>${l.fgm}-${l.fga}</td><td>${l.tpm}-${l.tpa}</td><td>${l.ftm}-${l.fta}</td><td>${eff(l)}</td></tr>`).join("")}</tbody>
        <tfoot><tr><td class="l sticky">Totals</td><td>${mins}</td><td>${t.pts}</td><td>${t.reb}</td><td>${t.ast}</td><td>${t.stl}</td><td>${t.blk}</td><td>${t.tov}</td><td>${t.pf}</td><td>${t.fgm}-${t.fga}</td><td>${t.tpm}-${t.tpa}</td><td>${t.ftm}-${t.fta}</td><td></td></tr></tfoot>
      </table></div></section>`;
  }

  function gamePlayed(g) {
    const tab = store.get("gameTab", "summary");
    const tabs = seg([["summary", "Summary"], ["box", "Box score"]], tab, "data-tab");
    if (tab === "box") return `<div class="stack">${tabs}${boxTable(g, g.home)}${boxTable(g, g.away)}</div>`;
    const [hl, al] = [teamLine(g, g.home), teamLine(g, g.away)];
    const all = [g.home, g.away].flatMap((t) => boxScore(g, t).map((l) => ({ ...l, team: t })));
    const potg = (g.potg && all.find((l) => l.key === g.potg)) || [...all].sort((a, b) => eff(b) - eff(a))[0];
    const potgP = playerById[lineId(potg.team, potg)];
    const top = (team, k) => [...boxScore(g, team)].sort((a, b) => b[k] - a[k])[0];
    const leaderRow = (label, k) => {
      const [a, b] = [top(g.home, k), top(g.away, k)];
      return `<div class="gl-row"><span class="gl-side"><b class="num">${a[k]}</b><span>${esc(a.name)}</span></span><span class="label">${label}</span><span class="gl-side r"><span>${esc(b.name)}</span><b class="num">${b[k]}</b></span></div>`;
    };
    return `<div class="stack">${tabs}
      <div class="two">
        <div>
          <section>${sh("Player of the game")}
            <a class="card potg" style="--team:${esc(TEAMS[potg.team].color)};--on-team:${readable(TEAMS[potg.team].color)}" href="${potgP ? plink(potgP) : "#game/" + g.id}"><span class="jersey">${esc(potg.no)}</span>
              <span><b>${esc(potg.name)}</b><span class="label">${esc(short(potg.team))} · ${potg.pts} pts · ${potg.reb} reb · ${potg.ast} ast · ${potg.fgm}-${potg.fga} fg</span></span>
              <span class="big">${eff(potg)}<span class="label" style="display:block">Eff</span></span></a></section>
          <section>${sh("Game leaders")}<div class="card">${cmpHead(g)}<div class="compare">${leaderRow("Points", "pts")}${leaderRow("Rebounds", "reb")}${leaderRow("Assists", "ast")}</div></div></section>
        </div>
        <div><section>${sh("Team stats", null, "This game")}<div class="card">${cmpHead(g)}<div class="compare">
          ${cmpRow(g, "FG%", hl.fgm / hl.fga * 100, al.fgm / al.fga * 100, (v) => v.toFixed(1))}
          ${cmpRow(g, "3PT%", hl.tpa ? hl.tpm / hl.tpa * 100 : 0, al.tpa ? al.tpm / al.tpa * 100 : 0, (v) => v.toFixed(1))}
          ${cmpRow(g, "FT%", hl.fta ? hl.ftm / hl.fta * 100 : 0, al.fta ? al.ftm / al.fta * 100 : 0, (v) => v.toFixed(1))}
          ${cmpRow(g, "REB", hl.reb, al.reb)}${cmpRow(g, "AST", hl.ast, al.ast)}${cmpRow(g, "STL", hl.stl, al.stl)}
          ${cmpRow(g, "TOV", hl.tov, al.tov, undefined, true)}
        </div></div></section></div>
      </div></div>`;
  }

  function gamePreview(g) {
    const [a, b] = [rowOf(g.home), rowOf(g.away)];
    const h2h = played.filter((x) => [x.home, x.away].includes(g.home) && [x.home, x.away].includes(g.away));
    const form = (r) => `<span class="form">${r.last5.map((x) => `<b class="${x}">${x}</b>`).join("") || `<span class="soft">No games yet</span>`}</span>`;
    const watch = (team) => {
      const s = Object.values(SEASON).filter((x) => x.p.team === team && x.gp).sort((x, y) => perGame(y, "eff") - perGame(x, "eff"))[0];
      return s ? `<a class="bl-row" href="${plink(s.p)}">${avatar(s.p)}<span class="nm">${esc(s.p.name)}<small>${esc(short(team))} · ${avg(s.t.pts, s.gp)} PPG · ${avg(s.t.reb, s.gp)} RPG · ${avg(s.t.ast, s.gp)} APG</small></span></a>` : "";
    };
    return `<div class="two">
      <div><section>${sh("Tale of the tape", null, "Season · rank")}<div class="card">${cmpHead(g)}<div class="compare">
        ${SIX.map(([l, k, low]) => cmpRow(g, l, a[k], b[k], (v) => fmtSix(k, v), low, [ordinal(rankIn(g.home, k, low)), ordinal(rankIn(g.away, k, low))])).join("")}
      </div></div></section></div>
      <div>
        <section>${sh("Players to watch")}<div class="card board-list">${watch(g.home)}${watch(g.away)}</div></section>
        <section>${sh("Form", null, "Last 5")}<div class="card">${[a, b].map((r) => `<div class="frow"><span class="tc">${logo(r.team, "md")}<b>${esc(r.team)}</b></span>${form(r)}</div>`).join("")}</div></section>
        <section>${sh("Head to head", null, "This season")}<div class="games">${h2h.map(gameCard).join("") || `<p class="card empty">First meeting this season.</p>`}</div></section>
      </div></div>`;
  }

  // ---------- score strip: the last round played and the next one ----------
  // The strip along the very top: games being played, then the ones still to come (soonest first), then the latest finished ones.
  function ticker() {
    const live = ALL.filter((g) => g.live && !g.played);
    const coming = ALL.filter((g) => !g.played && !g.live).slice(0, 8);
    const done = ALL.filter((g) => g.played).slice(-8).reverse();
    const card = (g, sep) => {
      const status = g.played ? "Final" : g.live ? "Live" : `${wkday(g.date)} ${time(g.date)}`;
      const soon = g.played ? "" : " soon";
      const line = (t, i) => {
        const lose = g.played && g.score[i] < g.score[1 - i];
        return `<span class="tk-row${lose ? " lose" : ""}">${logo(t)}${esc(short(t))}<b>${g.played ? g.score[i] : g.live ? g.live[i] : record(t)}</b></span>`;
      };
      return `<a class="tk${sep ? " sep" : ""}${g.live ? " on-air" : ""}" href="#game/${g.id}"><span class="tk-status${soon}">${esc(status)}</span>${line(g.home, 0)}${line(g.away, 1)}</a>`;
    };
    return [...live.map((g) => card(g)), ...coming.map((g) => card(g)), ...done.map((g, k) => card(g, k === 0 && (live.length || coming.length)))].join("");
  }

  // The browser tab's and a shared link's title: what the page is about, then the league.
  function pageTitle(page, arg) {
    if (!page || page === "home" || !pages[page]) return L.name;
    let t = "";
    if (page === "team" && byShort[arg]) t = byShort[arg];
    else if (page === "player" && playerById[arg]) t = `${playerById[arg].name} (${short(playerById[arg].team)})`;
    else if (page === "game" && byId[arg]) { const g = byId[arg]; t = g.played ? `${short(g.home)} ${g.score[0]}–${g.score[1]} ${short(g.away)}` : `${short(g.home)} vs ${short(g.away)}`; }
    else if (page === "article" && articleById(arg)) t = articleById(arg).title;
    else if (page === "album" && albumById(arg)) t = albumById(arg).title;
    else t = page[0].toUpperCase() + page.slice(1);
    return `${t} · ${L.name}`;
  }

  // ---------- routing ----------
  const NAV = { game: "games", team: "teams", player: "teams", signups: "signup", article: "news", album: "photos", admin: "signup" };
  function route() {
    const [page, arg] = decodeURIComponent((location.hash || "#home").slice(1)).split("/");
    const render = pages[page] || pages.home;
    closePhoto();
    app.innerHTML = render(arg);
    startHero();
    app.querySelectorAll(".scroll").forEach((el) => el.setAttribute("tabindex", "0"));
    app.querySelectorAll("tr[data-go]").forEach((el) => el.setAttribute("tabindex", "0"));
    const navKey = NAV[page] || (pages[page] ? page : "home");
    document.querySelectorAll(".nav a, .sheet a").forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + navKey ? "page" : "false"));
    const tab = ["home", "games", "standings", "stats"].includes(navKey) ? navKey : "more";
    document.querySelectorAll("[data-tab-for]").forEach((a) => a.toggleAttribute("aria-current", a.dataset.tabFor === tab));
    closeSheet();
    document.title = pageTitle(page, arg);
  }
  let lastHash = location.hash;
  window.addEventListener("hashchange", () => {
    const [p0, a0] = lastHash.split("/"), [p1, a1] = location.hash.split("/");
    const samePage = p0 === p1 && (!["#game", "#team", "#player", "#article", "#album"].includes(p1) || a0 === a1);
    lastHash = location.hash;
    route();
    if (!samePage) window.scrollTo(0, 0);
  });

  const sheet = document.getElementById("more-sheet");
  const moreBtn = document.querySelector(".more-btn");
  function closeSheet() { if (sheet) { sheet.hidden = true; moreBtn.setAttribute("aria-expanded", "false"); } }
  moreBtn && moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    sheet.hidden = !sheet.hidden;
    moreBtn.setAttribute("aria-expanded", String(!sheet.hidden));
  });
  document.addEventListener("click", (e) => { if (sheet && !sheet.hidden && !e.target.closest(".sheet")) closeSheet(); });

  document.addEventListener("click", (e) => {
    const step = e.target.closest("[data-hero], [data-hero-dot]");
    if (step) { const h = step.closest(".hero"), track = h.querySelector(".hero-track"); h.stop();
      h.go(step.dataset.heroDot != null ? +step.dataset.heroDot : Math.round(track.scrollLeft / track.clientWidth) + +step.dataset.hero); return; }
    const ph = e.target.closest("[data-photo]");
    if (ph) { const a = albumById(decodeURIComponent(location.hash.split("/")[1] || "")); if (a) openPhoto(a, +ph.dataset.photo); return; }
    const go = e.target.closest("[data-go]");
    if (go) { location.hash = go.dataset.go; return; }
    const mg = e.target.closest("[data-showgames]");
    if (mg) { store.set("gamesAll", mg.dataset.showgames === "1"); route(); return; }
    const more = e.target.closest("[data-showall]");
    if (more) { store.set("showAll", more.dataset.showall === "1"); route(); return; }
    const sort = e.target.closest("[data-sort]");
    if (sort) { store.set("sort", sort.dataset.sort); route(); return; }
    const tab = e.target.closest("[data-tab]");
    if (tab) { store.set("gameTab", tab.dataset.tab); route(); return; }
    const ttab = e.target.closest("[data-teamtab]");
    if (ttab) { store.set("teamTab", ttab.dataset.teamtab); route(); return; }
    if (e.target.closest("[data-back]")) { history.length > 1 ? history.back() : (location.hash = "#home"); }
  });
  document.addEventListener("keydown", (e) => {
    const row = e.key === "Enter" && e.target.closest && e.target.closest("tr[data-go]");
    if (row && e.target === row) location.hash = row.dataset.go;
  });
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (f.matches("[data-signup]")) { e.preventDefault(); if (f.reportValidity()) sendSignup(f); }
    if (f.matches("[data-passcode]")) { e.preventDefault(); loadSignups(f.passcode.value); }
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-more-rows]")) { document.querySelectorAll(".rr.extra").forEach((r) => r.classList.remove("extra")); e.target.remove(); }
    if (e.target.closest("[data-csv]")) downloadCsv();
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches("[data-filter]")) { store.set("teamFilter", e.target.value); route(); }
  });

  setInterval(() => document.querySelectorAll("[data-countdown]").forEach((el) => (el.textContent = countdown(el.dataset.countdown))), 30000);

  // ---------- masthead & footer ----------
  document.getElementById("ticker").innerHTML = ticker();
  if (PO) document.querySelectorAll('a[href="#playoffs"]').forEach((a) => (a.hidden = false));
  if (SU) document.querySelectorAll('a[href="#signup"]').forEach((a) => (a.hidden = false));
  if (C().albums.length) document.querySelectorAll('a[href="#photos"]').forEach((a) => (a.hidden = false));
  document.getElementById("brand").innerHTML = `${logo(null)}<b>${esc(L.name)}</b>`;
  // Season picker (owner, Nov 2026: "Add Season 6 too"): each season is the whole site for that season, at ?season=N.
  // Switching keeps the page (Standings stays Standings) but not a game, team or player, which belong to one season.
  if (S.seasons && S.seasons.length > 1) {
    const pick = document.createElement("label");
    pick.className = "season-pick";
    pick.innerHTML = `<select aria-label="Season">${S.seasons.map((s) =>
      `<option value="${esc(s.current ? "" : s.key)}"${s.shown ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select>`;
    document.querySelector(".theme").before(pick);
    pick.querySelector("select").addEventListener("change", (e) => {
      const page = (location.hash.split("/")[0] || "#home");
      location.href = location.pathname + (e.target.value ? "?season=" + encodeURIComponent(e.target.value) : "") + page;
    });
  }
  const src = S.source
    ? `<span class="src live">Live stats from <a href="${esc(S.source.url)}" rel="noopener">${esc(S.source.name)}</a> · ${esc(S.source.league)} · updated ${esc(time(S.source.updated))}</span>`
    : `<span class="src">Sample data · live stats appear once the league is on hoopr.id</span>`;
  document.getElementById("footer").innerHTML = `<div class="in"><span>${[L.name, L.city, L.founded && "Since " + L.founded].filter(Boolean).map(esc).join(" · ")}</span>${src}${L.email ? `<a href="mailto:${esc(L.email)}">${esc(L.email)}</a>` : ""}</div>`;

  const saved = store.get("theme", null);
  if (saved) document.documentElement.dataset.theme = saved;
  const switchTheme = () => {
    const dark = document.documentElement.dataset.theme === "dark";   // white unless someone chose dark
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    store.set("theme", dark ? "light" : "dark");
  };
  document.querySelectorAll(".theme, .sheet-theme").forEach((b) => b.addEventListener("click", switchTheme));

  // What the editor needs from here: the games, teams and players to link to, and a way to redraw.
  window.CBC = { S, L, ALL, TEAMS, teamNames, PLAYERS, gameKey, stageOf, short, day, esc, route, memo, field, sh, logo, applyLogos,
    played: (g) => g.played };

  route();
})();
