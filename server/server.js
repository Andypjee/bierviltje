// Bierviltje server: serveert de app en regelt de online kamers (codes) via WebSockets.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");
const BV = require("../shared/core.js");

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
// Versie van deze code: telefoons vergelijken die om te zien of er een update klaarstaat.
const VERSION = process.env.RENDER_GIT_COMMIT || String(Date.now());

/* ---------- Statische bestanden ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
};
const SPECIAL = {
  "/core.js": path.join(ROOT, "shared", "core.js"),
  "/vendor/qrcode.js": require.resolve("qrcode-generator/qrcode.js"),
};

function serveFile(res, file, req){
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()){ res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"}); return res.end("Niet gevonden"); }
    const ext = path.extname(file).toLowerCase();
    const longCache = ext === ".png";
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": longCache ? "public, max-age=604800" : "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, "http://x"); } catch { res.writeHead(400); return res.end(); }
  let p = decodeURIComponent(url.pathname);
  if (p === "/version"){ res.writeHead(200, {"Content-Type": "text/plain", "Cache-Control": "no-store"}); return res.end(VERSION); }
  if (p === "/healthz"){ res.writeHead(200, {"Content-Type": "text/plain"}); return res.end("ok"); }
  if (SPECIAL[p]) return serveFile(res, SPECIAL[p], req);
  if (p === "/" || /^\/[A-Za-z]{4}\/?$/.test(p)) p = "/index.html";   // ook bierviltje.app/ABCD werkt als uitnodiging
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)){ res.writeHead(403); return res.end(); }
  serveFile(res, file, req);
});

/* ---------- Kamers ---------- */
const rooms = new Map();
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
function newCode(){
  for (let tries = 0; tries < 1000; tries++){
    let c = ""; for (let i = 0; i < 4; i++) c += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    if (!rooms.has(c)) return c;
  }
  throw new Error("geen code vrij");
}

function createRoom(){
  const code = newCode();
  const g = BV.newGame("online");
  const room = {code, g, clients: new Set(), last: Date.now(), hostTimer: null};
  room.engine = BV.Engine(g, {
    emit: () => broadcast(room),
    fx: (kind, data) => sendAll(room, {t: "fx", kind, data}),
    err: (w, msg) => { for (const ws of room.clients) if (indexOf(room, ws.pid) === w) send(ws, {t: "err", msg}); },
  });
  rooms.set(code, room);
  return room;
}

const indexOf = (room, pid) => room.g.players.findIndex(p => p.id === pid && !p.gone);
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const sendAll = (room, m) => { const s = JSON.stringify(m); for (const ws of room.clients) if (ws.readyState === 1) ws.send(s); };

function broadcast(room){
  room.last = Date.now();
  const state = BV.pub(room.g, Date.now());
  const s = JSON.stringify(state);
  for (const ws of room.clients){
    const me = indexOf(room, ws.pid);
    if (me < 0){ send(ws, {t: "kicked"}); room.clients.delete(ws); ws.room = null; continue; }
    if (ws.readyState === 1) ws.send(`{"t":"state","code":"${room.code}","me":${me},"g":${s}}`);
  }
}

function ensureHost(room){
  const g = room.g;
  const host = g.players.find(p => p.id === g.hostId && !p.gone);
  if (host && host.online) { clearTimeout(room.hostTimer); room.hostTimer = null; return; }
  if (room.hostTimer) return;
  // Host weg? Na 30 seconden neemt de eerste speler die online is het over.
  room.hostTimer = setTimeout(() => {
    room.hostTimer = null;
    const h = g.players.find(p => p.id === g.hostId && !p.gone);
    if (h && h.online) return;
    const nh = g.players.find(p => p.online && !p.gone);
    if (nh){ g.hostId = nh.id; sendAll(room, {t: "fx", kind: "host", data: {name: nh.name}}); broadcast(room); }
  }, h0(room) ? 30000 : 1000);
}
const h0 = room => room.g.players.some(p => p.id === room.g.hostId && !p.gone);

function attach(ws, room, pid){
  if (ws.room && ws.room !== room) detach(ws);
  ws.room = room; ws.pid = pid;
  room.clients.add(ws);
}
function detach(ws){
  const room = ws.room; if (!room) return;
  room.clients.delete(ws); ws.room = null;
  const stillHere = [...room.clients].some(c => c.pid === ws.pid);
  const i = indexOf(room, ws.pid);
  if (i >= 0 && !stillHere){ room.g.players[i].online = false; ensureHost(room); broadcast(room); }
}

/* ---------- WebSocket ---------- */
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 4096 });

wss.on("connection", ws => {
  ws.isAlive = true; ws.room = null; ws.pid = null;
  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== "string") return;
    const pid = typeof m.pid === "string" ? m.pid.slice(0, 64) : ws.pid;

    if (m.t === "create"){
      if (!pid) return;
      const name = BV.cleanName(m.name);
      if (!name) return send(ws, {t: "err", msg: "Vul eerst je naam in."});
      const room = createRoom();
      BV.addPlayer(room.g, pid, name);
      room.g.hostId = pid;
      attach(ws, room, pid);
      return broadcast(room);
    }

    if (m.t === "join"){
      if (!pid) return;
      const code = String(m.code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
      const room = rooms.get(code);
      if (!room) return send(ws, {t: "err", msg: `Geen spel gevonden met code ${code || "…"}. Klopt de code?`, gone: true});
      const known = room.g.players.find(p => p.id === pid && !p.gone);
      const name = BV.cleanName(m.name);
      if (!known && !name) return send(ws, {t: "err", msg: "Vul eerst je naam in."});
      const i = BV.addPlayer(room.g, pid, known ? known.name : name);
      if (i < 0) return send(ws, {t: "err", msg: "Dit spel zit vol (maximaal 16 spelers)."});
      attach(ws, room, pid);
      if (!room.g.hostId) room.g.hostId = pid;
      ensureHost(room);
      if (!known) sendAll(room, {t: "fx", kind: "joined", data: {name: room.g.players[i].name}});
      return broadcast(room);
    }

    if (m.t === "leave"){
      const room = ws.room; if (!room) return;
      const i = indexOf(room, ws.pid);
      room.clients.delete(ws); ws.room = null;
      if (i >= 0){ BV.removePlayer(room.g, i); ensureHost(room); }
      return broadcast(room);
    }

    if (m.t === "ping") return send(ws, {t: "pong"});

    const room = ws.room; if (!room) return send(ws, {t: "err", msg: "Je zit niet (meer) in een spel.", gone: true});
    const w = indexOf(room, ws.pid);
    if (w < 0) return send(ws, {t: "kicked"});
    room.engine.act(w, m);
  });

  ws.on("close", () => detach(ws));
  ws.on("error", () => {});
});

// Verbindingen levend houden en dode telefoons opruimen.
setInterval(() => {
  for (const ws of wss.clients){
    if (!ws.isAlive){ ws.terminate(); continue; }
    ws.isAlive = false; try { ws.ping(); } catch {}
  }
}, 25000);

// Lege kamers na een uur weggooien.
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms){
    if (!room.clients.size && now - room.last > 60 * 60 * 1000){ room.engine.clearTimers(); clearTimeout(room.hostTimer); rooms.delete(code); }
  }
}, 5 * 60 * 1000);

server.listen(PORT, () => console.log(`Bierviltje draait op http://localhost:${PORT}`));
