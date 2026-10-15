// Serves the site's files. No dependencies; Railway runs it with `npm start`.
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp"
};
const hidden = new Set(["server.js", "package.json", "railway.json"]);

http.createServer((req, res) => {
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
    res.writeHead(200, { "content-type": types[path.extname(full)], "cache-control": name === "index.html" ? "no-cache" : "public, max-age=300" });
    res.end(body);
  });
}).listen(process.env.PORT || 8080, () => console.log("Serving on :" + (process.env.PORT || 8080)));
