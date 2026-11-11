/* CARBON CAPITAL — interface */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const el = (tag, attrs, html) => { const e = document.createElement(tag); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const { ROLES, ROLE_NAME, METER_NAME, ZONES, BUILDS, TEMPLES, HUB, POLICIES, AGENT_FX, RULES } = CC;
  const RC = { policy: '#ffff00', dev: '#3b3bf5', arch: '#f0384c', cit: '#5ce65c' };
  const RT = { policy: '#111', dev: '#fff', arch: '#fff', cit: '#111' };
  const TITLE = { policy: 'Policymaker', dev: 'Developer', arch: 'Architect', cit: 'Citizen' };
  const CAT_C = { 'CHANGE AGENT': '#111', COALITION: '#e066ff', CRISIS: '#f0384c', SITE: '#ff9a1f', NOTHING: '#999' };
  const ZONE_C = { RESCOM: null, MIXED: '#fff36b', INDUSTRIAL: '#ffae5c', PARK: '#6be36b', CIVIC: '#c58cff' };

  const UI = { g: null, seats: { policy: false, dev: false, arch: false, cit: true }, speed: 1, picking: null, flashId: null, busy: false, turnResolve: null, token: 0 };
  const SPEEDS = [{ n: 'SLOW', m: 1.7 }, { n: 'NORMAL', m: 1 }, { n: 'FAST', m: 0.4 }, { n: 'INSTANT', m: 0.05 }];
  let speedIdx = 1;
  const wait = ms => sleep(ms * SPEEDS[speedIdx].m);

  // ---------- stage scaling ----------
  function fit() {
    const st = $('#stage'), vw = innerWidth, vh = innerHeight;
    const k = Math.min(vw / 1355, vh / 942);
    st.style.transform = `scale(${k})`;
    st.style.left = ((vw - 1355 * k) / 2) + 'px';
    st.style.top = ((vh - 942 * k) / 2) + 'px';
    UI.scale = k;
  }
  addEventListener('resize', fit); fit();
  function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }

  // ---------- intro sequence ----------
  const RULE_PAGES = [
    `<p>Carbon Capital is a four-player simulation of 125th Street in Harlem.</p><p>Each player is a real stakeholder with different power and incentives:</p><p><span class="k">POLICYMAKER</span> wants APPROVAL. <span class="k">DEVELOPER</span> wants PROFIT. <span class="k">ARCHITECT</span> wants RECOGNITION. <span class="k">CITIZEN</span> wants LIVABILITY.</p>`,
    `<p>Together you shape the future of the neighborhood. Every decision moves two shared numbers:</p><p><span class="k">CARBON INDEX</span> total emissions. Starts at 50,000 tons. At 100,000 tons the carbon budget is gone and everybody loses.</p><p><span class="k">CONVICTION INDEX</span> how much the city cares about carbon. It fades a little every round.</p>`,
    `<p>Each turn, draw one card from the CITY DECK: change agents, coalitions, crises and site opportunities. Use it now or save it for later.</p><p>Then take your action (the Developer gets two).</p><p>Players do not have equal power. Developers act on more parcels. Citizens can interrupt other turns but have limited attention. Policymakers lose policy power when approval drops below 20. Architects gain design capacity with recognition.</p>`,
    `<p>Zoning, construction, retrofits, protests and coalitions shift the street.</p><p>High-carbon choices push the Carbon Index up. Aligned, low-carbon moves raise Conviction, unlock four <span class="k">CARBON TEMPLES</span> (a café, a church, a station, a museum) and eventually the <span class="k">MATERIAL HUB</span>, a circular industry that grows the street's own building material.</p>`,
    `<p><span class="k">WIN TOGETHER:</span> build the Material Hub and reach 80% conviction before carbon hits 100,000 tons.</p><p><span class="k">WIN ALONE:</span> if 12 rounds pass without either, the highest personal score wins.</p><p>TLDR: decide whether to chase your own incentives or work collectively, and build enough belief before the carbon budget runs out.</p>`,
  ];
  function intro(step) {
    const box = $('#introBox'); box.classList.remove('wide');
    if (step === 0) {
      box.innerHTML = `<div class="intro-text">Can four players change a city's mind? Policymaker. Developer. Architect. Citizen. Negotiate, compete, build carbon conviction on 125th Street. Win alone...or win together.</div><div class="btn-row"><button class="pill" id="b0">LET'S PLAY!</button></div>`;
      $('#b0').onclick = () => intro(1);
    } else if (step === 1) {
      box.innerHTML = `<div class="intro-text center">Do you know the rules of the game?</div><div class="btn-row"><button class="pill" id="b1">NO, SHOW ME!</button><button class="pill ghost" id="b2">I ALREADY KNOW! I'M READY TO PLAY!</button></div>`;
      $('#b1').onclick = () => intro(10); $('#b2').onclick = () => toSetup();
    } else if (step >= 10) {
      const i = step - 10; box.classList.add('wide');
      const last = i === RULE_PAGES.length - 1;
      const next = ['Tell me more!', 'Interesting!', 'Mhm...', 'Got it!', "LET'S START!"][i];
      box.innerHTML = `<div class="intro-text">${RULE_PAGES[i]}</div><div class="btn-row">${i ? '<button class="pill ghost" id="bb">BACK</button>' : ''}<button class="pill" id="bn">${next}</button></div>`;
      $('#bn').onclick = () => last ? toSetup() : intro(step + 1);
      if (i) $('#bb').onclick = () => intro(step - 1);
    }
  }

  // ---------- setup ----------
  const SEAT_INFO = {
    policy: ['PUBLIC APPROVAL', 'Rezone parcels, enact policies, hold town halls. Green policies cost approval. Below 20 approval you lose policy power.'],
    dev: ['PROFIT', 'Acquire parcels and build. Two actions per turn and a lot of cash. Luxury pays best and emits most.'],
    arch: ['RECOGNITION', 'Research bio-materials, retrofit, pitch bio-based designs and build the Carbon Temples and the Material Hub.'],
    cit: ['CITY LIVABILITY', 'Organize community spaces, spread the word, join coalitions. Protest other players\' moves with attention tokens.'],
  };
  function toSetup() {
    show('setup');
    const wrap = $('#seats'); wrap.innerHTML = '';
    ROLES.forEach(r => {
      const d = el('div', { class: 'seat' });
      d.innerHTML = `<div class="role" style="background:${RC[r]};color:${RT[r]}">${ROLE_NAME[r]}</div><div class="goal">GOAL: ${SEAT_INFO[r][0]}</div><div class="desc">${SEAT_INFO[r][1]}</div>
        <div class="toggle"><button data-h="1">HUMAN</button><button data-h="0">COMPUTER</button></div>`;
      d.querySelectorAll('.toggle button').forEach(b => b.onclick = () => { UI.seats[r] = b.dataset.h === '1'; paintSeats(); });
      d.dataset.r = r; wrap.appendChild(d);
    });
    paintSeats();
    document.querySelectorAll('.presets button').forEach(b => b.onclick = () => {
      const p = b.dataset.p; ROLES.forEach(r => UI.seats[r] = p === 'all' ? true : p === 'none' ? false : r === p); paintSeats();
    });
    $('#startBtn').onclick = startGame;
  }
  function paintSeats() {
    document.querySelectorAll('.seat').forEach(d => { const h = UI.seats[d.dataset.r]; d.querySelectorAll('.toggle button').forEach(b => b.classList.toggle('on', (b.dataset.h === '1') === h)); });
  }

  // ---------- board drawing ----------
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const K = 0.5; // plan-oblique shift per unit height (up-left)
  function box(g, x, y, w, d, z0, z, c, extraClass) {
    const b = z0 * K, t = (z0 + z) * K;
    const pts = a => a.map(p => p.join(',')).join(' ');
    const sw = 0.6, st = '#3a3a3a';
    g.appendChild(svgEl('polygon', { points: pts([[x - b, y + d - b], [x + w - b, y + d - b], [x + w - t, y + d - t], [x - t, y + d - t]]), fill: c.s, stroke: st, 'stroke-width': sw, 'stroke-linejoin': 'round' }));
    g.appendChild(svgEl('polygon', { points: pts([[x + w - b, y - b], [x + w - t, y - t], [x + w - t, y + d - t], [x + w - b, y + d - b]]), fill: c.e, stroke: st, 'stroke-width': sw, 'stroke-linejoin': 'round' }));
    const top = svgEl('rect', { x: x - t, y: y - t, width: w, height: d, fill: c.t, stroke: st, 'stroke-width': sw });
    if (extraClass) top.setAttribute('class', extraClass);
    g.appendChild(top);
    return { tx: x - t, ty: y - t };
  }
  // facade lines on the south face (window bands) for taller buildings
  function bands(g, x, y, w, d, z, color) {
    const n = Math.floor(z / 9);
    for (let i = 1; i < n; i++) {
      const t = i * 9 * K;
      g.appendChild(svgEl('line', { x1: x - t, y1: y + d - t, x2: x + w - t, y2: y + d - t, stroke: color || '#9a9a9a', 'stroke-width': .35 }));
    }
  }
  const COL = {
    existing: { t: '#ffffff', e: '#b8b8b8', s: '#d8d8d8' },
    retro: { t: '#f5ead0', e: '#c8b58a', s: '#e3d3ac' },
    dev: { t: '#e4e6ff', e: '#7b82e6', s: '#a9aef2' },
    coop: { t: '#f2f3ff', e: '#9aa0ee', s: '#c3c7f6' },
    bio: { t: '#f6e9c6', e: '#c5a865', s: '#e0cb94' },
    temple: { t: '#5a463a', e: '#2c221c', s: '#3f322a' },
    hub: { t: '#3a3a3a', e: '#151515', s: '#262626' },
  };

  function drawBoard(svg, g, opts) {
    opts = opts || {};
    svg.innerHTML = '';
    const defs = svgEl('defs', {});
    defs.innerHTML = `<pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#111" stroke-width="1.1" stroke-opacity=".5"/></pattern>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    svg.appendChild(defs);
    svg.appendChild(svgEl('image', { href: 'assets/ground.png', x: 0, y: 0, width: 1000, height: 390 }));
    const ground = svgEl('g', {}), bl = svgEl('g', {}), hl = svgEl('g', {}), labels = svgEl('g', {});
    svg.append(ground, bl, hl, labels);
    const pickSet = UI.picking ? new Set(UI.picking.ids) : null;
    // ground layer
    g.parcels.forEach(p => {
      const zc = ZONE_C[p.zone];
      const gr = svgEl('rect', { x: p.x + 1, y: p.y + 1, width: p.w - 2, height: p.h - 2, fill: zc || '#fff', 'fill-opacity': zc ? .55 : 0, stroke: '#9a9a9a', 'stroke-width': .4, class: 'ground', 'data-id': p.id });
      ground.appendChild(gr);
      if (p.owner === 'dev') ground.appendChild(svgEl('rect', { x: p.x + 2.5, y: p.y + 2.5, width: p.w - 5, height: p.h - 5, fill: 'none', stroke: RC.dev, 'stroke-width': 1.6, 'stroke-dasharray': '4 2.5', 'data-id': p.id }));
      if (p.bld && p.bld.type === 'COMMUNITY') {
        ground.appendChild(svgEl('rect', { x: p.x + 3, y: p.y + 3, width: p.w - 6, height: p.h - 6, fill: '#43c443', 'fill-opacity': .75, stroke: '#1f7a1f', 'stroke-width': .6, 'data-id': p.id }));
      }
    });
    // buildings painter-sorted
    const sorted = g.parcels.slice().sort((a, b) => (a.y + a.h) - (b.y + b.h) || (a.x - b.x));
    sorted.forEach(p => {
      const gp = svgEl('g', { 'data-id': p.id });
      bl.appendChild(gp);
      const b = p.bld; if (!b) return;
      const ins = 3, x = p.x + ins, y = p.y + ins, w = p.w - ins * 2, d = p.h - ins * 2;
      if (b.type === 'EXISTING') {
        const zc = ZONE_C[p.zone]; const base = b.retro ? COL.retro : COL.existing;
        box(gp, x, y, w, d, 0, b.h, zc && !b.retro ? { t: zc, e: base.e, s: base.s } : base); bands(gp, x, y, w, d, b.h, b.retro ? '#b49a5e' : '#a9a9a9');
        if (b.retro) { const t = b.h * K; gp.appendChild(svgEl('rect', { x: x - t + 2, y: y - t + 2, width: w - 4, height: d - 4, fill: '#7cc46b', 'fill-opacity': .55 })); }
      } else if (BUILDS[b.type]) {
        const c = b.bio ? COL.bio : (b.type === 'COOP' ? COL.coop : COL.dev);
        if (b.type === 'LUXURY') { box(gp, x, y, w, d, 0, 18, c); box(gp, x + w * .12, y + d * .18, w * .7, d * .62, 18, b.h - 18, c); bands(gp, x + w * .12, y + d * .18, w * .7, d * .62, b.h, b.bio ? '#a88b4b' : '#6d74d6'); }
        else if (b.type === 'WAREHOUSE') { const r = box(gp, x, y, w, d, 0, b.h, c); const n = Math.max(2, Math.floor(w / 14)); for (let i = 0; i < n; i++) { const sx = r.tx + i * w / n; gp.appendChild(svgEl('polyline', { points: `${sx},${r.ty + d} ${sx},${r.ty} ${sx + w / n},${r.ty + d}`, fill: 'none', stroke: '#555', 'stroke-width': .5 })); } }
        else { box(gp, x, y, w, d, 0, b.h, c); bands(gp, x, y, w, d, b.h, b.bio ? '#a88b4b' : '#7b82e6'); }
      } else if (b.type === 'TEMPLE') {
        const c = COL.temple; let r;
        if (b.temple === 'CAFE') { r = box(gp, x, y, w, d, 0, b.h, c); gp.appendChild(svgEl('ellipse', { cx: r.tx + w / 2, cy: r.ty + d / 2, rx: Math.min(w, d) * .3, ry: Math.min(w, d) * .3, fill: '#2a1d14', stroke: '#ff5a1f', 'stroke-width': 1.2 })); }
        else if (b.temple === 'CHURCH') { box(gp, x, y, w, d, 0, 20, c); const tw = Math.min(w, d) * .4; r = box(gp, x + w - tw - 4, y + 4, tw, tw, 20, 38, c); }
        else if (b.temple === 'STATION') { r = box(gp, x, y, w, d, 0, b.h, c); for (let i = 1; i < 5; i++) gp.appendChild(svgEl('line', { x1: r.tx + i * w / 5, y1: r.ty, x2: r.tx + i * w / 5, y2: r.ty + d, stroke: '#ff5a1f', 'stroke-width': .7 })); }
        else { box(gp, x, y, w, d, 0, 16, c); box(gp, x + w * .14, y + d * .14, w * .72, d * .72, 16, 16, c); r = box(gp, x + w * .28, y + d * .28, w * .44, d * .44, 32, 16, c); }
        gp.setAttribute('filter', 'url(#glow)');
        gp.querySelectorAll('polygon,rect').forEach(e => { e.setAttribute('stroke', '#ff5a1f'); e.setAttribute('stroke-width', '.8'); });
        const tk = TEMPLES[b.temple]; const tt = b.h * K + 12;
        labels.appendChild(tagLabel(x + w / 2 - b.h * K, y - tt + 4, tk.name.replace('CARBON ', '').replace('CIRCULAR ', ''), '#ff5a1f', '#fff'));
      } else if (b.type === 'HUB') {
        const r = box(gp, x, y, w, d, 0, b.h, COL.hub);
        const n = Math.max(3, Math.floor(w / 16)); for (let i = 0; i < n; i++) { const sx = r.tx + i * w / n; gp.appendChild(svgEl('polygon', { points: `${sx},${r.ty + d} ${sx},${r.ty} ${sx + w / n},${r.ty + d}`, fill: '#ff5a1f', 'fill-opacity': .25, stroke: '#ff9a1f', 'stroke-width': .7 })); }
        gp.setAttribute('filter', 'url(#glow)');
        labels.appendChild(tagLabel(x + w / 2 - b.h * K, y - b.h * K - 8, 'MATERIAL HUB', '#ff9a1f', '#111'));
      } else if (b.type === 'COMMUNITY') {
        const n = Math.max(3, Math.round(w * d / 700));
        let seed = p.id * 97;
        const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
        for (let i = 0; i < n; i++) { const cx = x + 5 + rnd() * (w - 10), cy = y + 5 + rnd() * (d - 10), rr = 3 + rnd() * 3; gp.appendChild(svgEl('line', { x1: cx, y1: cy, x2: cx - 4, y2: cy - 4, stroke: '#1f5c1f', 'stroke-width': .8 })); gp.appendChild(svgEl('circle', { cx: cx - 5, cy: cy - 5, r: rr, fill: '#2fa82f', stroke: '#145214', 'stroke-width': .5 })); }
      }
    });
    // picking highlights (on top so they're always clickable)
    if (pickSet) {
      g.parcels.forEach(p => {
        if (!pickSet.has(p.id)) return;
        const r = svgEl('rect', { x: p.x + 1.5, y: p.y + 1.5, width: p.w - 3, height: p.h - 3, class: 'hl', rx: 1.5 });
        const gg = svgEl('g', { class: 'pick', 'data-id': p.id }); gg.appendChild(r);
        gg.appendChild(Object.assign(svgEl('text', { x: p.x + p.w / 2, y: p.y + p.h / 2 + 3.5, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, 'font-family': 'Space Mono' }), { textContent: CC.pad(p.id) }));
        hl.appendChild(gg);
      });
    }
    if (UI.flashId) {
      const p = CC.parcel(g, UI.flashId);
      if (p) hl.appendChild(svgEl('rect', { x: p.x, y: p.y, width: p.w, height: p.h, fill: '#ffff00', 'fill-opacity': 0, stroke: '#ffff00', 'stroke-width': 2.5, class: 'flash' }));
    }
    // legend
    const lg = svgEl('g', { transform: 'translate(0,404)', 'font-family': 'Space Mono', 'font-size': 8.5, 'font-weight': 700 });
    let lx = 0;
    [['MIXED USE', ZONE_C.MIXED], ['INDUSTRIAL', ZONE_C.INDUSTRIAL], ['PARK', ZONE_C.PARK], ['CIVIC', ZONE_C.CIVIC], ['DEVELOPER-OWNED', null, 'dev'], ['BIO-BASED', COL.bio.t], ['TEMPLE', '#5a463a']].forEach(([n, c, k]) => {
      if (k === 'dev') lg.appendChild(svgEl('rect', { x: lx, y: -7, width: 9, height: 9, fill: 'none', stroke: RC.dev, 'stroke-width': 1.5, 'stroke-dasharray': '3 1.5' }));
      else lg.appendChild(svgEl('rect', { x: lx, y: -7, width: 9, height: 9, fill: c, stroke: '#111', 'stroke-width': .5 }));
      const t = svgEl('text', { x: lx + 13, y: 1, fill: '#bbb' }); t.textContent = n; lg.appendChild(t);
      lx += 22 + n.length * 5.6;
    });
    if (!opts.noLegend) svg.appendChild(lg);
  }
  function tagLabel(x, y, text, bg, fg) {
    const g = svgEl('g', { 'pointer-events': 'none' });
    const w = text.length * 5.3 + 8;
    g.appendChild(svgEl('rect', { x: x - w / 2, y: y - 8, width: w, height: 11, rx: 2, fill: bg, stroke: '#111', 'stroke-width': .6 }));
    const t = svgEl('text', { x, y: y + .5, 'text-anchor': 'middle', 'font-size': 7.5, 'font-weight': 700, 'font-family': 'Space Mono', fill: fg }); t.textContent = text;
    g.appendChild(t); return g;
  }

  // hover + click on board
  function bindBoard() {
    const svg = $('#board'), tip = $('#tip');
    svg.addEventListener('mousemove', e => {
      const t = e.target.closest('[data-id]'); const g = UI.g;
      if (!t || !g) { tip.style.display = 'none'; return; }
      const p = CC.parcel(g, +t.dataset.id);
      const b = p.bld;
      let what = !b ? 'VACANT LOT' : b.type === 'EXISTING' ? 'EXISTING BUILDING' + (b.retro ? ' (RETROFITTED)' : '') : b.type === 'TEMPLE' ? TEMPLES[b.temple].name : b.type === 'HUB' ? 'MATERIAL HUB' : b.type === 'COMMUNITY' ? 'COMMUNITY SPACE' : (b.bio ? 'BIO-BASED ' : '') + BUILDS[b.type].name;
      tip.innerHTML = `<b>PARCEL ${CC.pad(p.id)}</b><br>ZONED: ${ZONES[p.zone].name}<br>${what}<br>${p.owner ? 'OWNED BY DEVELOPER' : 'UNOWNED'}${p.rail ? '<br>NEXT TO THE METRO-NORTH VIADUCT' : ''}`;
      const r = $('#stage').getBoundingClientRect();
      tip.style.display = 'block';
      tip.style.left = ((e.clientX - r.left) / UI.scale + 14) + 'px';
      tip.style.top = ((e.clientY - r.top) / UI.scale + 14) + 'px';
    });
    svg.addEventListener('mouseleave', () => tip.style.display = 'none');
    svg.addEventListener('click', e => {
      const t = e.target.closest('.pick'); if (!t || !UI.picking) return;
      const id = +t.dataset.id, cb = UI.picking.cb; UI.picking = null; $('#tip').style.display = 'none'; cb(id);
    });
  }

  // ---------- HUD ----------
  function renderPanels() {
    const g = UI.g, a = CC.active(g);
    ROLES.forEach(r => {
      const P = g.p[r], d = $('#p-' + r);
      const on = Math.round(P.meter / 10);
      let m1, m2;
      if (r === 'policy') { m1 = ['POLICIES ACTIVE', Object.keys(g.policies).length]; m2 = ['POLICY POWER', P.meter >= 20 ? 'YES' : 'LOST']; }
      if (r === 'dev') { m1 = ['CASH ON HAND', CC.fmtCash(P.cash)]; m2 = ['PARCELS OWNED', g.parcels.filter(p => p.owner === 'dev').length]; }
      if (r === 'arch') { const avg = P.designs.length ? Math.round(P.designs.reduce((x, y) => x + y, 0) / P.designs.length) : null; m1 = ['BIO-MATERIALS', P.bio]; m2 = ['AVG CO₂ / DESIGN', avg == null ? '-' : (avg > 0 ? '+' : '') + avg.toLocaleString('en-US') + 't']; }
      if (r === 'cit') { m1 = ['ATTENTION TOKENS', P.tokens]; m2 = ['AFFORDABLE UNITS', P.affordable]; }
      d.innerHTML = `<span class="who">${g.humans[r] ? 'HUMAN' : 'CPU'}${P.saved ? ' · 1 CARD' : ''}</span>
        <div class="hd">${ROLE_NAME[r]}</div><hr><div class="score">${METER_NAME[r]}: ${P.meter} / 100</div>
        <div class="dots">${Array.from({ length: 10 }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</div>
        <div class="ml">METRICS:</div><div class="metrics"><div class="metric"><small>${m1[0]}</small><span>${m1[1]}</span></div><div class="metric"><small>${m2[0]}</small><span>${m2[1]}</span></div></div>`;
      d.classList.toggle('active', r === a && !g.over);
      d.classList.toggle('dim', r !== a && !g.over);
    });
    $('#rdL').textContent = $('#rdR').textContent = 'ROUND ' + g.round + ' / ' + RULES.maxRounds;
    const cPct = Math.min(100, g.carbon / RULES.carbonCap * 100);
    $('#ix-carbon').innerHTML = `<div class="hd">CARBON INDEX</div><hr><div class="val">${Math.round(g.carbon).toLocaleString('en-US')} TONS</div><div class="bar"><i style="width:${cPct}%"></i></div>`;
    $('#ix-conv').innerHTML = `<div class="hd">CONVICTION INDEX</div><hr><div class="val">${g.conviction}%</div><div class="bar"><i style="width:${g.conviction}%"></i><b style="left:${RULES.convictionWin}%" title="80% to win together"></b></div>`;
  }
  function renderBoard() { drawBoard($('#board'), UI.g); }
  function bubble(text, role) {
    const b = $('#bubble');
    b.innerHTML = (role ? `<span class="dot" style="background:${RC[role]}"></span>` : '') + text;
  }
  function renderTicker() {
    const L = UI.g.log.slice(-2);
    $('#ticker').innerHTML = L.map((l, i) => `<div class="${i < L.length - 1 ? 'old' : ''}">${l.role ? `<span class="rtag" style="background:${RC[l.role]}"></span>` : ''}${l.msg}</div>`).join('');
  }
  function render() { renderPanels(); renderBoard(); renderTicker(); }

  // ---------- modal helpers ----------
  function modal(html, roleHead) {
    $('#modal').innerHTML = (roleHead ? `<div class="mh" style="background:${RC[roleHead]};color:${RT[roleHead]}">${ROLE_NAME[roleHead]}</div>` : '') + html;
    $('#scrim').classList.add('on');
    return $('#modal');
  }
  function closeModal() { $('#scrim').classList.remove('on'); }
  // choose(): options [{label, sub, value, disabled, why}] -> Promise(value|null)
  function choose(title, text, options, role, cancelable) {
    return new Promise(res => {
      const m = modal(`<h3>${title}</h3>${text ? `<p>${text}</p>` : ''}<div class="opts"></div>${cancelable !== false ? '<div class="row"><button class="pill ghost" data-x>CANCEL</button></div>' : ''}`, role);
      const box = m.querySelector('.opts');
      options.forEach(o => {
        const b = el('button', { class: 'opt' }, `${o.label}${o.sub ? `<small>${o.sub}</small>` : ''}${o.disabled && o.why ? `<small class="why">${o.why}</small>` : ''}`);
        if (o.disabled) b.disabled = true;
        b.onclick = () => { closeModal(); res(o.value); };
        box.appendChild(b);
      });
      const x = m.querySelector('[data-x]'); if (x) x.onclick = () => { closeModal(); res(null); };
    });
  }
  function pickParcel(ids, prompt, role) {
    return new Promise(res => {
      UI.picking = { ids: ids.map(p => p.id || p), cb: id => { renderBoard(); renderActions(); res(id); } };
      bubble(prompt, role);
      renderBoard();
      const A = $('#actions'); A.innerHTML = '';
      const c = el('button', { class: 'abtn end' }, 'CANCEL'); c.onclick = () => { UI.picking = null; renderBoard(); res(null); };
      A.appendChild(c);
    });
  }
  function banner(text, sub, ms) {
    const b = $('#banner'); b.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
    b.classList.add('on'); return wait(ms || 1100).then(() => b.classList.remove('on'));
  }

  // ---------- city cards ----------
  function cardHTML(c) {
    return `<div class="ccard"><span class="cat" style="background:${CAT_C[c.cat]}">${c.cat}</span><div class="nm">${c.name}</div><div class="fl">${c.flavor}</div><div class="fx">${c.text}</div><span class="deck">CITY DECK</span></div>`;
  }
  async function humanCard(role, card, fromSaved) {
    const g = UI.g;
    while (true) {
      const agentList = card.target === 'player' ? `<p style="font-size:12px">${ROLES.map(r => `<b style="background:${RC[r]};color:${RT[r]};padding:0 4px;border:1px solid #111">${ROLE_NAME[r]}</b> ${AGENT_FX[r]}`).join('<br>')}</p>` : '';
      const m = modal(`<div class="cardwrap">${cardHTML(card)}<div style="flex:1"><h3>${card.cat === 'NOTHING' ? 'AW MAN.' : fromSaved ? 'Your saved card' : 'You drew a card!'}</h3>${agentList}<div class="opts" id="cOpts"></div></div></div>`, role);
      const O = m.querySelector('#cOpts');
      const choice = await new Promise(res => {
        const add = (label, sub, v, dis) => { const b = el('button', { class: 'opt' }, label + (sub ? `<small>${sub}</small>` : '')); if (dis) b.disabled = true; b.onclick = () => res(v); O.appendChild(b); };
        if (card.cat === 'NOTHING') { add('OK', 'Better luck next draw.', 'use'); return; }
        add('USE NOW', card.target === 'player' ? 'Pick who gets the change agent.' : card.target === 'parcel' ? (CC.pick[card.pick](g).length ? 'Pick a parcel.' : 'No eligible parcel right now.') : '', 'use', card.target === 'parcel' && !CC.pick[card.pick](g).length);
        if (!fromSaved) add('SAVE 4 LATER', g.p[role].saved ? 'Replaces your saved ' + g.p[role].saved.name + '.' : 'Keep it and play it on a later turn.', 'save');
        if (fromSaved) add('KEEP IT', 'Close.', 'keep');
      });
      closeModal();
      if (choice === 'keep') return 'kept';
      if (choice === 'save') { if (g.p[role].saved) g.discard.push(g.p[role].saved); g.p[role].saved = card; CC.log(g, ROLE_NAME[role] + ' saved a card for later.', role); return 'saved'; }
      if (choice === 'discard') { g.discard.push(card); CC.log(g, ROLE_NAME[role] + ' set the ' + card.name + ' card aside.', role); return 'discarded'; }
      let opt = {};
      if (card.target === 'player') {
        const t = await choose('USE ' + card.name + ' ON:', 'JUST FYI: Yes, you can send change agents to yourself!', ROLES.map(r => ({ label: ROLE_NAME[r], sub: AGENT_FX[r], value: r })), role);
        if (!t) continue; opt.target = t;
      }
      if (card.target === 'parcel') {
        $('#scrim').classList.remove('on');
        const id = await pickParcel(CC.pick[card.pick](g), 'PICK A PARCEL FOR ' + card.name, role);
        if (!id) continue; opt.parcel = id;
      }
      if (fromSaved) g.p[role].saved = null;
      await CC.playCard(g, card, role, opt, hooks);
      UI.flashId = opt.parcel || null;
      render(); UI.flashId = null;
      return 'used';
    }
  }

  // ---------- hooks for human reactions ----------
  const hooks = {
    async ask(role, kind, payload) {
      const g = UI.g;
      render();
      if (kind === 'react') {
        const P = g.p.cit, ch = Math.round(CC.protestChance(g) * 100);
        const what = payload.kind === 'build'
          ? `The ${ROLE_NAME[payload.by]} just proposed to build <b>${BUILDS[payload.build].name}</b> on Parcel ${CC.pad(payload.parcel)} (+${BUILDS[payload.build].carbon.toLocaleString('en-US')} tons, ${BUILDS[payload.build].liv} livability).`
          : `The ${ROLE_NAME[payload.by]} just rezoned Parcel ${CC.pad(payload.parcel)} from <b>${ZONES[payload.from].name}</b> to <b>${ZONES[payload.to].name}</b>.`;
        UI.flashId = payload.parcel; renderBoard(); UI.flashId = null;
        const v = await choose('CITIZEN REACTION', what + ' How do you want to react? (Your protest won’t always be heard.)', [
          { label: 'APPROVE', sub: 'Let it happen.', value: 'a' },
          { label: 'PROTEST', sub: `Spend 1 attention token (you have ${P.tokens}). ${ch}% chance the city listens.`, value: 'p', disabled: P.tokens < 1, why: 'NO ATTENTION TOKENS LEFT' },
        ], 'cit', false);
        return v === 'p';
      }
      if (kind === 'pitch') {
        const v = await choose('The ARCHITECT pitched a bio-based design.', `Your next build emits 60% less carbon and adds conviction. Profit ${g.policies.GREEN ? '+3 (Green Subsidy)' : '-3'} on that build.`, [
          { label: 'ACCEPT', value: 'y' }, { label: 'DECLINE', value: 'n' }], 'dev', false);
        return v === 'y';
      }
      if (kind === 'requestRezone') {
        const v = await choose('Rezoning request', `The DEVELOPER asks you to rezone Parcel ${CC.pad(payload.parcel)} to <b>${ZONES[payload.zone].name}</b>. They pay $250k in fees. Approval ${payload.zone === 'INDUSTRIAL' ? '-3' : '-1'}.`, [
          { label: 'APPROVE', value: 'y' }, { label: 'DENY', value: 'n' }], 'policy', false);
        return v === 'y';
      }
      return false;
    },
  };

  // ---------- human turn ----------
  function renderActions() {
    const g = UI.g, role = CC.active(g), A = $('#actions');
    A.innerHTML = '';
    if (!g.humans[role] || g.over || UI.picking) return;
    A.style.setProperty('--rc', RC[role]);
    if (g.phase === 'draw') {
      const b = el('button', { class: 'abtn primary' }, 'DRAW YOUR CARD!<small>FROM THE CITY DECK</small>');
      b.onclick = async () => { const c = CC.drawCard(g); renderPanels(); await humanCard(role, c, false); g.phase = 'act'; afterHuman(); };
      A.appendChild(b); return;
    }
    A.appendChild(el('div', { class: 'label' }, `WHAT WOULD YOU LIKE TO DO? ${g.actionsLeft} ACTION${g.actionsLeft === 1 ? '' : 'S'} LEFT`));
    if (g.actionsLeft > 0) {
      CC.actionsFor(g, role).forEach(a => {
        const b = el('button', { class: 'abtn', title: a.ok ? (a.hint || '') : a.why }, a.label + `<small>${a.ok ? (a.hint || '&nbsp;') : a.why}</small>`);
        if (!a.ok) b.disabled = true;
        b.onclick = () => humanAction(role, a);
        A.appendChild(b);
      });
    }
    if (g.p[role].saved) {
      const b = el('button', { class: 'abtn' }, 'PLAY SAVED CARD<small>' + g.p[role].saved.name + '</small>');
      b.onclick = async () => { await humanCard(role, g.p[role].saved, true); afterHuman(); };
      A.appendChild(b);
    }
    const e = el('button', { class: 'abtn end' }, g.actionsLeft > 0 ? 'END TURN' : 'I’M DONE!');
    e.onclick = () => { $('#actions').innerHTML = ''; if (UI.turnResolve) { const r = UI.turnResolve; UI.turnResolve = null; r(); } };
    A.appendChild(e);
  }
  function afterHuman() {
    const g = UI.g, role = CC.active(g);
    render();
    bubble(g.actionsLeft > 0 ? `${TITLE[role]}, it’s your turn!` : `${TITLE[role]}, end your turn when ready.`, role);
    renderActions();
  }
  async function humanAction(role, a) {
    const g = UI.g; let opt = {};
    const doAct = async (id, o) => { UI.busy = true; const r = await CC.act(g, role, id, o, hooks); UI.busy = false; if (r && r.ok === false && r.msg) await banner(r.msg, '', 900); UI.flashId = o && o.parcel; render(); UI.flashId = null; afterHuman(); };
    switch (a.id) {
      case 'townhall': case 'raise': case 'research': case 'pitch': case 'rest': case 'spread': return doAct(a.id, {});
      case 'rezone': {
        const id = await pickParcel(CC.pick.rezone(g), 'PICK A PARCEL TO REZONE', role); if (!id) return afterHuman();
        const p = CC.parcel(g, id);
        const z = await choose(`Rezone Parcel ${CC.pad(id)}`, `This zone is currently <b>${ZONES[p.zone].name}</b>. Rezone it to:`, Object.keys(ZONES).filter(k => k !== p.zone).map(k => ({ label: ZONES[k].name, value: k, sub: { PARK: '+3 livability, +3 approval. Developers can’t build here.', CIVIC: '+1% conviction. Temples can be built here.', INDUSTRIAL: '-2 approval. Warehouses, or the Material Hub.', MIXED: 'Co-op housing or luxury condos.', RESCOM: 'Luxury, offices or co-op.' }[k] })), role);
        if (!z) return afterHuman(); return doAct('rezone', { parcel: id, zone: z });
      }
      case 'policy': {
        const k = await choose('ENACT POLICIES', g.p.policy.freePolicy ? 'A change agent has your back: your next policy costs no approval.' : '-10 APPROVAL REQUIRED FOR ENACTING GREEN POLICIES.', Object.keys(POLICIES).map(k => { const st = CC.policyStatus(g, k); return { label: 'ENACT ' + POLICIES[k].name, sub: POLICIES[k].text, value: k, disabled: !st.ok, why: st.why }; }), 'policy');
        if (!k) return afterHuman(); return doAct('policy', { policy: k });
      }
      case 'acquire': {
        const list = CC.pick.acquire(g).filter(p => g.p.dev.cash >= (p.bld ? RULES.acquireExisting : RULES.acquireVacant));
        const id = await pickParcel(list, 'PICK A PARCEL TO ACQUIRE ($500k VACANT, $1 mil BUILT)', role); if (!id) return afterHuman();
        return doAct('acquire', { parcel: id });
      }
      case 'develop': {
        const id = await pickParcel(CC.pick.develop(g), 'PICK ONE OF YOUR PARCELS TO DEVELOP', role); if (!id) return afterHuman();
        const p = CC.parcel(g, id), bio = g.p.dev.pendingBio;
        const k = await choose(`Develop Parcel ${CC.pad(id)}`, `This zone is currently <b>${ZONES[p.zone].name}</b>. Choose what building type you want here:${bio ? ' <b>(bio-based: -60% carbon)</b>' : ''}${p.bld ? ' Demolishing the existing building adds 1,500 tons.' : ''}`,
          CC.buildOptions(g, p).map(k => { const B = BUILDS[k], c = CC.buildCost(g, k); return { label: `${B.name} (PROFIT: ${B.tag})`, sub: `Costs ${CC.fmtCash(c)} · +${B.profit} profit · +${Math.round(B.carbon * (bio ? .4 : 1)).toLocaleString('en-US')} tons · ${B.liv >= 0 ? '+' : ''}${B.liv} livability${B.units ? ' · ' + B.units + ' affordable units' : ''} · rent ${CC.fmtCash(B.rent)}/round`, value: k, disabled: g.p.dev.cash < c, why: 'NOT ENOUGH CASH' }; }), 'dev');
        if (!k) return afterHuman(); return doAct('develop', { parcel: id, build: k });
      }
      case 'request': {
        const id = await pickParcel(CC.pick.requestRezone(g), 'PICK ONE OF YOUR PARCELS TO REZONE', role); if (!id) return afterHuman();
        const p = CC.parcel(g, id);
        const z = await choose('REQUEST REZONING', `Parcel ${CC.pad(id)} is <b>${ZONES[p.zone].name}</b>. Ask the Policymaker to make it:`, ['RESCOM', 'MIXED', 'INDUSTRIAL'].filter(k => k !== p.zone).map(k => ({ label: ZONES[k].name, value: k })), 'dev');
        if (!z) return afterHuman(); return doAct('request', { parcel: id, zone: z });
      }
      case 'temple': {
        const k = await choose('DESIGN A CARBON TEMPLE', 'Public, low-carbon flagship buildings. Each one: -3,000 tons now, -500 tons every round, +5% conviction, +12 recognition. Costs 3 bio-materials.', Object.keys(TEMPLES).map(k => { const st = CC.templeStatus(g, k), T = TEMPLES[k]; return { label: T.name, sub: T.desc + ` Needs ${k === 'CHURCH' && g.faith ? T.conv - 10 : T.conv}% conviction · ${T.zones.join(' / ')}${T.rail ? ' parcel by the rail' : ''}${T.needsTemple ? ' · 2 other temples first' : ''}.`, value: k, disabled: !st.ok, why: st.why }; }), 'arch');
        if (!k) return afterHuman();
        const id = await pickParcel(CC.pick.temple(g, k), 'PICK A SITE FOR THE ' + TEMPLES[k].name, role); if (!id) return afterHuman();
        return doAct('temple', { temple: k, parcel: id });
      }
      case 'hub': {
        const id = await pickParcel(CC.pick.hub(g), 'PICK AN INDUSTRIAL PARCEL FOR THE MATERIAL HUB', role); if (!id) return afterHuman();
        return doAct('hub', { parcel: id });
      }
      case 'retrofit': {
        const id = await pickParcel(CC.pick.retrofit(g), 'PICK AN EXISTING BUILDING TO RETROFIT', role); if (!id) return afterHuman();
        return doAct('retrofit', { parcel: id });
      }
      case 'community': {
        const id = await pickParcel(CC.pick.community(g), 'PICK A VACANT PARK OR CIVIC PARCEL', role); if (!id) return afterHuman();
        return doAct('community', { parcel: id });
      }
      case 'coalition': {
        const t = await choose('JOIN A COALITION WITH:', 'They get +5 to their score. You get +2 livability. The city gets +3% conviction.', ROLES.filter(r => r !== 'cit').map(r => ({ label: ROLE_NAME[r], sub: { policy: '+5 approval', dev: '+5 profit, +$200k', arch: '+5 recognition, +1 bio-material' }[r], value: r })), 'cit');
        if (!t) return afterHuman(); return doAct('coalition', { target: t });
      }
    }
  }
  function humanTurn() {
    return new Promise(res => { UI.turnResolve = res; afterHuman(); });
  }

  // ---------- AI turn with pacing ----------
  async function aiTurnUI(role) {
    const g = UI.g, tok = UI.token;
    bubble(`${TITLE[role]} is thinking...`, role);
    $('#actions').innerHTML = '';
    await wait(650); if (tok !== UI.token) return;
    const card = CC.drawCard(g);
    const cd = CC.AI.card(g, role, card);
    if (cd.use) { await CC.playCard(g, card, role, cd, hooks); UI.flashId = cd.parcel || null; }
    else { if (g.p[role].saved) g.discard.push(g.p[role].saved); g.p[role].saved = card; CC.log(g, ROLE_NAME[role] + ' drew a card and saved it for later.', role); }
    g.phase = 'act'; render(); UI.flashId = null;
    await wait(900); if (tok !== UI.token) return;
    let guard = 0;
    while (g.actionsLeft > 0 && guard++ < 6) {
      const a = CC.AI.turn(g, role);
      let res = await CC.act(g, role, a.id, a.opt, hooks);
      if (res && res.ok === false) res = await CC.act(g, role, { policy: 'townhall', dev: 'raise', arch: 'research', cit: 'rest' }[role], {}, hooks);
      UI.flashId = a.opt && a.opt.parcel; render(); UI.flashId = null;
      await wait(1000); if (tok !== UI.token) return;
    }
  }

  // ---------- main loop ----------
  async function loop() {
    const g = UI.g, tok = UI.token;
    let lastRound = g.round;
    await banner('ROUND ' + g.round, 'Policymaker goes first', 1000);
    while (!g.over) {
      if (tok !== UI.token) return;
      const role = CC.active(g);
      if (g.humans[role]) {
        const humans = ROLES.filter(r => g.humans[r]).length;
        if (humans > 1) await banner(`${ROLE_NAME[role]}'S TURN`, 'Pass the screen', 1000);
        await humanTurn();
      } else await aiTurnUI(role);
      if (tok !== UI.token) return;
      CC.endTurn(g);
      render();
      if (g.over) break;
      if (g.round !== lastRound) { lastRound = g.round; await banner('ROUND ' + g.round, g.carbon > 85000 ? 'The carbon budget is almost gone' : g.conviction >= 60 ? 'The city is starting to believe' : '', 1100); }
    }
    await wait(700);
    endScreen();
  }

  function startGame() {
    UI.token++;
    UI.g = CC.newGame({ humans: Object.assign({}, UI.seats) });
    CC.startTurn(UI.g);
    siteIntro();
  }
  function siteIntro() {
    show('siteintro');
    const steps = [
      'WELCOME TO YOUR SITE....<br>EAST HARLEM, 125TH STREET!',
      'Two avenues, one street, and the Metro-North viaduct over Park Avenue. 34 parcels: built, vacant, and up for grabs.',
      'Yellow is mixed use. Orange is industrial. Green is park. Purple is civic, where temples go. Hover any parcel to inspect it.',
    ];
    let i = 0;
    const go = () => { $('#siteText').innerHTML = steps[i]; $('#siteNext').textContent = i === steps.length - 1 ? "LET'S PLAY!" : 'NEXT'; };
    drawBoard($('#introBoard'), UI.g, { noLegend: false });
    go();
    $('#siteNext').onclick = () => { i++; if (i < steps.length) go(); else { show('game'); render(); loop(); } };
  }

  // ---------- end screen ----------
  function endScreen() {
    const g = UI.g; show('end');
    const st = CC.standings(g);
    const top = st[0];
    let h, lede;
    if (g.over.type === 'win') { h = 'CARBON CAPITAL.<br>YOU WON TOGETHER.'; lede = `The Material Hub is running and ${g.conviction}% of the city cares about carbon. 125th Street now grows the material it builds with. Carbon held at ${Math.round(g.carbon).toLocaleString('en-US')} tons.`; }
    else if (g.over.type === 'loss') { h = 'THE CARBON BUDGET<br>RAN OUT.'; lede = `Round ${g.round}: carbon passed 100,000 tons with conviction at ${g.conviction}%. Everybody loses. Still, somebody did well: the ${ROLE_NAME[top.role]} finished with ${top.meter} ${METER_NAME[top.role].toLowerCase()}.`; }
    else { h = `THE ${ROLE_NAME[top.role]}<br>WINS ALONE.`; lede = `Twelve rounds and the street never quite decided. Carbon at ${Math.round(g.carbon).toLocaleString('en-US')} tons, conviction at ${g.conviction}%. Nobody lost the planet, nobody saved it.`; }
    const H = g.history, W = 420, Hh = 170;
    const xs = i => 30 + i * (W - 40) / Math.max(1, H.length - 1);
    const yc = v => Hh - 20 - (Math.min(v, 115000) - 30000) / (115000 - 30000) * (Hh - 40);
    const yv = v => Hh - 20 - v / 100 * (Hh - 40);
    const line = (f, c) => `<polyline fill="none" stroke="${c}" stroke-width="2.5" points="${H.map((h, i) => xs(i) + ',' + f(h)).join(' ')}"/>`;
    const chart = `<svg width="${W}" height="${Hh}" style="font-family:Space Mono;font-size:9px;font-weight:700">
      <line x1="30" x2="${W - 10}" y1="${yc(100000)}" y2="${yc(100000)}" stroke="#ff9a1f" stroke-dasharray="4 3"/><text x="34" y="${yc(100000) - 4}" fill="#ff9a1f">100k TON BUDGET</text>
      <line x1="30" x2="${W - 10}" y1="${yv(80)}" y2="${yv(80)}" stroke="#e066ff" stroke-dasharray="4 3"/><text x="${W - 10}" y="${yv(80) - 4}" text-anchor="end" fill="#e066ff">80% CONVICTION</text>
      ${line(h => yc(h.carbon), '#ff9a1f')}${line(h => yv(h.conviction), '#e066ff')}
      <line x1="30" x2="${W - 10}" y1="${Hh - 20}" y2="${Hh - 20}" stroke="#111"/>
      ${H.map((h, i) => `<text x="${xs(i)}" y="${Hh - 6}" text-anchor="middle">${i === 0 ? 'START' : 'R' + h.round}</text>`).join('')}
    </svg>`;
    $('#endWrap').innerHTML = `<h2>${h}</h2><p class="lede">${lede}</p>
      <div class="endgrid"><div class="box"><h4>CARBON INDEX + CONVICTION INDEX</h4>${chart}</div>
      <div class="box"><h4>PERSONAL SCORES</h4>${st.map(s => `<div class="stand"><span class="nm">${ROLE_NAME[s.role]}</span><span class="bar"><i style="width:${s.meter}%;background:${RC[s.role]}"></i></span><span class="n">${s.meter}</span></div>`).join('')}
      <p style="font-size:12px;margin:12px 0 0">Temples built: ${CC.templeCount(g)} / 4 · Material Hub: ${g.hub ? 'yes' : 'no'} · Affordable units: ${g.p.cit.affordable} · Developer cash: ${CC.fmtCash(g.p.dev.cash)}</p></div></div>
      <div class="btn-row" style="justify-content:flex-start"><button class="pill" id="again">PLAY AGAIN</button><button class="pill ghost" id="seatsAgain">CHANGE PLAYERS</button></div>`;
    $('#again').onclick = startGame; $('#seatsAgain').onclick = toSetup;
  }

  // ---------- tools ----------
  $('#tRules').onclick = () => {
    const m = modal(`<h3>RULES</h3>${RULE_PAGES.map(p => `<div style="font-size:13px;line-height:1.45;margin-bottom:12px">${p.replace(/<p>/g, '').replace(/<\/p>/g, ' ')}</div>`).join('')}<div class="row"><button class="pill" data-x>BACK TO THE GAME</button></div>`);
    m.querySelector('[data-x]').onclick = closeModal;
  };
  $('#tLog').onclick = () => {
    const L = UI.g ? UI.g.log.slice().reverse() : [];
    const m = modal(`<h3>GAME LOG</h3><div class="loglist">${L.map(l => `<div><span class="r">R${l.round}</span>${l.role ? `<span class="rtag" style="background:${RC[l.role]}"></span>` : ''}${l.msg}</div>`).join('') || 'Nothing yet.'}</div><div class="row"><button class="pill" data-x>CLOSE</button></div>`);
    m.querySelector('[data-x]').onclick = closeModal;
  };
  $('#tSpeed').onclick = () => { speedIdx = (speedIdx + 1) % SPEEDS.length; $('#tSpeed').textContent = '» SPEED: ' + SPEEDS[speedIdx].n; };
  $('#tRestart').onclick = async () => {
    const v = await choose('START A NEW GAME?', 'This game will be lost.', [{ label: 'YES, NEW GAME', value: 'y' }, { label: 'CHANGE PLAYERS', value: 's' }]);
    if (v === 'y') { UI.token++; UI.turnResolve = null; UI.picking = null; startGame(); }
    if (v === 's') { UI.token++; UI.turnResolve = null; UI.picking = null; toSetup(); }
  };

  bindBoard();
  const q = new URLSearchParams(location.search);
  if (q.has('demo')) { ROLES.forEach(r => UI.seats[r] = false); speedIdx = 2; $('#tSpeed').textContent = '» SPEED: FAST'; startGame(); }
  else intro(0);
  window.__UI = UI;
})();
