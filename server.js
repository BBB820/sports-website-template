// Serves the site's files, and /api/site-data: the league read live from Hooperville.
// No dependencies; Railway runs it with `npm start`.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { siteData } = require("./hooperville.js");

const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp"
};
const hidden = new Set(["server.js", "hooperville.js", "package.json", "railway.json", "CLAUDE.md", "README.md"]);

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

http.createServer((req, res) => {
  if (new URL(req.url, "http://x").pathname === "/api/site-data") {
    siteData()
      .then((data) => (data ? sendJson(res, 200, data) : sendJson(res, 404, { error: "No matching league in Hooperville" })))
      .catch((err) => { console.error(err.message); sendJson(res, 502, { error: "Hooperville is not reachable" }); });
    return;
  }
  let file = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (file.endsWith("/")) file += "index.html";
  const full = path.join(root, path.normalize(file));
  const name = path.basename(full);
  if (!full.startsWith(root + path.sep) || name.startsWith(".") || hidden.has(name) || !types[path.extname(full)]) {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("Not found");
  }
  fs.readFile(full, (err, body) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "content-type": types[path.extname(full)], "cache-control": /\.(html|js|css)$/.test(name) ? "no-cache" : "public, max-age=300" });
    res.end(body);
  });
}).listen(process.env.PORT || 8080, () => console.log("Serving on :" + (process.env.PORT || 8080)));
