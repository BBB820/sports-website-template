(() => {
  const S = window.SITE;
  const US = S.team.name;
  const app = document.getElementById("app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem("cbc:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("cbc:" + k, JSON.stringify(v)); } catch { /* private mode */ } }
  };

  // ---------- teams ----------
  const TEAMS = { [US]: { color: S.team.color, logo: S.team.logo }, ...S.teams };
  const teamNames = Object.keys(TEAMS);
  const logo = (name, size = "sm") => {
    const t = TEAMS[name] || { color: "#888", logo: name.slice(0, 1) };
    return `<span class="logo ${size}" style="--c:${esc(t.color)}" aria-hidden="true">${esc(t.logo)}</span>`;
  };
  document.documentElement.style.setProperty("--team", S.team.color);

  // ---------- seeded random (sample numbers stay the same on every visit) ----------
  const seedOf = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const rng = (str) => { let a = seedOf(str); return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const between = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

  // Split total into parts by weight so the parts add up exactly.
  function split(total, weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    const raw = weights.map((w) => (w / sum) * total);
    const out = raw.map(Math.floor);
    let left = total - out.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - out[i], i]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, i]) => out[i]++);
    return out;
  }

  // Points → made shots that add up: threes, free throws, twos.
  function shots(r, pts, threeRate) {
    let m3 = Math.min(Math.floor(pts / 3), Math.floor(r() * (pts * threeRate / 3 + 1)));
    let rest = pts - 3 * m3;
    let ftm = rest % 2 ? (rest >= 3 && r() < 0.4 ? 3 : 1) : (rest >= 2 && r() < 0.5 ? 2 : 0);
    if (ftm > rest) ftm = rest % 2;
    const m2 = (rest - ftm) / 2;
    const a2 = m2 + between(r, Math.ceil(m2 * 0.6), Math.ceil(m2 * 1.2) + 1);
    const a3 = m3 + between(r, Math.ceil(m3 * 1.2), Math.ceil(m3 * 2) + 1);
    const fta = ftm + (r() < 0.6 ? between(r, 0, 2) : 0);
    return { fgm: m2 + m3, fga: a2 + a3, tpm: m3, tpa: a3, ftm, fta };
  }

  // ---------- games ----------
  const games = S.schedule.map((g, id) => ({ ...g, id, played: Array.isArray(g.score) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const byId = Object.fromEntries(games.map((g) => [g.id, g]));
  const ours = games.filter((g) => g.home === US || g.away === US);
  const oursPlayed = ours.filter((g) => g.played);
  const oursNext = ours.filter((g) => !g.played);
  const scoreOf = (g, team) => (g.home === team ? g.score[0] : g.score[1]);
  const opp = (g, team = US) => (g.home === team ? g.away : g.home);
  const won = (g, team) => scoreOf(g, team) > scoreOf(g, opp(g, team));

  // Talent is fixed per player; it decides who gets the minutes and shots.
  const ROLE = {
    PG: { reb: 0.6, ast: 2.2, three: 0.45 }, SG: { reb: 0.7, ast: 1.1, three: 0.5 },
    SF: { reb: 1, ast: 0.9, three: 0.35 }, PF: { reb: 1.5, ast: 0.6, three: 0.15 }, C: { reb: 1.9, ast: 0.5, three: 0.05 }
  };
  const roster = S.roster.map((p, i) => {
    const r = rng("talent:" + p.name);
    return { ...p, starter: i < 5, talent: (i < 5 ? 1.4 : 0.8) + r() * 0.6 };
  });

  const boxCache = {};
  function boxScore(g) {
    if (boxCache[g.id]) return boxCache[g.id];
    if (g.box) return (boxCache[g.id] = g.box);
    const r = rng("box:" + g.date + g.home + g.away);
    const pts = scoreOf(g, US);
    // Five players on the floor for 40 minutes: starters about 30 each, bench about 10.
    const mins = split(200, roster.map((p) => (p.starter ? 1 + r() * 0.25 : 0.32 + r() * 0.12)));
    const ptShare = split(pts, roster.map((p, i) => mins[i] * p.talent * (0.5 + r())));
    const box = roster.map((p, i) => {
      const role = ROLE[p.pos] || ROLE.SF;
      const m = mins[i] / 30;
      return {
        no: p.no, name: p.name, min: mins[i], pts: ptShare[i], ...shots(r, ptShare[i], role.three),
        reb: Math.round(m * role.reb * between(r, 3, 8)), ast: Math.round(m * role.ast * between(r, 1, 4)),
        stl: Math.round(m * between(r, 0, 2)), blk: Math.round(m * (p.pos === "C" || p.pos === "PF" ? between(r, 0, 3) : between(r, 0, 1) * 0.5)),
        tov: Math.round(m * between(r, 0, 3)), pf: between(r, 0, 4)
      };
    });
    return (boxCache[g.id] = box);
  }

  const SUM_KEYS = ["pts", "fgm", "fga", "tpm", "tpa", "ftm", "fta", "reb", "ast", "stl", "blk", "tov", "pf"];
  const total = (lines) => Object.fromEntries(SUM_KEYS.map((k) => [k, lines.reduce((a, l) => a + (l[k] || 0), 0)]));

  // Team totals for one game. Cubao's add up its box score; other teams get sample totals.
  function teamLine(g, team) {
    if (team === US) return total(boxScore(g));
    const r = rng("team:" + g.date + team);
    const pts = scoreOf(g, team);
    const s = shots(r, pts, 0.3);
    // Pad attempts to a full game's worth.
    const extra2 = between(r, 18, 26), extra3 = between(r, 6, 12);
    return { pts, fgm: s.fgm, fga: s.fga + extra2 + extra3, tpm: s.tpm, tpa: s.tpa + extra3, ftm: s.ftm, fta: s.fta + between(r, 2, 6),
      reb: between(r, 34, 48), ast: between(r, 14, 25), stl: between(r, 4, 11), blk: between(r, 1, 7), tov: between(r, 9, 18), pf: between(r, 12, 22) };
  }

  function quarters(g) {
    const r = rng("q:" + g.date + g.home);
    return [g.home, g.away].map((t) => split(scoreOf(g, t), [0, 1, 2, 3].map(() => 0.75 + r() * 0.5)));
  }

  const eff = (l) => l.pts + l.reb + l.ast + l.stl + l.blk - (l.fga - l.fgm) - (l.fta - l.ftm) - l.tov;
  const pct = (m, a) => (a ? (100 * m / a).toFixed(1) : "0.0");
  const avg = (v, n) => (n ? (v / n).toFixed(1) : "0.0");
  const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");

  // ---------- standings & team numbers ----------
  function standings() {
    const rows = teamNames.map((team) => {
      const gs = games.filter((g) => g.played && (g.home === team || g.away === team));
      const res = gs.map((g) => (won(g, team) ? "W" : "L"));
      const lines = gs.map((g) => teamLine(g, team));
      const t = total(lines);
      let streak = "";
      if (res.length) { const last = res[res.length - 1]; let n = 0; for (let i = res.length - 1; i >= 0 && res[i] === last; i--) n++; streak = last + n; }
      const w = res.filter((x) => x === "W").length;
      return { team, gp: gs.length, w, l: gs.length - w, pf: t.pts, pa: gs.reduce((a, g) => a + scoreOf(g, opp(g, team)), 0),
        ppg: t.pts / (gs.length || 1), rpg: t.reb / (gs.length || 1), apg: t.ast / (gs.length || 1),
        fg: t.fga ? t.fgm / t.fga : 0, tp: t.tpa ? t.tpm / t.tpa : 0, stl: t.stl / (gs.length || 1),
        blk: t.blk / (gs.length || 1), tov: t.tov / (gs.length || 1), last5: res.slice(-5), streak };
    });
    rows.forEach((r) => (r.oppg = r.pa / (r.gp || 1)));
    rows.sort((a, b) => b.w - a.w || a.l - b.l || (b.pf - b.pa) - (a.pf - a.pa));
    const top = rows[0];
    rows.forEach((r, i) => { r.rank = i + 1; r.gb = ((top.w - r.w) + (r.l - top.l)) / 2; });
    return rows;
  }
  const TABLE = standings();
  const rowOf = (team) => TABLE.find((r) => r.team === team);
  const rankIn = (team, key, low = false) => {
    const sorted = [...TABLE].sort((a, b) => (low ? a[key] - b[key] : b[key] - a[key]));
    return sorted.findIndex((r) => r.team === team) + 1;
  };
  const SIX = [["PPG", "ppg"], ["RPG", "rpg"], ["APG", "apg"], ["FG%", "fg"], ["3PT%", "tp"], ["OPPG", "oppg", true]];
  const fmtSix = (key, v) => (key === "fg" || key === "tp" ? (v * 100).toFixed(1) : v.toFixed(1));

  // ---------- player season numbers ----------
  function playerSeason(p) {
    const lines = oursPlayed.map((g) => ({ g, l: boxScore(g).find((b) => b.no === p.no) })).filter((x) => x.l && x.l.min > 0);
    const t = total(lines.map((x) => x.l));
    t.min = lines.reduce((a, x) => a + x.l.min, 0);
    t.eff = lines.reduce((a, x) => a + eff(x.l), 0);
    return { p, gp: lines.length, t, log: lines };
  }
  const SEASONS = roster.map(playerSeason);

  // ---------- formatting ----------
  const dfmt = (iso, o) => new Date(iso).toLocaleString(undefined, o);
  const day = (iso) => dfmt(iso, { weekday: "short", month: "short", day: "numeric" });
  const time = (iso) => dfmt(iso, { hour: "numeric", minute: "2-digit" });
  const initials = (n) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const AVATAR = ["#1f3a5f", "#7a1f4d", "#1d6b52", "#5b2a86", "#6b5a12", "#1d5e6b", "#8a3b12", "#2e5b1d", "#4a2a6b", "#6b1d1d"];
  const avatar = (n, cls = "") => `<span class="avatar ${cls}" style="--c:${AVATAR[seedOf(n) % AVATAR.length]}">${esc(initials(n))}</span>`;
  const record = (team) => { const r = rowOf(team); return `${r.w}-${r.l} · ${ordinal(r.rank)}`; };
  const venue = (g) => (g.home === US ? S.team.home : g.venue || "");

  function countdown(iso) {
    const ms = new Date(iso) - new Date();
    if (ms <= 0) return "Tip-off";
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    if (d >= 1) return `In ${d}d ${h}h`;
    return h ? `In ${h}h ${m}m` : `In ${m}m`;
  }

  function gameCard(g) {
    const top = g.played
      ? `<span class="wl ${won(g, US) ? "W" : "L"}">${won(g, US) ? "W" : "L"}</span><b>${esc(day(g.date))}</b>`
      : `<b>${esc(day(g.date))}</b>`;
    const [hs, as] = g.played ? g.score : [];
    const mid = g.played
      ? `<b class="${hs < as ? "lose" : ""}">${hs}</b><span>FINAL</span><b class="${as < hs ? "lose" : ""}">${as}</b>`
      : `<span class="at">${esc(time(g.date))}</span>`;
    return `<a class="gc" href="#game/${g.id}">
      <div class="gc-top">${top}<span>${esc(venue(g) || S.league.name)}</span></div>
      <div class="vs">
        <div class="side">${logo(g.home, "md")}${esc(g.home)}<small>${esc(record(g.home))}</small></div>
        <div class="mid">${mid}</div>
        <div class="side">${logo(g.away, "md")}${esc(g.away)}<small>${esc(record(g.away))}</small></div>
      </div></a>`;
  }

  function teamHero() {
    const r = rowOf(US);
    return `<section class="hero">
      <span class="watermark" aria-hidden="true">${esc(S.team.logo)}</span>
      <div class="hero-top">
        <div><p>Standings: ${ordinal(r.rank)} in ${esc(S.league.name)} | ${r.w}-${r.l}</p>
        <h1>${esc(US)}</h1></div>
        ${logo(US, "lg")}
      </div>
      <dl>${SIX.map(([label, key, low]) => `<div><dt>${label}</dt><dd><b>${ordinal(rankIn(US, key, low))}</b><span class="num">${fmtSix(key, r[key])}</span></dd></div>`).join("")}</dl>
    </section>`;
  }

  // ---------- pages ----------
  const pages = {
    home() {
      const next = oursNext[0];
      const leaders = [["Points", "pts", "PPG"], ["Rebounds", "reb", "RPG"], ["Assists", "ast", "APG"], ["Efficiency", "eff", "EFF"]]
        .map(([label, key, unit]) => {
          const best = [...SEASONS].filter((s) => s.gp).sort((a, b) => b.t[key] / b.gp - a.t[key] / a.gp)[0];
          return best && `<li><a class="row" href="#player/${encodeURIComponent(best.p.no)}">${avatar(best.p.name)}
            <span class="row-main"><span class="label">${label}</span><b>${esc(best.p.name)}</b><span>#${esc(best.p.no)} · ${esc(best.p.pos)}</span></span>
            <span class="row-end"><b>${avg(best.t[key], best.gp)}</b><small>${unit}</small></span></a></li>`;
        }).join("");
      return `${teamHero()}
      <div class="cols">
        <div>
          ${next ? `<section><div class="head"><h2>Next game</h2><a href="#schedule">Full schedule ›</a></div>
            <a class="next" href="#game/${next.id}">
              <div class="next-top"><span class="label">${esc(day(next.date))} · ${esc(time(next.date))}</span><span class="pill" data-countdown="${esc(next.date)}">${esc(countdown(next.date))}</span></div>
              <div class="vs">
                <div class="side">${logo(next.home, "md")}${esc(next.home)}<small>${esc(record(next.home))}</small></div>
                <div class="mid"><b>VS</b><span>${esc(venue(next) || S.league.name)}</span></div>
                <div class="side">${logo(next.away, "md")}${esc(next.away)}<small>${esc(record(next.away))}</small></div>
              </div></a></section>` : ""}
          <section><div class="head"><h2>Latest results</h2><a href="#schedule/past">All results ›</a></div>
            ${oursPlayed.slice(-3).reverse().map(gameCard).join("") || `<p class="card empty">No games played yet.</p>`}</section>
        </div>
        <div>
          <section><div class="head"><h2>Team leaders</h2><a href="#stats">All stats ›</a></div>
            <div class="card"><ul class="rows">${leaders}</ul></div></section>
          <section><div class="head"><h2>Standings</h2><a href="#standings">Full table ›</a></div>
            <div class="card flush">${standingsTable(true)}</div></section>
          <section><div class="head"><h2>Club news</h2></div>
            <div class="card"><ul class="rows">${S.news.map((n) => `<li class="news-item"><span class="label">${esc(n.tag)} · ${esc(day(n.date))}</span><b>${esc(n.title)}</b><p>${esc(n.body)}</p></li>`).join("")}</ul></div></section>
        </div>
      </div>`;
    },

    schedule(tab) {
      const which = tab || (oursNext.length ? "upcoming" : "past");
      const list = which === "past" ? [...oursPlayed].reverse() : oursNext;
      return `<div class="page-title"><div><p>${esc(S.league.name)} · ${esc(S.league.season)}</p><h1>Schedule</h1></div></div>
        <div class="pills" role="tablist">
          <button role="tab" aria-selected="${which === "upcoming"}" data-go="#schedule/upcoming">Upcoming (${oursNext.length})</button>
          <button role="tab" aria-selected="${which === "past"}" data-go="#schedule/past">Results (${oursPlayed.length})</button>
        </div>
        <div class="grid-cards">${list.map(gameCard).join("") || `<p class="card empty">Nothing here yet.</p>`}</div>`;
    },

    roster() {
      return `<div class="page-title"><div><p>${esc(S.league.season)}</p><h1>Roster</h1></div></div>
        <section><div class="head"><h2>Players</h2><span>${roster.length}</span></div>
        <div class="card"><ul class="rows">${roster.map((p, i) => {
          const s = SEASONS[i];
          return `<li><a class="row" href="#player/${encodeURIComponent(p.no)}">${avatar(p.name)}
            <span class="row-main"><b>${esc(p.name)}</b><span>#${esc(p.no)} | ${esc(p.pos)}${p.ht ? ` | ${p.ht} cm` : ""}</span></span>
            ${p.captain ? `<span class="tag">CAPTAIN</span>` : ""}
            <span class="row-end"><b>${avg(s.t.pts, s.gp)}</b><small>PPG</small></span></a></li>`;
        }).join("")}</ul></div></section>
        <section><div class="head"><h2>Staff</h2></div>
          <div class="card"><ul class="rows"><li class="row">${avatar(S.team.coach)}<span class="row-main"><b>${esc(S.team.coach)}</b><span>Head coach</span></span></li></ul></div></section>`;
    },

    stats(mode) {
      const totals = mode === "totals";
      const sortKey = store.get("sort", "pts");
      const cols = [["MIN", "min"], ["PTS", "pts"], ["REB", "reb"], ["AST", "ast"], ["STL", "stl"], ["BLK", "blk"], ["TOV", "tov"],
        ["FG%", "fgp"], ["3P%", "tpp"], ["FT%", "ftp"], ["EFF", "eff"]];
      const val = (s, k) => {
        if (k === "fgp") return s.t.fga ? s.t.fgm / s.t.fga : 0;
        if (k === "tpp") return s.t.tpa ? s.t.tpm / s.t.tpa : 0;
        if (k === "ftp") return s.t.fta ? s.t.ftm / s.t.fta : 0;
        return totals ? s.t[k] : s.gp ? s.t[k] / s.gp : 0;
      };
      const show = (s, k) => ["fgp", "tpp", "ftp"].includes(k) ? (val(s, k) * 100).toFixed(1) : totals ? String(val(s, k)) : val(s, k).toFixed(1);
      const rows = [...SEASONS].sort((a, b) => val(b, sortKey) - val(a, sortKey));
      const tm = rowOf(US);
      return `<div class="page-title"><div><p>${esc(S.league.season)} · ${tm.gp} games</p><h1>Player stats</h1></div></div>
        <div class="pills" role="tablist">
          <button role="tab" aria-selected="${!totals}" data-go="#stats">Per game</button>
          <button role="tab" aria-selected="${totals}" data-go="#stats/totals">Totals</button>
        </div>
        <div class="card flush"><div class="scroll"><table>
          <thead><tr><th class="l sticky">Player</th><th>GP</th>${cols.map(([l, k]) => `<th class="${k === sortKey ? "on" : ""}"><button data-sort="${k}" aria-pressed="${k === sortKey}">${l}</button></th>`).join("")}</tr></thead>
          <tbody>${rows.map((s) => `<tr class="link" data-go="#player/${encodeURIComponent(s.p.no)}"><td class="l sticky">${esc(s.p.name)}</td><td>${s.gp}</td>${cols.map(([, k]) => `<td class="${k === sortKey ? "on" : ""}">${show(s, k)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div></div>
        <p class="note">Tap a column to sort. Tap a player for their game log.</p>
        <section><div class="head"><h2>Team numbers</h2><span>Rank in league</span></div>
          <div class="card"><div class="tiles">${SIX.map(([l, k, low]) => `<div class="tile"><b>${fmtSix(k, tm[k])}</b><span>${l} · ${ordinal(rankIn(US, k, low))}</span></div>`).join("")}</div></div></section>`;
    },

    standings() {
      return `<div class="page-title"><div><p>${esc(S.league.city)} · ${esc(S.league.season)}</p><h1>${esc(S.league.name)}</h1></div></div>
        <div class="card flush">${standingsTable(false)}</div>
        <p class="note">GB = games behind first place. STK = current streak.</p>`;
    },

    game(id) {
      const g = byId[id];
      if (!g) return pages.home();
      const head = `<div class="page-title"><button class="back" data-back aria-label="Back">‹</button><div><p>${esc(S.league.name)}</p><h1>Game</h1></div></div>
        <div class="card"><div class="gc-top">${g.played ? `<span class="wl ${won(g, US) ? "W" : "L"}">${won(g, US) ? "W" : "L"}</span>` : ""}<b>${esc(day(g.date))}</b><span>${esc(g.played ? S.league.name : time(g.date))}</span></div>
          <div class="vs" style="padding:10px 0 4px">
            <div class="side">${logo(g.home, "md")}${esc(g.home)}<small class="soft">${esc(record(g.home))}</small></div>
            <div class="mid gcmid">${g.played ? `<b class="num" style="font-size:2rem">${g.score[0]}</b><span class="small" style="font-weight:700">FINAL</span><b class="num ${g.score[1] < g.score[0] ? "soft" : ""}" style="font-size:2rem">${g.score[1]}</b>` : `<b class="num">VS</b>`}</div>
            <div class="side">${logo(g.away, "md")}${esc(g.away)}<small class="soft">${esc(record(g.away))}</small></div>
          </div>${venue(g) ? `<p class="note">${esc(venue(g))}</p>` : ""}</div>`;
      return head + (g.played ? gamePlayed(g) : gamePreview(g));
    },

    player(no) {
      const i = roster.findIndex((p) => p.no === no);
      if (i < 0) return pages.roster();
      const s = SEASONS[i], p = s.p, t = s.t;
      const tiles = [["PTS", avg(t.pts, s.gp)], ["REB", avg(t.reb, s.gp)], ["AST", avg(t.ast, s.gp)], ["STL", avg(t.stl, s.gp)],
        ["BLK", avg(t.blk, s.gp)], ["MIN", avg(t.min, s.gp)], ["FG%", pct(t.fgm, t.fga)], ["3P%", pct(t.tpm, t.tpa)], ["FT%", pct(t.ftm, t.fta)]];
      return `<div class="hero"><button class="back" data-back aria-label="Back">‹</button>
          <div class="phero">${avatar(p.name, "lg")}<div><p>#${esc(p.no)} · ${esc(p.pos)}${p.ht ? ` · ${p.ht} cm` : ""}${p.captain ? " · Captain" : ""}</p><h1>${esc(p.name)}</h1><p>${esc(US)}</p></div></div></div>
        <section><div class="head"><h2>Season averages</h2><span>${s.gp} games</span></div>
          <div class="card"><div class="tiles">${tiles.map(([l, v]) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`).join("")}</div></div></section>
        <section><div class="head"><h2>Game log</h2></div>
          <div class="card flush"><div class="scroll"><table>
            <thead><tr><th class="l sticky">Game</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG</th><th>3P</th><th>FT</th></tr></thead>
            <tbody>${[...s.log].reverse().map(({ g, l }) => `<tr class="link" data-go="#game/${g.id}"><td class="l sticky"><span class="team-cell"><span class="wl ${won(g, US) ? "W" : "L"}">${won(g, US) ? "W" : "L"}</span>${g.home === US ? "vs" : "@"} ${esc(opp(g))}</span></td>
              <td>${l.min}</td><td class="on">${l.pts}</td><td>${l.reb}</td><td>${l.ast}</td><td>${l.stl}</td><td>${l.blk}</td><td>${l.fgm}-${l.fga}</td><td>${l.tpm}-${l.tpa}</td><td>${l.ftm}-${l.fta}</td></tr>`).join("") || `<tr><td colspan="10" class="empty">No games yet.</td></tr>`}</tbody>
          </table></div></div></section>`;
    }
  };

  function standingsTable(compact) {
    return `<div class="scroll"><table>
      <thead><tr><th>#</th><th class="l">Team</th><th>W</th><th>L</th>${compact ? "" : "<th>PCT</th><th>GB</th><th>PF</th><th>PA</th>"}<th>STK</th></tr></thead>
      <tbody>${TABLE.map((r) => `<tr class="${r.team === US ? "us" : ""}"><td>${r.rank}</td>
        <td class="l"><span class="team-cell">${logo(r.team)}${esc(r.team)}</span></td><td>${r.w}</td><td>${r.l}</td>
        ${compact ? "" : `<td>${r.gp ? (r.w / r.gp).toFixed(3).replace(/^0/, "") : ".000"}</td><td>${r.gb ? r.gb : "–"}</td><td>${r.pf}</td><td>${r.pa}</td>`}
        <td>${r.streak || "–"}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function gamePlayed(g) {
    const tab = store.get("gameTab", "summary");
    const box = boxScore(g).filter((l) => l.min > 0);
    const q = quarters(g);
    const [hl, al] = [teamLine(g, g.home), teamLine(g, g.away)];
    const potg = [...box].sort((a, b) => eff(b) - eff(a))[0];
    const top = (k) => [...box].sort((a, b) => b[k] - a[k])[0];
    const bar = (label, hv, av, disp = (v) => v, low = false) => {
      const hw = low ? hv < av : hv > av, aw = low ? av < hv : av > hv;
      const tot = (hv + av) || 1;
      return `<div class="bar-row"><div class="bar-nums"><b class="${aw ? "lose" : ""}">${disp(hv)}</b><span>${label}</span><b class="${hw ? "lose" : ""}">${disp(av)}</b></div>
        <div class="bar" style="--l:${(hv / tot) * 100}fr;--r:${(av / tot) * 100}fr"><i class="${hw ? "win" : ""}" style="--c:${TEAMS[g.home].color}"></i><i class="${aw ? "win" : ""}" style="--c:${TEAMS[g.away].color}"></i></div></div>`;
    };
    const summary = `
      <section><div class="head"><h2>Score by quarter</h2></div><div class="card flush"><div class="scroll"><table>
        <thead><tr><th class="l">Team</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>T</th></tr></thead>
        <tbody>${[g.home, g.away].map((t, i) => `<tr><td class="l"><span class="team-cell">${logo(t)}${esc(t)}</span></td>${q[i].map((v) => `<td>${v}</td>`).join("")}<td><b>${g.score[i]}</b></td></tr>`).join("")}</tbody>
      </table></div></div></section>
      <section><div class="card potg"><div class="row" style="padding:0">${avatar(potg.name)}<span class="row-main"><span class="label">Cubao player of the game</span><b>${esc(potg.name)}</b><span>#${esc(potg.no)}</span></span>
        <span class="row-end"><b>${eff(potg)}</b><small>EFF</small></span></div>
        <div class="potg-line">${[["PTS", potg.pts], ["REB", potg.reb], ["AST", potg.ast], ["STL", potg.stl], ["BLK", potg.blk], ["FG", `${potg.fgm}-${potg.fga}`]].map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join("")}</div></div></section>
      <section><div class="head"><h2>Top performers</h2><span>Cubao</span></div><div class="card"><ul class="rows">
        ${[["Points", "pts"], ["Rebounds", "reb"], ["Assists", "ast"]].map(([l, k]) => { const p = top(k); return `<li class="row">${avatar(p.name)}<span class="row-main"><span class="label">${l}</span><b>${esc(p.name)}</b></span><span class="row-end"><b>${p[k]}</b></span></li>`; }).join("")}
      </ul></div></section>
      <section><div class="head"><h2>Team stats</h2><span>This game</span></div><div class="card bars">
        ${bar("FG%", hl.fgm / hl.fga * 100, al.fgm / al.fga * 100, (v) => v.toFixed(1))}
        ${bar("3PT%", hl.tpa ? hl.tpm / hl.tpa * 100 : 0, al.tpa ? al.tpm / al.tpa * 100 : 0, (v) => v.toFixed(1))}
        ${bar("FT%", hl.fta ? hl.ftm / hl.fta * 100 : 0, al.fta ? al.ftm / al.fta * 100 : 0, (v) => v.toFixed(1))}
        ${bar("REB", hl.reb, al.reb)}${bar("AST", hl.ast, al.ast)}${bar("STL", hl.stl, al.stl)}${bar("BLK", hl.blk, al.blk)}
        ${bar("TOV", hl.tov, al.tov, undefined, true)}${bar("FOULS", hl.pf, al.pf, undefined, true)}
      </div></section>`;
    const t = total(box);
    const boxTab = `<section><div class="head"><h2>${esc(US)}</h2><span>${g.home === US ? "Home" : "Away"}</span></div>
      <div class="card flush"><div class="scroll"><table>
        <thead><tr><th class="l sticky">Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>FG</th><th>3P</th><th>FT</th><th>EFF</th></tr></thead>
        <tbody>${box.sort((a, b) => b.min - a.min).map((l) => `<tr class="link" data-go="#player/${encodeURIComponent(l.no)}"><td class="l sticky"><span class="soft small">${esc(l.no)}</span> ${esc(l.name)}</td><td>${l.min}</td><td class="on">${l.pts}</td><td>${l.reb}</td><td>${l.ast}</td><td>${l.stl}</td><td>${l.blk}</td><td>${l.tov}</td><td>${l.pf}</td><td>${l.fgm}-${l.fga}</td><td>${l.tpm}-${l.tpa}</td><td>${l.ftm}-${l.fta}</td><td>${eff(l)}</td></tr>`).join("")}</tbody>
        <tfoot><tr><td class="l sticky">Team</td><td>200</td><td>${t.pts}</td><td>${t.reb}</td><td>${t.ast}</td><td>${t.stl}</td><td>${t.blk}</td><td>${t.tov}</td><td>${t.pf}</td><td>${t.fgm}-${t.fga}</td><td>${t.tpm}-${t.tpa}</td><td>${t.ftm}-${t.fta}</td><td></td></tr></tfoot>
      </table></div></div></section>
      <p class="note">Only Cubao's box score is kept. ${esc(opp(g))} totals are in Summary.</p>`;
    return `<div class="pills" role="tablist">
        <button role="tab" aria-selected="${tab === "summary"}" data-tab="summary">Summary</button>
        <button role="tab" aria-selected="${tab === "box"}" data-tab="box">Box score</button>
      </div>${tab === "box" ? boxTab : summary}`;
  }

  function gamePreview(g) {
    const [a, b] = [rowOf(g.home), rowOf(g.away)];
    const rows = [...SIX, ["STL", "stl"], ["BLK", "blk"], ["TOV", "tov", true]];
    const h2h = games.filter((x) => x.played && [x.home, x.away].includes(g.home) && [x.home, x.away].includes(g.away));
    const form = (r) => r.last5.map((x) => `<span class="wl ${x}">${x}</span>`).join("") || `<span class="soft small">No games yet</span>`;
    return `<section><div class="head"><h2>Tale of the tape</h2><span>Season · league rank</span></div>
        <div class="card tape">
          <div>${logo(g.home)}</div><span></span><div>${logo(g.away)}</div>
          ${rows.map(([l, k, low]) => { const hv = a[k], av = b[k]; const better = low ? hv < av : hv > av, worse = low ? hv > av : hv < av;
            return `<b class="${worse ? "lose" : ""}">${fmtSix(k, hv)}<small>${ordinal(rankIn(g.home, k, low))}</small></b><span>${l}</span><b class="${better ? "lose" : ""}">${fmtSix(k, av)}<small>${ordinal(rankIn(g.away, k, low))}</small></b>`; }).join("")}
        </div></section>
      <section><div class="head"><h2>Recent form</h2><span>Last 5</span></div>
        <div class="card"><ul class="rows">${[a, b].map((r) => `<li class="row">${logo(r.team)}<span class="row-main"><b>${esc(r.team)}</b><span>${r.w}-${r.l} · ${ordinal(r.rank)}</span></span><span style="display:flex;gap:4px">${form(r)}</span></li>`).join("")}</ul></div></section>
      <section><div class="head"><h2>Head to head</h2><span>This season</span></div>
        ${h2h.map(gameCard).join("") || `<p class="card empty">First meeting this season.</p>`}</section>`;
  }

  // ---------- routing ----------
  function route() {
    const [page, arg] = decodeURIComponent((location.hash || "#home").slice(1)).split("/");
    const render = pages[page] || pages.home;
    app.innerHTML = render(arg);
    const navKey = page === "game" ? "schedule" : page === "player" ? "roster" : (pages[page] ? page : "home");
    document.querySelectorAll(".nav a").forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + navKey ? "page" : "false"));
    document.title = page && page !== "home" && pages[page] ? `${page[0].toUpperCase() + page.slice(1)} · ${US}` : US;
  }
  let lastHash = location.hash;
  window.addEventListener("hashchange", () => {
    const samePage = lastHash.split("/")[0] === location.hash.split("/")[0];
    lastHash = location.hash;
    route();
    if (!samePage) window.scrollTo(0, 0);
  });

  app.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) { location.hash = go.dataset.go; return; }
    const sort = e.target.closest("[data-sort]");
    if (sort) { store.set("sort", sort.dataset.sort); route(); return; }
    const tab = e.target.closest("[data-tab]");
    if (tab) { store.set("gameTab", tab.dataset.tab); route(); return; }
    if (e.target.closest("[data-back]")) { history.length > 1 ? history.back() : (location.hash = "#home"); }
  });

  setInterval(() => document.querySelectorAll("[data-countdown]").forEach((el) => (el.textContent = countdown(el.dataset.countdown))), 30000);

  // ---------- chrome ----------
  document.getElementById("brand-logo").outerHTML = logo(US, "sm").replace('class="logo sm"', 'class="logo" id="brand-logo"');
  document.getElementById("brand-name").textContent = US;
  document.getElementById("footer").innerHTML = `<span>${esc(US)} · ${esc(S.team.home)} · Since ${esc(S.team.founded)}</span>
    <span><a href="mailto:${esc(S.team.email)}">${esc(S.team.email)}</a></span>`;

  const saved = store.get("theme", null);
  if (saved) document.documentElement.dataset.theme = saved;
  document.querySelector(".theme").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    store.set("theme", dark ? "light" : "dark");
  });

  route();
})();
