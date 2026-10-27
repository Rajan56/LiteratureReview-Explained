// Review Process Digital Twin: controls, KPI dashboard, PRISMA 2020 diagram, Gantt timeline.
import { computeTwin, DEFAULTS, PRESETS, DBS, STAGES, ASSUMPTIONS } from './twin-model.js';
import { fmt } from './twin3d.js';
import { linkText } from './refs.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const CONCEPTS = [
  ['"remote work"', 'telework*', 'telecommut*', '"work* from home"', '"home-based work"', '"distributed work"', '"virtual work*"', '"hybrid work*"'],
  ['productiv*', 'performance', 'output', 'efficien*', 'effectiveness', '"work outcome*"', '"task performance"', '"job performance"'],
  ['employee*', 'worker*', 'staff', 'personnel', '"knowledge worker*"', 'professional*', 'workforce', 'team*'],
  ['organi?ation*', 'firm*', 'compan*', 'enterprise*', 'corporat*', 'business*', 'SME*', 'workplace*'],
];

export function initTwin({ stage, onModel }) {
  const state = { ...DEFAULTS, dbs: [...DEFAULTS.dbs] };
  let model = null;
  let playing = false;

  // ---- build database checkboxes
  const dbBox = $('#twDbs');
  dbBox.innerHTML = Object.entries(DBS).map(([id, d]) => `<label class="dbchip"><input type="checkbox" value="${id}" ${state.dbs.includes(id) ? 'checked' : ''}><i style="background:${d.color}"></i><span>${d.name}</span></label>`).join('');
  $('#twPresets').innerHTML = Object.entries(PRESETS).map(([id, p]) => `<button type="button" class="chip-btn" data-preset="${id}">${p.label}</button>`).join('');
  $('#twAssumptions').innerHTML = ASSUMPTIONS.map(([a, b]) => `<tr><th scope="row">${a}</th><td>${linkText(b)}</td></tr>`).join('');

  const bind = (id, key, fmtFn = (v) => v, parse = Number) => {
    const el = $(id);
    const out = $(`${id}Out`);
    const sync = () => { el.value = state[key]; if (out) out.textContent = fmtFn(state[key]); };
    el.addEventListener('input', () => { state[key] = parse(el.value); if (out) out.textContent = fmtFn(state[key]); recompute(); });
    return sync;
  };
  const syncers = [
    bind('#twR', 'R'), bind('#twSyn', 'syn'), bind('#twBlocks', 'blocks'),
    bind('#twStrict', 'strict', (v) => ['lenient', 'moderate', 'strict'][Math.min(2, Math.floor(v * 3))] + ` (${Math.round(v * 100)}%)`),
    bind('#twKappa', 'kappa', (v) => Number(v).toFixed(2)), bind('#twAccess', 'access', (v) => `${Math.round(v * 100)}%`),
    bind('#twCut', 'appraisalCut', (v) => `${Math.round(v * 100)}%`), bind('#twReviewers', 'reviewers'), bind('#twHours', 'hours', (v) => `${v} h`),
    bind('#twSecTA', 'secTA', (v) => `${v} s`), bind('#twMinFT', 'minFT', (v) => `${v} min`), bind('#twMinEx', 'minExtract', (v) => `${v} min`),
  ];
  const selects = [['#twNoise', 'noise'], ['#twField', 'field'], ['#twYears', 'years'], ['#twStrategy', 'strategy']];
  selects.forEach(([id, key]) => $(id).addEventListener('change', (e) => { state[key] = e.target.value; recompute(); }));
  const checks = [['#twEnglish', 'english'], ['#twPeer', 'peer'], ['#twBack', 'back'], ['#twFwd', 'fwd']];
  checks.forEach(([id, key]) => $(id).addEventListener('change', (e) => { state[key] = e.target.checked; recompute(); }));
  dbBox.addEventListener('change', () => { state.dbs = [...dbBox.querySelectorAll('input:checked')].map((i) => i.value); recompute(); });

  function syncAll() {
    syncers.forEach((s) => s());
    selects.forEach(([id, key]) => { $(id).value = state[key]; });
    checks.forEach(([id, key]) => { $(id).checked = state[key]; });
    dbBox.querySelectorAll('input').forEach((i) => { i.checked = state.dbs.includes(i.value); });
  }

  $('#twPresets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    const pr = PRESETS[b.dataset.preset];
    Object.assign(state, DEFAULTS, pr, { dbs: [...pr.dbs] });
    $$('#twPresets .chip-btn').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    syncAll();
    recompute();
  });

  // ---- 3D toolbar
  document.querySelectorAll('[data-tw-view]').forEach((b) => b.addEventListener('click', () => stage && stage.setView(b.dataset.twView)));
  const modeBtn = $('#twMode');
  const playBtn = $('#twPlay');
  const weekSl = $('#twWeek');
  modeBtn.addEventListener('click', () => {
    const tl = modeBtn.getAttribute('aria-pressed') !== 'true';
    modeBtn.setAttribute('aria-pressed', tl ? 'true' : 'false');
    modeBtn.textContent = tl ? 'Timeline mode: on' : 'Timeline mode: off';
    $('#twTimeline').hidden = !tl;
    if (stage) stage.setMode(tl ? 'timeline' : 'live');
    setWeek(0);
    playing = false;
    playBtn.textContent = 'Play';
    renderGantt();
  });
  playBtn.addEventListener('click', () => {
    if (!model) return;
    if (+weekSl.value >= model.totalWeeks - 0.01) setWeek(0);
    playing = !playing;
    playBtn.textContent = playing ? 'Pause' : 'Play';
  });
  weekSl.addEventListener('input', () => { playing = false; playBtn.textContent = 'Play'; setWeek(+weekSl.value); });

  function setWeek(w) {
    if (!model) return;
    w = Math.max(0, Math.min(model.totalWeeks, w));
    weekSl.value = w;
    if (stage) stage.setWeek(w);
    const active = model.schedule.find((s) => w >= s.start && w < s.end);
    const name = active ? STAGES.find((s) => s.id === active.id).name : 'Review complete';
    $('#twWeekOut').textContent = `Week ${w.toFixed(1)} of ${model.totalWeeks.toFixed(1)} · ${name}`;
    renderGanttMarker(w);
  }

  function tick(dt) {
    if (playing && model) {
      const speed = Math.max(1, model.totalWeeks / 20); // whole project in about 20 seconds
      const w = +weekSl.value + dt * speed;
      setWeek(w);
      if (w >= model.totalWeeks) { playing = false; playBtn.textContent = 'Replay'; }
    }
  }

  // ---- outputs
  function recompute() {
    model = computeTwin(state);
    if (stage) stage.update(model);
    weekSl.max = model.totalWeeks.toFixed(2);
    renderKpis();
    renderPrisma();
    renderGantt();
    renderAdvice();
    renderString();
    setWeek(Math.min(+weekSl.value, model.totalWeeks));
    if (onModel) onModel(model);
  }

  function renderKpis() {
    const m = model;
    const tiles = [
      ['Records identified', fmt(m.identified), `${m.perDb.length} database${m.perDb.length === 1 ? '' : 's'}`],
      ['Duplicates removed', fmt(m.duplicates), `${m.identified ? Math.round((100 * m.duplicates) / m.identified) : 0}% of records`],
      ['Screened (title/abstract)', fmt(m.screened + m.other.screened), m.stoppedByRule ? `${fmt(m.humanScreened)} by humans, rest by stopping rule` : `${fmt(m.excludedTA)} excluded`],
      ['Full texts assessed', fmt(m.assessed + m.other.assessed), `${fmt(m.notRetrieved + m.other.notRetrieved)} not retrieved`],
      ['Studies included', fmt(m.included), m.other.included ? `${fmt(m.other.included)} via snowballing` : 'database search only'],
      ['Estimated recall', `${Math.round(m.recall * 100)}%`, `of ${fmt(m.p.R)} truly relevant studies`, m.recall < 0.6 ? 'bad' : m.recall < 0.8 ? 'warn' : 'good'],
      ['Search precision', `${(m.precision * 100).toFixed(1)}%`, 'relevant share of unique records'],
      ['Person-hours', fmt(m.totalHours), `${m.p.reviewers} reviewer${m.p.reviewers > 1 ? 's' : ''} × ${m.p.hours} h/week`],
      ['Calendar time', `${m.totalWeeks.toFixed(1)} wk`, `≈ ${(m.totalWeeks / 4.35).toFixed(1)} months`, m.totalWeeks > 52 ? 'warn' : ''],
      ['Bottleneck', STAGES.find((s) => s.id === m.bottleneck).short, `${Math.round(m.hours[m.bottleneck])} h (${Math.round((100 * m.hours[m.bottleneck]) / m.totalHours)}%)`, 'warn'],
      ['Screening conflicts', m.conflicts ? fmt(m.conflicts) : '–', m.p.strategy === 'dual' ? `agreement ${(m.po * 100).toFixed(0)}%, κ = ${m.p.kappa.toFixed(2)}` : m.p.strategy === 'single_check' ? 'on the 20% check sample' : 'no second screener'],
    ];
    $('#twKpis').innerHTML = tiles.map(([l, v, s, cls]) => `<div class="kpi ${cls || ''}"><span class="kpi-l">${l}</span><span class="kpi-v">${v}</span><span class="kpi-s">${s}</span></div>`).join('');
    $('#twLive').textContent = `Twin updated: ${fmt(m.identified)} records identified, ${fmt(m.included)} studies included, estimated recall ${Math.round(m.recall * 100)} percent, about ${m.totalWeeks.toFixed(0)} weeks of work. Bottleneck: ${STAGES.find((s) => s.id === m.bottleneck).name}.`;
  }

  function renderAdvice() {
    $('#twAdvice').innerHTML = model.advice.map(([k, t]) => `<li class="adv adv-${k}"><span class="adv-k">${{ bad: 'Problem', warn: 'Check', info: 'Note', good: 'Good' }[k]}</span>${linkText(t)}</li>`).join('');
  }

  function renderString() {
    const blocks = CONCEPTS.slice(0, state.blocks).map((c) => `(${c.slice(0, state.syn).join(' OR ')})`);
    const body = blocks.join('\n AND ');
    const field = { ti: 'TITLE', tak: 'TITLE-ABS-KEY', all: 'ALL' }[state.field];
    const lim = [];
    if (state.years !== 'all') lim.push(`PUBYEAR > ${2026 - Number(state.years) - 1}`);
    if (state.english) lim.push('LIMIT-TO (LANGUAGE, "English")');
    if (state.peer) lim.push('LIMIT-TO (SRCTYPE, "j")');
    $('#twString').textContent = `${field} (\n ${body}\n)${lim.length ? '\nAND ' + lim.join('\nAND ') : ''}`;
  }

  // PRISMA 2020 flow diagram (database and other-methods columns)
  function renderPrisma() {
    const m = model;
    const box = (x, y, w, h, lines, cls = '') => {
      const t = lines.map((l, i) => `<text x="${x + 12}" y="${y + 24 + i * 19}" class="${i === 0 ? 'pb' : 'pt'}">${esc(l)}</text>`).join('');
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="pbox ${cls}"/>${t}`;
    };
    const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="parr" marker-end="url(#pa)"/>`;
    const dbLines = m.perDb.map((d) => `  ${d.name}: ${fmt(d.records)}`);
    const reasons = m.reasons.filter((r) => r[1] > 0).map(([r, n]) => `  ${r}: ${fmt(n)}`);
    const hasOther = m.p.back || m.p.fwd;
    const W = hasOther ? 1000 : 720;
    const idH = Math.max(82, 48 + dbLines.length * 19);
    const y1 = 60, y2 = y1 + idH + 40, y3 = y2 + 80, y4 = y3 + 80, y5 = y4 + Math.max(80, 44 + reasons.length * 19) + 20, H = y5 + 100;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="prisma" role="img" aria-labelledby="prismaT prismaD"><title id="prismaT">PRISMA 2020 flow diagram</title><desc id="prismaD">${esc($('#twLive').textContent)}</desc>
    <defs><marker id="pa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="parrhead"/></marker></defs>
    <text x="10" y="32" class="phead">Identification of studies via databases</text>`;
    if (hasOther) s += `<text x="730" y="32" class="phead">Via other methods</text>`;
    s += box(10, y1, 330, idH, [`Records identified (n = ${fmt(m.identified)})`, 'Databases:', ...dbLines]);
    s += box(380, y1, 320, 82, ['Records removed before screening', `Duplicates (n = ${fmt(m.duplicates)})`]);
    s += arrow(340, y1 + 41, 378, y1 + 41) + arrow(175, y1 + idH, 175, y2 - 2);
    s += box(10, y2, 330, 60, [`Records screened (n = ${fmt(m.screened)})`]);
    s += box(380, y2, 320, 60, [`Records excluded (n = ${fmt(m.excludedTA + m.stoppedByRule)})`, m.stoppedByRule ? `incl. ${fmt(m.stoppedByRule)} by AI stopping rule` : 'title/abstract criteria']);
    s += arrow(340, y2 + 30, 378, y2 + 30) + arrow(175, y2 + 60, 175, y3 - 2);
    s += box(10, y3, 330, 60, [`Reports sought for retrieval (n = ${fmt(m.sought)})`]);
    s += box(380, y3, 320, 60, [`Reports not retrieved (n = ${fmt(m.notRetrieved)})`]);
    s += arrow(340, y3 + 30, 378, y3 + 30) + arrow(175, y3 + 60, 175, y4 - 2);
    const exH = Math.max(80, 44 + reasons.length * 19);
    s += box(10, y4, 330, 60, [`Reports assessed for eligibility (n = ${fmt(m.assessed)})`]);
    s += box(380, y4, 320, exH, [`Reports excluded (n = ${fmt(m.excludedFT)})`, ...reasons]);
    s += arrow(340, y4 + 30, 378, y4 + 30) + arrow(175, y4 + 60, 175, y5 - 2);
    if (hasOther) {
      s += box(730, y1, 260, 82, [`Records identified (n = ${fmt(m.other.screened)})`, `Citation searching: ${[m.p.back ? 'backward' : '', m.p.fwd ? 'forward' : ''].filter(Boolean).join(' + ')}`]);
      s += arrow(860, y1 + 82, 860, y3 - 2);
      s += box(730, y3, 260, 60, [`Reports sought (n = ${fmt(m.other.sought)})`, `Not retrieved (n = ${fmt(m.other.notRetrieved)})`]);
      s += arrow(860, y3 + 60, 860, y4 - 2);
      s += box(730, y4, 260, 60, [`Reports assessed (n = ${fmt(m.other.assessed)})`, `Excluded (n = ${fmt(m.other.excluded)})`]);
      s += `<path d="M860,${y4 + 60} L860,${y5 + 30} L342,${y5 + 30}" class="parr" fill="none" marker-end="url(#pa)"/>`;
    }
    s += box(10, y5, 330, 76, [`Studies included in review (n = ${fmt(m.included)})`, m.lowQuality ? `after excluding ${fmt(m.lowQuality)} low-quality studies` : 'appraised, none excluded on quality'], 'pinc');
    s += `<text x="${W - 10}" y="${H - 8}" class="pnote" text-anchor="end">Structure after Page et al. (2021); numbers from the twin model</text></svg>`;
    $('#twPrisma').innerHTML = s;
  }

  function renderGantt() {
    const m = model;
    const W = 720, rowH = 28, top = 26, H = top + STAGES.length * rowH + 30;
    const X = (w) => 150 + (w / Math.max(1, m.totalWeeks)) * (W - 170);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="gantt" role="img" aria-label="Project timeline: ${STAGES.map((st) => `${st.name} ${m.weeks[st.id].toFixed(1)} weeks`).join(', ')}">`;
    const step = m.totalWeeks > 60 ? 10 : m.totalWeeks > 25 ? 5 : m.totalWeeks > 10 ? 2 : 1;
    for (let w = 0; w <= m.totalWeeks + 0.001; w += step) s += `<line x1="${X(w)}" x2="${X(w)}" y1="${top - 6}" y2="${H - 26}" class="ggrid"/><text x="${X(w)}" y="${H - 10}" class="gtick" text-anchor="middle">${w}</text>`;
    s += `<text x="${W - 10}" y="14" class="gtick" text-anchor="end">weeks</text>`;
    STAGES.forEach((st, i) => {
      const sc = m.schedule[i];
      const y = top + i * rowH;
      const bott = st.id === m.bottleneck;
      s += `<text x="140" y="${y + 18}" class="glab" text-anchor="end">${st.short}</text>`;
      s += `<rect x="${X(sc.start)}" y="${y + 5}" width="${Math.max(2, X(sc.end) - X(sc.start))}" height="${rowH - 10}" rx="4" class="gbar ${bott ? 'gbott' : ''}"/>`;
      s += `<text x="${Math.min(W - 4, X(sc.end) + 6)}" y="${y + 18}" class="gval">${Math.round(m.hours[st.id])} h${bott ? ' · bottleneck' : ''}</text>`;
    });
    s += `<line id="twMarker" x1="${X(0)}" x2="${X(0)}" y1="${top - 8}" y2="${H - 24}" class="gmark" ${$('#twTimeline').hidden ? 'visibility="hidden"' : ''}/></svg>`;
    $('#twGantt').innerHTML = s;
    renderGanttMarker(+weekSl.value);
  }
  function renderGanttMarker(w) {
    const mk = $('#twMarker');
    if (!mk || !model) return;
    const x = 150 + (w / Math.max(1, model.totalWeeks)) * (720 - 170);
    mk.setAttribute('x1', x); mk.setAttribute('x2', x);
  }

  syncAll();
  recompute();
  return { tick, get model() { return model; }, state, recompute };
}

function $$(s) { return [...document.querySelectorAll(s)]; }
