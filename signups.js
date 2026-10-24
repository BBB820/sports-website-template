// Season sign-ups: team registrations and free agents, kept in a JSON file on the server.
// Contact details are only ever returned to the admin page, behind SIGNUP_PASSCODE.
//
// Settings (Railway → the service → Variables):
//   SIGNUP_PASSCODE  the passcode for the private sign-ups page. Without it the page stays locked.
//   DATA_DIR         where the file is kept. On Railway, add a Volume (any mount path) and this is set
//                    for you through RAILWAY_VOLUME_MOUNT_PATH. Without a volume, sign-ups are lost
//                    on every redeploy.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DIR = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, ".data");
const FILE = path.join(DIR, "signups.json");
const PASSCODE = process.env.SIGNUP_PASSCODE || "";
const persistent = !!(process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH);

const POSITIONS = ["PG", "SG", "SF", "PF", "C", "Any"];
const LEVELS = ["Beginner", "Casual", "Competitive", "Former varsity / pro"];

class InputError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }

const text = (body, key, label, max, min = 0) => {
  const v = typeof body[key] === "string" ? body[key].trim().replace(/\s+/g, " ") : "";
  if (v.length < min) throw new InputError(min > 1 ? `${label} is required` : `${label} is required`);
  if (v.length > max) throw new InputError(`${label} is too long`);
  return v;
};
const phone = (body) => {
  const v = text(body, "phone", "Mobile number", 20, 1);
  if (!/^\+?[\d\s-]{7,20}$/.test(v)) throw new InputError("Enter a valid mobile number");
  return v;
};
const email = (body) => {
  const v = text(body, "email", "Email", 120);
  if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new InputError("Enter a valid email or leave it blank");
  return v;
};

function validate(body) {
  if (!body || typeof body !== "object") throw new InputError("Nothing was sent");
  if (body.website) throw new InputError("Could not send"); // hidden field only bots fill in
  if (body.agree !== true) throw new InputError("Please confirm the league can contact you");
  const season = text(body, "season", "Season", 60, 1);

  if (body.kind === "team") {
    const players = (Array.isArray(body.players) ? body.players : []).slice(0, 20).map((p, i) => {
      const name = typeof p?.name === "string" ? p.name.trim().replace(/\s+/g, " ") : "";
      if (name.length > 60) throw new InputError(`Player ${i + 1}'s name is too long`);
      const no = typeof p?.no === "string" ? p.no.trim().slice(0, 3) : "";
      if (no && !/^\d{1,2}$|^00$/.test(no)) throw new InputError(`Player ${i + 1}'s jersey number should be 0–99 or 00`);
      const pos = POSITIONS.includes(p?.pos) ? p.pos : "";
      return { name, no, pos };
    }).filter((p) => p.name);
    if (players.length < 5) throw new InputError("List at least 5 players");
    const color = typeof body.color === "string" && /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : "";
    return { kind: "team", season, teamName: text(body, "teamName", "Team name", 40, 2), color,
      captain: text(body, "captain", "Captain's name", 60, 2), phone: phone(body), email: email(body),
      players, notes: text(body, "notes", "Notes", 500) };
  }
  if (body.kind === "player") {
    const ht = body.height === "" || body.height == null ? null : Number(body.height);
    if (ht !== null && !(Number.isInteger(ht) && ht >= 120 && ht <= 230)) throw new InputError("Height should be in cm, 120–230");
    return { kind: "player", season, name: text(body, "name", "Name", 60, 2), phone: phone(body), email: email(body),
      position: POSITIONS.includes(body.position) ? body.position : "Any", height: ht,
      level: LEVELS.includes(body.level) ? body.level : "", notes: text(body, "notes", "Notes", 500) };
  }
  throw new InputError("Choose team or player");
}

// One write at a time, through a temporary file, so a crash never leaves half a file.
let queue = Promise.resolve();
const read = () => fs.promises.readFile(FILE, "utf8").then(JSON.parse).catch((err) => (err.code === "ENOENT" ? [] : Promise.reject(err)));
function update(fn) {
  const run = queue.then(async () => {
    const list = await read();
    const result = fn(list);
    await fs.promises.mkdir(DIR, { recursive: true });
    const tmp = FILE + "." + process.pid + ".tmp";
    await fs.promises.writeFile(tmp, JSON.stringify(list, null, 1));
    await fs.promises.rename(tmp, FILE);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

// A few sign-ups per connection every ten minutes is plenty for a person.
const recent = new Map();
function allow(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (hits.length >= 5) return false;
  hits.push(now);
  recent.set(ip, hits);
  return true;
}

async function add(body, ip) {
  if (!allow(ip)) throw new InputError("Too many sign-ups from here. Try again in a few minutes.", 429);
  const entry = validate(body);
  return update((list) => {
    if (entry.kind === "team" && list.some((x) => x.kind === "team" && x.season === entry.season && x.teamName.toLowerCase() === entry.teamName.toLowerCase())) {
      throw new InputError(`A team called ${entry.teamName} is already registered. Pick another name or contact the league.`, 409);
    }
    const saved = { id: crypto.randomBytes(3).toString("hex").toUpperCase(), createdAt: new Date().toISOString(), ...entry };
    list.push(saved);
    return { id: saved.id, kind: saved.kind };
  });
}

const passcodeOk = (given) => {
  if (!PASSCODE || typeof given !== "string") return false;
  const a = crypto.createHash("sha256").update(given).digest(), b = crypto.createHash("sha256").update(PASSCODE).digest();
  return crypto.timingSafeEqual(a, b);
};

async function list(given) {
  if (!PASSCODE) throw new InputError("The sign-ups page is not set up yet: add SIGNUP_PASSCODE on Railway.", 503);
  if (!passcodeOk(given)) throw new InputError("That passcode is not correct", 403);
  return { persistent, signups: await read() };
}

/** Counts only, for the public page: no names or contact details. */
async function summary() {
  const all = await read();
  const bySeason = {};
  for (const x of all) {
    const s = (bySeason[x.season] ||= { teams: 0, players: 0 });
    x.kind === "team" ? s.teams++ : s.players++;
  }
  return bySeason;
}

module.exports = { add, list, summary, InputError, DIR };
