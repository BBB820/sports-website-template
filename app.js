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
    // Made shots that add up to the score: about 8 threes and 13 free throws a game.
    let tpm = between(r, 5, 11), ftm = between(r, 8, 18);
    while (pts - 3 * tpm - ftm < 0) tpm > 0 ? tpm-- : ftm--;
    if ((pts - 3 * tpm - ftm) % 2) ftm += ftm > 0 ? -1 : 1;
    const fgm = (pts - 3 * tpm - ftm) / 2 + tpm;
    const tpa = tpm + between(r, 12, 20);
    return { pts, fgm, fga: fgm + between(r, 34, 46), tpm, tpa, ftm, fta: ftm + between(r, 3, 8),
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
  const mon = (iso) => dfmt(iso, { month: "short", day: "numeric" });
  const wkday = (iso) => dfmt(iso, { weekday: "short" });
  const time = (iso) => dfmt(iso, { hour: "numeric", minute: "2-digit" });
  const short = (team) => (team === US ? S.team.short : TEAMS[team]?.short) || team.slice(0, 3).toUpperCase();
  const record = (team) => { const r = rowOf(team); return `${r.w}-${r.l}`; };
  const venue = (g) => (g.home === US ? S.team.home : g.venue || "");
  const nameParts = (n) => { const w = n.trim().split(/\s+/); return w.length > 2 && /^(de|dela|del|van|von|da|di|la)$/i.test(w[w.length - 2]) ? [w.slice(0, -2).join(" "), w.slice(-2).join(" ")] : [w.slice(0, -1).join(" "), w[w.length - 1]]; };
  const res = (g) => (won(g, US) ? "W" : "L");
  const player = (no) => roster.find((p) => p.no === no);

  function countdown(iso) {
    const ms = new Date(iso) - new Date();
    if (ms <= 0) return "Tip-off";
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    return d >= 1 ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
  }

  const sh = (title, link, label) => `<div class="sh"><h2>${title}</h2>${link ? `<a href="${link}">${label} →</a>` : label ? `<span>${label}</span>` : ""}</div>`;
  const head = (eyebrow, title) => `<section class="phead"><span class="label">${esc(eyebrow)}</span><h1>${esc(title)}</h1></section>`;

  // ---------- shared pieces ----------
  function gameCard(g) {
    const stamp = g.played ? `<span class="stamp ${res(g)}">${res(g) === "W" ? "Win" : "Loss"}</span>` : `<span class="count" data-countdown="${esc(g.date)}">${esc(countdown(g.date))}</span>`;
    const line = (t, i) => {
      const lose = g.played && g.score[i] < g.score[1 - i];
      return `<div class="tline${lose ? " lose" : ""}">${logo(t, "md")}<span class="nm">${esc(t)}<small>${esc(record(t))}${i ? "" : " · Home"}</small></span>${g.played ? `<span class="pts num">${g.score[i]}</span>` : ""}</div>`;
    };
    const foot = g.played ? `<span>Final</span><em>Box score →</em>` : `<span>${esc(time(g.date))}${venue(g) ? ` · ${esc(venue(g))}` : ""}</span><em>Preview →</em>`;
    return `<a class="card game" href="#game/${g.id}"><div class="game-top"><span class="label">${esc(day(g.date))}</span>${stamp}</div>
      <div class="teams">${line(g.home, 0)}${line(g.away, 1)}</div><div class="game-foot">${foot}</div></a>`;
  }

  function leaders() {
    return `<div class="card leaders">${[["Points", "pts"], ["Rebounds", "reb"], ["Assists", "ast"], ["Efficiency", "eff"]].map(([label, key]) => {
      const best = [...SEASONS].filter((s) => s.gp).sort((a, b) => b.t[key] / b.gp - a.t[key] / a.gp)[0];
      if (!best) return "";
      return `<a class="leader" href="#player/${encodeURIComponent(best.p.no)}"><span class="label">${label}</span><span class="big">${avg(best.t[key], best.gp)}</span><b>${esc(best.p.name)}</b><span class="soft" style="font-size:.8rem">#${esc(best.p.no)} · ${esc(best.p.pos)}</span></a>`;
    }).join("")}</div>`;
  }

  function standingsTable(compact) {
    return `<div class="card scroll"><table>
      <thead><tr><th>#</th><th class="l">Team</th><th>W</th><th>L</th>${compact ? "" : "<th>PCT</th><th>GB</th><th>PPG</th><th>OPPG</th><th>L5</th>"}<th>Strk</th></tr></thead>
      <tbody>${TABLE.map((r) => `<tr class="${r.team === US ? "us" : ""}"><td>${r.rank}</td>
        <td class="l"><span class="tc">${logo(r.team)}<b>${compact ? `<span class="wide">${esc(r.team)}</span><span class="narrow">${esc(short(r.team))}</span>` : esc(r.team)}</b></span></td><td>${r.w}</td><td>${r.l}</td>
        ${compact ? "" : `<td>${r.gp ? (r.w / r.gp).toFixed(3).replace(/^0/, "") : ".000"}</td><td>${r.gb ? r.gb : "–"}</td><td>${r.ppg.toFixed(1)}</td><td>${r.oppg.toFixed(1)}</td><td>${r.last5.filter((x) => x === "W").length}-${r.last5.filter((x) => x === "L").length}</td>`}
        <td>${r.streak || "–"}</td></tr>`).join("")}</tbody></table></div>`;
  }

  const recapGame = (n) => n.game && ours.find((x) => x.date.startsWith(n.game) && x.played);
  function newsList(items) {
    return `<div class="card news">${items.map((n) => {
      const g = recapGame(n);
      const tag = `<div class="row"><span class="chip">${esc(n.tag)}</span><span class="label">${esc(day(n.date))}</span>${g ? `<span class="label">· ${esc(short(g.home))} ${g.score[0]}–${g.score[1]} ${esc(short(g.away))}</span>` : ""}</div>`;
      const inner = `${tag}<h3>${esc(n.title)}</h3><p>${esc(n.body)}</p>`;
      return g ? `<a class="item" href="#game/${g.id}">${inner}</a>` : `<div class="item">${inner}</div>`;
    }).join("")}</div>`;
  }

  // ---------- pages ----------
  const pages = {
    home() {
      const r = rowOf(US);
      const next = oursNext[0];
      const last = oursPlayed[oursPlayed.length - 1];
      const [first, ...rest] = US.split(" ");
      return `<section class="top band">
          <div><span class="label">${esc(S.league.name)} · ${esc(S.league.season)}</span>
            <h1>${esc(first)} <span>${esc(rest.join(" "))}</span></h1>
            <p class="meta"><b>${r.w}-${r.l}</b> · ${ordinal(r.rank)} in the league${r.streak ? ` · ${r.streak[0] === "W" ? "Won" : "Lost"} ${r.streak.slice(1)} straight` : ""}</p></div>
          ${logo(US, "xl")}
        </section>
        <section class="scoreboard band">${SIX.map(([label, key, low]) => `<div><span class="label">${label}</span><b class="num">${fmtSix(key, r[key])}</b><i>${ordinal(rankIn(US, key, low))}<span class="wide"> in league</span></i></div>`).join("")}</section>
        <div class="two">
          <div>
            ${next ? `<section>${sh("Next up", "#schedule", "Schedule")}${gameCard(next)}</section>` : ""}
            ${last ? `<section>${sh("Last game", "#schedule/results", "Results")}${gameCard(last)}</section>` : ""}
          </div>
          <div>
            <section>${sh("Team leaders", "#stats", "Stats")}${leaders()}</section>
            <section>${sh("Standings", "#standings", "Full table")}${standingsTable(true)}</section>
          </div>
        </div>
        <section>${sh("News", "#news", "All news")}${newsList(S.news.slice(0, 2))}</section>`;
    },

    schedule(tab) {
      const which = tab === "results" ? "results" : tab === "upcoming" || oursNext.length ? "upcoming" : "results";
      const list = which === "results" ? [...oursPlayed].reverse() : oursNext;
      let lastMonth = "";
      const rows = list.map((g) => {
        const m = dfmt(g.date, { month: "long" });
        const monthRow = m !== lastMonth ? `<div class="month">${esc(m)}</div>` : "";
        lastMonth = m;
        const home = g.home === US;
        const right = g.played ? `<span class="sres"><span class="wl ${res(g)}">${res(g)}</span>${scoreOf(g, US)}–${scoreOf(g, opp(g))}</span>` : `<span class="sres">${esc(time(g.date))}</span>`;
        return `${monthRow}<a class="srow" href="#game/${g.id}">
          <span class="sdate"><b>${esc(mon(g.date))}</b><span>${esc(wkday(g.date))}</span></span>
          <span class="sopp"><span class="ha">${home ? "vs" : "@"}</span>${logo(opp(g), "md")}<span class="nm">${esc(opp(g))}<small>${esc(record(opp(g)))} · ${esc(home ? S.team.home : "Away")}</small></span></span>
          ${right}</a>`;
      }).join("");
      return head(`${S.league.name} · ${S.league.season}`, "Schedule") + `<div class="stack">
        <div class="seg" role="tablist">
          <button role="tab" aria-selected="${which === "upcoming"}" data-go="#schedule/upcoming">Upcoming</button>
          <button role="tab" aria-selected="${which === "results"}" data-go="#schedule/results">Results</button>
        </div>
        <div class="card list">${rows || `<p class="empty">Nothing here yet.</p>`}</div></div>`;
    },

    roster() {
      return head(`${S.league.season} · ${roster.length} players`, "Roster") + `<section class="cards">${roster.map((p, i) => {
          const s = SEASONS[i];
          const [first, last] = nameParts(p.name);
          return `<a class="card pcard" href="#player/${encodeURIComponent(p.no)}">
            ${p.captain ? `<span class="chip cap">Captain</span>` : ""}
            <span class="jersey">${esc(p.no)}</span>
            <span class="nm"><small>${esc(first)}</small>${esc(last)}</span>
            <span class="label">${esc(p.pos)}${p.ht ? ` · ${p.ht} cm` : ""}</span>
            <div class="mini"><div><b class="num">${avg(s.t.pts, s.gp)}</b><span class="label">PPG</span></div><div><b class="num">${avg(s.t.reb, s.gp)}</b><span class="label">RPG</span></div><div><b class="num">${avg(s.t.ast, s.gp)}</b><span class="label">APG</span></div></div>
          </a>`;
        }).join("")}</section>
        <section>${sh("Coach")}<div class="card news"><div class="item"><span class="label">Head coach</span><h3>${esc(S.team.coach)}</h3></div></div></section>`;
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
      return head(`${S.league.season} · ${rowOf(US).gp} games`, "Stats") + `<div class="stack">
        <div class="seg" role="tablist">
          <button role="tab" aria-selected="${!totals}" data-go="#stats">Per game</button>
          <button role="tab" aria-selected="${totals}" data-go="#stats/totals">Totals</button>
        </div>
        <div class="card scroll"><table>
          <thead><tr><th class="l sticky">Player</th><th>GP</th>${cols.map(([l, k]) => `<th class="${k === sortKey ? "on" : ""}"><button data-sort="${k}" aria-pressed="${k === sortKey}">${l}</button></th>`).join("")}</tr></thead>
          <tbody>${rows.map((s) => `<tr class="link" data-go="#player/${encodeURIComponent(s.p.no)}"><td class="l sticky">${esc(s.p.name)}</td><td>${s.gp}</td>${cols.map(([, k]) => `<td class="${k === sortKey ? "on" : ""}">${show(s, k)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>
        <p class="note">Tap a column to sort. Tap a player for their game log.</p></div>`;
    },

    standings() {
      return head(`${S.league.city} · ${S.league.season}`, S.league.name) + `<div class="stack">${standingsTable(false)}
        <p class="note">GB: games behind first. L5: last five games. Strk: current streak.</p></div>`;
    },

    news() {
      return head(US, "News") + newsList(S.news);
    },

    game(id) {
      const g = byId[id];
      if (!g) return pages.home();
      const lose = (i) => g.played && g.score[i] < g.score[1 - i];
      const side = (t) => `<div class="bteam">${logo(t, "lg")}<b>${esc(t)}</b><small>${esc(record(t))}</small></div>`;
      const score = g.played
        ? `<div class="bscore"><div class="row"><span class="num${lose(0) ? " lose" : ""}">${g.score[0]}</span><span class="label">–</span><span class="num${lose(1) ? " lose" : ""}">${g.score[1]}</span></div><span class="stamp ${res(g)}">Final</span></div>`
        : `<div class="bscore"><span class="vs big">vs</span><span class="count" data-countdown="${esc(g.date)}">${esc(countdown(g.date))}</span></div>`;
      const q = g.played ? quarters(g) : null;
      const linescore = q ? `<div class="linescore scroll"><table>
          <thead><tr><th class="l">Team</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>T</th></tr></thead>
          <tbody>${[g.home, g.away].map((t, i) => `<tr><td class="l"><span class="tc">${logo(t)}<b>${esc(short(t))}</b></span></td>${q[i].map((v) => `<td>${v}</td>`).join("")}<td><b>${g.score[i]}</b></td></tr>`).join("")}</tbody></table></div>` : "";
      return `<button class="back" data-back aria-label="Back">←</button>
        <section class="phead"><span class="label">${esc(day(g.date))} · ${esc(time(g.date))}${venue(g) ? ` · ${esc(venue(g))}` : ""}</span></section>
        <section class="card"><div class="board" style="--h:${esc(TEAMS[g.home].color)};--a:${esc(TEAMS[g.away].color)}">${side(g.home)}${score}${side(g.away)}</div>${linescore}</section>
        ${g.played ? gamePlayed(g) : gamePreview(g)}`;
    },

    player(no) {
      const i = roster.findIndex((p) => p.no === no);
      if (i < 0) return pages.roster();
      const s = SEASONS[i], p = s.p, t = s.t;
      const [first, last] = nameParts(p.name);
      const six = [["PPG", avg(t.pts, s.gp)], ["RPG", avg(t.reb, s.gp)], ["APG", avg(t.ast, s.gp)], ["FG%", pct(t.fgm, t.fga)], ["3P%", pct(t.tpm, t.tpa)], ["MIN", avg(t.min, s.gp)]];
      return `<section class="player-top band"><button class="back" data-back aria-label="Back">←</button><span class="jersey" aria-hidden="true">${esc(p.no)}</span>
          <div><span class="label">${esc(p.pos)}${p.ht ? ` · ${p.ht} cm` : ""}${p.captain ? " · Captain" : ""} · ${s.gp} games</span>
            <h1><small>${esc(first)}</small>${esc(last)}</h1></div></section>
        <section class="scoreboard band">${six.map(([l, v]) => `<div><span class="label">${l}</span><b class="num">${v}</b></div>`).join("")}</section>
        <section>${sh("Game log", null, S.league.season)}
          <div class="card scroll"><table>
            <thead><tr><th class="l sticky">Game</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG</th><th>3P</th><th>FT</th></tr></thead>
            <tbody>${[...s.log].reverse().map(({ g, l }) => `<tr class="link" data-go="#game/${g.id}"><td class="l sticky"><span class="wl ${res(g)}">${res(g)}</span>${esc(mon(g.date))} ${g.home === US ? "vs" : "@"} ${esc(short(opp(g)))}</td>
              <td>${l.min}</td><td class="on">${l.pts}</td><td>${l.reb}</td><td>${l.ast}</td><td>${l.stl}</td><td>${l.blk}</td><td>${l.tov}</td><td>${l.fgm}-${l.fga}</td><td>${l.tpm}-${l.tpa}</td><td>${l.ftm}-${l.fta}</td></tr>`).join("") || `<tr><td colspan="11" class="empty">No games yet.</td></tr>`}</tbody>
          </table></div></section>`;
    }
  };

  function cmpRow(g, label, hv, av, disp = (v) => v, low = false, ranks) {
    const hw = low ? hv < av : hv > av, aw = low ? av < hv : av > hv;
    const tot = (hv + av) || 1;
    const [rh, ra] = ranks || ["", ""];
    return `<div class="cmp"><div class="cmp-nums"><span class="num${aw ? " lose" : ""}">${disp(hv)}${rh ? `<small>${rh}</small>` : ""}</span><span class="label">${label}</span><span class="num${hw ? " lose" : ""}">${ra ? `<small>${ra}</small>` : ""}${disp(av)}</span></div>
      <div class="cmp-bar" style="--l:${(hv / tot) * 100}fr;--r:${(av / tot) * 100}fr"><i class="${hw ? "win" : ""}" style="--c:${esc(TEAMS[g.home].color)}"></i><i class="${aw ? "win" : ""}" style="--c:${esc(TEAMS[g.away].color)}"></i></div></div>`;
  }
  const cmpHead = (g) => `<div class="cmp-head"><span class="tc">${logo(g.home)}<b>${esc(short(g.home))}</b></span><span class="tc"><b>${esc(short(g.away))}</b>${logo(g.away)}</span></div>`;

  function gamePlayed(g) {
    const tab = store.get("gameTab", "summary");
    const box = boxScore(g).filter((l) => l.min > 0);
    const [hl, al] = [teamLine(g, g.home), teamLine(g, g.away)];
    const seg = `<div class="seg" role="tablist">
        <button role="tab" aria-selected="${tab === "summary"}" data-tab="summary">Summary</button>
        <button role="tab" aria-selected="${tab === "box"}" data-tab="box">Box score</button></div>`;
    if (tab === "box") {
      const t = total(box);
      return `<div class="stack">${seg}
        <div class="card scroll"><table>
          <thead><tr><th class="l sticky">${esc(short(US))}</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>FG</th><th>3P</th><th>FT</th><th>EFF</th></tr></thead>
          <tbody>${[...box].sort((a, b) => b.min - a.min).map((l) => `<tr class="link" data-go="#player/${encodeURIComponent(l.no)}"><td class="l sticky"><span class="soft">${esc(l.no)}</span>&nbsp; ${esc(l.name)}</td><td>${l.min}</td><td class="on">${l.pts}</td><td>${l.reb}</td><td>${l.ast}</td><td>${l.stl}</td><td>${l.blk}</td><td>${l.tov}</td><td>${l.pf}</td><td>${l.fgm}-${l.fga}</td><td>${l.tpm}-${l.tpa}</td><td>${l.ftm}-${l.fta}</td><td>${eff(l)}</td></tr>`).join("")}</tbody>
          <tfoot><tr><td class="l sticky">Totals</td><td>200</td><td>${t.pts}</td><td>${t.reb}</td><td>${t.ast}</td><td>${t.stl}</td><td>${t.blk}</td><td>${t.tov}</td><td>${t.pf}</td><td>${t.fgm}-${t.fga}</td><td>${t.tpm}-${t.tpa}</td><td>${t.ftm}-${t.fta}</td><td></td></tr></tfoot>
        </table></div>
        <p class="note">Only Cubao's box score is kept. ${esc(opp(g))} team totals are under Summary.</p></div>`;
    }
    const potg = [...box].sort((a, b) => eff(b) - eff(a))[0];
    return `<div class="stack">${seg}
      <div class="two">
        <div><section>${sh("Player of the game")}
          <a class="card potg" href="#player/${encodeURIComponent(potg.no)}"><span class="jersey">${esc(potg.no)}</span>
            <span><b>${esc(potg.name)}</b><span class="label">${potg.pts} pts · ${potg.reb} reb · ${potg.ast} ast · ${potg.fgm}-${potg.fga} fg</span></span>
            <span class="big">${eff(potg)}<span class="label" style="display:block">Eff</span></span></a></section></div>
        <div><section>${sh("Team stats", null, "This game")}<div class="card">${cmpHead(g)}<div class="compare">
          ${cmpRow(g, "FG%", hl.fgm / hl.fga * 100, al.fgm / al.fga * 100, (v) => v.toFixed(1))}
          ${cmpRow(g, "3PT%", hl.tpa ? hl.tpm / hl.tpa * 100 : 0, al.tpa ? al.tpm / al.tpa * 100 : 0, (v) => v.toFixed(1))}
          ${cmpRow(g, "FT%", hl.fta ? hl.ftm / hl.fta * 100 : 0, al.fta ? al.ftm / al.fta * 100 : 0, (v) => v.toFixed(1))}
          ${cmpRow(g, "REB", hl.reb, al.reb)}${cmpRow(g, "AST", hl.ast, al.ast)}
          ${cmpRow(g, "TOV", hl.tov, al.tov, undefined, true)}
        </div></div></section></div>
      </div></div>`;
  }

  function gamePreview(g) {
    const [a, b] = [rowOf(g.home), rowOf(g.away)];
    const h2h = games.filter((x) => x.played && [x.home, x.away].includes(g.home) && [x.home, x.away].includes(g.away));
    const form = (r) => `<span class="form">${r.last5.map((x) => `<b class="${x}">${x}</b>`).join("") || `<span class="soft">No games yet</span>`}</span>`;
    return `<div class="two">
      <div><section>${sh("Tale of the tape", null, "Season · rank")}<div class="card">${cmpHead(g)}<div class="compare">
        ${SIX.map(([l, k, low]) => cmpRow(g, l, a[k], b[k], (v) => fmtSix(k, v), low, [ordinal(rankIn(g.home, k, low)), ordinal(rankIn(g.away, k, low))])).join("")}
      </div></div></section></div>
      <div>
        <section>${sh("Form", null, "Last 5")}<div class="card">${[a, b].map((r) => `<div class="frow"><span class="tc">${logo(r.team, "md")}<b>${esc(r.team)}</b></span>${form(r)}</div>`).join("")}</div></section>
        <section>${sh("Head to head", null, "This season")}<div class="games">${h2h.map(gameCard).join("") || `<p class="card empty">First meeting this season.</p>`}</div></section>
      </div></div>`;
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

  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) { location.hash = go.dataset.go; return; }
    const sort = e.target.closest("[data-sort]");
    if (sort) { store.set("sort", sort.dataset.sort); route(); return; }
    const tab = e.target.closest("[data-tab]");
    if (tab) { store.set("gameTab", tab.dataset.tab); route(); return; }
    if (e.target.closest("[data-back]")) { history.length > 1 ? history.back() : (location.hash = "#home"); }
  });

  setInterval(() => document.querySelectorAll("[data-countdown]").forEach((el) => (el.textContent = countdown(el.dataset.countdown))), 30000);

  // ---------- score strip: the league's last round played and the next one ----------
  function ticker() {
    const dates = [...new Set(games.map((g) => g.date.slice(0, 10)))];
    const lastPlayed = dates.filter((d) => games.some((g) => g.date.startsWith(d) && g.played)).pop();
    const nextDay = dates.find((d) => games.some((g) => g.date.startsWith(d) && !g.played));
    return [lastPlayed, nextDay].filter(Boolean).map((d) => games.filter((g) => g.date.startsWith(d)).map((g) => {
      const status = g.played ? "Final" : `${wkday(g.date)} ${time(g.date)}`;
      const line = (t, i) => {
        const lose = g.played && g.score[i] < g.score[1 - i];
        return `<span class="tk-row${lose ? " lose" : ""}">${logo(t)}${esc(short(t))}<b>${g.played ? g.score[i] : record(t)}</b></span>`;
      };
      return `<a class="tk${g.home === US || g.away === US ? " us" : ""}" href="#game/${g.id}"><span class="tk-status">${esc(status)}</span>${line(g.home, 0)}${line(g.away, 1)}</a>`;
    }).join("")).join("");
  }

  // ---------- masthead & footer ----------
  document.getElementById("ticker").innerHTML = ticker();
  document.getElementById("brand").innerHTML = `${logo(US)}<b>${esc(US)}</b>`;
  document.getElementById("footer").innerHTML = `<div class="in"><span>${esc(US)} · ${esc(S.team.home)} · Since ${esc(S.team.founded)}</span><a href="mailto:${esc(S.team.email)}">${esc(S.team.email)}</a></div>`;

  const saved = store.get("theme", null);
  if (saved) document.documentElement.dataset.theme = saved;
  document.querySelector(".theme").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    store.set("theme", dark ? "light" : "dark");
  });

  route();
})();
