/* Bierviltje — gedeelde spelregels.
   Draait op de server (online spel, iedereen een eigen telefoon) én in de browser (één telefoon op tafel).
   Alles wat met "_" begint blijft geheim en gaat nooit naar de telefoons. */
(function (root, factory) {
  const m = factory();
  if (typeof module === "object" && module.exports) module.exports = m;
  else root.BV = m;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ================= Inhoud ================= */
  /* Per opdracht: s = basis-slokken, to = wie er al aangetikt staat,
     c = wie er kan drinken (p, o, po, others; leeg = iedereen), one = maar één persoon kiezen. */
  const OPDRACHT = [
    {t:"{p}, doe je beste imitatie van {o}. Vindt de groep het raak? Dan drinkt {o} {n}. Zo niet: jij.", s:2, c:"po", one:true},
    {t:"{p} geeft {N} aan iemand anders. Kies maar.", s:2, c:"others", one:true},
    {t:"{p}, noem binnen vijf seconden drie biermerken. Lukt het niet? Drink {n}.", s:1, c:"p"},
    {t:"Iedereen die iets zwarts draagt drinkt {n}.", s:1},
    {t:"De jongste van de groep drinkt {n}.", s:1, one:true},
    {t:"Wie als laatste de eigen neus aanraakt, drinkt {n}. Nu!", s:2, one:true},
    {t:"{p}, laat de laatste foto op je telefoon zien of drink {n}.", s:2, c:"p"},
    {t:"{p}, vertel je meest gênante moment van dit jaar of drink {n}.", s:2, c:"p"},
    {t:"Iedereen met minder dan 30% batterij drinkt {n}.", s:1},
    {t:"Proost! Iedereen drinkt {n}.", s:1, to:"all"},
    {t:"{p}, neurie een liedje. Raadt niemand het binnen tien seconden? Dan drink je {n}.", s:2, c:"p"},
    {t:"Wie het laatst op vakantie was, drinkt {n}.", s:1, one:true},
    {t:"{p}, doe tien squats of drink {n}.", s:2, c:"p"},
    {t:"Waterval! {p} begint met drinken, daarna de persoon links ervan, en zo verder. Je mag pas stoppen als de persoon vóór jou stopt.", s:0},
    {t:"{p}, wat is het slechtste cadeau dat je ooit kreeg? Vindt de groep het te saai? Dan drink je {n}.", s:2, c:"p"},
    {t:"Wie een barst in het telefoonscherm heeft, drinkt {n}.", s:1},
    {t:"De persoon met het langste haar drinkt {n}.", s:1, one:true},
    {t:"{o} kiest een emoji die {p} naar het laatst geappte contact stuurt. Weigeren kost {N}.", s:3, c:"p"},
    {t:"{p}, praat tot je volgende beurt met een Vlaams accent. Vergeten? Dan drink je {n}.", s:1, c:"p"},
    {t:"Iedereen behalve {p} drinkt {n}. Gefeliciteerd, {p}.", s:1, to:"others", c:"others"},
    {t:"{p} en {o} drinken allebei {n}. Zomaar. Proost.", s:1, to:"po", c:"po"},
    {t:"Wie vandaag het vroegst wakker was, drinkt {n}.", s:1, one:true},
    {t:"{p}, geef iedereen een compliment. Stokt het? Dan drink je {n}.", s:1, c:"p"},
    {t:"{p}, laat je schermtijd van vandaag zien. Meer dan vier uur? Drink {n}.", s:2, c:"p"},
    {t:"Iedereen die vanavond al iets gemorst heeft, drinkt {n}.", s:1},
    {t:"{p} drinkt {n}. Geen reden. Het viltje heeft gesproken.", s:1, to:"p", c:"p"},
    {t:"{o} drinkt {n}. {p} mag uit solidariteit meedrinken, maar hoeft niet.", s:1, to:"o", c:"po"},
    {t:"{p}, vertel twee waarheden en één leugen. Wie de leugen niet raadt, drinkt {n}.", s:1, c:"others"},
    {t:"{p}, dans tien seconden zonder muziek. Weigeren kost {N}.", s:2, c:"p"},
    {t:"{o}, verzin een nieuwe bijnaam voor {p}. Iedereen gebruikt die tot het einde van het spel.", s:0},
    {t:"Iedereen die iemand in deze groep al langer dan tien jaar kent, drinkt {n}.", s:1},
    {t:"Wie vandaag gesport heeft, drinkt {n}. Verdiend.", s:1},
    {t:"{p}, raad de lievelingskleur van {o}. Fout? Jij drinkt {n}. Goed? {o} drinkt.", s:2, c:"po", one:true},
    {t:"Iedereen die ooit gezakt is voor het rijexamen, drinkt {n}.", s:1},
    {t:"{p}, doe een dier na. Raadt de groep het niet binnen tien seconden? Dan drink je {n}.", s:1, c:"p"},
    {t:"Wie het laatst een sms stuurde (dus geen app), drinkt {n}.", s:1, one:true},
    {t:"{p}, lees het laatste bericht in je groepsapp hardop voor of drink {n}.", s:2, c:"p"},
    {t:"{p} wijst iemand aan die {n} drinkt.", s:2, c:"others", one:true},
    {t:"Iedereen met een huisdier drinkt {n}. Proost op de beestjes.", s:1},
    {t:"{p} en {o} rennen een rondje om de tafel. Wie als laatste terug is, drinkt {n}.", s:1, c:"po", one:true},
    {t:"Wie het dichtst bij {p} woont, drinkt {n}.", s:1, c:"others", one:true},
    {t:"{p}, maak een toost op {o} van minstens drie zinnen. Daarna drinkt iedereen {n}.", s:1, to:"all"},
  ];

  const NOOIT = [
    "een vlucht gemist","per ongeluk ‘ik hou van je’ gezegd tegen iemand aan de telefoon","in de trein in slaap gevallen en mijn halte gemist",
    "de verjaardag van een goede vriend vergeten","gelogen over mijn leeftijd","een appje naar de verkeerde persoon gestuurd",
    "gedaan alsof ik een liedje kende","mijn ex gestalkt op social media","een heel seizoen van een serie in één dag gekeken",
    "iets teruggebracht naar de winkel dat ik al gebruikt had","op een festival al mijn vrienden kwijtgeraakt","gehuild bij een tekenfilm",
    "mijn eigen naam gegoogeld","op een tafel gedanst","een date gehad die ik halverwege wilde verlaten",
    "onder de douche gezongen alsof ik in de Ziggo Dome stond","gedaan alsof ik ziek was om ergens onderuit te komen",
    "iets gekookt dat zo mislukt was dat het de prullenbak in ging","per ongeluk het drankje van iemand anders opgedronken",
    "andermans fiets meegenomen omdat ik dacht dat het de mijne was","mijn jas in de kroeg laten hangen","een ‘reply all’ gedaan waar ik spijt van had",
    "op Tinder iemand geswipet die ik kende","een boete gekregen op de fiets",
    "gedaan alsof ik iemand niet zag om een gesprek te ontwijken","stiekem eten van een huisgenoot opgegeten","een plant laten doodgaan",
    "een selfie gemaakt op de wc","een karaoke-microfoon niet meer willen loslaten"
  ];

  const WIEZOU = [
    "in de gevangenis belanden","een realityshow winnen","in Las Vegas trouwen","een zombie-apocalyps overleven",
    "verdwalen met Google Maps aan","miljonair worden","het paspoort vergeten op weg naar het vliegveld","vanavond als eerste in slaap vallen",
    "na het stappen thuiskomen met een kat","viraal gaan op TikTok","vanavond nog een ex appen","een eigen kroeg beginnen",
    "met een beroemdheid op de foto gaan","ruzie krijgen met een buschauffeur","in z’n eentje een hele pizza wegwerken",
    "vergeten waar de fiets staat","de laatste zijn die vanavond naar huis gaat","per ongeluk een dure wijn bestellen",
    "een carrière als influencer beginnen","een speech op een bruiloft verpesten"
  ];

  const REGELS = [
    {name:"Duimkoning", t:"{p} is Duimkoning. Legt {p} stiekem een duim op tafel, dan volgt iedereen. Wie als laatste volgt, drinkt {n}.", s:2, d:8},
    {name:"Geen namen", t:"Niemand mag nog iemands naam zeggen. Wel gedaan? {N}.", s:1, d:6},
    {name:"Linkerhand", t:"Iedereen drinkt met de linkerhand. Betrapt met rechts? {N}.", s:1, d:8},
    {name:"Vraagmeester", t:"{p} is Vraagmeester. Wie antwoord geeft op een vraag van {p}, drinkt {n}.", s:1, d:7},
    {name:"Geen ja of nee", t:"De woorden ‘ja’ en ‘nee’ zijn verboden. Elke keer: {N}.", s:1, d:6},
    {name:"Drinkmaatjes", t:"{p} en {o} zijn drinkmaatjes. Drinkt de een, dan drinkt de ander mee.", s:0, d:8},
    {name:"Proost op…", t:"Voor elke slok roep je eerst ‘Proost op {o}!’. Vergeten? Er gaat {N} bij.", s:1, d:6},
    {name:"Geen Engels", t:"Engelse woorden zijn verboden, ook ‘sorry’ en ‘oké’. Elke fout: {N}.", s:1, d:6},
    {name:"Telefoon weg", t:"Wie de telefoon pakt voor iets anders dan dit spel, drinkt {n}.", s:2, d:8},
    {name:"Pink omhoog", t:"Iedereen drinkt met de pink omhoog. Heel chic. Vergeten? {N}.", s:1, d:8},
    {name:"Dichter", t:"{p} mag alleen nog in rijm praten. Elke zin die niet rijmt: {N}.", s:1, d:5},
    {name:"Spiegel", t:"{o} is de spiegel van {p}. Drinkt {p}, dan drinkt {o} mee. Andersom niet.", s:0, d:7},
    {name:"Majesteit", t:"{p} is koning(in). Iedereen spreekt {p} aan met ‘Majesteit’. Vergeten? {N}.", s:1, d:6},
    {name:"Slangenogen", t:"{p} heeft slangenogen. Wie {p} recht aankijkt, drinkt {n}.", s:1, d:6},
  ];

  const DUELS = [
    "Steen, papier, schaar. Best of three. Verliezer drinkt {N}.",
    "Duimworstelen. Verliezer drinkt {N}.",
    "Staarwedstrijd. Wie als eerste lacht of wegkijkt, drinkt {N}.",
    "Wie het langst op één been staat, wint. Verliezer drinkt {N}.",
    "Zeg drie keer snel: ‘De kat krabt de krullen van de trap.’ Wie de meeste fouten maakt, drinkt {N}.",
    "Armpje drukken. Verliezer drinkt {N}.",
    "Om de beurt een land in Europa noemen. Wie vastloopt of herhaalt, drinkt {N}.",
    "Wie het eerst drie Nederlandstalige hits noemt, wint. Verliezer drinkt {N}.",
    "Zwijgduel. Wie als eerste iets zegt, drinkt {N}. De rest mag jullie aan het praten proberen te krijgen.",
    "Wie het mooiste compliment voor de ander verzint? De groep beslist. Verliezer drinkt {N}.",
    "Wie kan het langst een toon aanhouden? Verliezer drinkt {N}.",
  ];

  const CATEGORIEEN = [
    "Biermerken","Kaassoorten","Snacks uit de snackbar","Voetbalclubs","Dingen bij IKEA","Disneyfilms","Pizzatoppings",
    "Nederlandse artiesten","Automerken","Dingen op een camping","Cocktails","Dieren in de dierentuin","Landen in Europa",
    "Woorden die rijmen op ‘bier’","Sinterklaasliedjes","Onderdelen van een fiets","Dingen in een koelkast","Snoepjes",
    "Steden in Nederland","Kledingmerken","Apps op je telefoon","Soorten pasta","Tv-presentatoren","Dingen die je op Koningsdag ziet",
    "Sporten met een bal","Harry Potter-personages","Groenten","Superhelden","Dingen die je op een bruiloft ziet"
  ];

  /* ================= Instellingen ================= */
  const LEVELS = [
    {name:"Chill", hint:"1–3 slokken", f:s=>s},
    {name:"Feest", hint:"2–4 slokken", f:s=>s+1},
    {name:"Hardcore", hint:"2–6 slokken", f:s=>s*2},
  ];
  const TYPES = {
    opdracht:{label:"Opdracht", set:"Opdrachten", w:26},
    nooit:{label:"Ik heb nog nooit", set:"Ik heb nog nooit", w:15},
    wiezou:{label:"Wie zou", set:"Wie zou het eerst", w:13},
    regel:{label:"Nieuwe regel", set:"Regels", w:8},
    duel:{label:"Duel", set:"Duels", w:10},
    categorie:{label:"Categorie", set:"Categorieën", w:8},
    mini:{label:"Minigame", set:"Minigames", w:13},
  };
  const MINIS = ["bom","rad","hl","reactie"];
  const MINI_LABEL = {bom:"Minigame · Bom", rad:"Minigame · Rad", hl:"Minigame · Hoger lager", reactie:"Minigame · Reactie"};
  const MAX_PLAYERS = 16;
  const TAU = Math.PI * 2;

  /* ================= Hulpjes ================= */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rnd = n => Math.floor(Math.random()*n);
  const shuffle = a => { for (let i=a.length-1;i>0;i--){ const j=rnd(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  const slok = n => n + (n===1 ? " slok" : " slokken");
  const cleanName = s => String(s || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 14);

  function radTarget(rot0, idx, n, jit){
    const seg = TAU / n;
    let t = -Math.PI/2 - (idx + .5)*seg + jit*seg;
    while (t < rot0 + TAU*5) t += TAU;
    return t;
  }

  /* ================= Spelstatus ================= */
  function newGame(mode){
    return {
      mode, phase: mode === "local" ? "setup" : "lobby",
      level: 1, types: Object.fromEntries(Object.keys(TYPES).map(k => [k, true])),
      players: [], hostId: null, round: 0, turn: 0, rules: [], card: null, sel: [], seq: 0
    };
  }

  const active = g => g.players.map((_, i) => i).filter(i => !g.players[i].gone);
  function nextActive(g, i){
    const n = g.players.length;
    for (let k=1; k<=n; k++){ const j = (i + k) % n; if (!g.players[j].gone) return j; }
    return i;
  }

  function addPlayer(g, id, name){
    name = cleanName(name) || "Speler";
    const found = g.players.findIndex(p => p.id === id);
    if (found >= 0){
      const p = g.players[found];
      if (p.gone && g.phase === "game") p.gone = false;
      p.online = true;
      return found;
    }
    if (active(g).length >= MAX_PLAYERS) return -1;
    let base = name, k = 2;
    while (g.players.some(p => !p.gone && p.name.toLowerCase() === name.toLowerCase())) name = (base.slice(0, 12) + " " + k++);
    g.players.push({id, name, sips: 0, online: true, gone: false});
    return g.players.length - 1;
  }

  function removePlayer(g, i){
    if (!g.players[i]) return;
    if (g.phase === "game" || g.phase === "end"){
      g.players[i].gone = true; g.players[i].online = false;
      g.sel = g.sel.filter(x => x !== i);
      if (g.turn === i) g.turn = nextActive(g, i);
    } else {
      g.players.splice(i, 1);
    }
  }

  /* ================= Rechten ================= */
  const isHost = (g, w) => g.mode === "local" || (w >= 0 && !!g.players[w] && g.players[w].id === g.hostId);
  /* Tijdens het spel is de host een gewone speler: alleen wie aan de beurt is gaat door.
     Is die persoon weg (telefoon uit, verbinding kwijt), dan mag iedereen het overnemen. */
  function canAdvance(g, w){
    if (g.mode === "local") return true;
    if (!(w >= 0 && g.players[w])) return false;
    const t = g.players[g.turn];
    return w === g.turn || !t || !t.online || t.gone;
  }
  /* Mag w persoon i aantikken als drinker? Jezelf altijd, anderen alleen als jij aan de beurt bent. */
  function canMark(g, w, i){
    const c = g.card;
    if (g.phase !== "game" || !c || !(c.sips > 0) || !c.ready || c.lock) return false;
    if (c.cand && !c.cand.includes(i)) return false;
    return g.mode === "local" || w === i || canAdvance(g, w);
  }
  /* Mag w namens persoon i een minigame-knop indrukken? (eigen beurt, of i is weg en w regelt het spel) */
  function actsFor(g, w, i){
    if (g.mode === "local") return true;
    if (w === i) return true;
    const p = g.players[i];
    return (!p || !p.online || p.gone) && canAdvance(g, w);
  }

  /* ================= Viltjes maken ================= */
  function makeCard(g){
    const online = g.mode !== "local";
    const act = active(g), p = g.turn;
    const others = act.filter(i => i !== p);
    const o = others.length ? others[rnd(others.length)] : p;
    const nm = i => `<b class="nm">${esc(g.players[i] ? g.players[i].name : "?")}</b>`;
    const sipN = base => base ? LEVELS[g.level].f(base) : 0;
    const fill = (t, n) => esc(t).replace(/\{(p|o|n|N)\}/g, (m, k) => k==="p" ? nm(p) : k==="o" ? nm(o) : k==="n" ? String(n) : slok(n));
    const bags = g._bags || (g._bags = {});
    const draw = (key, arr) => { if (!bags[key] || !bags[key].length) bags[key] = shuffle([...arr.keys()]); return arr[bags[key].pop()]; };

    const en = Object.keys(TYPES).filter(k => g.types[k] && !(k === "regel" && g.rules.length >= 3));
    let type = "opdracht";
    if (en.length){
      let r = Math.random() * en.reduce((a, k) => a + TYPES[k].w, 0);
      for (const k of en){ r -= TYPES[k].w; if (r < 0){ type = k; break; } }
    }

    /* ready = de groep kan nu aantikken wie drinkt; lock = het spel heeft het al beslist; one = maar één persoon; cand = wie er kan drinken */
    const c = {id: ++g.seq, no: g.round, type, p, o, stamp: TYPES[type].label, lead: "", html: "", sub: "", sips: 0, pre: [], pick: "Wie drinkt?", mini: null, foot: "",
               ready: true, lock: false, one: false, cand: null};
    const targets = to => ({p:[p], o:[o], po:[p, o], all:act, others}[to] || []);

    if (type === "opdracht"){
      const it = draw("o", OPDRACHT); c.sips = sipN(it.s); c.html = fill(it.t, c.sips); c.pre = targets(it.to);
      c.one = !!it.one; c.cand = it.c ? targets(it.c) : null;
      if (it.c === "p") c.pick = "Moet " + (g.players[p] ? g.players[p].name : "die") + " drinken?";
    } else if (type === "nooit"){
      const it = draw("nooit", NOOIT); c.sips = sipN(1);
      c.lead = "Ik heb nog nooit…"; c.html = esc(it) + "."; c.sub = `Wel gedaan? Drink ${slok(c.sips)}.`; c.pick = online ? "Wel gedaan? Tik jezelf aan" : "Wie heeft het wel gedaan?";
    } else if (type === "wiezou"){
      const it = draw("wiezou", WIEZOU); c.sips = sipN(2);
      c.lead = "Wie zou het eerst…"; c.html = esc(it) + "?"; c.sub = `Tel tot drie en wijs. Wie de meeste vingers krijgt, drinkt ${slok(c.sips)}.`; c.pick = "Wie werd aangewezen?"; c.one = true;
    } else if (type === "regel"){
      const it = draw("regel", REGELS); const pen = sipN(it.s);
      c.lead = esc(it.name); c.html = fill(it.t, pen); c.sub = `Geldt voor de komende ${it.d} viltjes. Je ziet hem bovenin staan.`; c.foot = "Regel actief";
      g.rules = g.rules.filter(r => r.name !== it.name);
      g.rules.push({name: it.name, html: c.html, left: it.d + 1});
    } else if (type === "duel"){
      const it = draw("duel", DUELS); c.sips = sipN(2);
      c.lead = `${nm(p)}<span class="vs">tegen</span>${nm(o)}`; c.html = fill(it, c.sips); c.pick = "Wie verloor?"; c.one = true; c.cand = [p, o];
    } else if (type === "categorie"){
      const cat = draw("cat", CATEGORIEEN); c.sips = sipN(1);
      c.html = `<span class="cat">${esc(cat)}</span>`;
      c.sub = online
        ? `Om de beurt iets noemen, ${nm(p)} begint. Je telefoon zegt wanneer jij moet. Vijf seconden per beurt. Te laat? ${slok(c.sips)}.`
        : `Om de beurt iets noemen, ${nm(p)} begint. Vijf seconden per beurt. Wie vastloopt of iets herhaalt, drinkt ${slok(c.sips)}.`;
      c.mini = {kind:"cat", status:"idle", speaker:null, count:0}; c.pick = "Wie liep vast?"; c.one = true; c.ready = false;
    } else {
      const kind = draw("mini", MINIS); c.stamp = MINI_LABEL[kind];
      if (kind === "bom"){
        const cat = draw("cat", CATEGORIEEN); c.sips = sipN(2);
        c.html = `<span class="cat">${esc(cat)}</span>`;
        c.sub = online
          ? `Noem iets uit de categorie en tik op Doorgeven. De bom springt naar de volgende telefoon. Wie hem heeft bij de knal, drinkt ${slok(c.sips)}.`
          : `Noem iets uit de categorie en geef de telefoon door. Wie hem vasthoudt bij de knal, drinkt ${slok(c.sips)}.`;
        c.pick = "Wie had de bom?"; c.one = true; c.ready = false;
        c.mini = {kind, status:"idle", holder:null, passes:0};
      } else if (kind === "rad"){
        c.sips = sipN(2); c.sub = `${nm(p)} draait. Het rad kiest wie ${slok(c.sips)} drinkt.`; c.pick = "Het rad koos"; c.one = true; c.ready = false;
        c.mini = {kind, status:"idle", rot:0};
      } else if (kind === "hl"){
        c.sips = 0; c.lead = "Hoger of lager?";
        c.sub = `${nm(p)} raadt. Elke goede gok maakt de inzet hoger. Stoppen mag na één goede.`;
        c.mini = {kind, cur:{v:2+rnd(13), s:rnd(4)}, streak:0, done:false, n:0, msg:"Gelijk telt als fout."}; c.ready = false; c.one = true;
      } else {
        c.sips = sipN(2);
        if (online){
          c.lead = "Iedereen tegen iedereen";
          c.sub = `Kijk naar je eigen scherm en tik zodra er NU! staat. Te vroeg of de traagste? Drink ${slok(c.sips)}.`;
        } else {
          c.lead = `${nm(p)}<span class="vs">tegen</span>${nm(o)}`;
          c.sub = `Leg de telefoon plat tussen jullie in. Tik op jouw helft zodra er NU! staat. Te vroeg is verloren. Verliezer drinkt ${slok(c.sips)}.`;
        }
        c.pick = "Wie verloor?"; c.ready = false; c.lock = online; c.one = !online; c.cand = online ? null : [p, o];
        c.mini = {kind, status:"idle"};
      }
    }
    return c;
  }

  /* ================= Motor ================= */
  function Engine(g, hooks){
    const timers = {};
    const now = hooks.now || (() => Date.now());
    const local = g.mode === "local";
    const emit = () => hooks.emit && hooks.emit();
    const fx = (k, d) => hooks.fx && hooks.fx(k, d || {});
    const err = (w, m) => hooks.err && hooks.err(w, m);
    const nm = i => `<b class="nm">${esc(g.players[i] ? g.players[i].name : "?")}</b>`;
    const sipN = base => base ? LEVELS[g.level].f(base) : 0;

    function clearTimers(){ for (const k in timers){ clearTimeout(timers[k]); delete timers[k]; } }
    function later(key, ms, fn){
      clearTimeout(timers[key]);
      timers[key] = setTimeout(() => { delete timers[key]; fn(); emit(); }, Math.max(0, ms));
    }

    function newCard(){ g.card = makeCard(g); g.sel = [...g.card.pre]; }

    function startGame(){
      clearTimers();
      g.players = g.players.filter(p => !p.gone);
      g.players.forEach(p => p.sips = 0);
      g.rules = []; g.round = 1; g._bags = {};
      g.turn = rnd(g.players.length);
      g.phase = "game";
      newCard();
    }

    function next(){
      clearTimers();
      const c = g.card;
      if (c && c.sips > 0 && g.sel.length){
        g.sel.forEach(i => { if (g.players[i]) g.players[i].sips += c.sips; });
        fx("logged", {sel:[...g.sel], sips:c.sips});
      } else fx("card");
      g.rules.forEach(r => r.left--);
      const expired = g.rules.filter(r => r.left <= 0).map(r => r.name);
      g.rules = g.rules.filter(r => r.left > 0);
      if (expired.length) fx("expired", {names: expired});
      g.turn = nextActive(g, g.turn);
      g.round++;
      newCard();
    }

    function finishReactie(M){
      clearTimeout(timers.rx); delete timers.rx;
      const ms = i => (i in M.taps && M.taps[i] >= 0) ? M.taps[i] : Infinity;
      const early = M.part.filter(i => M.taps[i] === -1);
      let losers;
      if (early.length) losers = early;
      else {
        const worst = Math.max(...M.part.map(ms));
        losers = M.part.filter(i => ms(i) === worst);
      }
      M.status = "done";
      M.losers = losers;
      M.results = M.part.map(i => ({i, ms: i in M.taps ? M.taps[i] : null}))
        .sort((a, b) => (a.ms === -1 ? 1e9 : a.ms == null ? 1e8 : a.ms) - (b.ms === -1 ? 1e9 : b.ms == null ? 1e8 : b.ms));
      g.sel = [...losers]; g.card.pre = [...losers]; g.card.ready = true; g.card.lock = true;
      fx("buzz", {who: losers});
    }

    function armCat(M){
      M._deadline = now() + 5000;
      later("cat", 5000, () => {
        M.status = "late"; g.card.ready = true;
        if (!local && M.speaker != null){ g.sel = [M.speaker]; g.card.lock = true; }
        fx("buzz", {who: M.speaker != null ? [M.speaker] : []});
      });
    }

    function miniAct(w, m){
      const c = g.card;
      if (g.phase !== "game" || !c || !c.mini) return;
      const M = c.mini, ctrl = canAdvance(g, w);
      switch (M.kind + ":" + m.a){
        /* ---- bom ---- */
        case "bom:start": {
          if (!ctrl || M.status === "live") return;
          M.status = "live"; M.holder = local ? null : c.p; M.passes = 0; M._t0 = now();
          later("bom", 12000 + Math.random() * (local ? 18000 : 22000), () => {
            M.status = "boom"; c.ready = true;
            if (!local && M.holder != null){ g.sel = [M.holder]; c.pre = [M.holder]; c.lock = true; }
            fx("boom", {holder: M.holder});
          });
          break;
        }
        case "bom:pass": {
          if (M.status !== "live" || local) return;
          if (!actsFor(g, w, M.holder)) return;
          M.passes++; M.holder = nextActive(g, M.holder);
          fx("pass", {to: M.holder});
          break;
        }
        /* ---- rad ---- */
        case "rad:spin": {
          if (!ctrl || M.status !== "idle") return;
          const a = active(g);
          M.seg = a; M.w = a[rnd(a.length)]; M.jit = (Math.random() - .5) * .7; M.rot0 = M.rot || 0;
          M.status = "spin"; M._t0 = now();
          later("rad", 4500, () => {
            M.status = "done";
            M.rot = radTarget(M.rot0, M.seg.indexOf(M.w), M.seg.length, M.jit) % TAU;
            g.sel = [M.w]; c.pre = [M.w]; c.ready = true; c.lock = true;
            fx("win", {});
          });
          break;
        }
        /* ---- hoger / lager ---- */
        case "hl:guess":
        case "hl:stop": {
          if (M.done || !actsFor(g, w, c.p)) return;
          if (m.a === "stop"){
            if (!M.streak) return;
            M.done = true; c.sips = sipN(M.streak); c.pre = []; g.sel = []; c.pick = "Aan wie gegeven?";
            c.ready = true; c.one = true; c.cand = active(g).filter(i => i !== c.p);
            M.msg = `${nm(c.p)} geeft ${slok(c.sips)} aan één iemand.` + (local ? " Tik die persoon aan." : " Die persoon tikt zichzelf aan.");
            fx("win", {});
            break;
          }
          const prev = M.cur.v, nx = {v: 2 + rnd(13), s: rnd(4)};
          const ok = m.dir === "up" ? nx.v > prev : nx.v < prev;
          M.cur = nx; M.n++;
          if (ok){ M.streak++; M.msg = `Goed! Reeks van ${M.streak}. Nog eentje?`; fx("good", {streak: M.streak}); }
          else {
            M.done = true; c.sips = sipN(1) + M.streak; c.pre = [c.p]; g.sel = [c.p]; c.ready = true; c.lock = true;
            M.msg = `${nx.v === prev ? "Gelijk telt als fout. " : ""}Fout! ${nm(c.p)} drinkt ${slok(c.sips)}.`;
            fx("buzz", {who: [c.p]});
          }
          break;
        }
        /* ---- reactie ---- */
        case "reactie:result": {          // één telefoon: de uitslag komt van het gesplitste scherm
          if (!local || M.status === "done") return;
          const L = +m.loser, W = +m.winner;
          if (!g.players[L]) return;
          M.status = "done";
          M.res = m.early ? `${nm(L)} was te vroeg en drinkt ${slok(c.sips)}.`
                          : `${nm(W)} was sneller (${Math.round(+m.ms) || 0} ms). ${nm(L)} drinkt ${slok(c.sips)}.`;
          g.sel = [L]; c.pre = [L]; c.ready = true; c.lock = true;
          break;
        }
        case "reactie:arm": {
          if (local || !ctrl || M.status !== "idle") return;
          M.part = active(g).filter(i => g.players[i].online);
          if (M.part.length < 2){ err(w, "Er moeten minstens twee telefoons online zijn."); return; }
          M.status = "wait"; M.armId = (M.armId || 0) + 1; M.taps = {};
          M._goAt = now() + 2000 + Math.random() * 3500;
          later("rx", (M._goAt - now()) + 6000, () => finishReactie(M));
          break;
        }
        case "reactie:tap": {
          if (M.status !== "wait" || !M.part.includes(w) || (w in M.taps)) return;
          M.taps[w] = m.early ? -1 : Math.max(0, Math.min(6000, Math.round(+m.ms) || 6000));
          if (M.part.every(i => i in M.taps)) finishReactie(M);
          break;
        }
        /* ---- categorie ---- */
        case "cat:start": {
          if (!ctrl || M.status === "live") return;
          M.status = "live"; M.speaker = local ? null : c.p; M.count = 0;
          g.sel = []; c.ready = false; c.lock = false;
          armCat(M);
          break;
        }
        case "cat:said": {
          if (M.status !== "live") return;
          if (!local && !actsFor(g, w, M.speaker)) return;
          M.count++;
          if (!local) M.speaker = nextActive(g, M.speaker);
          armCat(M);
          break;
        }
        default: return;
      }
    }

    function act(w, m){
      if (!m || typeof m.t !== "string") return;
      switch (m.t){
        case "setPlayers": {
          if (!local) return;
          g.players = (m.names || []).map(cleanName).filter(Boolean).slice(0, MAX_PLAYERS)
            .map((name, i) => ({id: "l" + i, name, sips: 0, online: true, gone: false}));
          break;
        }
        case "settings": {
          if (!isHost(g, w)) return;
          if (LEVELS[m.level]) g.level = m.level;
          if (m.types && typeof m.types === "object"){
            for (const k in TYPES) if (k in m.types) g.types[k] = !!m.types[k];
            if (!Object.values(g.types).some(Boolean)) g.types.opdracht = true;
          }
          break;
        }
        case "start": {
          if (!isHost(g, w)) return;
          if (active(g).length < 2){ err(w, "Je hebt minstens twee spelers nodig."); return; }
          startGame();
          break;
        }
        case "next": {
          if (g.phase !== "game" || !canAdvance(g, w)) return;
          next();
          break;
        }
        case "mark": {
          const c = g.card, i = +m.i;
          if (!g.players[i] || g.players[i].gone || !canMark(g, w, i)) return;
          const on = m.on === undefined ? !g.sel.includes(i) : !!m.on;
          if (on) g.sel = c.one ? [i] : (g.sel.includes(i) ? g.sel : [...g.sel, i]);
          else g.sel = g.sel.filter(x => x !== i);
          if (on && w !== i) fx("marked", {i});
          break;
        }
        case "mini": miniAct(w, m); break;
        case "adj": {
          const i = +m.i, p = g.players[i];
          if (!p || !(local || w === i)) return;
          p.sips = Math.max(0, p.sips + (m.d > 0 ? 1 : -1));
          break;
        }
        case "kick": {
          const i = +m.i;
          if (local || !isHost(g, w) || !g.players[i] || g.players[i].id === g.hostId) return;
          removePlayer(g, i);
          break;
        }
        case "end": {
          if (!isHost(g, w) || g.phase !== "game") return;
          clearTimers(); g.phase = "end";
          break;
        }
        case "lobby": {
          if (!isHost(g, w)) return;
          clearTimers(); g.phase = local ? "setup" : "lobby"; g.card = null; g.sel = []; g.rules = [];
          g.players = g.players.filter(p => !p.gone);
          break;
        }
        default: return;
      }
      emit();
    }

    return {act, clearTimers};
  }

  /* Wat de telefoons te zien krijgen: geheimen eruit, tijden omgerekend naar "nog zoveel ms". */
  function pub(g, t){
    const s = JSON.parse(JSON.stringify(g, (k, v) => (k[0] === "_" ? undefined : v)));
    const M = g.card && g.card.mini, P = s.card && s.card.mini;
    if (M && P){
      if (M._deadline) P.msLeft = Math.max(0, M._deadline - t);
      if (M._t0) P.elapsed = t - M._t0;
      if (M._goAt) P.goIn = M._goAt - t;
    }
    return s;
  }

  return {LEVELS, TYPES, MAX_PLAYERS, esc, slok, cleanName, radTarget, newGame, addPlayer, removePlayer, active, isHost, canAdvance, canMark, actsFor, Engine, pub};
});
