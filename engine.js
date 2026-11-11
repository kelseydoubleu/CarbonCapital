/* CARBON CAPITAL — game engine (no DOM). Works in browser (window.CC) and Node (module.exports). */
(function (root) {
  'use strict';

  const ROLES = ['policy', 'dev', 'arch', 'cit'];
  const ROLE_NAME = { policy: 'POLICYMAKER', dev: 'DEVELOPER', arch: 'ARCHITECT', cit: 'CITIZEN' };
  const METER_NAME = { policy: 'PUBLIC APPROVAL', dev: 'PROFIT', arch: 'RECOGNITION', cit: 'CITY LIVABILITY' };
  const ACTIONS_PER_TURN = { policy: 1, dev: 2, arch: 1, cit: 1 };

  const RULES = {
    maxRounds: 12,
    carbonStart: 50000,
    carbonCap: 100000,
    convictionStart: 20,
    convictionWin: 80,
    baselineCarbon: 4500,       // business as usual, per round
    acquireVacant: 500000,
    acquireExisting: 1000000,
    demolitionCarbon: 1500,
    raiseCapital: 400000,
    decay: 6,               // conviction fades each round
  };

  const ZONES = {
    RESCOM: { name: 'COMMERCIAL OR RESIDENTIAL', short: 'RES / COM' },
    MIXED: { name: 'MIXED USE', short: 'MIXED' },
    INDUSTRIAL: { name: 'INDUSTRIAL', short: 'IND' },
    PARK: { name: 'PARK / GREEN BELT', short: 'PARK' },
    CIVIC: { name: 'CIVIC / PUBLIC', short: 'CIVIC' },
  };

  // Developer building types
  const BUILDS = {
    LUXURY: { name: 'LUXURY CONDOS + RETAIL', tag: '$$$', zones: ['RESCOM', 'MIXED'], cost: 1200000, profit: 15, carbon: 6000, liv: -5, conv: -2, rent: 500000, ops: 400, h: 70, units: 0 },
    OFFICE: { name: 'OFFICE TOWER', tag: '$$', zones: ['RESCOM'], cost: 1000000, profit: 12, carbon: 5000, liv: -1, conv: 0, rent: 400000, ops: 300, h: 60, units: 0 },
    COOP: { name: 'CO-OP HOUSING + RETAIL', tag: '$', zones: ['MIXED', 'RESCOM'], cost: 800000, profit: 6, carbon: 3000, liv: 5, conv: 1, rent: 200000, ops: 150, h: 35, units: 24 },
    WAREHOUSE: { name: 'LOGISTICS WAREHOUSE', tag: '$$', zones: ['INDUSTRIAL'], cost: 700000, profit: 9, carbon: 4000, liv: -6, conv: 0, rent: 300000, ops: 300, h: 18, units: 0 },
  };

  const TEMPLES = {
    CAFE: { name: 'CIRCULAR CAFÉ', desc: 'A coffee shop that turns its spent grounds into building material.', conv: 25, zones: ['CIVIC', 'PARK', 'MIXED'], bio: 3 },
    CHURCH: { name: 'CARBON CHURCH', desc: 'A congregation that tithes in stored carbon.', conv: 40, zones: ['CIVIC'], bio: 3 },
    STATION: { name: 'CARBON STATION', desc: 'A Metro-North platform clad in sequestering panels.', conv: 45, zones: ['CIVIC', 'PARK', 'MIXED'], bio: 3, rail: true },
    MUSEUM: { name: 'MUSEUM OF CARBON', desc: 'Where carbon is stored, displayed, adopted and valued.', conv: 55, zones: ['CIVIC', 'PARK'], bio: 3, needsTemple: true },
  };
  const TEMPLE_FX = { carbon: -3000, perRound: -500, conv: 5, rec: 12, liv: 4, approval: 3 };
  const HUB = { name: 'MATERIAL HUB', conv: 70, temples: 3, bio: 3, zones: ['INDUSTRIAL'], carbon: -2000, perRoundCarbon: -2000, perRoundConv: 4, perRoundBio: 2, rec: 15 };

  const POLICIES = {
    GREEN: { name: 'GREEN SUBSIDY', need: 60, cost: 10, text: 'Spend public funds on bio-materials and sustainable design. +10 Architect recognition, +10 livability, -3,000 tons. Bio-based builds earn the Developer +3 profit.' },
    TAX: { name: 'CARBON TAX', need: 70, cost: 10, text: 'High-carbon builds cost $500k more. -1,000 tons every round. +5 conviction.' },
    QUOTA: { name: 'HOUSING QUOTA', need: 80, cost: 10, text: 'Luxury builds must include 12 affordable units (+3 livability each). Luxury profit -4.' },
    DEREG: { name: 'DEREGULATION', need: 0, cost: -5, text: 'Cut the red tape. Builds cost $300k less and emit 20% more. +5 approval now. -5 conviction.' },
  };

  // ---------- parcels (board coords on a 1000 x 390 plan) ----------
  const P = (id, x, y, w, h, eh, zone, extra) => Object.assign({ id, x, y, w, h, zone: zone || 'RESCOM', owner: null, bld: eh ? { type: 'EXISTING', h: eh } : null }, extra || {});
  function makeParcels() {
    return [
      P(1, 35, 34, 100, 62, 45), P(2, 135, 34, 154, 62, 25, 'CIVIC', { church: true }),
      P(3, 35, 96, 50, 64, 15), P(4, 85, 96, 35, 64, 30), P(5, 120, 96, 34, 64, 35), P(6, 154, 96, 46, 64, 20),
      P(7, 200, 96, 30, 64, 0), P(8, 230, 96, 59, 64, 18, null, { rail: true }),
      P(9, 395, 34, 175, 64, 40), P(10, 570, 34, 74, 52, 35), P(11, 395, 98, 51, 62, 12, null, { rail: true }),
      P(12, 446, 98, 31, 62, 0), P(13, 477, 98, 31, 62, 22), P(14, 508, 98, 62, 62, 28), P(15, 570, 86, 74, 74, 50),
      P(16, 702, 34, 33, 126, 30), P(17, 735, 34, 87, 126, 55, 'CIVIC'), P(18, 822, 34, 88, 126, 55), P(19, 910, 34, 52, 126, 60),
      P(20, 35, 226, 55, 58, 22), P(21, 90, 226, 30, 64, 28), P(22, 120, 226, 34, 64, 14), P(23, 154, 226, 135, 64, 0, null, { rail: true }),
      P(24, 35, 284, 164, 68, 20, 'INDUSTRIAL'), P(25, 199, 290, 90, 62, 0),
      P(26, 395, 226, 50, 49, 0, null, { rail: true }), P(27, 445, 226, 32, 59, 25), P(28, 395, 275, 82, 77, 18),
      P(29, 477, 226, 62, 126, 65), P(30, 539, 226, 105, 64, 30), P(31, 539, 290, 105, 62, 22),
      P(32, 702, 226, 104, 126, 0), P(33, 806, 226, 156, 94, 0), P(34, 806, 320, 156, 32, 12),
    ];
  }

  // ---------- city deck ----------
  const AGENT_FX = {
    policy: 'Next policy costs no approval. +8 approval.',
    dev: 'Next build is bio-based (no architect needed).',
    arch: '+2 bio-materials, +6 recognition.',
    cit: '+2 attention tokens, +4 livability.',
  };
  function makeDeck(rng) {
    const C = [];
    const agent = (name, flavor) => C.push({ cat: 'CHANGE AGENT', name, flavor, target: 'player', text: 'Send a change agent into any organization (yourself included). +2% conviction.' });
    agent('SUSTAINABILITY LEAD', 'Hired to write a report. Ends up rewriting the budget.');
    agent('BIO-MATERIAL COLLECTIVE', 'They meet at conferences. Then they meet at your office.');
    agent('CLIMATE JOURNALIST', 'One long read and suddenly everyone has an opinion.');
    agent('INSIDE ADVOCATE', 'Ideas spread person to person, not memo to memo.');
    const fx = (cat, name, flavor, text, key, extra) => C.push(Object.assign({ cat, name, flavor, text, key }, extra || {}));
    fx('COALITION', 'COMMUNITY BOARD 11', 'East Harlem shows up to the meeting.', '+6 livability, +5 approval.', 'board');
    fx('COALITION', 'FAITH LEADERS COALITION', 'Stewardship, preached from four pulpits.', '+4% conviction. Church temple needs 10% less conviction.', 'faith');
    fx('COALITION', 'GREEN JOBS COALITION', 'Turns out sequestration needs a workforce.', '+4% conviction, +5 Developer profit.', 'jobs');
    fx('CRISIS', 'HEAT WAVE', 'The blacktop holds the heat all night.', '+1,500 tons. -6 livability unless 2+ parks or community spaces exist.', 'heat');
    fx('CRISIS', 'RENT SPIKE', 'Listings up 30% in a year.', '-8 livability. +5 Developer profit.', 'rent');
    fx('CRISIS', 'SUPPLY CHAIN SHOCK', 'Straw bales stuck at the port.', '-2 bio-materials. Developer loses $500k.', 'supply');
    fx('CRISIS', 'PARK AVE FLOOD', 'The viaduct underpass fills again.', '+2,000 tons, -5 approval. If a temple exists, people notice: +5 conviction.', 'flood');
    fx('CRISIS', 'CONDO BOOM', 'Cranes on every corner.', 'Developer +$800k. +2,000 tons. -3% conviction.', 'boom');
    fx('CRISIS', 'NEWS CYCLE MOVES ON', 'Something else is trending.', '-4% conviction.', 'news');
    fx('CRISIS', 'VIRAL BACKLASH', '"Carbon church?" trends for the wrong reasons.', '-5% conviction.', 'backlash');
    fx('SITE', 'PARISH OFFERS ITS LOT', 'An aging congregation looks for a new mission.', 'Pick an unowned parcel with a building: rezone it CIVIC for free. +2 conviction.', 'parish', { target: 'parcel', pick: 'unownedBuilt' });
    fx('SITE', 'LOT DONATED', 'An estate leaves a vacant lot to the neighborhood.', 'Pick an unowned vacant parcel: it becomes PARK / GREEN BELT. +3 livability.', 'donate', { target: 'parcel', pick: 'unownedVacant' });
    fx('SITE', 'RAIL AIR RIGHTS', 'Metro-North sells the space beside the viaduct.', 'Pick an unowned parcel next to the rail: rezone it CIVIC. +3 conviction.', 'rail', { target: 'parcel', pick: 'railUnowned' });
    fx('SITE', 'COFFEE GROUNDS PILOT', '125th St cafés start saving their grounds.', '+2 bio-materials, +2 livability, +2 conviction.', 'coffee');
    fx('SITE', 'TAX ABATEMENT DEAL', 'A quiet deal at City Hall.', 'Developer gets $1M. +1,000 tons. -2 conviction.', 'abate');
    for (let i = 0; i < 3; i++) C.push({ cat: 'NOTHING', name: 'NOTHING', flavor: 'AW MAN.', text: 'THIS CARD DOES NOTHING... BETTER LUCK NEXT DRAW!', key: 'nothing' });
    return shuffle(C.map((c, i) => Object.assign({ uid: i + 1 }, c)), rng);
  }

  // ---------- utils ----------
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fmtTons = t => Math.round(t).toLocaleString('en-US') + ' TONS';
  const fmtCash = c => (c >= 1e6 || c <= -1e6) ? '$' + (c / 1e6).toFixed(c % 1e6 === 0 ? 0 : 1) + ' mil' : '$' + Math.round(c / 1000) + 'k';

  // ---------- game ----------
  function newGame(opts) {
    opts = opts || {};
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 1e9);
    const rng = mulberry32(seed);
    const s = {
      seed, round: 1, turn: 0, actionsLeft: 0, phase: 'draw',
      carbon: RULES.carbonStart, conviction: RULES.convictionStart,
      humans: Object.assign({ policy: false, dev: false, arch: false, cit: true }, opts.humans || {}),
      p: {
        policy: { meter: 50, saved: null, freePolicy: false },
        dev: { meter: 0, cash: 2500000, saved: null, pendingBio: false },
        arch: { meter: 30, bio: 5, saved: null, designs: [] },
        cit: { meter: 30, tokens: 5, saved: null, community: 0, affordable: 0 },
      },
      policies: {}, temples: {}, hub: null, faith: false,
      parcels: makeParcels(), deck: [], discard: [], drawn: null, log: [], over: null, history: [],
    };
    s.deck = makeDeck(rng);
    s._rng = rng;
    snapshot(s);
    return s;
  }

  const active = s => ROLES[s.turn];
  const parcel = (s, id) => s.parcels.find(p => p.id === id);
  function log(s, msg, role) { s.log.push({ round: s.round, role: role || null, msg }); }
  function meter(s, role, d) { s.p[role].meter = clamp(s.p[role].meter + d, 0, 100); }
  function conv(s, d) { s.conviction = clamp(s.conviction + d, 0, 100); }
  function carbon(s, d) { s.carbon = Math.max(0, s.carbon + d); }
  function snapshot(s) { s.history.push({ round: s.round, carbon: s.carbon, conviction: s.conviction, meters: ROLES.map(r => s.p[r].meter) }); }
  const templeCount = s => Object.keys(s.temples).length;
  const greenSpaces = s => s.parcels.filter(p => p.zone === 'PARK' || (p.bld && p.bld.type === 'COMMUNITY')).length;
  const isProtected = p => p.bld && ['TEMPLE', 'HUB', 'COMMUNITY'].includes(p.bld.type);
  const isVacant = p => !p.bld;

  // ---------- eligibility ----------
  const pick = {
    rezone: (s) => s.parcels.filter(p => !isProtected(p) && !(p.owner && p.bld && p.bld.type !== 'EXISTING')),
    acquire: (s) => s.parcels.filter(p => !p.owner && !isProtected(p) && ['RESCOM', 'MIXED', 'INDUSTRIAL'].includes(p.zone)),
    develop: (s) => s.parcels.filter(p => p.owner === 'dev' && (!p.bld || p.bld.type === 'EXISTING') && buildOptions(s, p).length),
    requestRezone: (s) => s.parcels.filter(p => p.owner === 'dev' && (!p.bld || p.bld.type === 'EXISTING')),
    retrofit: (s) => s.parcels.filter(p => p.bld && p.bld.type === 'EXISTING' && !p.bld.retro),
    temple: (s, key) => s.parcels.filter(p => !p.owner && !isProtected(p) && TEMPLES[key].zones.includes(p.zone) && (!TEMPLES[key].rail || p.rail)),
    hub: (s) => s.parcels.filter(p => !p.owner && !isProtected(p) && HUB.zones.includes(p.zone)),
    community: (s) => s.parcels.filter(p => !p.owner && isVacant(p) && ['PARK', 'CIVIC'].includes(p.zone)),
    unownedBuilt: (s) => s.parcels.filter(p => !p.owner && p.bld && p.bld.type === 'EXISTING'),
    unownedVacant: (s) => s.parcels.filter(p => !p.owner && isVacant(p) && p.zone !== 'PARK'),
    railUnowned: (s) => s.parcels.filter(p => !p.owner && p.rail && !isProtected(p) && p.zone !== 'CIVIC'),
  };

  function buildOptions(s, p) { return Object.keys(BUILDS).filter(k => BUILDS[k].zones.includes(p.zone)); }
  function buildCost(s, k) {
    let c = BUILDS[k].cost;
    if (s.policies.TAX && k !== 'COOP') c += 500000;
    if (s.policies.DEREG) c -= 300000;
    return c;
  }
  function templeNeed(s, key) { return TEMPLES[key].conv - (key === 'CHURCH' && s.faith ? 10 : 0); }
  function templeStatus(s, key) {
    const t = TEMPLES[key];
    if (s.temples[key]) return { ok: false, why: 'ALREADY BUILT' };
    if (s.conviction < templeNeed(s, key)) return { ok: false, why: 'NEED ' + templeNeed(s, key) + '% CONVICTION' };
    if (t.needsTemple && templeCount(s) < 2) return { ok: false, why: 'NEED 2 OTHER TEMPLES FIRST' };
    if (s.p.arch.bio < t.bio) return { ok: false, why: 'NEED ' + t.bio + ' BIO-MATERIALS' };
    if (!pick.temple(s, key).length) return { ok: false, why: 'NO ' + t.zones.join('/') + ' PARCEL' + (t.rail ? ' BY THE RAIL' : '') };
    return { ok: true };
  }
  function hubStatus(s) {
    if (s.hub) return { ok: false, why: 'ALREADY BUILT' };
    if (s.conviction < HUB.conv) return { ok: false, why: 'NEED ' + HUB.conv + '% CONVICTION' };
    if (templeCount(s) < HUB.temples) return { ok: false, why: 'NEED ' + HUB.temples + ' TEMPLES' };
    if (s.p.arch.bio < HUB.bio) return { ok: false, why: 'NEED ' + HUB.bio + ' BIO-MATERIALS' };
    if (!pick.hub(s).length) return { ok: false, why: 'NO UNOWNED INDUSTRIAL PARCEL' };
    return { ok: true };
  }
  function policyStatus(s, key) {
    const pol = POLICIES[key];
    if (s.policies[key]) return { ok: false, why: 'ACTIVE' };
    if (s.p.policy.meter < 20) return { ok: false, why: 'APPROVAL TOO LOW (POLICY POWER LOST)' };
    if (s.p.policy.meter <= pol.need && pol.need > 0) return { ok: false, why: 'NEED APPROVAL > ' + pol.need };
    return { ok: true };
  }

  // ---------- action catalogue (for UI + AI) ----------
  function actionsFor(s, role) {
    const a = [];
    const P = s.p;
    if (role === 'policy') {
      const power = P.policy.meter >= 20;
      a.push({ id: 'rezone', label: 'REZONE PARCEL', ok: power && pick.rezone(s).length > 0, why: power ? '' : 'APPROVAL TOO LOW', target: 'parcel' });
      a.push({ id: 'policy', label: 'ENACT POLICY', ok: Object.keys(POLICIES).some(k => policyStatus(s, k).ok), why: 'NO POLICY AVAILABLE', sub: 'policy' });
      a.push({ id: 'townhall', label: 'HOLD TOWN HALL', ok: true, hint: '+8 APPROVAL' });
    }
    if (role === 'dev') {
      const can = pick.acquire(s).some(p => P.dev.cash >= (p.bld ? RULES.acquireExisting : RULES.acquireVacant));
      a.push({ id: 'acquire', label: 'ACQUIRE PARCEL', ok: can, why: 'NO AFFORDABLE PARCEL', target: 'parcel', hint: '$500k / $1 mil' });
      const dv = pick.develop(s).some(p => buildOptions(s, p).some(k => P.dev.cash >= buildCost(s, k)));
      a.push({ id: 'develop', label: 'DEVELOP PARCEL', ok: dv, why: 'NOTHING TO BUILD ON (OR NOT ENOUGH CASH)', target: 'parcel' });
      a.push({ id: 'request', label: 'REQUEST REZONING', ok: pick.requestRezone(s).length > 0, why: 'OWN A PARCEL FIRST', target: 'parcel' });
      a.push({ id: 'raise', label: 'RAISE CAPITAL', ok: true, hint: '+$400k' });
    }
    if (role === 'arch') {
      a.push({ id: 'temple', label: 'DESIGN A TEMPLE', ok: Object.keys(TEMPLES).some(k => templeStatus(s, k).ok), why: 'NO TEMPLE AVAILABLE YET', sub: 'temple' });
      const hs = hubStatus(s);
      if (!s.hub) a.push({ id: 'hub', label: 'BUILD MATERIAL HUB', ok: hs.ok, why: hs.why, target: 'parcel' });
      a.push({ id: 'pitch', label: 'PITCH BIO-DESIGN', ok: !P.dev.pendingBio && P.arch.bio >= 1 && pick.develop(s).length > 0, why: P.dev.pendingBio ? 'PITCH ALREADY ACCEPTED' : (P.arch.bio < 1 ? 'NEED 1 BIO-MATERIAL' : 'DEVELOPER HAS NOTHING TO BUILD'), hint: 'TO THE DEVELOPER' });
      a.push({ id: 'retrofit', label: 'RETROFIT', ok: P.arch.bio >= 1 && pick.retrofit(s).length > 0, why: 'NEED 1 BIO-MATERIAL', target: 'parcel', hint: '-1,500 TONS' });
      a.push({ id: 'research', label: 'RESEARCH', ok: true, hint: '+' + researchYield(s) + ' BIO, +3 RECOGNITION' });
    }
    if (role === 'cit') {
      a.push({ id: 'community', label: 'COMMUNITY SPACE', ok: P.cit.tokens >= 1 && pick.community(s).length > 0, why: P.cit.tokens < 1 ? 'NO ATTENTION TOKENS' : 'NEEDS A VACANT PARK OR CIVIC PARCEL', target: 'parcel', hint: '1 TOKEN' });
      a.push({ id: 'spread', label: 'SPREAD THE WORD', ok: P.cit.tokens >= 1, why: 'NO ATTENTION TOKENS', hint: '1 TOKEN, +3% CONVICTION' });
      a.push({ id: 'coalition', label: 'JOIN A COALITION', ok: P.cit.tokens >= 1, why: 'NO ATTENTION TOKENS', sub: 'player', hint: '1 TOKEN, HELP ANOTHER PLAYER' });
      a.push({ id: 'rest', label: 'REST + RECRUIT', ok: true, hint: '+2 TOKENS' });
    }
    return a;
  }
  const researchYield = s => 1 + Math.floor(s.p.arch.meter / 50);

  // ---------- turn flow ----------
  function drawCard(s) {
    if (!s.deck.length) { s.deck = shuffle(s.discard, s._rng); s.discard = []; }
    s.drawn = s.deck.pop();
    s.phase = 'card';
    return s.drawn;
  }
  function startTurn(s) {
    s.actionsLeft = ACTIONS_PER_TURN[active(s)];
    s.phase = 'draw';
  }

  // hooks: { react(kind, payload) -> Promise<bool> | bool }
  async function playCard(s, card, role, opt, hooks) {
    opt = opt || {};
    const P = s.p;
    const done = () => { s.discard.push(card); };
    switch (card.key) {
      case undefined: { // change agent
        const t = opt.target || role;
        conv(s, 2);
        if (t === 'policy') { P.policy.freePolicy = true; meter(s, 'policy', 8); }
        if (t === 'dev') { P.dev.pendingBio = true; P.dev.freeBio = true; }
        if (t === 'arch') { P.arch.bio += 2; meter(s, 'arch', 6); }
        if (t === 'cit') { P.cit.tokens += 2; meter(s, 'cit', 4); }
        log(s, ROLE_NAME[role] + ' sent ' + card.name + ' to the ' + ROLE_NAME[t] + '. ' + AGENT_FX[t], role);
        break;
      }
      case 'board': meter(s, 'cit', 6); meter(s, 'policy', 5); break;
      case 'faith': conv(s, 4); s.faith = true; break;
      case 'jobs': conv(s, 4); meter(s, 'dev', 5); break;
      case 'heat': carbon(s, 1500); if (greenSpaces(s) < 2) meter(s, 'cit', -6); break;
      case 'rent': meter(s, 'cit', -8); meter(s, 'dev', 5); break;
      case 'supply': P.arch.bio = Math.max(0, P.arch.bio - 2); P.dev.cash = Math.max(0, P.dev.cash - 500000); break;
      case 'flood': carbon(s, 2000); meter(s, 'policy', -5); if (templeCount(s)) conv(s, 5); break;
      case 'backlash': conv(s, -5); break;
      case 'boom': P.dev.cash += 800000; carbon(s, 2000); conv(s, -3); break;
      case 'news': conv(s, -4); break;
      case 'parish': { const p = parcel(s, opt.parcel); if (p) { p.zone = 'CIVIC'; conv(s, 2); } break; }
      case 'donate': { const p = parcel(s, opt.parcel); if (p) { p.zone = 'PARK'; meter(s, 'cit', 3); } break; }
      case 'rail': { const p = parcel(s, opt.parcel); if (p) { p.zone = 'CIVIC'; conv(s, 3); } break; }
      case 'coffee': P.arch.bio += 2; meter(s, 'cit', 2); conv(s, 2); break;
      case 'abate': P.dev.cash += 1000000; carbon(s, 1000); conv(s, -2); break;
      case 'nothing': break;
    }
    if (card.key) log(s, card.name + (card.key === 'nothing' ? ': nothing happens.' : ': ' + card.text + (opt.parcel ? ' (Parcel ' + pad(opt.parcel) + ')' : '')), role);
    done();
  }
  const pad = n => String(n).padStart(2, '0');

  // Main actions. Return {ok, msg}
  async function act(s, role, id, opt, hooks) {
    opt = opt || {};
    const P = s.p;
    let r = { ok: true };
    switch (id) {
      // ---- POLICYMAKER ----
      case 'townhall': meter(s, 'policy', 8); log(s, 'POLICYMAKER held a town hall. +8 approval.', role); break;
      case 'rezone': {
        const p = parcel(s, opt.parcel), z = opt.zone; const from = p.zone;
        if (from === z) return { ok: false };
        p.zone = z;
        if (z === 'PARK') { meter(s, 'cit', 3); meter(s, 'policy', 3); }
        if (z === 'CIVIC') { conv(s, 1); }
        if (z === 'INDUSTRIAL') { meter(s, 'policy', -2); }
        log(s, 'POLICYMAKER rezoned Parcel ' + pad(p.id) + ' from ' + ZONES[from].short + ' to ' + ZONES[z].name + '.', role);
        if (z === 'INDUSTRIAL' || (from === 'PARK')) {
          const pr = await reaction(s, 'rezone', { parcel: p.id, from, to: z, by: role }, hooks);
          if (pr === 'protest-win') { p.zone = from; log(s, 'The rezoning was reversed.', 'cit'); }
        }
        break;
      }
      case 'policy': {
        const key = opt.policy, pol = POLICIES[key];
        const st = policyStatus(s, key); if (!st.ok) return { ok: false, msg: st.why };
        s.policies[key] = true;
        if (P.policy.freePolicy && pol.cost > 0) { P.policy.freePolicy = false; } else meter(s, 'policy', -pol.cost);
        if (key === 'GREEN') { meter(s, 'arch', 10); meter(s, 'cit', 10); carbon(s, -3000); conv(s, 3); }
        if (key === 'TAX') { conv(s, 5); }
        if (key === 'DEREG') { conv(s, -5); }
        log(s, 'POLICYMAKER enacted ' + pol.name + '.', role);
        break;
      }
      // ---- DEVELOPER ----
      case 'raise': P.dev.cash += RULES.raiseCapital; log(s, 'DEVELOPER raised $400k from investors.', role); break;
      case 'acquire': {
        const p = parcel(s, opt.parcel); const cost = p.bld ? RULES.acquireExisting : RULES.acquireVacant;
        if (P.dev.cash < cost) return { ok: false, msg: 'NOT ENOUGH CASH' };
        P.dev.cash -= cost; p.owner = 'dev';
        log(s, 'DEVELOPER acquired Parcel ' + pad(p.id) + ' for ' + fmtCash(cost) + '.', role);
        break;
      }
      case 'develop': {
        const p = parcel(s, opt.parcel), k = opt.build, b = BUILDS[k];
        const cost = buildCost(s, k);
        if (P.dev.cash < cost) return { ok: false, msg: 'NOT ENOUGH CASH' };
        const bio = P.dev.pendingBio;
        const label = (bio ? 'BIO-BASED ' : '') + b.name;
        // citizen reaction to high-carbon builds
        if (['LUXURY', 'OFFICE', 'WAREHOUSE'].includes(k) && !bio) {
          const pr = await reaction(s, 'build', { parcel: p.id, build: k, by: role }, hooks);
          if (pr === 'protest-win') {
            P.dev.cash -= Math.round(cost * 0.15);
            meter(s, 'policy', -4);
            log(s, 'The ' + b.name + ' on Parcel ' + pad(p.id) + ' was stopped. Developer lost ' + fmtCash(Math.round(cost * 0.15)) + ' in fees.', 'cit');
            s.actionsLeft -= 1;
            return { ok: true, blocked: true };
          }
        }
        P.dev.cash -= cost;
        let em = b.carbon;
        if (p.bld && p.bld.type === 'EXISTING') em += RULES.demolitionCarbon;
        if (s.policies.DEREG) em *= 1.2;
        let profit = b.profit;
        if (bio) {
          em *= 0.4; conv(s, 2); P.dev.pendingBio = false;
          if (s.policies.GREEN) profit += 3; else profit -= 3;
          if (!P.dev.freeBio) { meter(s, 'arch', 8); P.arch.designs.push(Math.round(em)); }
          P.dev.freeBio = false;
        }
        if (k === 'LUXURY' && s.policies.QUOTA) { profit -= 4; P.cit.affordable += 12; meter(s, 'cit', 3); }
        meter(s, 'dev', profit);
        carbon(s, em); meter(s, 'cit', b.liv); conv(s, b.conv);
        if (b.units) P.cit.affordable += b.units;
        p.bld = { type: k, h: b.h, bio: !!bio };
        log(s, 'DEVELOPER built ' + label + ' on Parcel ' + pad(p.id) + '. +' + fmtTons(em) + '.', role);
        r.em = em;
        break;
      }
      case 'request': {
        const p = parcel(s, opt.parcel), z = opt.zone;
        log(s, 'DEVELOPER asked the Policymaker to rezone Parcel ' + pad(p.id) + ' to ' + ZONES[z].name + '.', role);
        const yes = await ask(hooks, 'policy', 'requestRezone', { parcel: p.id, zone: z }, s);
        if (yes) { p.zone = z; P.dev.cash -= 250000; meter(s, 'policy', z === 'INDUSTRIAL' ? -3 : -1); log(s, 'POLICYMAKER approved the rezoning ($250k in fees).', 'policy'); }
        else log(s, 'POLICYMAKER denied the request.', 'policy');
        break;
      }
      // ---- ARCHITECT ----
      case 'research': { const y = researchYield(s); P.arch.bio += y; meter(s, 'arch', 3); log(s, 'ARCHITECT researched bio-materials. +' + y + ' bio-materials.', role); break; }
      case 'retrofit': {
        const p = parcel(s, opt.parcel); if (P.arch.bio < 1) return { ok: false };
        P.arch.bio -= 1; p.bld.retro = true; carbon(s, -1500); meter(s, 'cit', 2); meter(s, 'arch', 5); conv(s, 2); P.arch.designs.push(-1500);
        log(s, 'ARCHITECT retrofitted Parcel ' + pad(p.id) + ' with bio-materials. -1,500 TONS.', role);
        break;
      }
      case 'pitch': {
        log(s, 'ARCHITECT pitched a bio-based design to the Developer.', role);
        const yes = await ask(hooks, 'dev', 'pitch', {}, s);
        if (yes) { P.arch.bio -= 1; P.dev.pendingBio = true; P.dev.freeBio = false; meter(s, 'arch', 3); conv(s, 2); log(s, 'DEVELOPER accepted. Their next build will be bio-based.', 'dev'); }
        else { log(s, 'DEVELOPER passed on the pitch.', 'dev'); }
        break;
      }
      case 'temple': {
        const key = opt.temple, t = TEMPLES[key], p = parcel(s, opt.parcel);
        const st = templeStatus(s, key); if (!st.ok) return { ok: false, msg: st.why };
        P.arch.bio -= t.bio; s.temples[key] = p.id;
        p.bld = { type: 'TEMPLE', temple: key, h: key === 'MUSEUM' ? 48 : key === 'CHURCH' ? 40 : key === 'STATION' ? 22 : 18, reuse: !!(p.bld) };
        carbon(s, TEMPLE_FX.carbon); conv(s, TEMPLE_FX.conv); meter(s, 'arch', TEMPLE_FX.rec); meter(s, 'cit', TEMPLE_FX.liv); meter(s, 'policy', TEMPLE_FX.approval);
        P.arch.designs.push(TEMPLE_FX.carbon);
        log(s, 'ARCHITECT built the ' + t.name + ' on Parcel ' + pad(p.id) + '. -3,000 TONS, +8% CONVICTION.', role);
        break;
      }
      case 'hub': {
        const p = parcel(s, opt.parcel); const st = hubStatus(s); if (!st.ok) return { ok: false, msg: st.why };
        P.arch.bio -= HUB.bio; s.hub = p.id; p.bld = { type: 'HUB', h: 26 };
        carbon(s, HUB.carbon); meter(s, 'arch', HUB.rec); conv(s, 5);
        log(s, 'ARCHITECT initiated the MATERIAL HUB on Parcel ' + pad(p.id) + '. The street now grows its own building material.', role);
        break;
      }
      // ---- CITIZEN ----
      case 'rest': P.cit.tokens += 2; log(s, 'CITIZEN rested and recruited neighbors. +2 attention tokens.', role); break;
      case 'spread': P.cit.tokens -= 1; conv(s, 3); log(s, 'CITIZEN spread the word. +3% CONVICTION.', role); break;
      case 'community': {
        const p = parcel(s, opt.parcel); P.cit.tokens -= 1; P.cit.community += 1;
        p.bld = { type: 'COMMUNITY', h: 0 };
        meter(s, 'cit', 8); conv(s, 3); carbon(s, -500); meter(s, 'policy', 2);
        log(s, 'CITIZEN organized a community space on Parcel ' + pad(p.id) + '.', role);
        break;
      }
      case 'coalition': {
        const t = opt.target; P.cit.tokens -= 1;
        meter(s, t, 5); meter(s, 'cit', 2); conv(s, 3);
        if (t === 'arch') P.arch.bio += 1;
        if (t === 'dev') P.dev.cash += 200000;
        log(s, 'CITIZEN joined a coalition with the ' + ROLE_NAME[t] + '. +5 ' + METER_NAME[t].toLowerCase() + ', +3% conviction.', role);
        break;
      }
      default: return { ok: false, msg: 'UNKNOWN ACTION' };
    }
    s.actionsLeft -= 1;
    return r;
  }

  // Citizen interrupts. Returns 'none' | 'approve' | 'protest-win' | 'protest-lose'
  async function reaction(s, kind, payload, hooks) {
    if (payload.by === 'cit') return 'none';
    const c = s.p.cit;
    const choice = await ask(hooks, 'cit', 'react', Object.assign({ kind }, payload), s); // true = protest
    if (!choice) { log(s, 'CITIZEN approves.', 'cit'); if (kind === 'build') meter(s, 'dev', 1); return 'approve'; }
    if (c.tokens < 1) { log(s, 'CITIZEN has no attention left to protest.', 'cit'); return 'none'; }
    c.tokens -= 1;
    const chance = protestChance(s);
    const win = s._rng() < chance;
    if (win) { meter(s, 'cit', 3); conv(s, 2); log(s, 'CITIZEN PROTESTS! And the city listens.', 'cit'); return 'protest-win'; }
    log(s, 'CITIZEN PROTESTS! ...BUT NOTHING CHANGES.', 'cit');
    return 'protest-lose';
  }
  const protestChance = s => clamp(0.3 + s.conviction / 200 + (s.p.cit.meter - 30) / 300, 0.15, 0.85);

  async function ask(hooks, role, kind, payload, s) {
    if (s.humans[role] && hooks && hooks.ask) return !!(await hooks.ask(role, kind, payload, s));
    return AI.decide(s, role, kind, payload);
  }

  function endTurn(s) {
    s.drawn = null;
    s.turn += 1;
    if (s.turn >= ROLES.length) { s.turn = 0; endRound(s); }
    if (!s.over) startTurn(s);
  }

  function endRound(s) {
    const P = s.p;
    // developer income + operational carbon
    let rent = 0, ops = 0;
    s.parcels.forEach(p => {
      if (!p.bld) return;
      const b = BUILDS[p.bld.type];
      if (b && p.owner === 'dev') { rent += b.rent; ops += p.bld.bio ? b.ops * 0.4 : b.ops; if (p.bld.type === 'LUXURY') meter(s, 'dev', 1); }
    });
    P.dev.cash += rent;
    let d = RULES.baselineCarbon + ops;
    d += Object.keys(s.temples).length * TEMPLE_FX.perRound;
    if (s.policies.TAX) d -= 1000;
    if (s.hub) { d += HUB.perRoundCarbon; conv(s, HUB.perRoundConv); P.arch.bio += HUB.perRoundBio; }
    carbon(s, d);
    // approval drifts with livability and carbon
    meter(s, 'policy', Math.round((P.cit.meter - 40) / 10) - (s.carbon > 80000 ? 2 : 0));
    P.cit.tokens += 1;
    log(s, 'END OF ROUND ' + s.round + '. Developer collected ' + fmtCash(rent) + ' in rent. Carbon ' + (d >= 0 ? '+' : '') + Math.round(d).toLocaleString('en-US') + ' tons.', null);
    snapshot(s);
    if (s.carbon >= RULES.carbonCap) { s.over = { type: 'loss', why: 'budget' }; return; }
    if (s.hub && s.conviction >= RULES.convictionWin) { s.over = { type: 'win' }; return; }
    if (s.round >= RULES.maxRounds) { s.over = { type: 'solo' }; return; }
    s.round += 1;
  }

  function standings(s) {
    return ROLES.map(r => ({ role: r, meter: s.p[r].meter })).sort((a, b) => b.meter - a.meter);
  }

  // ---------- AI ----------
  const AI = {
    // yes/no decisions during other players' turns
    decide(s, role, kind, payload) {
      const r = s._rng();
      if (kind === 'react') { // citizen: protest?
        if (s.p.cit.tokens < 1) return false;
        const sev = payload.kind === 'build' ? ({ LUXURY: 0.8, WAREHOUSE: 0.7, OFFICE: 0.35 }[payload.build] || 0.3) : 0.6;
        return r < sev * (s.p.cit.tokens >= 2 ? 1 : 0.5);
      }
      if (kind === 'pitch') { // developer accept bio-design?
        let p = 0.1 + s.conviction / 150;
        if (s.policies.GREEN) p += 0.3;
        if (s.policies.TAX) p += 0.2;
        return r < p;
      }
      if (kind === 'requestRezone') {
        if (payload.zone === 'INDUSTRIAL') return s.p.policy.meter > 55 && r < 0.4;
        return r < 0.7;
      }
      return r < 0.5;
    },

    card(s, role, card) { // -> {use:bool, target?, parcel?}
      if (card.key === 'nothing') return { use: true };
      if (card.target === 'player') {
        // change agent: biggest carbon lever is the developer
        let t = role;
        if (s.p.dev.cash > 700000 && !s.p.dev.pendingBio && pick.develop(s).length) t = 'dev';
        else if (role === 'policy' && Object.keys(POLICIES).some(k => k !== 'DEREG' && !s.policies[k])) t = 'policy';
        else if (role !== 'arch' && s.p.arch.bio < 2) t = 'arch';
        return { use: true, target: t };
      }
      if (card.target === 'parcel') {
        let list = pick[card.pick](s);
        if (card.key === 'parish') list = list.slice().sort((a, b) => (b.church ? 1 : 0) - (a.church ? 1 : 0));
        return list.length ? { use: true, parcel: list[Math.floor(s._rng() * Math.min(3, list.length))].id } : { use: false };
      }
      // harmful cards: save if possible to dodge (only one slot)
      if (card.cat === 'CRISIS' && !s.p[role].saved && s._rng() < 0.5) return { use: false };
      return { use: true };
    },

    turn(s, role) { // -> {id, opt}
      const P = s.p, rng = s._rng;
      const can = id => actionsFor(s, role).find(a => a.id === id && a.ok);
      const any = list => list[Math.floor(rng() * list.length)];
      if (role === 'policy') {
        const ap = P.policy.meter;
        if (ap < 35) return { id: 'townhall' };
        const greenOrder = ['GREEN', 'TAX', 'QUOTA'].filter(k => policyStatus(s, k).ok);
        if (greenOrder.length && s.conviction >= 30 && rng() < 0.7) {
          let k = greenOrder[0];
          if (greenOrder.includes('TAX') && s.carbon > 70000) k = 'TAX';
          return { id: 'policy', opt: { policy: k } };
        }
        if (!s.policies.DEREG && s.conviction < 35 && rng() < 0.4) return { id: 'policy', opt: { policy: 'DEREG' } };
        // help temples get sites
        const civicFree = s.parcels.filter(p => !p.owner && !isProtected(p) && ['CIVIC', 'PARK'].includes(p.zone)).length;
        if (can('rezone') && civicFree < 3 && rng() < 0.75) {
          const rail = !s.temples.STATION ? pick.rezone(s).filter(p => p.rail && !p.owner && p.zone !== 'CIVIC') : [];
          const cands = (rail.length ? rail : pick.rezone(s).filter(p => !p.owner && !['CIVIC', 'PARK'].includes(p.zone)));
          if (cands.length) { const p = any(cands); return { id: 'rezone', opt: { parcel: p.id, zone: !p.bld && rng() < 0.5 ? 'PARK' : 'CIVIC' } }; }
        }
        if (can('rezone') && rng() < 0.3) {
          const cands = pick.rezone(s).filter(p => p.zone === 'RESCOM' && !p.owner);
          if (cands.length) return { id: 'rezone', opt: { parcel: any(cands).id, zone: 'MIXED' } };
        }
        return { id: 'townhall' };
      }
      if (role === 'dev') {
        const dl = pick.develop(s).filter(p => buildOptions(s, p).some(k => P.dev.cash >= buildCost(s, k)));
        if (dl.length) {
          const p = dl[0];
          let opts = buildOptions(s, p).filter(k => P.dev.cash >= buildCost(s, k));
          let k = opts.sort((a, b) => BUILDS[b].profit - BUILDS[a].profit)[0];
          if (opts.includes('COOP') && (s.conviction >= 60 && rng() < 0.4 || s.policies.QUOTA && rng() < 0.3)) k = 'COOP';
          return { id: 'develop', opt: { parcel: p.id, build: k } };
        }
        const acq = pick.acquire(s).filter(p => P.dev.cash >= (p.bld ? RULES.acquireExisting : RULES.acquireVacant) + 700000);
        const vac = acq.filter(p => !p.bld);
        if (vac.length) return { id: 'acquire', opt: { parcel: any(vac).id } };
        if (acq.length && rng() < 0.6) return { id: 'acquire', opt: { parcel: any(acq).id } };
        return { id: 'raise' };
      }
      if (role === 'arch') {
        if (hubStatus(s).ok) return { id: 'hub', opt: { parcel: pick.hub(s)[0].id } };
        const tk = Object.keys(TEMPLES).filter(k => templeStatus(s, k).ok);
        if (tk.length) { const k = tk[0]; const l = pick.temple(s, k); const pp = l.find(p => p.church && k === 'CHURCH') || any(l); return { id: 'temple', opt: { temple: k, parcel: pp.id } }; }
        if (P.arch.bio < 3 && rng() < 0.6) return { id: 'research' };
        if (can('pitch') && rng() < 0.6) return { id: 'pitch' };
        if (can('retrofit') && P.arch.bio > 2 && rng() < 0.5) return { id: 'retrofit', opt: { parcel: any(pick.retrofit(s)).id } };
        return { id: 'research' };
      }
      if (role === 'cit') {
        if (can('community')) return { id: 'community', opt: { parcel: any(pick.community(s)).id } };
        if (P.cit.tokens >= 3 && rng() < 0.6) return { id: 'spread' };
        if (P.cit.tokens >= 3 && rng() < 0.5) return { id: 'coalition', opt: { target: s.p.arch.bio < 2 ? 'arch' : 'policy' } };
        return { id: 'rest' };
      }
    },
  };

  // Plays one full turn for an AI role (used by Node sim; UI drives its own pacing)
  async function aiTurn(s, hooks) {
    const role = active(s);
    startTurn(s);
    const card = drawCard(s);
    const cd = AI.card(s, role, card);
    if (cd.use) await playCard(s, card, role, cd, hooks);
    else { if (s.p[role].saved) s.discard.push(s.p[role].saved); s.p[role].saved = card; }
    s.drawn = null; s.phase = 'act';
    let guard = 0;
    while (s.actionsLeft > 0 && guard++ < 6) {
      const a = AI.turn(s, role);
      const res = await act(s, role, a.id, a.opt, hooks);
      if (res && res.ok === false) { await act(s, role, role === 'policy' ? 'townhall' : role === 'dev' ? 'raise' : role === 'arch' ? 'research' : 'rest', {}, hooks); }
    }
    endTurn(s);
  }

  const API = { ROLES, ROLE_NAME, METER_NAME, ACTIONS_PER_TURN, RULES, ZONES, BUILDS, TEMPLES, TEMPLE_FX, HUB, POLICIES, AGENT_FX,
    newGame, active, parcel, actionsFor, pick, buildOptions, buildCost, templeStatus, hubStatus, policyStatus, protestChance,
    drawCard, startTurn, playCard, act, endTurn, standings, AI, aiTurn, fmtTons, fmtCash, pad, templeCount, researchYield, log };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.CC = API;
})(typeof window !== 'undefined' ? window : globalThis);
