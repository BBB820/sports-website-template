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
  const initials = (n) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const AVATAR = ["#1f3a5f", "#7a1f4d", "#1d6b52", "#5b2a86", "#6b5a12", "#1d5e6b", "#8a3b12", "#2e5b1d", "#4a2a6b", "#6b1d1d"];
  const avatar = (n) => `<span class="avatar" style="--c:${AVATAR[seedOf(n) % AVATAR.length]}">${esc(initials(n))}</span>`;
  const short = (team) => (team === US ? S.team.short : TEAMS[team]?.short) || team.slice(0, 3).toUpperCase();
  const record = (team) => { const r = rowOf(team); return `${r.w}-${r.l}`; };
  const venue = (g) => (g.home === US ? S.team.home : g.venue || "");
  const nameParts = (n) => { const w = n.trim().split(/\s+/); return w.length > 2 && /^(de|dela|del|van|von|da|di|la)$/i.test(w[w.length - 2]) ? [w.slice(0, -2).join(" "), w.slice(-2).join(" ")] : [w.slice(0, -1).join(" "), w[w.length - 1]]; };
  const res = (g) => (won(g, US) ? "W" : "L");

  function countdown(iso) {
    const ms = new Date(iso) - new Date();
    if (ms <= 0) return "Tip-off";
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    return d >= 1 ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
  }

  const sh = (title, link, label) => `<div class="sh"><h2>${title}</h2>${link ? `<a href="${link}">${label}</a>` : label ? `<span>${label}</span>` : ""}</div>`;
  const banner = (eyebrow, title, extra = "") => `<section class="banner"><div class="wrap"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1></div>${extra}</div></section>`;

  // ---------- score strip ----------
  function ticker() {
    // The last round played and the next one, like the NBA scoreboard bar.
    const dates = [...new Set(games.map((g) => g.date.slice(0, 10)))];
    const lastPlayed = dates.filter((d) => games.some((g) => g.date.startsWith(d) && g.played)).pop();
    const nextDay = dates.find((d) => games.some((g) => g.date.startsWith(d) && !g.played));
    const show = [lastPlayed, nextDay].filter(Boolean);
    return show.map((d) => `<span class="tk-day">${esc(mon(d + "T12:00"))}</span>` + games.filter((g) => g.date.startsWith(d)).map((g) => {
      const status = g.played ? "Final" : `${wkday(g.date)} ${time(g.date)}`;
      const line = (t, i) => {
        const lose = g.played && g.score[i] < g.score[1 - i];
        return `<span class="tk-row${lose ? " lose" : ""}">${logo(t)}${esc(short(t))}<b>${g.played ? g.score[i] : record(t)}</b></span>`;
      };
      return `<a class="tk${g.home === US || g.away === US ? " us" : ""}" href="#game/${g.id}"><span class="tk-status">${esc(status)}</span>${line(g.home, 0)}${line(g.away, 1)}</a>`;
    }).join("")).join("");
  }

  // ---------- shared pieces ----------
  function gameTile(g) {
    const top = g.played
      ? `<span>${esc(day(g.date))}</span><span class="res ${res(g)}">${res(g) === "W" ? "Win" : "Loss"}</span>`
      : `<span>${esc(day(g.date))}</span><span>${esc(time(g.date))}</span>`;
    const line = (t, i) => {
      const lose = g.played && g.score[i] < g.score[1 - i];
      return `<div class="gline${lose ? " lose" : ""}">${logo(t, "md")}<span class="name">${esc(t)}<small>${esc(record(t))} · ${i ? "Away" : "Home"}</small></span>${g.played ? `<span class="pts">${g.score[i]}</span>` : ""}</div>`;
    };
    const foot = g.played ? `<span>Final</span><em>Box score ›</em>` : `<span>${esc(venue(g) || S.league.name)}</span><em>Preview ›</em>`;
    return `<a class="gtile" style="--c:${esc(TEAMS[opp(g)].color)}" href="#game/${g.id}"><div class="gtile-top">${top}</div>${line(g.home, 0)}${line(g.away, 1)}<div class="gtile-foot">${foot}</div></a>`;
  }

  function art(n) {
    const g = n.game && ours.find((x) => x.date.startsWith(n.game));
    if (g && g.played) {
      return `<div class="art" style="--c:${esc(TEAMS[opp(g)].color)}"><div class="vsart">${logo(g.home, "md")}<span class="score">${g.score[0]}–${g.score[1]}</span>${logo(g.away, "md")}</div><span class="tagchip">${esc(n.tag)}</span></div>`;
    }
    return `<div class="art"><span class="big">${esc(S.team.logo)}</span><span class="tagchip">${esc(n.tag)}</span></div>`;
  }
  const storyLink = (n) => { const g = n.game && ours.find((x) => x.date.startsWith(n.game)); return g ? `#game/${g.id}` : "#news"; };
  const story = (n, feature) => `<a class="story${feature ? " feature" : ""}" href="${storyLink(n)}">${art(n)}<div class="story-body"><time>${esc(day(n.date))}</time><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></div></a>`;

  function leadersPanel() {
    return `<div class="panel leaders">${[["Points", "pts", "PPG"], ["Rebounds", "reb", "RPG"], ["Assists", "ast", "APG"], ["Efficiency", "eff", "EFF"]].map(([label, key, unit]) => {
      const best = [...SEASONS].filter((s) => s.gp).sort((a, b) => b.t[key] / b.gp - a.t[key] / a.gp)[0];
      if (!best) return "";
      return `<a class="leader" href="#player/${encodeURIComponent(best.p.no)}">${avatar(best.p.name)}
        <span><span class="cat">${label}</span><b class="nm">${esc(best.p.name)}</b><small>#${esc(best.p.no)} · ${esc(best.p.pos)}</small></span>
        <span class="val">${avg(best.t[key], best.gp)}<small>${unit}</small></span></a>`;
    }).join("")}</div>`;
  }

  function standingsTable(compact) {
    return `<div class="panel scroll"><table>
      <thead><tr><th>#</th><th class="l">Team</th><th>W</th><th>L</th>${compact ? "" : "<th>PCT</th><th>GB</th><th>PPG</th><th>OPPG</th><th>L5</th>"}<th>STRK</th></tr></thead>
      <tbody>${TABLE.map((r) => `<tr class="${r.team === US ? "us" : ""}"><td>${r.rank}</td>
        <td class="l"><span class="tc">${logo(r.team)}<span class="name">${esc(compact ? short(r.team) : r.team)}</span></span></td><td>${r.w}</td><td>${r.l}</td>
        ${compact ? "" : `<td>${r.gp ? (r.w / r.gp).toFixed(3).replace(/^0/, "") : ".000"}</td><td>${r.gb ? r.gb : "–"}</td><td>${r.ppg.toFixed(1)}</td><td>${r.oppg.toFixed(1)}</td><td>${r.last5.filter((x) => x === "W").length}-${r.last5.filter((x) => x === "L").length}</td>`}
        <td>${r.streak || "–"}</td></tr>`).join("")}</tbody></table></div>`;
  }

  // ---------- pages ----------
  const pages = {
    home() {
      const r = rowOf(US);
      const next = oursNext[0];
      const lead = S.news[0];
      const lastGame = oursPlayed[oursPlayed.length - 1];
      return `<section class="hero"><span class="watermark" aria-hidden="true">${esc(S.team.logo)}</span>
        <div class="wrap hero-in">
          <div>
            <p class="eyebrow">${esc(lead ? lead.tag : S.league.name)}</p>
            <h1 class="headline">${esc(lead ? lead.title : US)}</h1>
            <p class="lede">${esc(lead ? lead.body : S.team.tagline)}</p>
            <div class="actions">
              ${lastGame ? `<a class="btn" href="#game/${lastGame.id}">Box score</a>` : ""}
              <a class="btn ghost" href="#schedule">Schedule</a>
            </div>
          </div>
          ${next ? `<a class="nextcard" href="#game/${next.id}">
            <div class="when"><span>Next game</span><span class="count" data-countdown="${esc(next.date)}">${esc(countdown(next.date))}</span></div>
            <div class="matchup">
              <div class="side">${logo(next.home, "md")}<b>${esc(next.home)}</b><small>${esc(record(next.home))}</small></div>
              <span class="at">${next.home === US ? "VS" : "@"}</span>
              <div class="side">${logo(next.away, "md")}<b>${esc(next.away)}</b><small>${esc(record(next.away))}</small></div>
            </div>
            <div class="when"><span>${esc(day(next.date))} · ${esc(time(next.date))}</span><span>Preview ›</span></div>
          </a>` : ""}
        </div></section>
        <section class="teamstrip"><div class="wrap">
          <div class="record"><b>${r.w}-${r.l}</b><span>${ordinal(r.rank)} in ${esc(S.league.name)}${r.streak ? ` · ${r.streak}` : ""}</span></div>
          <div class="six">${SIX.map(([label, key, low]) => `<div><span>${label}</span><b>${fmtSix(key, r[key])}</b><i>${ordinal(rankIn(US, key, low))}</i></div>`).join("")}</div>
        </div></section>
        <section class="wrap">${sh("Upcoming games", "#schedule", "Full schedule")}
          <div class="tiles-row">${oursNext.slice(0, 4).map(gameTile).join("") || `<p class="empty">No games scheduled.</p>`}</div></section>
        <div class="wrap homegrid">
          <div>
            <section>${sh("Latest news", "#news", "All news")}<div class="newsgrid">${S.news.slice(0, 3).map((n, i) => story(n, i === 0)).join("")}</div></section>
            <section>${sh("Recent results", "#schedule/results", "All results")}
              <div class="tiles-row">${[...oursPlayed].reverse().slice(0, 3).map(gameTile).join("") || `<p class="empty">No games played yet.</p>`}</div></section>
          </div>
          <div>
            <section>${sh("Team leaders", "#stats", "Stats")}${leadersPanel()}</section>
            <section>${sh("Standings", "#standings", "Full table")}${standingsTable(true)}</section>
          </div>
        </div>`;
    },

    schedule(tab) {
      const which = tab === "results" ? "results" : tab === "upcoming" || oursNext.length ? "upcoming" : "results";
      const list = which === "results" ? [...oursPlayed].reverse() : oursNext;
      let lastMonth = "";
      const rows = list.map((g) => {
        const m = dfmt(g.date, { month: "long", year: "numeric" });
        const head = m !== lastMonth ? `<div class="month">${esc(m)}</div>` : "";
        lastMonth = m;
        const home = g.home === US;
        const right = g.played
          ? `<span class="sres"><span class="${res(g)}">${res(g)}</span> ${scoreOf(g, US)}-${scoreOf(g, opp(g))}<small>Box score ›</small></span>`
          : `<span class="sres">${esc(time(g.date))}<small>Preview ›</small></span>`;
        return `${head}<a class="srow" href="#game/${g.id}">
          <span class="sdate"><b>${esc(mon(g.date))}</b><span>${esc(wkday(g.date))}</span></span>
          <span class="sopp"><span class="ha">${home ? "VS" : "@"}</span>${logo(opp(g), "md")}<span class="opp">${esc(opp(g))}<small>${esc(record(opp(g)))} · ${esc(home ? S.team.home : "Away")}</small></span></span>
          ${right}</a>`;
      }).join("");
      return banner(`${S.league.name} · ${S.league.season}`, "Schedule") + `<div class="wrap">
        <div class="tabs" role="tablist">
          <button role="tab" aria-selected="${which === "upcoming"}" data-go="#schedule/upcoming">Upcoming</button>
          <button role="tab" aria-selected="${which === "results"}" data-go="#schedule/results">Results</button>
        </div>
        <div class="panel sched" style="margin-top:16px">${rows || `<p class="empty">Nothing here yet.</p>`}</div></div>`;
    },

    roster() {
      return banner(`${S.league.season} · ${roster.length} players`, "Roster") + `<div class="wrap" style="display:grid;gap:28px">
        <section>${sh("Players")}<div class="cards">${roster.map((p, i) => {
          const s = SEASONS[i];
          const [first, last] = nameParts(p.name);
          return `<a class="pcard" href="#player/${encodeURIComponent(p.no)}">
            <div class="pcard-top"><span class="jn">${esc(p.no)}</span>${p.captain ? `<span class="cap">CAPTAIN</span>` : ""}${avatar(p.name)}</div>
            <div class="pname"><small>${esc(first)}</small><b>${esc(last)}</b></div>
            <div class="pmeta">#${esc(p.no)} | ${esc(p.pos)}${p.ht ? ` | ${p.ht} cm` : ""}</div>
            <div class="pline"><div><b>${avg(s.t.pts, s.gp)}</b><span>PPG</span></div><div><b>${avg(s.t.reb, s.gp)}</b><span>RPG</span></div><div><b>${avg(s.t.ast, s.gp)}</b><span>APG</span></div></div>
          </a>`;
        }).join("")}</div></section>
        <section>${sh("Coaching staff")}<div class="panel leaders"><div class="leader">${avatar(S.team.coach)}<span><span class="cat">Head coach</span><b class="nm">${esc(S.team.coach)}</b></span><span></span></div></div></section>
      </div>`;
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
      return banner(`${S.league.season} · ${tm.gp} games`, "Stats") + `<div class="wrap" style="display:grid;gap:28px">
        <section>${sh("Team", null, "League rank")}
          <div class="tiles6">${SIX.map(([l, k, low]) => `<div><span>${l}</span><b>${fmtSix(k, tm[k])}</b><i>${ordinal(rankIn(US, k, low))}</i></div>`).join("")}</div></section>
        <section>${sh("Players")}
          <div class="tabs" role="tablist">
            <button role="tab" aria-selected="${!totals}" data-go="#stats">Per game</button>
            <button role="tab" aria-selected="${totals}" data-go="#stats/totals">Totals</button>
          </div>
          <div class="panel scroll" style="margin-top:14px"><table>
            <thead><tr><th class="l sticky">Player</th><th>GP</th>${cols.map(([l, k]) => `<th class="${k === sortKey ? "on" : ""}"><button data-sort="${k}" aria-pressed="${k === sortKey}">${l}</button></th>`).join("")}</tr></thead>
            <tbody>${rows.map((s) => `<tr class="link" data-go="#player/${encodeURIComponent(s.p.no)}"><td class="l sticky">${esc(s.p.name)}</td><td>${s.gp}</td>${cols.map(([, k]) => `<td class="${k === sortKey ? "on" : ""}">${show(s, k)}</td>`).join("")}</tr>`).join("")}</tbody>
          </table></div>
          <p class="note">Tap a column to sort. Tap a player for their game log.</p></section>
      </div>`;
    },

    standings() {
      return banner(`${S.league.city} · ${S.league.season}`, S.league.name) + `<div class="wrap">
        ${standingsTable(false)}
        <p class="note">GB: games behind first. L5: last five games. STRK: current streak.</p></div>`;
    },

    news() {
      return banner(US, "News") + `<div class="wrap"><div class="newsgrid">${S.news.map((n, i) => story(n, i === 0)).join("")}</div></div>`;
    },

    game(id) {
      const g = byId[id];
      if (!g) return pages.home();
      const lose = (i) => g.played && g.score[i] < g.score[1 - i];
      const side = (t, cls) => `<div class="gteam ${cls}">${logo(t, "lg")}<div><b>${esc(t)}</b><small>${esc(record(t))}</small></div></div>`;
      const head = `<section class="ghead" style="--h:${esc(TEAMS[g.home].color)};--a:${esc(TEAMS[g.away].color)}"><div class="wrap">
          <div class="gtop"><button class="back" data-back aria-label="Back">‹</button><span class="grow">${esc(day(g.date))} · ${esc(g.played ? S.league.name : time(g.date))}${venue(g) ? ` · ${esc(venue(g))}` : ""}</span><span style="width:38px"></span></div>
          <div class="gboard">${side(g.home, "home")}
            <div class="gscore">${g.played ? `<b class="${lose(0) ? "lose" : ""}">${g.score[0]}</b><span>Final</span><b class="${lose(1) ? "lose" : ""}">${g.score[1]}</b>` : `<span class="vs">VS</span>`}</div>
            ${side(g.away, "away")}</div>
        </div></section>`;
      return head + `<div class="wrap">${g.played ? gamePlayed(g) : gamePreview(g)}</div>`;
    },

    player(no) {
      const i = roster.findIndex((p) => p.no === no);
      if (i < 0) return pages.roster();
      const s = SEASONS[i], p = s.p, t = s.t;
      const [first, last] = nameParts(p.name);
      const strip = [["PPG", avg(t.pts, s.gp)], ["RPG", avg(t.reb, s.gp)], ["APG", avg(t.ast, s.gp)], ["SPG", avg(t.stl, s.gp)],
        ["BPG", avg(t.blk, s.gp)], ["FG%", pct(t.fgm, t.fga)], ["3P%", pct(t.tpm, t.tpa)], ["FT%", pct(t.ftm, t.fta)]];
      return `<section class="phead"><span class="bignum" aria-hidden="true">${esc(p.no)}</span><div class="wrap">
          <button class="back" data-back aria-label="Back">‹</button>
          ${avatar(p.name)}
          <div class="who"><span class="meta">${esc(US)} | #${esc(p.no)} | ${esc(p.pos)}${p.captain ? " | Captain" : ""}</span>
            <span class="first">${esc(first)}</span><span class="last">${esc(last)}</span>
            <span class="meta">${p.ht ? `${p.ht} cm · ` : ""}${s.gp} games · ${avg(t.min, s.gp)} min</span></div>
        </div></section>
        <section class="pstrip"><div class="wrap">${strip.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join("")}</div></section>
        <div class="wrap"><section>${sh("Game log", null, S.league.season)}
          <div class="panel scroll"><table>
            <thead><tr><th class="l sticky">Game</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG</th><th>3P</th><th>FT</th></tr></thead>
            <tbody>${[...s.log].reverse().map(({ g, l }) => `<tr class="link" data-go="#game/${g.id}"><td class="l sticky"><span class="res-chip ${res(g)}">${res(g)}</span>${esc(mon(g.date))} ${g.home === US ? "vs" : "@"} ${esc(short(opp(g)))}</td>
              <td>${l.min}</td><td class="on">${l.pts}</td><td>${l.reb}</td><td>${l.ast}</td><td>${l.stl}</td><td>${l.blk}</td><td>${l.tov}</td><td>${l.fgm}-${l.fga}</td><td>${l.tpm}-${l.tpa}</td><td>${l.ftm}-${l.fta}</td></tr>`).join("") || `<tr><td colspan="11" class="empty">No games yet.</td></tr>`}</tbody>
          </table></div></section></div>`;
    }
  };

  function cmpBar(g, label, hv, av, disp = (v) => v, low = false) {
    const hw = low ? hv < av : hv > av, aw = low ? av < hv : av > hv;
    const tot = (hv + av) || 1;
    return `<div class="cmp"><div class="cmp-nums"><b class="${aw ? "lose" : ""}">${disp(hv)}</b><span>${label}</span><b class="${hw ? "lose" : ""}">${disp(av)}</b></div>
      <div class="cmp-bar" style="--l:${(hv / tot) * 100}fr;--r:${(av / tot) * 100}fr"><i class="${hw ? "win" : ""}" style="--c:${esc(TEAMS[g.home].color)}"></i><i class="${aw ? "win" : ""}" style="--c:${esc(TEAMS[g.away].color)}"></i></div></div>`;
  }

  function gamePlayed(g) {
    const tab = store.get("gameTab", "summary");
    const box = boxScore(g).filter((l) => l.min > 0);
    const q = quarters(g);
    const [hl, al] = [teamLine(g, g.home), teamLine(g, g.away)];
    const potg = [...box].sort((a, b) => eff(b) - eff(a))[0];
    const top = (k) => [...box].sort((a, b) => b[k] - a[k])[0];
    const lineScore = `<div class="panel scroll"><table>
        <thead><tr><th class="l">Team</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Final</th></tr></thead>
        <tbody>${[g.home, g.away].map((t, i) => `<tr><td class="l"><span class="tc">${logo(t)}<span class="name">${esc(short(t))}</span></span></td>${q[i].map((v) => `<td>${v}</td>`).join("")}<td><b>${g.score[i]}</b></td></tr>`).join("")}</tbody>
      </table></div>`;
    const tabs = `<div class="tabs" role="tablist" style="margin-top:16px">
        <button role="tab" aria-selected="${tab === "summary"}" data-tab="summary">Summary</button>
        <button role="tab" aria-selected="${tab === "box"}" data-tab="box">Box score</button>
      </div>`;
    if (tab === "box") {
      const t = total(box);
      return lineScore + tabs + `<section style="margin-top:20px">${sh(esc(US), null, g.home === US ? "Home" : "Away")}
        <div class="panel scroll"><table>
          <thead><tr><th class="l sticky">Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>FG</th><th>3P</th><th>FT</th><th>EFF</th></tr></thead>
          <tbody>${[...box].sort((a, b) => b.min - a.min).map((l) => `<tr class="link" data-go="#player/${encodeURIComponent(l.no)}"><td class="l sticky"><span class="soft">${esc(l.no)}</span> ${esc(l.name)}</td><td>${l.min}</td><td class="on">${l.pts}</td><td>${l.reb}</td><td>${l.ast}</td><td>${l.stl}</td><td>${l.blk}</td><td>${l.tov}</td><td>${l.pf}</td><td>${l.fgm}-${l.fga}</td><td>${l.tpm}-${l.tpa}</td><td>${l.ftm}-${l.fta}</td><td>${eff(l)}</td></tr>`).join("")}</tbody>
          <tfoot><tr><td class="l sticky">Totals</td><td>200</td><td>${t.pts}</td><td>${t.reb}</td><td>${t.ast}</td><td>${t.stl}</td><td>${t.blk}</td><td>${t.tov}</td><td>${t.pf}</td><td>${t.fgm}-${t.fga}</td><td>${t.tpm}-${t.tpa}</td><td>${t.ftm}-${t.fta}</td><td></td></tr></tfoot>
        </table></div>
        <p class="note">Only Cubao's box score is kept. ${esc(opp(g))} team totals are under Summary.</p></section>`;
    }
    return lineScore + tabs + `<div class="cols2" style="margin-top:20px">
      <div>
        <section>${sh("Player of the game")}
          <a class="potg" href="#player/${encodeURIComponent(potg.no)}">${avatar(potg.name)}
            <span><span class="cat">${esc(short(US))} · #${esc(potg.no)}</span><b class="nm">${esc(potg.name)}</b>
            <span class="line">${potg.pts} PTS · ${potg.reb} REB · ${potg.ast} AST · ${potg.fgm}-${potg.fga} FG</span></span>
            <span class="val">${eff(potg)}<small>EFF</small></span></a></section>
        <section>${sh("Game leaders", null, short(US))}<div class="panel leaders">
          ${[["Points", "pts", "PTS"], ["Rebounds", "reb", "REB"], ["Assists", "ast", "AST"]].map(([l, k, u]) => { const p = top(k);
            return `<a class="leader" href="#player/${encodeURIComponent(p.no)}">${avatar(p.name)}<span><span class="cat">${l}</span><b class="nm">${esc(p.name)}</b><small>#${esc(p.no)} · ${esc(roster.find((r) => r.no === p.no)?.pos || "")}</small></span><span class="val">${p[k]}<small>${u}</small></span></a>`; }).join("")}
        </div></section>
      </div>
      <div>
        <section>${sh("Team stats", null, "This game")}<div class="panel">
          <div class="compare-head"><span class="tc">${logo(g.home)}<span class="name">${esc(short(g.home))}</span></span><span class="tc"><span class="name">${esc(short(g.away))}</span>${logo(g.away)}</span></div>
          <div class="compare">${(
            cmpBar(g, "FG%", hl.fgm / hl.fga * 100, al.fgm / al.fga * 100, (v) => v.toFixed(1)) +
            cmpBar(g, "3PT%", hl.tpa ? hl.tpm / hl.tpa * 100 : 0, al.tpa ? al.tpm / al.tpa * 100 : 0, (v) => v.toFixed(1)) +
            cmpBar(g, "FT%", hl.fta ? hl.ftm / hl.fta * 100 : 0, al.fta ? al.ftm / al.fta * 100 : 0, (v) => v.toFixed(1)) +
            cmpBar(g, "REB", hl.reb, al.reb) + cmpBar(g, "AST", hl.ast, al.ast) + cmpBar(g, "STL", hl.stl, al.stl) +
            cmpBar(g, "BLK", hl.blk, al.blk) + cmpBar(g, "TOV", hl.tov, al.tov, undefined, true) + cmpBar(g, "FOULS", hl.pf, al.pf, undefined, true))}
          </div></div></section>
      </div></div>`;
  }

  function gamePreview(g) {
    const [a, b] = [rowOf(g.home), rowOf(g.away)];
    const rows = [...SIX, ["STL", "stl"], ["BLK", "blk"], ["TOV", "tov", true]];
    const h2h = games.filter((x) => x.played && [x.home, x.away].includes(g.home) && [x.home, x.away].includes(g.away));
    const form = (r) => `<span class="form">${r.last5.map((x) => `<b class="${x}">${x}</b>`).join("") || `<span class="soft">No games yet</span>`}</span>`;
    return `<div class="cols2" style="margin-top:24px">
      <div><section>${sh("Tale of the tape", null, "Season · league rank")}<div class="panel">
        <div class="compare-head"><span class="tc">${logo(g.home)}<span class="name">${esc(short(g.home))}</span></span><span class="tc"><span class="name">${esc(short(g.away))}</span>${logo(g.away)}</span></div>
        <div class="compare">${rows.map(([l, k, low]) => {
          const hv = a[k], av = b[k];
          const hw = low ? hv < av : hv > av, aw = low ? av < hv : av > hv;
          const tot = (hv + av) || 1;
          return `<div class="cmp"><div class="cmp-nums"><b class="${aw ? "lose" : ""}">${fmtSix(k, hv)}<small>${ordinal(rankIn(g.home, k, low))}</small></b><span>${l}</span><b class="${hw ? "lose" : ""}"><small>${ordinal(rankIn(g.away, k, low))}</small>${fmtSix(k, av)}</b></div>
            <div class="cmp-bar" style="--l:${(hv / tot) * 100}fr;--r:${(av / tot) * 100}fr"><i class="${hw ? "win" : ""}" style="--c:${esc(TEAMS[g.home].color)}"></i><i class="${aw ? "win" : ""}" style="--c:${esc(TEAMS[g.away].color)}"></i></div></div>`;
        }).join("")}</div></div></section></div>
      <div>
        <section>${sh("Recent form", null, "Last 5")}<div class="panel">${[a, b].map((r) => `<div class="frow"><span class="tc">${logo(r.team, "md")}<span class="name">${esc(r.team)}<br><small class="soft">${r.w}-${r.l} · ${ordinal(r.rank)}</small></span></span>${form(r)}</div>`).join("")}</div></section>
        <section>${sh("Head to head", null, "This season")}
          <div style="display:grid;gap:12px">${h2h.map(gameTile).join("") || `<p class="empty panel">First meeting this season.</p>`}</div></section>
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

  // ---------- masthead & footer ----------
  document.getElementById("ticker").innerHTML = ticker();
  document.getElementById("brand").innerHTML = `${logo(US)}<span><b>${esc(US)}</b><small>${esc(S.league.name)}</small></span>`;
  document.getElementById("footer").innerHTML = `<div class="wrap">
    <div class="brand">${logo(US)}<span><b>${esc(US)}</b><small>${esc(S.team.home)} · Since ${esc(S.team.founded)}</small></span></div>
    <p><a href="mailto:${esc(S.team.email)}">${esc(S.team.email)}</a></p></div>`;

  const saved = store.get("theme", null);
  if (saved) document.documentElement.dataset.theme = saved;
  document.querySelector(".theme").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    store.set("theme", dark ? "light" : "dark");
  });

  route();
})();
