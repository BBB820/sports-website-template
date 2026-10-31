// Serves the site's files, /api/site-data (the league read live from Hooperville), the
// season sign-ups (/api/signups) and the organisers' slides, articles and albums (/api/content).
// No dependencies; Railway runs it with `npm start`.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { siteData, logoFile, hasLogos } = require("./hooperville.js");
const signups = require("./signups.js");
const content = require("./content.js");

const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp", ".woff2": "font/woff2"
};
const hidden = new Set(["server.js", "hooperville.js", "signups.js", "content.js", "package.json", "railway.json", "CLAUDE.md", "README.md"]);

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

// Read a small JSON body (a sign-up is a few hundred bytes).
function readJson(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new signups.InputError("That is too much to send", 413)); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { reject(new signups.InputError("Could not read the form")); } });
    req.on("error", reject);
  });
}
// Read a picture as it is (the editor shrinks photos before sending, so a few MB is plenty).
function readRaw(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new signups.InputError("That picture is too big", 413)); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
const clientIp = (req) => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "";
const fail = (res, err) => {
  if (err instanceof signups.InputError) return sendJson(res, err.status, { error: err.message });
  console.error(err);
  sendJson(res, 500, { error: "Something went wrong saving that. Please try again." });
};

http.createServer((req, res) => {
  const route = new URL(req.url, "http://x").pathname;
  if (route === "/api/signups" && req.method === "POST") {
    readJson(req).then((body) => signups.add(body, clientIp(req))).then((r) => sendJson(res, 201, r)).catch((err) => fail(res, err));
    return;
  }
  if (route === "/api/signups" && req.method === "GET") {
    signups.list(req.headers["x-passcode"]).then((r) => sendJson(res, 200, r)).catch((err) => fail(res, err));
    return;
  }
  if (route === "/api/signups/summary") {
    signups.summary().then((r) => sendJson(res, 200, r)).catch((err) => fail(res, err));
    return;
  }
  if (route === "/api/content" && req.method === "GET") {
    content.published().then((r) => sendJson(res, 200, r)).catch((err) => fail(res, err));
    return;
  }
  if (route === "/api/admin/content" && req.method === "GET") {
    content.all(req.headers["x-passcode"]).then((r) => sendJson(res, 200, r)).catch((err) => fail(res, err));
    return;
  }
  if (route === "/api/admin/content" && req.method === "PUT") {
    readJson(req, 2 * 1024 * 1024).then((body) => content.save(req.headers["x-passcode"], body)).then((r) => sendJson(res, 200, r)).catch((err) => fail(res, err));
    return;
  }
  if (route === "/api/admin/upload" && req.method === "POST") {
    readRaw(req).then((buf) => content.upload(req.headers["x-passcode"], buf)).then((r) => sendJson(res, 201, r)).catch((err) => fail(res, err));
    return;
  }
  if (route.startsWith("/uploads/")) {
    const file = content.uploadPath(route.slice(9));
    if (!file) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found"); }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found"); }
      res.writeHead(200, { "content-type": types[path.extname(file)], "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" });
      res.end(body);
    });
    return;
  }
  if (route.startsWith("/hv-logo/")) {
    const key = route.slice(9);
    if (!/^([0-9a-f-]{36}|league)$/.test(key)) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found"); }
    (hasLogos() ? Promise.resolve() : siteData().catch(() => {}))
      .then(() => logoFile(key))
      .then((f) => {
        if (!f) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found"); }
        res.writeHead(200, { "content-type": f.type, "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" });
        res.end(f.body);
      })
      .catch((err) => { console.error(err.message); res.writeHead(502, { "content-type": "text/plain" }); res.end("Logo not available"); });
    return;
  }
  if (route === "/api/site-data") {
    siteData()
      .then((data) => (data ? sendJson(res, 200, data) : sendJson(res, 404, { error: "No matching league in Hooperville" })))
      .catch((err) => { console.error(err.message); sendJson(res, 502, { error: "Hooperville is not reachable" }); });
    return;
  }
  let file = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (file.endsWith("/")) file += "index.html";
  const full = path.join(root, path.normalize(file));
  const name = path.basename(full);
  const insideHidden = path.relative(root, full).split(path.sep).some((part) => part.startsWith("."));
  if (!full.startsWith(root + path.sep) || insideHidden || hidden.has(name) || !types[path.extname(full)]) {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("Not found");
  }
  fs.readFile(full, (err, body) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "content-type": types[path.extname(full)], "cache-control": /\.(html|js|css)$/.test(name) ? "no-cache" : /\.woff2$/.test(name) ? "public, max-age=31536000, immutable" : "public, max-age=300" });
    res.end(body);
  });
}).listen(process.env.PORT || 8080, () => console.log("Serving on :" + (process.env.PORT || 8080)));
