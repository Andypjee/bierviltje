"use strict";
/* Bierviltje — de app op de telefoon.
   Eén telefoon: de spelmotor (core.js) draait hier in de browser.
   Online: de motor draait op de server, deze telefoon toont alleen de stand en stuurt knoppen door. */

const $ = s => document.querySelector(s);
const {esc, slok, LEVELS, TYPES} = BV;
const rnd = n => Math.floor(Math.random() * n);
const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k){ try { localStorage.removeItem(k); } catch (e) {} },
};
const PCOL = ["--t-opdracht","--t-wiezou","--t-nooit","--t-duel","--t-regel","--t-categorie","--t-mini"];
const TCOL = {opdracht:"--t-opdracht",nooit:"--t-nooit",wiezou:"--t-wiezou",regel:"--t-regel",duel:"--t-duel",categorie:"--t-categorie",mini:"--t-mini"};
const EXAMPLES = ["Sanne","Daan","Noor","Jesse"];
const GLASS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l-1.6 17.1a1 1 0 0 1-1 .9H8.6a1 1 0 0 1-1-.9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M6.7 9.5h10.6l-.95 10.5H7.65z" fill="currentColor"/></svg>';
const SND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const SND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';

let pid = store.get("bv-pid");
if (!pid){ pid = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)); store.set("bv-pid", pid); }
let sound = store.get("bv-sound", true);

/* Wat er nu op het scherm hoort: V.g is de (openbare) spelstatus, V.me mijn plek in de spelerslijst. */
const V = {mode: null, g: null, me: -1, code: null};
const online = () => V.mode === "online";

/* ================= Geluid ================= */
let ac = null;
function actx(){
  if (!sound) return null;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); return ac; } catch (e) { return null; }
}
function beep(f = 660, d = .06, type = "square", vol = .06){
  const a = actx(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .03);
}
function noise(d = .6, vol = .5, freq = 900){
  const a = actx(); if (!a) return;
  const len = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  const src = a.createBufferSource(), lp = a.createBiquadFilter(), g = a.createGain();
  lp.type = "lowpass"; lp.frequency.value = freq; g.gain.value = vol;
  src.buffer = buf; src.connect(lp).connect(g).connect(a.destination); src.start();
}
const sndCard = () => noise(.12, .35, 2400);
const sndBoom = () => { noise(1.1, .9, 700); beep(70, .6, "sine", .5); };
const sndBuzz = () => beep(140, .45, "sawtooth", .08);
const sndWin = () => { beep(880, .09, "triangle", .08); setTimeout(() => beep(1320, .14, "triangle", .08), 90); };
const sndClink = () => { beep(2093, .25, "sine", .05); setTimeout(() => beep(2637, .3, "sine", .04), 40); };
document.addEventListener("pointerdown", () => actx(), {once: true});

/* ================= Scherm aan houden ================= */
let wake = null;
async function keepAwake(){
  try { if (navigator.wakeLock && !wake){ wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } } catch (e) { wake = null; }
}

/* ================= Toast / flits / fouten ================= */
let toastT;
function toast(html, ms = 1900){
  const t = $("#toast"); t.innerHTML = html; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms);
}
function flash(text){
  const f = $("#flash"); f.textContent = text; f.hidden = false;
  f.style.animation = "none"; void f.offsetWidth; f.style.animation = "";
  setTimeout(() => { f.hidden = true; }, 1100);
}
function showErr(msg){
  const map = {home: "#homeErr", setup: "#setupErr", lobby: "#lobbyErr"};
  const el = map[screen] && $(map[screen]);
  if (el){ el.textContent = msg; el.hidden = false; } else toast(esc(msg), 2600);
}
function clearErr(){ ["#homeErr", "#setupErr", "#lobbyErr"].forEach(s => { $(s).hidden = true; }); }

/* ================= Schermen ================= */
let screen = "home";
const SCREENS = {home: "#scrHome", setup: "#scrSetup", lobby: "#scrLobby", game: "#scrGame", end: "#scrEnd"};
function show(name){
  if (name !== screen) clearErr();
  screen = name;
  for (const k in SCREENS) $(SCREENS[k]).hidden = k !== name;
  if (name !== "game"){ destroyCard(); }
  else keepAwake();
}

/* ================= Instellingen-blok (één telefoon + lobby) ================= */
function settingsHTML(level, types, editable){
  return `<div class="settings ${editable ? "" : "ro"}">
    <div class="field"><div class="lbl">${editable ? "Hoe hard gaan we?" : "Hoe hard gaan we? (kiest de host)"}</div>
      <div class="seg">${LEVELS.map((l, i) => `<button type="button" data-lv="${i}" aria-pressed="${i === level}"><b>${l.name}</b><span>${l.hint}</span></button>`).join("")}</div></div>
    <div class="field"><div class="lbl">Soorten viltjes</div>
      <div class="types">${Object.entries(TYPES).map(([k, t]) => `<button type="button" data-ty="${k}" aria-pressed="${!!types[k]}" style="--c:var(${TCOL[k]})"><i></i>${t.set}</button>`).join("")}</div></div>
  </div>`;
}
function settingsClick(e, level, types, apply){
  const lv = e.target.closest("[data-lv]"), ty = e.target.closest("[data-ty]");
  if (lv) apply(+lv.dataset.lv, types);
  if (ty){
    const k = ty.dataset.ty, t = {...types, [k]: !types[k]};
    if (!Object.values(t).some(Boolean)) return toast("Er moet minstens één soort aan staan.");
    apply(level, t);
  }
}

/* ================= Eén telefoon ================= */
const L = Object.assign({names: [...EXAMPLES], examples: true, level: 1, types: Object.fromEntries(Object.keys(TYPES).map(k => [k, true]))}, store.get("bv-local", {}));
const saveL = () => store.set("bv-local", L);
let LG = null, LE = null;

function localHooks(){
  return {
    emit: () => { V.mode = "local"; V.me = -1; render(BV.pub(LG, Date.now())); store.set("bv-local-game", LG); },
    fx: onFx,
    err: (w, m) => showErr(m),
  };
}
function startLocal(){
  if (L.names.length < 2) return showErr("Voeg minstens twee spelers toe. Alleen drinken is geen spel.");
  LG = BV.newGame("local"); LG.level = L.level; LG.types = {...L.types};
  LE = BV.Engine(LG, localHooks());
  V.mode = "local"; shownId = null;
  LE.act(-1, {t: "setPlayers", names: L.names});
  LE.act(-1, {t: "start"});
  sndCard();
}
function resumeLocal(){
  const g = store.get("bv-local-game");
  if (!g || !g.card) return;
  const M = g.card.mini;
  if (M){
    for (const k of Object.keys(M)) if (k[0] === "_") delete M[k];
    if (["live", "spin", "wait"].includes(M.status)) M.status = "idle";
  }
  LG = g; LE = BV.Engine(LG, localHooks()); V.mode = "local"; shownId = null;
  render(BV.pub(LG, Date.now()));
}
function quitLocal(){ if (LE) LE.clearTimers(); LG = LE = null; store.del("bv-local-game"); V.mode = null; V.g = null; goHome(); }

function renderSetup(){
  show("setup");
  $("#plist").innerHTML = L.names.map((n, i) => `<span class="pchip" style="--c:var(${PCOL[i % PCOL.length]})"><i></i>${esc(n)}<button type="button" data-rm="${i}" aria-label="${esc(n)} verwijderen">×</button></span>`).join("");
  $("#pCount").textContent = L.names.length === 1 ? "1 speler" : L.names.length + " spelers";
  $("#exNote").hidden = !L.examples;
  $("#localSettings").innerHTML = settingsHTML(L.level, L.types, true);
}

/* ================= Online verbinding ================= */
const net = {
  ws: null, want: false, backoff: 600, pending: [],
  connect(){
    this.want = true;
    if (this.ws && this.ws.readyState <= 1) return;
    const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      this.backoff = 600; setConn(true);
      const q = this.pending; this.pending = [];
      if (V.code && !q.some(m => m.t === "join" || m.t === "create")) ws.send(JSON.stringify({t: "join", code: V.code, pid}));
      q.forEach(m => ws.send(JSON.stringify(m)));
    };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onMsg(m); };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      if (this.want){ setConn(false); setTimeout(() => this.want && this.connect(), this.backoff); this.backoff = Math.min(this.backoff * 1.6, 5000); }
    };
  },
  send(m){
    m.pid = pid;
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m));
    else { this.pending.push(m); this.connect(); }
  },
  close(){ this.want = false; const ws = this.ws; this.ws = null; this.pending = []; try { ws && ws.close(); } catch (e) {} setConn(true); },
};
function setConn(ok){ const c = $("#conn"); c.hidden = ok || !online(); }
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (online() && net.want && (!net.ws || net.ws.readyState > 1)) net.connect();
  if (screen === "game") keepAwake();
});

function onMsg(m){
  if (m.t === "state"){
    V.mode = "online"; V.code = m.code; V.me = m.me;
    store.set("bv-online", {code: m.code, at: Date.now()});
    render(m.g);
  } else if (m.t === "fx") onFx(m.kind, m.data || {});
  else if (m.t === "err"){
    if (m.gone){ store.del("bv-online"); if (online() && screen !== "home"){ leaveOnline(false); } else { net.close(); V.mode = null; V.code = null; } }
    showErr(m.msg);
  } else if (m.t === "kicked"){
    leaveOnline(false); toast("De host heeft je uit het spel gehaald.", 3000);
  }
}
function leaveOnline(tell = true){
  if (tell) net.send({t: "leave"});
  setTimeout(() => net.close(), tell ? 150 : 0);
  store.del("bv-online");
  V.mode = null; V.code = null; V.g = null; V.me = -1;
  goHome();
}
function send(m){ if (V.mode === "local"){ LE && LE.act(-1, m); } else net.send(m); }

/* ================= Alles tekenen ================= */
function render(g){
  V.g = g;
  if (g.phase === "setup") renderSetup();
  else if (g.phase === "lobby") renderLobby();
  else if (g.phase === "game") renderGame();
  else if (g.phase === "end") renderEnd();
  setConn(!net.want || (net.ws && net.ws.readyState === 1));
}
const nmi = i => `<b class="nm">${esc(V.g.players[i] ? V.g.players[i].name : "?")}</b>`;
const pname = i => (V.g.players[i] ? V.g.players[i].name : "?");
const ctrl = () => BV.canAdvance(V.g, V.me);
const isHost = () => BV.isHost(V.g, V.me);

/* ---------- Lobby ---------- */
let qrFor = null;
function qrSVG(text){
  try { const q = qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({cellSize: 4, margin: 0, scalable: true}); } catch (e) { return ""; }
}
const inviteURL = () => `${location.origin}/?code=${V.code}`;
function renderLobby(){
  show("lobby");
  const g = V.g, host = isHost();
  $("#bigCode").textContent = V.code;
  if (qrFor !== V.code){ qrFor = V.code; $("#qr").innerHTML = qrSVG(inviteURL()); }
  const hostP = g.players.find(p => p.id === g.hostId);
  $("#lobbyRole").textContent = host ? "Jij bent de host" : `Host: ${hostP ? hostP.name : "…"}`;
  $("#lobbyPlayers").innerHTML = g.players.map((p, i) => {
    const tags = (p.id === g.hostId ? `<span class="tag">host</span>` : "") + (i === V.me ? `<span class="tag">jij</span>` : "");
    const kick = host && p.id !== g.hostId ? `<button type="button" data-kick="${i}" aria-label="${esc(p.name)} verwijderen">×</button>` : "";
    return `<span class="pchip ${i === V.me ? "me" : ""} ${p.online ? "" : "off"} ${kick ? "" : "solo"}" style="--c:var(${PCOL[i % PCOL.length]})"><i></i>${esc(p.name)}${tags}${kick}</span>`;
  }).join("");
  const n = g.players.length;
  $("#lobbyCount").textContent = n === 1 ? "1 speler" : n + " spelers";
  $("#lobbySettings").innerHTML = settingsHTML(g.level, g.types, host);
  const b = $("#btnStartOnline");
  b.hidden = !host; $("#lobbyWait").hidden = host;
  b.disabled = n < 2;
  b.textContent = n < 2 ? "Wacht op minstens één speler" : `Start met ${n} spelers`;
}

/* ---------- Spel ---------- */
let shownId = null, cardEl = null, miniCtl = null, lastTurnMine = false, lastSelMine = "";
function destroyCard(){ if (miniCtl){ miniCtl.destroy(); miniCtl = null; } shownId = null; cardEl = null; $("#deck").innerHTML = ""; }

function renderHeader(){
  const g = V.g;
  $("#roundNo").textContent = g.round;
  const mine = online() && g.turn === V.me;
  const t = $("#turn");
  t.classList.toggle("mine", mine);
  t.innerHTML = `Aan de beurt<b>${mine ? "Jij!" : esc(pname(g.turn))}</b>`;
  if (mine && !lastTurnMine) vib([60, 40, 60]);
  lastTurnMine = mine;
  $("#btnSound").innerHTML = sound ? SND_ON : SND_OFF;
  const r = $("#rules");
  r.hidden = !g.rules.length;
  r.innerHTML = g.rules.map((x, i) => `<button class="rule" data-rule="${i}">${esc(x.name)}<em>${Math.max(1, x.left - 1)}</em></button>`).join("");
}

function sizeClass(html){
  const len = html.replace(/<[^>]+>/g, "").length;
  return len < 70 ? "sz-l" : len < 130 ? "sz-m" : "sz-s";
}
function footHTML(c){
  const sw = `<span class="swipe">${online() ? "" : "veeg om door te gaan"}</span>`;
  if (c.foot) return `<span class="sips">${c.foot}</span>${sw}`;
  if (c.mini && c.mini.kind === "hl" && !c.sips) return `<span class="sips muted">${GLASS} inzet loopt op</span>${sw}`;
  return c.sips ? `<span class="sips">${GLASS} ${slok(c.sips)}</span>${sw}` : `<span class="sips muted">Iedereen doet mee</span>${sw}`;
}

function mountCard(animate){
  const deck = $("#deck"), c = V.g.card;
  if (miniCtl){ miniCtl.destroy(); miniCtl = null; }
  const old = deck.querySelector(".card:not(.out)");
  if (old && animate){ old.classList.add("out"); setTimeout(() => old.remove(), 400); }
  else if (old) old.remove();
  const el = document.createElement("article");
  el.className = `card t-${c.type}` + (animate ? " in" : "");
  el.innerHTML = `
    <div class="c-top"><span class="stamp">${c.stamp}</span><span class="c-no">№ ${c.no}</span></div>
    <div class="c-body">
      ${c.lead ? `<div class="lead">${c.lead}</div>` : ""}
      ${c.html ? `<p class="txt ${sizeClass(c.html)}">${c.html}</p>` : ""}
      ${c.sub ? `<p class="sub">${c.sub}</p>` : ""}
      ${c.mini ? `<div class="mini"></div>` : ""}
    </div>
    <div class="c-foot">${footHTML(c)}</div>`;
  deck.appendChild(el);
  if (animate) el.addEventListener("animationend", () => el.classList.remove("in"), {once: true});
  cardEl = el;
  if (c.mini) miniCtl = MINI[c.mini.kind](c, el, el.querySelector(".mini"));
  if (!online()) bindSwipe(el);
}

function renderGame(){
  const first = screen !== "game";
  show("game");
  const g = V.g, c = g.card;
  renderHeader();
  if (!cardEl || c.id !== shownId){ mountCard(!first && shownId !== null); shownId = c.id; lastSelMine = ""; }
  else { const f = cardEl.querySelector(".c-foot"); const h = footHTML(c); if (f.innerHTML !== h) f.innerHTML = h; }
  if (miniCtl) miniCtl.update(c.mini, c);
  renderDock();
}

function renderDock(){
  const g = V.g, c = g.card, on = online(), showWho = c.sips > 0;
  $("#who").hidden = !showWho;
  if (showWho){
    $("#whoLabel").textContent = c.pick;
    $("#whoSips").textContent = "+" + slok(c.sips);
    $("#chips").innerHTML = g.players.map((p, i) => p.gone ? "" :
      `<button class="chip ${i === V.me ? "me" : ""}" data-chip="${i}" aria-pressed="${g.sel.includes(i)}" ${BV.canMark(g, V.me, i) ? "" : "disabled"}>${i === V.me ? "Jij" : esc(p.name)}</button>`).join("");
  }
  const you = $("#you");
  const mineSel = on && showWho && g.sel.includes(V.me);
  you.hidden = !mineSel;
  if (mineSel){
    you.className = "you"; you.textContent = `Jij drinkt ${slok(c.sips)}!`;
    const key = c.id + ":" + c.sips;
    if (lastSelMine !== key){ lastSelMine = key; vib([120, 60, 120]); }
  } else lastSelMine = "";
  const b = $("#btnNext");
  const may = !on || BV.canAdvance(g, V.me);
  b.disabled = !may;
  const go = showWho && g.sel.length > 0;
  b.classList.toggle("go", may && go);
  b.textContent = !may ? `Wacht op ${pname(g.turn)}…` : go ? "Proost, volgende" : "Volgende viltje";
}

function bindSwipe(el){
  let x0 = null, y0 = 0, dx = 0;
  el.addEventListener("pointerdown", e => { if (e.target.closest("button,canvas")) return; x0 = e.clientX; y0 = e.clientY; dx = 0; });
  el.addEventListener("pointermove", e => {
    if (x0 === null) return;
    dx = e.clientX - x0;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - y0)) el.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
  });
  const end = () => {
    if (x0 === null) return; x0 = null;
    if (Math.abs(dx) > 90){ el.style.transform = ""; send({t: "next"}); }
    else { el.style.transition = "transform .25s"; el.style.transform = ""; setTimeout(() => { el.style.transition = ""; }, 260); }
  };
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end); el.addEventListener("pointerleave", end);
}

/* ================= Minigames ================= */
function setHTML(el, html){ if (el._h !== html){ el._h = html; el.innerHTML = html; } }
const MINI = {};

/* Categorie: 5 seconden per beurt */
MINI.cat = (c, el, box) => {
  box.innerHTML = `<div class="tsec">5</div><div class="tbar"><i></i></div><p class="mnote" hidden></p><div class="mrow"><button class="mbtn" hidden></button></div>`;
  const sec = box.querySelector(".tsec"), bar = box.querySelector(".tbar i"), note = box.querySelector(".mnote"), btn = box.querySelector(".mbtn");
  let M0 = null, deadline = 0, raf = 0, lastS = null, alive = true, lastSpk = null;
  const setNote = h => { note.hidden = !h; if (h) setHTML(note, h); };
  const loud = () => !online() || (M0 && M0.speaker === V.me);
  const loop = () => {
    if (!alive) return;
    if (M0 && M0.status === "live"){
      const left = Math.max(0, deadline - performance.now());
      bar.style.transform = `scaleX(${left / 5000})`;
      const s = Math.ceil(left / 1000);
      if (s !== lastS){ lastS = s; sec.textContent = s; if (s <= 3 && s > 0 && loud()) beep(990, .05); }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  btn.onclick = () => { if (!M0) return; send({t: "mini", a: M0.status === "live" ? "said" : "start"}); if (M0.status === "live") beep(1500, .04, "triangle"); };
  return {
    update(M){
      M0 = M;
      const on = online(), g = V.g;
      if (M.status === "live"){ deadline = performance.now() + (M.msLeft != null ? M.msLeft : 5000); lastS = null; }
      el.classList.toggle("hot", on && M.status === "live" && M.speaker === V.me);
      if (M.status === "idle"){
        sec.textContent = "5"; bar.style.transform = "scaleX(1)";
        setNote(on && !ctrl() ? `${nmi(c.p)} start de klok.` : "");
        btn.hidden = !ctrl(); btn.textContent = "Start de klok";
      } else if (M.status === "live"){
        if (on){
          const mine = M.speaker === V.me;
          if (mine && lastSpk !== V.me) vib(150);
          setNote(mine ? "Jij bent! Noem iets." : `${nmi(M.speaker)} is aan de beurt.`);
          btn.hidden = !BV.actsFor(g, V.me, M.speaker);
          btn.textContent = mine ? "Gezegd!" : `Gezegd namens ${pname(M.speaker)}`;
        } else {
          setNote(M.count ? `${M.count} genoemd` : "Tik na elk antwoord.");
          btn.hidden = false; btn.textContent = "Gezegd! Volgende";
        }
        lastSpk = M.speaker;
      } else {
        sec.textContent = "Te laat!"; bar.style.transform = "scaleX(0)";
        setNote(on ? `${nmi(M.speaker)} was te laat en drinkt ${slok(c.sips)}.` : "Wie bleef hangen? Tik de naam hieronder aan.");
        btn.hidden = !ctrl(); btn.textContent = "Nieuwe ronde";
        lastSpk = null;
      }
    },
    destroy(){ alive = false; cancelAnimationFrame(raf); },
  };
};

/* Bom: lont aan, doorgeven, BOEM */
MINI.bom = (c, el, box) => {
  let M0 = null, tickT = 0, alive = true, recv = 0, lastHolder = null;
  const tick = () => {
    if (!alive || !M0 || M0.status !== "live") return;
    const e = (M0.elapsed || 0) + (performance.now() - recv), k = Math.min(1, e / 30000);
    if (!online() || M0.holder === V.me){ beep(k > .6 ? 1180 : 860, .035, "square", .05); vib(12); }
    tickT = setTimeout(tick, 650 - 480 * k + Math.random() * 60);
  };
  box.addEventListener("click", e => { const b = e.target.closest("[data-a]"); if (b) send({t: "mini", a: b.dataset.a}); });
  return {
    update(M){
      const was = M0 && M0.status; M0 = M; recv = performance.now();
      const on = online(), live = M.status === "live";
      el.classList.toggle("ticking", live);
      el.classList.toggle("hot", live && on && M.holder === V.me);
      $("#dock").classList.toggle("dim", live && !on);
      if (live && was !== "live"){ clearTimeout(tickT); tick(); }
      if (!live) clearTimeout(tickT);
      if (M.status === "idle"){
        setHTML(box, ctrl() ? `<div class="mrow"><button class="mbtn" data-a="start">Steek de lont aan</button></div>` : `<p class="mnote">Wacht tot ${nmi(c.p)} de lont aansteekt.</p>`);
      } else if (live){
        if (!on) setHTML(box, `<div class="fuse"><span class="spark"></span></div><p class="mnote">Noemen en doorgeven!</p>`);
        else if (M.holder === V.me){
          if (lastHolder !== V.me) vib([150, 50, 150]);
          setHTML(box, `<p class="holder">Jij hebt de bom!</p><p class="mnote">Noem iets en geef hem door.</p><div class="mrow"><button class="mbtn big" data-a="pass">Doorgeven</button></div>`);
        } else {
          const can = BV.actsFor(V.g, V.me, M.holder);
          setHTML(box, `<div class="fuse"><span class="spark"></span></div><p class="mnote">De bom ligt bij ${nmi(M.holder)}.</p>` +
            (can ? `<div class="mrow"><button class="mbtn ghost" data-a="pass">Doorgeven namens ${esc(pname(M.holder))}</button></div>` : ""));
        }
        lastHolder = M.holder;
      } else {
        setHTML(box, on ? `<p class="mres">BOEM!</p><p class="mnote">${nmi(M.holder)} had hem vast en drinkt ${slok(c.sips)}.</p>`
                        : `<p class="mres">BOEM!</p><p class="mnote">Wie had hem vast? Tik de naam hieronder aan.</p>`);
      }
    },
    destroy(){ alive = false; clearTimeout(tickT); $("#dock").classList.remove("dim"); },
  };
};

/* Rad: iedere telefoon draait hetzelfde rad mee */
MINI.rad = (c, el, box) => {
  box.innerHTML = `<div class="wheel"><canvas></canvas><span class="pin"></span></div><div class="mact"></div>`;
  const cv = box.querySelector("canvas"), act = box.querySelector(".mact");
  const cols = PCOL.map(css), ink = css("--ink"), TAU = Math.PI * 2;
  let rot = 0, raf = 0, spinning = false, spunFor = null, M0 = null, list = [];
  function drawWheel(){
    const size = cv.clientWidth || 180, dpr = window.devicePixelRatio || 1, n = Math.max(1, list.length), seg = TAU / n;
    if (cv.width !== Math.round(size * dpr)) cv.width = cv.height = Math.round(size * dpr);
    const gx = cv.getContext("2d"); gx.setTransform(dpr, 0, 0, dpr, 0, 0); gx.clearRect(0, 0, size, size);
    const r = size / 2;
    gx.save(); gx.translate(r, r); gx.rotate(rot);
    list.forEach((pi, i) => {
      gx.beginPath(); gx.moveTo(0, 0); gx.arc(0, 0, r - 1, i * seg, (i + 1) * seg); gx.closePath();
      gx.fillStyle = cols[pi % cols.length]; gx.fill(); gx.lineWidth = 3; gx.strokeStyle = ink; gx.stroke();
      gx.save(); gx.rotate(i * seg + seg / 2); gx.textAlign = "right"; gx.textBaseline = "middle"; gx.fillStyle = ink;
      gx.font = `800 ${Math.max(10, Math.min(15, 110 / n + 4))}px "Bricolage Grotesque", system-ui, sans-serif`;
      const name = pname(pi); gx.fillText(name.length > 9 ? name.slice(0, 8) + "…" : name, r - 10, 0); gx.restore();
    });
    gx.restore();
    gx.beginPath(); gx.arc(r, r, 13, 0, TAU); gx.fillStyle = ink; gx.fill();
  }
  const segAt = a => Math.floor((((-Math.PI / 2 - a) % TAU) + TAU) % TAU / (TAU / list.length));
  function actions(){
    const M = M0;
    if (spinning) return setHTML(act, `<p class="mnote">Het rad draait…</p>`);
    if (M.status === "idle") return setHTML(act, ctrl() ? `<div class="mrow"><button class="mbtn" data-a="spin">Draai het rad</button></div>` : `<p class="mnote">${nmi(c.p)} draait het rad.</p>`);
    if (M.w != null) setHTML(act, `<p class="mres">${M.w === V.me && online() ? "Jij drinkt" : nmi(M.w) + " drinkt"} ${slok(c.sips)}!</p>`);
  }
  act.addEventListener("click", e => { const b = e.target.closest("[data-a]"); if (b){ b.disabled = true; send({t: "mini", a: "spin"}); } });
  function animate(M){
    const target = BV.radTarget(M.rot0, list.indexOf(M.w), list.length, M.jit), start = M.rot0, dur = 4300;
    const t0 = performance.now() - Math.min(M.elapsed || 0, dur);
    let last = segAt(start);
    spinning = true;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      rot = start + (target - start) * e; drawWheel();
      const idx = segAt(rot); if (idx !== last){ last = idx; beep(1500, .015, "triangle", .05); vib(5); }
      if (k < 1) raf = requestAnimationFrame(step);
      else { spinning = false; rot = target; drawWheel(); actions(); }
    };
    raf = requestAnimationFrame(step);
  }
  return {
    update(M){
      M0 = M;
      list = M.seg || BV.active(V.g);
      const key = M.status !== "idle" && M.seg ? M.w + ":" + M.rot0 : null;
      if (M.status === "spin" && key !== spunFor){ spunFor = key; cancelAnimationFrame(raf); animate(M); }
      else if (!spinning){
        if (M.status === "done" && spunFor === null && M.seg) spunFor = key;
        rot = M.rot || 0; requestAnimationFrame(drawWheel);
      }
      actions();
    },
    destroy(){ cancelAnimationFrame(raf); },
  };
};

/* Hoger / lager */
MINI.hl = (c, el, box) => {
  const LBL = {11: "B", 12: "V", 13: "H", 14: "A"}, SUITS = ["♠", "♥", "♦", "♣"];
  let lastN = null;
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-g]"); if (!b) return;
    const g = b.dataset.g;
    send(g === "stop" ? {t: "mini", a: "stop"} : {t: "mini", a: "guess", dir: g});
  });
  return {
    update(M){
      const can = BV.actsFor(V.g, V.me, c.p), k = M.cur, red = k.s === 1 || k.s === 2;
      const flip = lastN !== null && M.n !== lastN; lastN = M.n;
      let h = `<div class="pc ${red ? "red" : ""} ${flip ? "flip" : ""}" data-n="${M.n}">${LBL[k.v] || k.v}<small>${SUITS[k.s]}</small></div>`;
      if (M.msg) h += `<p class="mnote">${M.msg}</p>`;
      if (!M.done){
        if (can){
          h += `<div class="mrow"><button class="mbtn" data-g="up">Hoger</button><button class="mbtn" data-g="down">Lager</button></div>`;
          if (M.streak) h += `<div class="mrow"><button class="mbtn ghost" data-g="stop">Stop en deel ${slok(LEVELS[V.g.level].f(M.streak))} uit</button></div>`;
        } else h += `<p class="mnote">${nmi(c.p)} raadt…</p>`;
      }
      setHTML(box, h);
    },
    destroy(){},
  };
};

/* Reactie: één telefoon = gesplitst scherm, online = iedereen op de eigen telefoon */
MINI.reactie = (c, el, box) => {
  let armed = null, rx = null;
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-a]"); if (!b) return;
    if (b.dataset.a === "duel") openDuel(c);
    else send({t: "mini", a: "arm"});
  });
  function closeRx(){ if (rx){ clearTimeout(rx.timer); rx = null; } $("#rxOv").hidden = true; $("#rxOv").onpointerdown = null; }
  function openRx(M){
    const ov = $("#rxOv"), big = $("#rxBig"), small = $("#rxSmall");
    closeRx();
    rx = {state: "wait", tGo: 0, timer: 0};
    ov.className = "rx"; big.textContent = "Wacht…"; small.textContent = "Vinger klaar. Tik pas bij NU!";
    ov.hidden = false;
    rx.timer = setTimeout(() => {
      if (!rx || rx.state !== "wait") return;
      rx.state = "go"; rx.tGo = performance.now();
      ov.className = "rx go"; big.textContent = "NU!"; small.textContent = "Tik!";
      beep(1250, .15, "square", .09); vib(80);
    }, Math.max(0, M.goIn || 0));
    ov.onpointerdown = e => {
      e.preventDefault();
      if (!rx) return;
      if (rx.state === "wait"){
        rx.state = "sent"; clearTimeout(rx.timer);
        ov.className = "rx early"; big.textContent = "Te vroeg!"; small.textContent = "Wachten op de rest…";
        sndBuzz(); vib([200, 60, 200]);
        send({t: "mini", a: "tap", early: true});
      } else if (rx.state === "go"){
        const ms = Math.round(performance.now() - rx.tGo);
        rx.state = "sent";
        ov.className = "rx done"; big.textContent = ms + " ms"; small.textContent = "Wachten op de rest…";
        send({t: "mini", a: "tap", ms});
      }
    };
  }
  return {
    update(M){
      if (!online()){
        setHTML(box, M.status === "done" ? `<p class="mres">${M.res}</p>` : `<div class="mrow"><button class="mbtn" data-a="duel">Start het duel</button></div>`);
        return;
      }
      if (M.status === "idle"){
        setHTML(box, ctrl() ? `<div class="mrow"><button class="mbtn" data-a="arm">Start de reactietest</button></div>` : `<p class="mnote">Wacht tot ${nmi(c.p)} de test start.</p>`);
      } else if (M.status === "wait"){
        if (M.part.includes(V.me) && armed !== M.armId){ armed = M.armId; openRx(M); }
        setHTML(box, `<p class="mnote">Kijk naar je scherm… ${Object.keys(M.taps).length} van ${M.part.length} getikt.</p>`);
      } else {
        if (rx || !$("#rxOv").hidden) setTimeout(closeRx, 1300);
        const lose = new Set(M.losers);
        setHTML(box, `<ol class="results">${M.results.map(r => `<li class="${lose.has(r.i) ? "lose" : ""}"><span>${r.i === V.me ? "Jij" : esc(pname(r.i))}</span><span>${r.ms === -1 ? "te vroeg" : r.ms == null ? "geen tik" : r.ms + " ms"}</span></li>`).join("")}</ol>`);
      }
    },
    destroy(){ closeRx(); },
  };
};

/* Gesplitst scherm voor één telefoon */
function openDuel(c){
  const ov = $("#duelOv"), top = $("#halfTop"), bot = $("#halfBot"), close = $("#duelClose");
  const sides = [{el: top, who: c.o}, {el: bot, who: c.p}];
  let state = "wait", timer = 0, t0 = 0, result = null;
  ov.hidden = false; ov.className = "duel"; close.hidden = true;
  sides.forEach(s => { s.el.className = "half " + (s.el === top ? "top" : "bot"); s.el.querySelector(".dn").textContent = pname(s.who); s.el.querySelector(".dm").textContent = "Vinger klaar… wacht op NU!"; });
  timer = setTimeout(() => {
    state = "go"; t0 = performance.now(); ov.classList.add("go");
    sides.forEach(s => s.el.querySelector(".dm").textContent = "NU!");
    beep(1250, .15, "square", .09); vib(80);
  }, 1800 + Math.random() * 3800);
  const finish = (w, l, mw, ml) => {
    state = "done"; clearTimeout(timer); ov.classList.remove("go");
    w.el.classList.add("win"); l.el.classList.add("lose");
    w.el.querySelector(".dm").textContent = mw; l.el.querySelector(".dm").textContent = ml;
    close.hidden = false;
  };
  const hit = s => e => {
    e.preventDefault();
    if (state === "done") return;
    const other = sides.find(x => x !== s);
    if (state === "wait"){
      sndBuzz(); vib([200, 60, 200]);
      finish(other, s, "Gewonnen! De ander was te vroeg.", `Te vroeg! Drink ${slok(c.sips)}.`);
      result = {winner: other.who, loser: s.who, early: true};
    } else {
      const ms = Math.round(performance.now() - t0);
      sndWin(); vib([60, 40, 60]);
      finish(s, other, `Gewonnen in ${ms} ms!`, `Te traag. Drink ${slok(c.sips)}.`);
      result = {winner: s.who, loser: other.who, ms};
    }
  };
  top.onpointerdown = hit(sides[0]); bot.onpointerdown = hit(sides[1]);
  close.onclick = () => {
    clearTimeout(timer); ov.hidden = true; top.onpointerdown = bot.onpointerdown = null;
    if (result) send({t: "mini", a: "result", ...result});
  };
}

/* ================= Effecten van de motor ================= */
function onFx(kind, d){
  const g = V.g;
  const who = list => list.map(i => (online() && i === V.me) ? "jou" : `<b>${esc(g && g.players[i] ? g.players[i].name : "?")}</b>`);
  switch (kind){
    case "logged": {
      sndClink(); vib(30);
      const n = who(d.sel);
      toast(`+${slok(d.sips)} voor ${n.length > 3 ? n.length + " mensen" : n.join(", ")}`);
      break;
    }
    case "card": sndCard(); break;
    case "expired": setTimeout(() => toast(`Regel voorbij: <b>${d.names.map(esc).join(", ")}</b>`), 900); break;
    case "boom": sndBoom(); flash("BOEM!"); vib([500, 100, 300]); break;
    case "buzz": sndBuzz(); if (!online() || (d.who || []).includes(V.me)) vib([200, 60, 200]); break;
    case "win": sndWin(); vib([60, 40, 60]); break;
    case "good": beep(660 + d.streak * 120, .1, "triangle", .08); vib(25); break;
    case "pass": beep(520, .05, "triangle", .06); break;
    case "joined": if (screen === "lobby") beep(880, .08, "triangle"); toast(`<b>${esc(d.name)}</b> doet mee`); break;
    case "host": toast(`<b>${esc(d.name)}</b> is nu de host`); break;
  }
}

/* ================= Stand ================= */
function openSheet(){
  const g = V.g, on = online(), host = isHost();
  const max = Math.max(1, ...g.players.map(p => p.sips));
  const rows = g.players.map((p, i) => ({p, i})).filter(x => !x.p.gone).sort((a, b) => b.p.sips - a.p.sips).map(({p, i}) => {
    const can = !on || host || i === V.me;
    return `<div class="srow" style="--c:var(${PCOL[i % PCOL.length]})">
      <span class="n">${i === V.me ? "Jij" : esc(p.name)}${on && !p.online ? " · weg" : ""}</span>
      ${can ? `<button class="sbtn" data-adj="${i}" data-d="-1" aria-label="Eén slok minder">−</button>` : "<span></span>"}
      <span class="v">${p.sips}</span>
      ${can ? `<button class="sbtn" data-adj="${i}" data-d="1" aria-label="Eén slok extra">+</button>` : "<span></span>"}
      <div class="bar2"><i style="width:${p.sips / max * 100}%"></i></div></div>`;
  }).join("");
  const rules = g.rules.length ? `<div class="lbl">Actieve regels</div><ul class="rlist">${g.rules.map(r => `<li><b>${esc(r.name)} · nog ${Math.max(1, r.left - 1)}</b>${r.html}</li>`).join("")}</ul>` : "";
  const invite = on ? `<div class="invite"><div class="qr">${qrSVG(inviteURL())}</div><div><span>Iemand later erbij? Code:</span><b>${V.code}</b></div></div>` : "";
  const left = !on || host ? `<button data-act="end">Spel afronden</button>` : `<button data-act="leave">Spel verlaten</button>`;
  $("#sheet").innerHTML = `<h2>De stand</h2>
    <p class="hint">${on ? "Regel overtreden? Tel je eigen slok erbij met +." : "Regel overtreden of extra slok? Tel hem erbij met +."}</p>
    ${rows}${rules}${invite}
    <div class="sacts">${left}<button class="pri" data-act="close">Verder spelen</button></div>`;
  $("#scrim").hidden = false;
}
const closeSheet = () => { $("#scrim").hidden = true; };

/* ================= Einde ================= */
function renderEnd(){
  show("end");
  const g = V.g, on = online(), host = isHost();
  const ps = g.players.map((p, i) => ({...p, i})).filter(p => !p.gone).sort((a, b) => b.sips - a.sips);
  const total = ps.reduce((a, p) => a + p.sips, 0);
  const top = ps[0], low = ps[ps.length - 1], tie = !top || top.sips === low.sips;
  const nm = p => p.i === V.me && on ? "Jij" : esc(p.name);
  let btns;
  if (!on) btns = `<button class="cta" data-end="again">Nieuw potje</button>
    <button class="next alt" data-end="setup">Spelers aanpassen</button>
    <button class="next alt" data-end="home">Naar het begin</button>`;
  else if (host) btns = `<button class="cta" data-end="again">Nieuw potje</button>
    <button class="next alt" data-end="lobby">Terug naar de lobby</button>`;
  else btns = `<p class="wait">Wachten op de host voor een nieuw potje…</p><button class="next alt" data-end="leave">Spel verlaten</button>`;
  $("#scrEnd").innerHTML = `
    <h2>Laatste ronde geweest.</h2>
    <p class="sum">Samen <b>${slok(total)}</b> in <b>${g.round} viltjes</b>.</p>
    <div class="awards">
      ${tie ? `<div class="award" style="--c:var(--t-duel)"><small>Gelijkspel</small><b>Allemaal even ver</b><span>${slok(top ? top.sips : 0)} per persoon</span></div>`
            : `<div class="award" style="--c:var(--t-opdracht)"><small>Zuipschuit</small><b>${nm(top)}</b><span>${slok(top.sips)}</span></div>
               <div class="award" style="--c:var(--t-wiezou)"><small>Heilig boontje</small><b>${nm(low)}</b><span>${slok(low.sips)}</span></div>`}
    </div>
    <ol class="rank">${ps.map(p => `<li><span class="n">${nm(p)}</span><span class="v">${p.sips}</span></li>`).join("")}</ol>
    <p class="water"><b>Pak eerst een glas water.</b> Daarna nog een potje?</p>
    ${btns}`;
}

/* ================= Begin-scherm ================= */
function goHome(){
  show("home");
  const params = new URLSearchParams(location.search);
  const pathCode = (location.pathname.match(/^\/([A-Za-z]{4})\/?$/) || [])[1];
  const code = (params.get("code") || pathCode || "").toUpperCase();
  if (code && !$("#joinCode").value) $("#joinCode").value = code.slice(0, 4);
  const box = $("#resumeBox");
  const lg = store.get("bv-local-game"), on = store.get("bv-online");
  if (lg && lg.phase === "game"){
    box.hidden = false;
    box.innerHTML = `<div class="resume"><div><b>Potje op deze telefoon</b>Bij viltje ${lg.round} gebleven</div><button data-resume="local">Verder</button><button class="x" data-resume="dropLocal" aria-label="Weggooien">×</button></div>`;
  } else if (on && Date.now() - on.at < 6 * 3600e3){
    box.hidden = false;
    box.innerHTML = `<div class="resume"><div><b>Terug naar spel ${esc(on.code)}</b>Je zat nog in dit spel</div><button data-resume="online">Terug</button><button class="x" data-resume="dropOnline" aria-label="Vergeten">×</button></div>`;
  } else box.hidden = true;
  renderInstall();
}

function needName(){
  const name = BV.cleanName($("#myName").value);
  if (!name){ showErr("Vul eerst je naam in."); $("#myName").focus(); return null; }
  store.set("bv-name", name);
  return name;
}

/* ================= App installeren ================= */
let deferredPrompt = null;
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredPrompt = e; renderInstall(); });
window.addEventListener("appinstalled", () => { deferredPrompt = null; renderInstall(); toast("Bierviltje staat op je beginscherm"); });
function renderInstall(){
  const box = $("#installBox"), btn = $("#btnInstall"), hint = $("#installHint");
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (standalone()){ box.hidden = true; return; }
  if (deferredPrompt){ box.hidden = false; btn.hidden = false; hint.textContent = "Dan open je het als een app, zonder adresbalk."; }
  else if (ios){ box.hidden = false; btn.hidden = true; hint.textContent = "Tik in Safari onderaan op Deel en kies ‘Zet op beginscherm’."; }
  else { box.hidden = false; btn.hidden = true; hint.textContent = "Open het browsermenu en kies ‘App installeren’ of ‘Toevoegen aan startscherm’."; }
}
$("#btnInstall").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  try { await deferredPrompt.userChoice; } catch (e) {}
  deferredPrompt = null; renderInstall();
});

/* ================= Knoppen ================= */
$("#myName").value = store.get("bv-name", "");
$("#joinCode").addEventListener("input", e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4); });
$("#btnHost").addEventListener("click", () => {
  clearErr(); const name = needName(); if (!name) return;
  V.code = null; V.mode = "online"; net.send({t: "create", name});
});
$("#joinForm").addEventListener("submit", e => {
  e.preventDefault(); clearErr();
  const code = $("#joinCode").value.trim().toUpperCase();
  if (code.length !== 4) return showErr("Een code heeft vier letters.");
  const name = needName(); if (!name) return;
  V.code = null; V.mode = "online"; net.send({t: "join", code, name});
});
$("#btnLocal").addEventListener("click", () => {
  const name = BV.cleanName($("#myName").value);
  if (name){ store.set("bv-name", name); if (L.examples){ L.names = [name]; L.examples = false; saveL(); } }
  V.mode = "local"; renderSetup();
});
$("#resumeBox").addEventListener("click", e => {
  const b = e.target.closest("[data-resume]"); if (!b) return;
  const a = b.dataset.resume;
  if (a === "local") resumeLocal();
  if (a === "dropLocal"){ store.del("bv-local-game"); goHome(); }
  if (a === "online"){ const on = store.get("bv-online"); if (on){ V.mode = "online"; V.code = on.code; net.send({t: "join", code: on.code}); } }
  if (a === "dropOnline"){ store.del("bv-online"); goHome(); }
});
document.addEventListener("click", e => { if (e.target.closest("[data-home]")) goHome(); });

$("#addForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = BV.cleanName($("#pName").value);
  if (!v) return;
  if (L.examples){ L.names = []; L.examples = false; }
  if (L.names.length >= BV.MAX_PLAYERS) return toast(`Maximaal ${BV.MAX_PLAYERS} spelers.`);
  if (L.names.some(n => n.toLowerCase() === v.toLowerCase())) return toast(`<b>${esc(v)}</b> doet al mee.`);
  L.names.push(v); $("#pName").value = ""; clearErr(); saveL(); renderSetup();
});
$("#plist").addEventListener("click", e => {
  const b = e.target.closest("[data-rm]"); if (!b) return;
  L.names.splice(+b.dataset.rm, 1); L.examples = false; saveL(); renderSetup();
});
$("#localSettings").addEventListener("click", e => settingsClick(e, L.level, L.types, (lv, t) => { L.level = lv; L.types = t; saveL(); renderSetup(); }));
$("#btnStartLocal").addEventListener("click", startLocal);

$("#lobbySettings").addEventListener("click", e => {
  if (!isHost()) return;
  settingsClick(e, V.g.level, V.g.types, (lv, t) => send({t: "settings", level: lv, types: t}));
});
$("#lobbyPlayers").addEventListener("click", e => { const b = e.target.closest("[data-kick]"); if (b) send({t: "kick", i: +b.dataset.kick}); });
$("#btnStartOnline").addEventListener("click", () => { actx(); send({t: "start"}); });
$("#btnLeaveLobby").addEventListener("click", () => leaveOnline(true));
$("#btnShare").addEventListener("click", async () => {
  const url = inviteURL(), text = `Doe mee met Bierviltje! Code: ${V.code}`;
  try { if (navigator.share){ await navigator.share({title: "Bierviltje", text, url}); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(url); toast("Link gekopieerd"); } catch (e) { toast(esc(url), 4000); }
});

$("#btnNext").addEventListener("click", () => { actx(); send({t: "next"}); });
$("#chips").addEventListener("click", e => {
  const b = e.target.closest("[data-chip]"); if (!b || b.disabled) return;
  vib(8); send({t: "mark", i: +b.dataset.chip});
});
$("#rules").addEventListener("click", e => { const b = e.target.closest("[data-rule]"); if (!b) return; const r = V.g.rules[+b.dataset.rule]; if (r) toast(r.html, 4200); });
$("#btnSound").addEventListener("click", () => { sound = !sound; store.set("bv-sound", sound); if (sound) beep(880, .08, "triangle"); renderHeader(); });
$("#btnScores").addEventListener("click", openSheet);
$("#scrim").addEventListener("click", e => {
  if (e.target === $("#scrim")) return closeSheet();
  const adj = e.target.closest("[data-adj]");
  if (adj){ send({t: "adj", i: +adj.dataset.adj, d: +adj.dataset.d}); setTimeout(openSheet, online() ? 250 : 0); return; }
  const act = e.target.closest("[data-act]"); if (!act) return;
  const a = act.dataset.act;
  closeSheet();
  if (a === "end") send({t: "end"});
  if (a === "leave") leaveOnline(true);
});
$("#scrEnd").addEventListener("click", e => {
  const b = e.target.closest("[data-end]"); if (!b) return;
  const a = b.dataset.end;
  if (a === "again"){ shownId = null; send({t: "start"}); }
  if (a === "lobby" || a === "setup") send({t: "lobby"});
  if (a === "home") quitLocal();
  if (a === "leave") leaveOnline(true);
});
document.addEventListener("keydown", e => {
  if (screen === "game" && $("#scrim").hidden && $("#duelOv").hidden && $("#rxOv").hidden && (e.key === "ArrowRight" || e.key === " ") && !e.target.closest("button,input")){
    e.preventDefault(); if (!online() || ctrl()) send({t: "next"});
  }
});

/* ================= Start ================= */
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
(function boot(){
  const on = store.get("bv-online");
  const params = new URLSearchParams(location.search);
  const invited = (params.get("code") || "").toUpperCase();
  goHome();
  // Telefoon was even weg (scherm op slot, app herstart)? Dan meteen terug in hetzelfde spel.
  if (on && Date.now() - on.at < 3 * 3600e3 && (!invited || invited === on.code)){
    V.mode = "online"; V.code = on.code; net.send({t: "join", code: on.code});
  } else if (invited && !$("#myName").value) $("#myName").focus();
})();
