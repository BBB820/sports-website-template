// Serves the site's files, /api/site-data (the league read live from Hooperville) and the
// season sign-ups (/api/signups).
// No dependencies; Railway runs it with `npm start`.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { siteData } = require("./hooperville.js");
const signups = require("./signups.js");

const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp"
};
const hidden = new Set(["server.js", "hooperville.js", "signups.js", "package.json", "railway.json", "CLAUDE.md", "README.md"]);

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
    res.writeHead(200, { "content-type": types[path.extname(full)], "cache-control": /\.(html|js|css)$/.test(name) ? "no-cache" : "public, max-age=300" });
    res.end(body);
  });
}).listen(process.env.PORT || 8080, () => console.log("Serving on :" + (process.env.PORT || 8080)));
