// The organisers' editor (#admin): slideshow slides, articles and photo albums.
// Loaded only when someone opens #admin. Uses the same passcode as the sign-ups list.
(() => {
  const { S, ALL, TEAMS, teamNames, PLAYERS, gameKey, stageOf, short, day, esc, memo, field, logo } = window.CBC;
  const AUTO = {
    league: ["🏀", "League banner", "Key numbers with Game of the Week, or the champion"],
    closest: ["⏱", "Closest finish", "Last round's closest game, with a box score link"],
    leader: ["🔥", "Top scorer", "The league's points leader"],
    standings: ["🏆", "First place", "The team on top, with the top four"],
    news: ["📰", "Latest story", "Your newest article, or the newest league post"]
  };
  const LINKS = [["none", "No link"], ["article", "An article"], ["album", "A photo album"], ["game", "A game (box score)"], ["team", "A team"], ["player", "A player"], ["signup", "The sign-up page"], ["url", "A web address"]];
  const DEFAULT_BUTTON = { article: "Read story", album: "See photos", game: "Box score", team: "Team page", player: "Player page", signup: "Sign up", url: "Learn more" };

  let doc = null, persistent = true, tab = "slides", editing = null, note = "";
  const box = () => document.getElementById("admin");
  const today = () => new Date().toISOString().slice(0, 10);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const newId = () => Math.random().toString(36).slice(2, 12).padEnd(10, "0");

  // ---------- talking to the server ----------
  async function api(method, url, body, type = "application/json") {
    const res = await fetch(url, { method, headers: { "x-passcode": memo.get(), ...(body ? { "content-type": type } : {}) }, body: body && type === "application/json" ? JSON.stringify(body) : body });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(out.error || "The editor only works on the live website."); e.status = res.status; throw e; }
    return out;
  }
  function take(out) {
    persistent = out.persistent;
    doc = { slides: out.slides, articles: out.articles, albums: out.albums };
    // What visitors see, so the public pages show the change straight away.
    S.content = { slides: doc.slides.filter((s) => s.on), articles: doc.articles.filter((a) => a.published), albums: doc.albums.filter((a) => a.published && a.photos.length) };
  }
  async function save(msg) {
    take(await api("PUT", "/api/admin/content", doc));
    note = msg;
  }

  // Photos are shrunk on the phone before sending: at most 2000 px on the long side, as JPEG.
  async function shrink(file, max = 2000) {
    const img = await createImageBitmap(file).catch(() => null);
    if (!img) throw new Error("That file is not a picture this browser can read. Try a JPEG or PNG.");
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    return new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.84));
  }
  const upload = async (file) => (await api("POST", "/api/admin/upload", await shrink(file), "image/jpeg")).src;

  // ---------- small pieces ----------
  const opts = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(l)}</option>`).join("");
  const input = (f, label, value, attrs = "", hint = "") => `<label class="fld"><span>${label}</span><input data-f="${f}" value="${esc(value || "")}" ${attrs}>${hint ? `<small>${hint}</small>` : ""}</label>`;
  const textarea = (f, label, value, rows, hint = "", attrs = "") => `<label class="fld"><span>${label}</span><textarea data-f="${f}" rows="${rows}" ${attrs}>${esc(value || "")}</textarea>${hint ? `<small>${hint}</small>` : ""}</label>`;
  const selectF = (f, label, list, cur, hint = "") => `<label class="fld"><span>${label}</span><select data-f="${f}">${opts(list, cur)}</select>${hint ? `<small>${hint}</small>` : ""}</label>`;
  const check = (f, label, on) => `<label class="check toggle-row"><input type="checkbox" data-f="${f}"${on ? " checked" : ""}> <span>${label}</span></label>`;
  const gameLabel = (g) => `${stageOf(g)} · ${short(g.home)} ${g.played ? `${g.score[0]}–${g.score[1]}` : "vs"} ${short(g.away)} · ${day(g.date)}`;
  const gameOpts = () => [["", "No game"], ...[...ALL].reverse().map((g) => [gameKey(g), gameLabel(g)])];
  function picture(f, src, focus, hint) {
    return `<div class="fld"><span>Picture</span>
      ${src ? `<div class="pic-prev" data-focus="${f}"><img src="${esc(src)}" alt=""><i class="focus-dot" style="left:${focus.x}%;top:${focus.y}%"></i></div>
        <small>Tap the picture on the part that must always stay in view (faces, the ball). On phones the sides get cut off.</small>` : ""}
      <div class="pic-actions"><label class="btn ghost">${src ? "Change picture" : "Choose picture"}<input type="file" accept="image/*" data-upload="${f}" hidden></label>
        ${src ? `<button type="button" class="link" data-clear="${f}">Remove</button>` : ""}<span class="up-status" role="status"></span></div>
      ${hint ? `<small>${hint}</small>` : ""}</div>`;
  }
  const status = (text) => { const s = box().querySelector(".up-status"); if (s) s.textContent = text; };
  const flash = () => (note ? `<p class="card saved" role="status">✓ ${esc(note)}</p>` : "");

  // ---------- screens ----------
  function render() {
    const b = box();
    if (!b) return;
    const tabs = [["slides", "Slideshow"], ["articles", "Articles"], ["albums", "Photos"]];
    b.innerHTML = `${persistent ? "" : `<p class="card warn">Saved work and pictures are not on a storage disk yet, so they are lost whenever the website redeploys. Add a Volume to the service on Railway.</p>`}
      ${editing ? "" : `<div class="seg ad-tabs" role="tablist">${tabs.map(([v, l]) => `<button role="tab" aria-selected="${v === tab}" data-atab="${v}">${l}</button>`).join("")}</div>${flash()}`}
      ${editing ? form() : tab === "slides" ? slideList() : tab === "articles" ? articleList() : albumList()}
      ${editing ? "" : `<p class="note">Also for organisers: <a href="#signups">sign-ups list</a> · <a href="#home">see the home page</a></p>`}`;
    note = "";
  }

  function slideList() {
    const rows = doc.slides.map((s, i) => {
      const a = AUTO[s.auto];
      const thumb = a ? `<span class="ad-thumb auto">${a[0]}</span>` : s.image ? `<span class="ad-thumb"><img src="${esc(s.image)}" alt=""></span>` : `<span class="ad-thumb">${logo(null)}</span>`;
      const when = !a && (s.from || s.until) ? ` · ${s.from ? "from " + day(s.from + "T12:00") : ""}${s.until ? " until " + day(s.until + "T12:00") : ""}` : "";
      return `<div class="ad-row${s.on ? "" : " off"}">${thumb}
        <div class="ad-txt"><b>${esc(a ? a[1] : s.headline || "Picture slide")}</b><small>${a ? `Automatic · ${a[2]}` : `Your slide${when}`}</small></div>
        <label class="switch" title="Show on the site"><input type="checkbox" data-slide-on="${i}"${s.on ? " checked" : ""}><span></span><em class="vh">Show</em></label>
        <div class="ad-move"><button type="button" data-move="${i}" data-by="-1" aria-label="Move up"${i ? "" : " disabled"}>↑</button><button type="button" data-move="${i}" data-by="1" aria-label="Move down"${i < doc.slides.length - 1 ? "" : " disabled"}>↓</button></div>
        ${a ? `<span class="ad-edit"></span>` : `<button type="button" class="link ad-edit" data-edit="slide" data-i="${i}">Edit</button>`}</div>`;
    }).join("");
    return `<div class="ad-head"><p class="note">The slides at the top of the home page, in this order. Switch any off, or add your own.</p>
      <button type="button" class="btn" data-new="slide">+ New slide</button></div><div class="card ad-list">${rows}</div>`;
  }
  function articleList() {
    const rows = doc.articles.map((a, i) => `<div class="ad-row${a.published ? "" : " off"}">${a.image ? `<span class="ad-thumb"><img src="${esc(a.image)}" alt=""></span>` : `<span class="ad-thumb auto">📰</span>`}
      <div class="ad-txt"><b>${esc(a.title)}</b><small>${esc(day(a.date + "T12:00"))} · ${a.published ? "On the site" : "Draft, not on the site"}</small></div>
      ${a.published ? `<a class="link" href="#article/${esc(a.id)}">View</a>` : ""}<button type="button" class="link ad-edit" data-edit="article" data-i="${i}">Edit</button></div>`).join("");
    return `<div class="ad-head"><p class="note">Stories for the News page. Link them from a slide, or to a game.</p>
      <button type="button" class="btn" data-new="article">+ New article</button></div>
      ${rows ? `<div class="card ad-list">${rows}</div>` : `<p class="card empty">No articles yet.</p>`}`;
  }
  function albumList() {
    const rows = doc.albums.map((a, i) => `<div class="ad-row${a.published && a.photos.length ? "" : " off"}">${a.photos[0] ? `<span class="ad-thumb"><img src="${esc(a.photos[0].src)}" alt=""></span>` : `<span class="ad-thumb auto">📷</span>`}
      <div class="ad-txt"><b>${esc(a.title)}</b><small>${a.photos.length} photo${a.photos.length === 1 ? "" : "s"} · ${a.published && a.photos.length ? "On the site" : "Not on the site"}</small></div>
      ${a.published && a.photos.length ? `<a class="link" href="#album/${esc(a.id)}">View</a>` : ""}<button type="button" class="link ad-edit" data-edit="album" data-i="${i}">Edit</button></div>`).join("");
    return `<div class="ad-head"><p class="note">Photo albums for the Photos page. Link one from a slide.</p>
      <button type="button" class="btn" data-new="album">+ New album</button></div>
      ${rows ? `<div class="card ad-list">${rows}</div>` : `<p class="card empty">No albums yet.</p>`}`;
  }

  function form() {
    const { kind, item, isNew } = editing;
    const foot = `<p class="form-error" role="alert" hidden></p>
      <div class="ad-actions"><button type="button" class="btn" data-save>Save</button><button type="button" class="btn ghost" data-cancel>Cancel</button>
      ${isNew ? "" : `<button type="button" class="link danger" data-delete>Delete</button>`}</div>`;
    if (kind === "slide") {
      const l = item.link, t = l.type;
      const target = t === "article" ? selectF("link.target", "Which article", [["", "Choose one"], ...doc.articles.map((a) => [a.id, a.title + (a.published ? "" : " (draft)")])], l.target)
        : t === "album" ? selectF("link.target", "Which album", [["", "Choose one"], ...doc.albums.map((a) => [a.id, a.title + (a.published ? "" : " (not on site)")])], l.target)
        : t === "game" ? selectF("link.target", "Which game", gameOpts(), l.target)
        : t === "team" ? selectF("link.target", "Which team", [["", "Choose one"], ...teamNames.map((n) => [n, n])], l.target)
        : t === "player" ? selectF("link.target", "Which player", [["", "Choose one"], ...[...PLAYERS].sort((a, b) => a.name.localeCompare(b.name)).map((p) => [p.id, `${p.name} (${short(p.team)})`])], l.target)
        : t === "url" ? input("link.target", "Web address", l.target, 'type="url" inputmode="url" placeholder="https://"') : "";
      return `<form class="card su-form ad-form" novalidate><h3>${isNew ? "New slide" : "Edit slide"}</h3>
        ${picture("image", item.image, item.focus, "A wide photo works best. It sits behind the words, a little darkened.")}
        ${input("headline", "Headline", item.headline, 'maxlength="90" placeholder="Sharks win the title"')}
        ${input("label", "Small label above it (optional)", item.label, 'maxlength="60" placeholder="Finals · Game 3"')}
        ${textarea("text", "Short text (optional)", item.text, 2, "One or two lines.", 'maxlength="220"')}
        <div class="fld-row">${selectF("link.type", "When someone taps it, go to", LINKS, t)}${target || "<span></span>"}</div>
        ${t !== "none" ? input("button", "Button words (optional)", item.button, `maxlength="30" placeholder="${esc(DEFAULT_BUTTON[t] || "")}"`, "Leave empty for the usual words.") : ""}
        <div class="fld-row">${input("from", "Show from (optional)", item.from, 'type="date"')}${input("until", "Show until (optional)", item.until, 'type="date"', "It hides itself after this day.")}</div>
        ${check("on", "Show this slide on the site", item.on)}${foot}</form>`;
    }
    if (kind === "article") {
      return `<form class="card su-form ad-form" novalidate><h3>${isNew ? "New article" : "Edit article"}</h3>
        ${input("title", "Title", item.title, 'maxlength="120" placeholder="Sharks take Game 3 in overtime"')}
        <div class="fld-row">${input("tag", "Label (optional)", item.tag, 'maxlength="30" placeholder="Finals"')}${input("date", "Date", item.date, 'type="date"')}</div>
        ${picture("image", item.image, item.focus, "Shown at the top of the story and on the news card.")}
        ${textarea("summary", "Short summary", item.summary, 2, "One or two sentences for the news card.", 'maxlength="300"')}
        ${textarea("body", "Story", item.body, 12, "Leave an empty line between paragraphs.")}
        ${selectF("game", "Linked game (optional)", gameOpts(), item.game, "Shows the game's score and box score link under the story.")}
        ${check("published", "Put it on the site", item.published)}${foot}</form>`;
    }
    return `<form class="card su-form ad-form" novalidate><h3>${isNew ? "New album" : "Edit album"}</h3>
      ${input("title", "Album name", item.title, 'maxlength="120" placeholder="Finals night"')}
      <div class="fld-row">${input("date", "Date", item.date, 'type="date"')}${selectF("game", "Linked game (optional)", gameOpts(), item.game)}</div>
      <div class="fld"><span>Photos</span>
        <div class="ad-photos">${item.photos.map((p, i) => `<div class="ad-photo"><img src="${esc(p.src)}" alt="">
          <input data-cap="${i}" value="${esc(p.caption)}" placeholder="Caption (optional)" maxlength="200" aria-label="Caption for photo ${i + 1}">
          <div class="ad-photo-btns"><button type="button" data-pmove="${i}" data-by="-1" aria-label="Move earlier"${i ? "" : " disabled"}>←</button><button type="button" data-pmove="${i}" data-by="1" aria-label="Move later"${i < item.photos.length - 1 ? "" : " disabled"}>→</button><button type="button" data-premove="${i}" aria-label="Remove photo">✕</button></div>
          ${i === 0 ? `<span class="chip">Cover</span>` : ""}</div>`).join("")}</div>
        <div class="pic-actions"><label class="btn ghost">Add photos<input type="file" accept="image/*" multiple data-upload="album" hidden></label><span class="up-status" role="status"></span></div>
        <small>Pick several at once. The first photo is the cover.</small></div>
      ${check("published", "Put it on the site", item.published)}${foot}</form>`;
  }

  // ---------- actions ----------
  function startEdit(kind, i) {
    const list = kind === "slide" ? doc.slides : kind === "article" ? doc.articles : doc.albums;
    const blank = kind === "slide" ? { id: newId(), on: true, image: "", focus: { x: 50, y: 50 }, label: "", headline: "", text: "", link: { type: "none" }, button: "", from: "", until: "" }
      : kind === "article" ? { id: newId(), published: false, title: "", tag: "", date: today(), image: "", focus: { x: 50, y: 50 }, summary: "", body: "", game: "" }
      : { id: newId(), published: true, title: "", date: today(), game: "", photos: [] };
    editing = i == null ? { kind, item: blank, isNew: true } : { kind, item: clone(list[i]), isNew: false };
    render();
    window.scrollTo(0, 0);
  }
  function setField(path, value) {
    const [a, b] = path.split(".");
    if (b) editing.item[a] = { ...editing.item[a], [b]: value }; else editing.item[a] = value;
  }
  function problem() {
    const { kind, item } = editing;
    if (kind === "slide" && !item.headline && !item.image) return "Add a headline or a picture.";
    if (kind === "slide" && item.link.type === "url" && !/^https?:\/\/\S+$/i.test(item.link.target || "")) return "Enter a web address starting with https://";
    if (kind === "slide" && !["none", "signup", "url"].includes(item.link.type) && !item.link.target) return "Choose where the slide should go.";
    if (kind === "slide" && item.from && item.until && item.from > item.until) return "The show-until day is before the show-from day.";
    if (kind !== "slide" && !item.title) return kind === "article" ? "Give the article a title." : "Give the album a name.";
    if (kind === "article" && item.published && !item.body.trim() && !item.summary.trim()) return "Write the story (or at least a summary) before putting it on the site.";
    if (kind === "album" && item.published && !item.photos.length) return "Add at least one photo, or untick “Put it on the site”.";
    return "";
  }
  async function commit() {
    const err = box().querySelector(".form-error"), btn = box().querySelector("[data-save]");
    const p = problem();
    if (p) { err.textContent = p; err.hidden = false; return; }
    const { kind, item, isNew } = editing;
    const key = kind === "slide" ? "slides" : kind === "article" ? "articles" : "albums";
    const before = clone(doc);
    const at = doc[key].findIndex((x) => x.id === item.id);
    if (at >= 0) doc[key][at] = item; else doc[key].unshift(item);
    if (kind === "article") doc.articles.sort((a, b) => b.date.localeCompare(a.date));
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      await save(`${isNew ? "Added" : "Saved"}. ${kind === "slide" ? (item.on ? "It's in the slideshow now." : "It's switched off, so visitors don't see it.") : item.published ? "It's on the site now." : "Saved as a draft."}`);
      tab = key; editing = null; render(); window.scrollTo(0, 0);
    } catch (e) {
      doc = before; err.textContent = e.message; err.hidden = false; btn.disabled = false; btn.textContent = "Save";
      if (e.status === 403) lock(e.message);
    }
  }
  async function quick(change, msg) {
    const before = clone(doc);
    change();
    render();
    try { await save(msg); render(); } catch (e) { doc = before; note = ""; render(); alert(e.message); if (e.status === 403) lock(e.message); }
  }

  async function uploadFiles(target, files) {
    const list = [...files];
    if (!list.length) return;
    try {
      for (let k = 0; k < list.length; k++) {
        status(list.length > 1 ? `Uploading ${k + 1} of ${list.length}…` : "Uploading…");
        const src = await upload(list[k]);
        if (target === "album") editing.item.photos.push({ src, caption: "" });
        else { editing.item[target] = src; editing.item.focus = { x: 50, y: 50 }; }
      }
      render();
    } catch (e) { status(e.message); if (e.status === 403) lock(e.message); }
  }

  function lock(msg = "") {
    memo.set("");
    const b = box();
    if (!b) return;
    b.innerHTML = `<form class="card su-form narrow-form" data-admin-pass><h3>Organisers only</h3>
      ${field("passcode", "Passcode", 'type="password" required autocomplete="current-password"')}
      ${msg ? `<p class="form-error" role="alert">${esc(msg)}</p>` : ""}<button class="btn" type="submit">Open</button>
      <p class="note">The same passcode as the sign-ups list.</p></form>`;
  }
  async function open() {
    try { take(await api("GET", "/api/admin/content")); render(); }
    catch (e) { lock(e.status === 403 || !memo.get() ? (memo.get() ? e.message : "") : e.message); }
  }

  // ---------- wiring (once; the #admin box is redrawn on every visit) ----------
  document.addEventListener("submit", (e) => {
    if (!e.target.matches("[data-admin-pass]")) return;
    e.preventDefault();
    memo.set(e.target.passcode.value);
    box().innerHTML = `<p class="card empty">Loading…</p>`;
    open();
  });
  document.addEventListener("input", (e) => {
    if (!box() || !box().contains(e.target) || !editing) return;
    const f = e.target.dataset.f;
    if (f) setField(f, e.target.type === "checkbox" ? e.target.checked : e.target.value);
    if (e.target.dataset.cap != null) editing.item.photos[+e.target.dataset.cap].caption = e.target.value;
  });
  document.addEventListener("change", (e) => {
    if (!box() || !box().contains(e.target)) return;
    const t = e.target;
    if (editing && t.dataset.f) { setField(t.dataset.f, t.type === "checkbox" ? t.checked : t.value); if (t.dataset.f === "link.type") { editing.item.link = { type: t.value }; render(); } }
    if (editing && t.dataset.upload) uploadFiles(t.dataset.upload, t.files);
    if (t.dataset.slideOn != null) { const i = +t.dataset.slideOn; quick(() => (doc.slides[i].on = t.checked), t.checked ? "Switched on." : "Switched off."); }
  });
  document.addEventListener("click", (e) => {
    const b = box();
    if (!b || !b.contains(e.target)) return;
    const q = (sel) => e.target.closest(sel);
    let x;
    if ((x = q("[data-atab]"))) { tab = x.dataset.atab; render(); }
    else if ((x = q("[data-new]"))) startEdit(x.dataset.new);
    else if ((x = q("[data-edit]"))) startEdit(x.dataset.edit, +x.dataset.i);
    else if (q("[data-cancel]")) { editing = null; render(); }
    else if (q("[data-save]")) commit();
    else if (q("[data-delete]")) {
      const { kind, item } = editing, key = kind === "slide" ? "slides" : kind === "article" ? "articles" : "albums";
      if (!confirm(`Delete this ${kind}? This cannot be undone.`)) return;
      editing = null; tab = key;
      quick(() => (doc[key] = doc[key].filter((y) => y.id !== item.id)), "Deleted.");
    }
    else if ((x = q("[data-move]"))) { const i = +x.dataset.move, j = i + +x.dataset.by; quick(() => ([doc.slides[i], doc.slides[j]] = [doc.slides[j], doc.slides[i]]), "Order saved."); }
    else if ((x = q("[data-pmove]"))) { const p = editing.item.photos, i = +x.dataset.pmove, j = i + +x.dataset.by; [p[i], p[j]] = [p[j], p[i]]; render(); }
    else if ((x = q("[data-premove]"))) { editing.item.photos.splice(+x.dataset.premove, 1); render(); }
    else if ((x = q("[data-clear]"))) { editing.item[x.dataset.clear] = ""; render(); }
    else if ((x = q("[data-focus]"))) {
      const img = x.querySelector("img").getBoundingClientRect();
      editing.item.focus = { x: Math.round(Math.min(100, Math.max(0, ((e.clientX - img.left) / img.width) * 100))), y: Math.round(Math.min(100, Math.max(0, ((e.clientY - img.top) / img.height) * 100))) };
      const dot = x.querySelector(".focus-dot");
      dot.style.left = editing.item.focus.x + "%"; dot.style.top = editing.item.focus.y + "%";
    }
  });

  window.CBCAdmin = {
    mount() {
      editing = null;
      if (!memo.get()) return lock();
      box().innerHTML = `<p class="card empty">Loading…</p>`;
      open();
    }
  };
})();
