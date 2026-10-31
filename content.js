// What the organisers write on the site: their own slideshow slides, articles and photo albums,
// plus which automatic slides show. Kept in content.json next to the sign-ups, with uploaded
// pictures in an uploads folder beside it. Editing needs the organisers' passcode (SIGNUP_PASSCODE).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { InputError, DIR, passcodeOk, hasPasscode, persistent } = require("./signups.js");

const FILE = path.join(DIR, "content.json");
const UPLOADS = path.join(DIR, "uploads");
const AUTO = ["league", "gotw", "closest", "leader", "standings", "news"];
const LINKS = ["none", "article", "album", "game", "team", "player", "signup", "url"];
const EMPTY = () => ({ slides: AUTO.map((auto) => ({ auto, on: true })), articles: [], albums: [], logos: {}, leagueLogo: "" });

// ---------- checking what is saved ----------
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneLine = (v, max) => str(v, max).replace(/\s+/g, " ");
const id = (v) => (typeof v === "string" && /^[a-z0-9]{6,16}$/.test(v) ? v : crypto.randomBytes(5).toString("hex"));
const day = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
const image = (v) => (typeof v === "string" && /^\/uploads\/[a-f0-9]{20}\.(jpg|png|webp)$/.test(v) ? v : "");
const pct = (v) => (Number.isFinite(+v) ? Math.min(100, Math.max(0, Math.round(+v))) : 50);
const focus = (f) => ({ x: pct(f && f.x), y: pct(f && f.y) });
const url = (v) => { const s = str(v, 500); return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : ""; };

function link(l) {
  const type = LINKS.includes(l && l.type) ? l.type : "none";
  if (type === "url") return { type, target: url(l.target) };
  if (type === "none" || type === "signup") return { type };
  return { type, target: oneLine(l.target, 200) };
}
function slide(s) {
  if (s && AUTO.includes(s.auto)) return { auto: s.auto, on: s.on !== false };
  return { id: id(s && s.id), on: !!(s && s.on !== false), image: image(s && s.image), focus: focus(s && s.focus),
    label: oneLine(s && s.label, 60), headline: oneLine(s && s.headline, 90), text: oneLine(s && s.text, 220),
    link: link(s && s.link), button: oneLine(s && s.button, 30), from: day(s && s.from), until: day(s && s.until) };
}
const article = (a) => ({ id: id(a && a.id), published: !!(a && a.published), title: oneLine(a && a.title, 120),
  tag: oneLine(a && a.tag, 30), date: day(a && a.date) || new Date().toISOString().slice(0, 10), image: image(a && a.image),
  focus: focus(a && a.focus), summary: oneLine(a && a.summary, 300), body: str(a && a.body, 20000), game: oneLine(a && a.game, 200) });
const album = (a) => ({ id: id(a && a.id), published: !!(a && a.published), title: oneLine(a && a.title, 120),
  date: day(a && a.date) || new Date().toISOString().slice(0, 10), game: oneLine(a && a.game, 200),
  photos: (Array.isArray(a && a.photos) ? a.photos : []).slice(0, 200).map((p) => ({ src: image(p && p.src), caption: oneLine(p && p.caption, 200) })).filter((p) => p.src) });

// Team name → uploaded logo picture.
function logos(m) {
  const out = {};
  if (m && typeof m === "object") for (const [k, v] of Object.entries(m).slice(0, 80)) { const name = oneLine(k, 60), src = image(v); if (name && src) out[name] = src; }
  return out;
}

function clean(doc) {
  if (!doc || typeof doc !== "object") throw new InputError("Nothing was sent");
  const slides = (Array.isArray(doc.slides) ? doc.slides : []).slice(0, 40).map(slide);
  // A newer automatic slide the saved list does not know yet goes in after the one before it, switched on.
  AUTO.forEach((auto, k) => {
    if (slides.some((s) => s.auto === auto)) return;
    const prev = k ? slides.findIndex((s) => s.auto === AUTO[k - 1]) : -1;
    slides.splice(prev + 1, 0, { auto, on: true });
  });
  const seen = new Set();
  return {
    slides: slides.filter((s) => (s.auto ? (seen.has(s.auto) ? false : seen.add(s.auto)) : s.headline || s.image)),
    articles: (Array.isArray(doc.articles) ? doc.articles : []).slice(0, 500).map(article).filter((a) => a.title),
    albums: (Array.isArray(doc.albums) ? doc.albums : []).slice(0, 200).map(album).filter((a) => a.title),
    logos: logos(doc.logos),
    leagueLogo: image(doc.leagueLogo)
  };
}

// ---------- reading and saving ----------
let queue = Promise.resolve();
const read = () => fs.promises.readFile(FILE, "utf8").then((t) => clean(JSON.parse(t))).catch((err) => (err.code === "ENOENT" ? EMPTY() : Promise.reject(err)));
function write(doc) {
  const run = queue.then(async () => {
    await fs.promises.mkdir(DIR, { recursive: true });
    const tmp = FILE + "." + process.pid + ".tmp";
    await fs.promises.writeFile(tmp, JSON.stringify(doc, null, 1));
    await fs.promises.rename(tmp, FILE);
    return doc;
  });
  queue = run.catch(() => {});
  return run;
}

function check(given) {
  if (!hasPasscode()) throw new InputError("The organisers' page is not set up yet: add SIGNUP_PASSCODE on Railway.", 503);
  if (!passcodeOk(given)) throw new InputError("That passcode is not correct", 403);
}

/** What visitors see: switched-on slides, published articles and albums. */
async function published() {
  const doc = await read();
  return { slides: doc.slides.filter((s) => s.on), articles: doc.articles.filter((a) => a.published), albums: doc.albums.filter((a) => a.published && a.photos.length), logos: doc.logos, leagueLogo: doc.leagueLogo };
}
async function all(given) { check(given); return { persistent, ...(await read()) }; }
async function save(given, body) { check(given); return { persistent, ...(await write(clean(body))) }; }

// Pictures: JPEG, PNG or WebP, checked by their first bytes, saved under a random name.
const KINDS = [[[0xff, 0xd8, 0xff], "jpg"], [[0x89, 0x50, 0x4e, 0x47], "png"], [[0x52, 0x49, 0x46, 0x46], "webp"]];
async function upload(given, buf) {
  check(given);
  const kind = KINDS.find(([sig]) => sig.every((b, i) => buf[i] === b));
  if (!kind || (kind[1] === "webp" && buf.toString("latin1", 8, 12) !== "WEBP")) throw new InputError("Send a JPEG, PNG or WebP picture");
  const name = crypto.randomBytes(10).toString("hex") + "." + kind[1];
  await fs.promises.mkdir(UPLOADS, { recursive: true });
  await fs.promises.writeFile(path.join(UPLOADS, name), buf);
  return { src: "/uploads/" + name };
}
const uploadPath = (name) => (/^[a-f0-9]{20}\.(jpg|png|webp)$/.test(name) ? path.join(UPLOADS, name) : null);

module.exports = { published, all, save, upload, uploadPath };
