// Local-only dev server: serves the static app and mounts the /api/lookup
// serverless function so you can test everything without the Vercel CLI.
// Run with: node --env-file=.env dev-server.js
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const lookup = require("./api/lookup.js");
const visionLookup = require("./api/vision-lookup.js");
const swapSuggestion = require("./api/swap-suggestion.js");

const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/lookup") {
    const query = Object.fromEntries(url.searchParams);
    const shim = {
      status(code) {
        res.statusCode = code;
        return shim;
      },
      json(body) {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(body));
      },
    };
    await lookup({ query }, shim);
    return;
  }

  if (url.pathname === "/api/swap-suggestion") {
    const query = Object.fromEntries(url.searchParams);
    const shim = {
      status(code) {
        res.statusCode = code;
        return shim;
      },
      json(body) {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(body));
      },
    };
    await swapSuggestion({ query }, shim);
    return;
  }

  if (url.pathname === "/api/vision-lookup") {
    const shim = {
      status(code) {
        res.statusCode = code;
        return shim;
      },
      json(body) {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(body));
      },
    };

    let parsedBody;
    try {
      parsedBody = await readJsonBody(req);
    } catch {
      shim.status(400).json({ error: "Invalid JSON body." });
      return;
    }

    await visionLookup({ method: req.method, body: parsedBody }, shim);
    return;
  }

  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  filePath = path.join(__dirname, filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
