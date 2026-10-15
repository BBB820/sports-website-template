(() => {
  const S = window.SITE;
  const API = "https://www.thesportsdb.com/api/v1/json/3";
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("matchday:" + key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("matchday:" + key, JSON.stringify(value)); } catch { /* private mode */ }
    }
  };

  const fmtDate = (iso, withTime) => {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const opts = { weekday: "short", month: "short", day: "numeric" };
    if (withTime) Object.assign(opts, { hour: "numeric", minute: "2-digit" });
    return d.toLocaleString(undefined, opts);
  };

  const now = new Date();
  const played = S.schedule.filter((m) => m.score).sort((a, b) => b.date.localeCompare(a.date));
  const upcoming = S.schedule.filter((m) => !m.score && new Date(m.date) >= now)
    .sort((a, b) => a.date.localeCompare(b.date));

  // ---------- routing ----------
  const views = [...document.querySelectorAll(".view")];
  function route() {
    const id = (location.hash || "#home").slice(1);
    const target = views.find((v) => v.id === id) ? id : "home";
    views.forEach((v) => (v.hidden = v.id !== target));
    document.querySelectorAll(".tabs a").forEach((a) =>
      a.setAttribute("aria-current", a.getAttribute("href") === "#" + target ? "page" : "false"));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  // ---------- theme ----------
  const savedTheme = store.get("theme", null);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $(".theme-toggle").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
  });

  // ---------- shared renderers ----------
  const resultClass = (m) => {
    const us = S.team.name;
    if (!m.score || (m.home !== us && m.away !== us)) return "";
    const [h, a] = m.score;
    const ours = m.home === us ? h - a : a - h;
    return ours > 0 ? "win" : ours < 0 ? "loss" : "draw";
  };

  const matchRow = (m, withTime) => `
    <li class="match ${resultClass(m)}">
      <span class="when">${esc(fmtDate(m.date, withTime))}</span>
      <span class="teams">
        <span>${esc(m.home)}</span>
        <b class="score">${m.score ? `${m.score[0]}–${m.score[1]}` : "vs"}</b>
        <span>${esc(m.away)}</span>
      </span>
    </li>`;

  function tableHTML(rows, highlight) {
    const sorted = rows.map((r) => ({ ...r, gd: r.gd ?? r.gf - r.ga, pts: r.pts ?? r.w * 3 + r.d }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    return `<table class="standings">
      <thead><tr><th>#</th><th class="l">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>${sorted.map((r, i) => `
        <tr class="${r.team === highlight ? "us" : ""}">
          <td>${i + 1}</td><td class="l">${esc(r.team)}</td><td>${r.p}</td><td>${r.w}</td>
          <td>${r.d}</td><td>${r.l}</td><td>${r.gd > 0 ? "+" : ""}${r.gd}</td><td><b>${r.pts}</b></td>
        </tr>`).join("")}</tbody></table>`;
  }

  // ---------- home ----------
  function renderHome() {
    $("#hero-league").textContent = S.team.league;
    $("#hero-team").textContent = S.team.name;
    $("#hero-tagline").textContent = S.team.tagline;
    $("#footer-team").textContent = `© ${now.getFullYear()} ${S.team.name}`;
    document.title = `${S.team.name} · Matchday`;

    const next = upcoming[0];
    const box = $("#next-match");
    if (next) {
      box.innerHTML = `<p class="eyebrow">Next match</p>
        <p class="nm-teams">${esc(next.home)} <span>vs</span> ${esc(next.away)}</p>
        <p class="nm-when">${esc(fmtDate(next.date, true))} · <span id="countdown"></span></p>`;
      const tick = () => {
        const ms = new Date(next.date) - new Date();
        if (ms <= 0) { $("#countdown").textContent = "Kick-off!"; return; }
        const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
        $("#countdown").textContent = `${d}d ${h}h ${m}m`;
      };
      tick(); setInterval(tick, 30000);
    } else {
      box.innerHTML = `<p class="eyebrow">Next match</p><p>No fixtures scheduled.</p>`;
    }

    $("#home-results").innerHTML = played.slice(0, 4).map((m) => matchRow(m)).join("");
    $("#home-table").innerHTML = tableHTML(S.table.slice(0, 5), S.team.name);
    $("#home-news").innerHTML = S.news.slice(0, 4).map((n) =>
      `<li><a href="#news">${esc(n.title)}</a><span class="muted">${esc(fmtDate(n.date))}</span></li>`).join("");
  }

  // ---------- scores (local or live) ----------
  const sel = $("#league-select");
  sel.innerHTML = S.liveLeagues.map((l) => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join("");
  sel.value = store.get("league", "local");
  if (!sel.value) sel.value = "local";
  sel.addEventListener("change", () => { store.set("league", sel.value); renderScores(); });

  function renderLocalScores(note) {
    $("#scores-past").innerHTML = played.map((m) => matchRow(m)).join("") || "<li>No results yet.</li>";
    $("#scores-next").innerHTML = upcoming.map((m) => matchRow(m, true)).join("") || "<li>No fixtures.</li>";
    $("#scores-table").innerHTML = tableHTML(S.table, S.team.name);
    $("#scores-status").textContent = note || "";
  }

  const fromApi = (e) => ({
    date: e.strTimestamp || (e.dateEvent + "T" + (e.strTime || "00:00")),
    home: e.strHomeTeam, away: e.strAwayTeam,
    score: e.intHomeScore != null && e.intHomeScore !== "" ? [e.intHomeScore, e.intAwayScore] : null
  });

  async function getJSON(path) {
    const r = await fetch(API + path);
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  let scoresReq = 0;
  async function renderScores() {
    const league = S.liveLeagues.find((l) => l.id === sel.value);
    if (!league || league.id === "local") return renderLocalScores();
    const req = ++scoresReq;
    $("#scores-status").textContent = "Loading…";
    try {
      const [past, next, table] = await Promise.all([
        getJSON(`/eventspastleague.php?id=${league.id}`),
        getJSON(`/eventsnextleague.php?id=${league.id}`),
        getJSON(`/lookuptable.php?l=${league.id}&s=${league.season}`).catch(() => ({}))
      ]);
      if (req !== scoresReq) return;
      const p = (past.events || []).map(fromApi).reverse();
      const n = (next.events || []).map(fromApi);
      $("#scores-past").innerHTML = p.map((m) => matchRow(m)).join("") || "<li class='muted'>No recent results.</li>";
      $("#scores-next").innerHTML = n.map((m) => matchRow(m, true)).join("") || "<li class='muted'>No upcoming fixtures.</li>";
      const rows = (table.table || []).map((t) => ({
        team: t.strTeam, p: +t.intPlayed, w: +t.intWin, d: +t.intDraw, l: +t.intLoss,
        gf: +t.intGoalsFor, ga: +t.intGoalsAgainst, gd: +t.intGoalDifference, pts: +t.intPoints
      }));
      $("#scores-table").innerHTML = rows.length ? tableHTML(rows) : "<p class='muted'>No table available for this league.</p>";
      $("#scores-status").textContent = "Live · TheSportsDB";
    } catch {
      if (req !== scoresReq) return;
      renderLocalScores("Live data unavailable, showing club data");
    }
  }

  // ---------- team ----------
  function renderTeam() {
    $("#team-schedule").innerHTML = [...S.schedule].sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => matchRow(m, !m.score)).join("");
    const t = S.team;
    $("#team-facts").innerHTML = [["Founded", t.founded], ["Ground", t.ground], ["Colors", t.colors],
      ["Head coach", t.coach], ["Email", `<a href="mailto:${esc(t.email)}">${esc(t.email)}</a>`]]
      .map(([k, v]) => `<dt>${k}</dt><dd>${k === "Email" ? v : esc(v)}</dd>`).join("");

    const positions = ["All", "GK", "DF", "MF", "FW"];
    let pos = "All";
    const drawRoster = () => {
      $("#roster-filter").innerHTML = positions.map((p) =>
        `<button type="button" class="chip" aria-pressed="${p === pos}" data-pos="${p}">${p}</button>`).join("");
      $("#team-roster").innerHTML = S.roster.filter((r) => pos === "All" || r.pos === pos)
        .sort((a, b) => a.no - b.no)
        .map((r) => `<div class="player"><span class="no">${r.no}</span><span>${esc(r.name)}</span><span class="pos">${r.pos}</span></div>`)
        .join("");
    };
    $("#roster-filter").addEventListener("click", (e) => {
      const b = e.target.closest("[data-pos]"); if (!b) return;
      pos = b.dataset.pos; drawRoster();
    });
    drawRoster();

    $("#contact-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const subject = encodeURIComponent(`Website message from ${f.get("name")}`);
      const body = encodeURIComponent(`${f.get("message")}\n\n— ${f.get("name")} (${f.get("email")})`);
      location.href = `mailto:${S.team.email}?subject=${subject}&body=${body}`;
      $("#contact-note").textContent = "Opening your email app…";
    });
  }

  // ---------- news ----------
  function renderNews(q = "") {
    const needle = q.trim().toLowerCase();
    const items = S.news.filter((n) => !needle || (n.title + n.body + n.tag).toLowerCase().includes(needle));
    $("#news-list").innerHTML = items.map((n) => `
      <article class="card news">
        <p class="eyebrow">${esc(n.tag)} · ${esc(fmtDate(n.date))}</p>
        <h2>${esc(n.title)}</h2>
        <p>${esc(n.body)}</p>
      </article>`).join("") || "<p class='muted'>No stories match.</p>";
  }
  $("#news-search").addEventListener("input", (e) => renderNews(e.target.value));

  // ---------- fan zone ----------
  function renderPredict() {
    const next = upcoming[0];
    const el = $("#predict");
    if (!next) { el.innerHTML = "<p class='muted'>No upcoming match.</p>"; return; }
    const key = "pred:" + next.date;
    const saved = store.get(key, null);
    el.innerHTML = `<p>${esc(next.home)} vs ${esc(next.away)} · ${esc(fmtDate(next.date))}</p>
      <form class="predict-form">
        <input type="number" min="0" max="20" name="h" aria-label="${esc(next.home)} goals" value="${saved ? saved[0] : ""}" required>
        <span>–</span>
        <input type="number" min="0" max="20" name="a" aria-label="${esc(next.away)} goals" value="${saved ? saved[1] : ""}" required>
        <button type="submit">${saved ? "Update" : "Lock in"}</button>
      </form>
      <p class="muted" role="status">${saved ? `Your call: ${saved[0]}–${saved[1]}` : "Saved on this device."}</p>`;
    el.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      store.set(key, [+f.get("h"), +f.get("a")]);
      renderPredict();
    });
  }

  function renderPoll() {
    const candidates = S.roster.filter((r) => r.pos !== "GK").slice(-4);
    const vote = store.get("poll", null);
    const el = $("#poll");
    el.innerHTML = candidates.map((c) => `
      <button type="button" class="poll-opt" aria-pressed="${vote === c.name}" data-name="${esc(c.name)}">
        <span>#${c.no} ${esc(c.name)}</span><span class="pos">${c.pos}</span>
      </button>`).join("") +
      `<p class="muted" role="status">${vote ? `You voted for ${esc(vote)}.` : "One vote per device."}</p>`;
    el.onclick = (e) => {
      const b = e.target.closest("[data-name]"); if (!b) return;
      store.set("poll", b.dataset.name); renderPoll();
    };
  }

  function renderWall() {
    const posts = store.get("wall", [
      { msg: "Up the Riverside! 💛💙", at: "2026-10-11T17:05" },
      { msg: "What a goal from Ito last week.", at: "2026-10-12T09:30" }
    ]);
    $("#wall").innerHTML = posts.slice().reverse().map((p) =>
      `<li><p>${esc(p.msg)}</p><span class="muted">${esc(fmtDate(p.at, true))}</span></li>`).join("");
    return posts;
  }
  $("#wall-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = e.target.msg;
    const msg = input.value.trim(); if (!msg) return;
    const posts = renderWall();
    posts.push({ msg, at: new Date().toISOString() });
    store.set("wall", posts.slice(-50));
    input.value = "";
    renderWall();
  });

  // ---------- boot ----------
  renderHome();
  renderScores();
  renderTeam();
  renderNews();
  renderPredict();
  renderPoll();
  renderWall();
  $("#history").innerHTML = S.history.map((h) => `<li><b>${h.year}</b> ${esc(h.text)}</li>`).join("");
  route();
})();
