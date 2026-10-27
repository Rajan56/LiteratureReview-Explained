// Review Lab: application controller.
import { REFS, cite, linkText } from './refs.js';
import { TYPES, FAMILIES, STEPS, PATHS, LEVELS, SYNTH, TOOLS, FINDER, PY_EXAMPLES } from './data.js';
import { initTwin } from './twin-ui.js';
import { initMeta, runInitialMeta } from './meta.js';
import { loadPython, callPy, runCode, onPyStatus } from './py.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LV = ['bachelor', 'master', 'phd', 'researcher'];
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } } };

// ------------------------------------------------------------------ citations and references
function renderCites(root = document) {
  $$('[data-cite]', root).forEach((el) => { el.outerHTML = cite(...el.dataset.cite.split(',')); });
}
function linkTextCites(html) {
  // turn "(Author & Author, 2019)"-style mentions written in data strings into links where the key is known
  return html.replace(/\(([A-Z][^()]*?\d{4})\)/g, (m, inner) => {
    const parts = inner.split(/;\s*/);
    const linked = parts.map((p) => {
      const r = REFS.find((x) => x[1] === p.trim());
      return r ? `<a class="cite" href="#ref-${r[0]}">${p}</a>` : p;
    });
    return `(${linked.join('; ')})`;
  });
}
function renderRefs() {
  const sorted = [...REFS].sort((a, b) => a[2].localeCompare(b[2]));
  $('#refList').innerHTML = sorted.map(([k, , full, url]) => `<li id="ref-${k}">${full}${url ? ` <a href="${url}" rel="noopener">${url.replace('https://', '')}</a>` : ''}</li>`).join('');
  const yr = new Date().getFullYear();
  $('#citeThis').innerHTML = `Rajan Kumar V K. (${yr}). <i>Review Lab: An interactive learning platform and digital twin for literature reviews, systematic reviews and meta-analysis</i> [Web application]. GitHub. https://rajan56.github.io/LiteratureReview-Explained/`;
  const stat = $('.hero-stats li:last-child b');
  if (stat) stat.textContent = String(REFS.length);
}

// ------------------------------------------------------------------ level
function setLevel(lv, from) {
  document.body.dataset.level = lv;
  store.set('rl-level', lv);
  $$('input[name="level"]').forEach((r) => { r.checked = r.value === lv; });
  if (from !== 'path') selectPath(lv);
  const an = $('#anLevel'); if (an) an.value = lv;
  renderAtlas();
  renderFinder();
}

// ------------------------------------------------------------------ five elements (Kraus et al., 2022)
const ELEMENTS = {
  types: `<h4>Types: systematic and non-systematic</h4><p><b>Systematic literature reviews (SLRs)</b> follow an adopted or adapted procedure or protocol for curating and analysing the literature, which makes them transparent and replicable. Any review guided by a systematic methodology is essentially an SLR. <b>Non-systematic reviews</b> weave the literature together through the critical evaluation and judgement of the authors, shaped by their exposure, expertise and experience (the "3Es"); they are essentially critical reviews.</p><p>Names such as scoping, structured, integrative or narrative review are <i>nomenclatures</i>; what matters is whether the review is well scoped, structured, integrated and interpreted.</p>`,
  focuses: `<h4>Focuses: domain, theory, method</h4><ul><li><b>Domain</b>: a concept (e.g., digital transformation), context (e.g., a country), discipline, field or outlet (a journal), or hybrids between or within domains.</li><li><b>Theory</b>: a standalone theory (e.g., theory of planned behaviour), or a theory combined with a domain or a method.</li><li><b>Method</b>: a standalone method (e.g., structural equation modelling), or a method combined with a domain or a theory.</li></ul>`,
  considerations: `<h4>Considerations: planning and data collection</h4><p><b>Non-SLRs</b> reason deductively: the authors develop coverage areas and then draw on literature to address each. <b>SLRs</b> reason inductively: criteria define the corpus, which then reveals the state of the art. Typical criteria, each needing a justification:</p><ul class="cols"><li>Search database(s)</li><li>Search keywords</li><li>Boolean operators</li><li>Search period</li><li>Search field</li><li>Subject area</li><li>Publication stage</li><li>Document type</li><li>Source type</li><li>Language</li><li>Quality filtering</li><li>Document relevance</li><li>Screening process</li><li>Inclusion and exclusion criteria</li><li>Codebook building</li></ul><p>Try these decisions in the <a href="#twin">digital twin</a>.</p>`,
  methods: `<h4>Methods: a toolbox for analysing the literature</h4><ul><li><b>Bibliometric analysis</b> (objective, large corpora): performance analysis and science mapping (co-citation, bibliographic coupling, co-word, topic modelling).</li><li><b>Content analysis</b> (tens to low hundreds of articles): quantitative, through an organising framework such as ADO-TCM; or qualitative, as thematic analysis.</li><li><b>Critical analysis</b> (subjective): evaluation drawing on the authors' 3Es; recommended within SLRs too.</li><li><b>Meta-analysis</b> (objective): quantitative estimates of commonly studied relationships.</li><li>Others: multiple correspondence analysis, HOMALS.</li></ul>`,
  contributions: `<h4>Contributions</h4><p>Three primary contributions <span data-cite="lim2022"></span>: (i) an <b>overview of current knowledge</b>, (ii) an <b>evaluation of knowledge progression</b>, including conflicts and under-explored areas, and (iii) a <b>proposal of pathways for advancing knowledge</b>. Performance analysis adds objective assessment of productivity and impact; science mapping adds thematic clusters, nomological networks, social patterns, evolution and knowledge gaps <span data-cite="mukherjee2022"></span>. Reviews can also build theory <span data-cite="post2020,breslin2023"></span>.</p>`,
};
function initElements() {
  const show = (el) => {
    $$('.pent-b').forEach((b) => b.setAttribute('aria-selected', b.dataset.el === el ? 'true' : 'false'));
    $('#pentPanel').innerHTML = ELEMENTS[el] + `<p class="src">Summarised from <a class="cite" href="#ref-kraus2022">Kraus et al. (2022)</a>.</p>`;
    renderCites($('#pentPanel'));
  };
  $$('.pent-b').forEach((b) => b.addEventListener('click', () => show(b.dataset.el)));
  show('types');
}

// ------------------------------------------------------------------ learning paths
function initPaths() {
  $('#pathTabs').innerHTML = LEVELS.map((l) => `<button role="tab" class="tab" data-lv="${l.id}" aria-selected="false" id="tab-${l.id}">${l.label}</button>`).join('');
  $$('#pathTabs .tab').forEach((b) => b.addEventListener('click', () => { setLevel(b.dataset.lv, 'path'); selectPath(b.dataset.lv); }));
  $('#pathTabs').addEventListener('keydown', (e) => {
    const tabs = $$('#pathTabs .tab');
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const j = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      tabs[j].focus(); tabs[j].click();
    }
  });
}
function selectPath(lv) {
  const p = PATHS[lv];
  $$('#pathTabs .tab').forEach((b) => { const on = b.dataset.lv === lv; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
  $('#pathPanel').setAttribute('aria-labelledby', `tab-${lv}`);
  const typeLinks = p.types.map((id) => { const t = TYPES.find((x) => x.id === id); return `<a href="#types" data-open-type="${id}" class="pill">${t.short}</a>`; }).join('');
  $('#pathPanel').innerHTML = `
    <div class="path-grid">
      <div class="path-main">
        <h3>${p.title}</h3>
        <p><b>Where the review appears.</b> ${p.where}</p>
        <p><b>What examiners and editors expect.</b> ${p.expect}</p>
        <p><b>Review types that fit best.</b></p><div class="pills">${typeLinks}</div>
        <div class="path-facts"><div><span>Typical scale</span>${p.scale}</div><div><span>Time</span>${p.time}</div></div>
      </div>
      <div class="path-side">
        <p class="mini-h">Target synthesis mix</p>${mixBar(p.mix)}
        <p class="mini-h">Skills to build</p><ul class="checks">${p.skills.map((s) => `<li>${s}</li>`).join('')}</ul>
        <p class="mini-h">Common mistakes</p><ul class="crosses">${p.mistakes.map((s) => `<li>${s}</li>`).join('')}</ul>
        <p class="next"><b>Next step:</b> ${p.next}</p>
        <p class="mini-h">Key readings</p><p class="src">${cite(...p.read)}</p>
      </div>
    </div>`;
  $$('[data-open-type]', $('#pathPanel')).forEach((a) => a.addEventListener('click', () => openType(a.dataset.openType)));
}

function mixBar(m, label = '') {
  return `<div class="mixbar" role="img" aria-label="${label}Descriptive ${m.descriptive}%, analytical ${m.analytical}%, evaluative ${m.evaluative}%"><span class="mx-d" style="width:${m.descriptive}%">D ${m.descriptive}%</span><span class="mx-a" style="width:${m.analytical}%">A ${m.analytical}%</span><span class="mx-e" style="width:${m.evaluative}%">E ${m.evaluative}%</span></div>`;
}

// ------------------------------------------------------------------ atlas
let familyFilter = 'all';
function initAtlas() {
  const chips = [['all', 'All types'], ...Object.entries(FAMILIES), ['fit', 'Good fit for my level']];
  $('#typeFilters').innerHTML = chips.map(([k, l]) => `<button type="button" class="chip-btn" data-fam="${k}" aria-pressed="${k === 'all'}">${l}</button>`).join('');
  $('#typeFilters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fam]');
    if (!b) return;
    familyFilter = b.dataset.fam;
    $$('#typeFilters .chip-btn').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    renderAtlas();
  });
  // SALSA matrix
  $('#salsa').innerHTML = `<thead><tr><th scope="col">Type</th><th scope="col">Search</th><th scope="col">Appraisal</th><th scope="col">Synthesis</th><th scope="col">Analysis</th><th scope="col">Reporting</th></tr></thead><tbody>${TYPES.map((t) => `<tr><th scope="row">${t.name}</th>${t.salsa.map((s) => `<td>${s}</td>`).join('')}<td>${t.reporting}</td></tr>`).join('')}</tbody>`;
}
function renderAtlas() {
  const lvIdx = LV.indexOf(document.body.dataset.level);
  const list = TYPES.filter((t) => familyFilter === 'all' || (familyFilter === 'fit' ? t.suit[lvIdx] >= 2 : t.family === familyFilter));
  $('#atlas').innerHTML = list.map((t) => {
    const fit = t.suit[lvIdx];
    return `<button type="button" class="tcard fam-${t.family}" data-type="${t.id}"><span class="tfam">${FAMILIES[t.family]}</span><span class="tname">${t.name}</span><span class="tone">${t.one}</span><span class="tmeta"><span>${t.time}</span><span class="fit fit-${fit}">${['Rare at your level', 'Possible', 'Good fit', 'Typical'][fit]}</span></span></button>`;
  }).join('');
  $$('#atlas .tcard').forEach((b) => b.addEventListener('click', () => openType(b.dataset.type, true)));
}
function openType(id, scroll = false) {
  const t = TYPES.find((x) => x.id === id);
  const lvl = ['Rare', 'Possible', 'Good fit', 'Typical'];
  $('#typeDetail').innerHTML = `
    <div class="td-head"><div><p class="kicker">${FAMILIES[t.family]}</p><h3>${t.name}</h3><p class="lead-s">${t.one}</p></div>
      <div class="td-fit">${LEVELS.map((l, i) => `<span class="fit fit-${t.suit[i]}">${l.label}: ${lvl[t.suit[i]]}</span>`).join('')}</div></div>
    <div class="td-grid">
      <div><h4>Purpose</h4><p>${linkTextCites(t.purpose)}</p><h4>Typical question</h4><p>${t.question}</p><h4>Output</h4><p>${t.output}</p><h4>Watch out</h4><p>${t.caution}</p></div>
      <div><h4>Search · Appraisal · Synthesis · Analysis</h4><dl class="salsa-dl"><dt>S</dt><dd>${t.salsa[0]}</dd><dt>A</dt><dd>${t.salsa[1]}</dd><dt>S</dt><dd>${t.salsa[2]}</dd><dt>A</dt><dd>${t.salsa[3]}</dd></dl>
        <h4>Reporting standard</h4><p>${t.reporting}</p><p><b>Time:</b> ${t.time} · <b>Team:</b> ${t.team}</p><p class="src">Key sources: ${cite(...t.refs)}</p>
        <div class="row-btns"><button type="button" class="btn btn-small" data-how="${t.id}">How it is done →</button><button type="button" class="btn btn-small btn-ghost" data-close>Close</button></div></div>
    </div>`;
  $('#typeDetail').classList.add('open');
  $('[data-how]', $('#typeDetail')).addEventListener('click', () => { $('#howSelect').value = t.id; renderHow(); $('#howto').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); });
  $('[data-close]', $('#typeDetail')).addEventListener('click', () => { $('#typeDetail').classList.remove('open'); $('#typeDetail').innerHTML = ''; });
  if (scroll) { $('#typeDetail').focus({ preventScroll: true }); $('#typeDetail').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' }); }
}

// ------------------------------------------------------------------ finder
const answers = { aim: 'background', evidence: 'any', size: 'unknown', time: 'months', team: 'alone', output: 'chapter' };
function initFinder() {
  $('#finderForm').innerHTML = FINDER.questions.map((q, qi) => `<fieldset class="fq"><legend><span class="fq-n">${qi + 1}</span>${q.q}</legend><div class="fq-opts">${q.opts.map(([v, l]) => `<label class="opt"><input type="radio" name="f-${q.id}" value="${v}" ${answers[q.id] === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>`).join('');
  $('#finderForm').addEventListener('change', (e) => { const n = e.target.name.replace('f-', ''); answers[n] = e.target.value; renderFinder(); });
}
function renderFinder() {
  if (!$('#finderOut')) return;
  const lvIdx = LV.indexOf(document.body.dataset.level);
  const qLabel = Object.fromEntries(FINDER.questions.map((q) => [q.id, Object.fromEntries(q.opts)]));
  const scored = TYPES.map((t) => {
    let s = t.suit[lvIdx] * 0.8;
    const why = [], against = [];
    for (const [qid, ans] of Object.entries(answers)) {
      const pts = (FINDER.scores[qid][ans] || {})[t.id] || 0;
      s += pts;
      if (pts >= 2) why.push(qLabel[qid][ans]);
      else if (pts <= -2) against.push(qLabel[qid][ans]);
    }
    if (t.suit[lvIdx] >= 2) why.push(`Suits ${LEVELS[lvIdx].label} level`);
    if (t.suit[lvIdx] === 0) against.push(`Uncommon at ${LEVELS[lvIdx].label} level`);
    return { t, s, why, against };
  }).sort((a, b) => b.s - a.s);
  const top = scored.slice(0, 3);
  const max = Math.max(1, top[0].s);
  $('#finderOut').innerHTML = `<h3>Recommended for your project</h3>${top.map((r, i) => `
    <article class="rec ${i === 0 ? 'rec-top' : ''}"><div class="rec-h"><span class="rec-n">${i + 1}</span><h4>${r.t.name}</h4><span class="rec-score" aria-label="match score">${Math.round((100 * Math.max(0, r.s)) / max)}% match</span></div>
      <p>${r.t.one}</p>
      ${r.why.length ? `<p class="rec-why"><b>Why:</b> ${r.why.join(' · ')}</p>` : ''}
      ${r.against.length ? `<p class="rec-against"><b>Be aware:</b> ${r.against.join(' · ')}</p>` : ''}
      <p class="rec-meta"><b>Reporting:</b> ${r.t.reporting} <b>Time:</b> ${r.t.time}. <b>Team:</b> ${r.t.team}.</p>
      <div class="row-btns"><button type="button" class="btn btn-small" data-open="${r.t.id}">Details</button><button type="button" class="btn btn-small" data-howto="${r.t.id}">Steps</button>${['slr', 'scoping', 'meta', 'rapid', 'map', 'framework', 'hybrid'].includes(r.t.id) ? '<a class="btn btn-small btn-accent" href="#twin">Simulate in the twin</a>' : ''}</div>
    </article>`).join('')}
    <p class="hint">Also considered: ${scored.slice(3, 7).map((r) => r.t.short).join(', ')}.</p>`;
  $$('[data-open]', $('#finderOut')).forEach((b) => b.addEventListener('click', () => { openType(b.dataset.open); $('#types').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); }));
  $$('[data-howto]', $('#finderOut')).forEach((b) => b.addEventListener('click', () => { $('#howSelect').value = b.dataset.howto; renderHow(); $('#howto').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); }));
}

// ------------------------------------------------------------------ how-to
function initHow() {
  $('#howSelect').innerHTML = TYPES.map((t) => `<option value="${t.id}" ${t.id === 'slr' ? 'selected' : ''}>${t.name}</option>`).join('');
  $('#howSelect').addEventListener('change', renderHow);
  renderHow();
}
function renderHow() {
  const id = $('#howSelect').value;
  const steps = STEPS[id];
  $('#howSteps').innerHTML = steps.map(([t, d, tools], i) => `<li class="step"><span class="step-n" aria-hidden="true">${i + 1}</span><div><h4>${t}</h4><p>${linkTextCites(d)}</p>${tools ? `<p class="step-tools">Tools: ${tools}</p>` : ''}</div></li>`).join('');
}

// ------------------------------------------------------------------ writing
function initWriting() {
  $('#levelCards').innerHTML = SYNTH.levels.map((l) => `<article class="lv lv-${l.id}"><p class="lv-tag">${l.name[0]} · ${l.name}</p><h3>${l.q}</h3><p>${l.def}</p><p><b>Why it matters:</b> ${l.why}</p><p class="lv-verbs"><b>Signal phrases:</b> <i>${l.verbs}</i></p></article>`).join('');
  $('#ladder').innerHTML = SYNTH.levels.map((l) => `<li class="ld ld-${l.id}"><span class="ld-k">${l.name}</span><p>${l.ex}</p></li>`).join('');
  $('#mixType').innerHTML = SYNTH.byType.map(([name, m, why]) => `<div class="mix-row"><p class="mix-name">${name}</p>${mixBar({ descriptive: m[0], analytical: m[1], evaluative: m[2] }, name + ': ')}<p class="mix-why">${linkTextCites(why)}</p></div>`).join('');
  $('#mixLevel').innerHTML = LEVELS.map((l) => `<div class="mix-row"><p class="mix-name">${l.label}</p>${mixBar(PATHS[l.id].mix, l.label + ': ')}</div>`).join('') + '<p class="hint">D = descriptive, A = analytical, E = evaluative. Bars carry the numbers, so they do not rely on colour.</p>';
  $('#openTemplate').innerHTML = SYNTH.openingTemplate;
  $('#anText').value = SYNTH.samples.balanced;
  $$('[data-sample]').forEach((b) => b.addEventListener('click', () => { $('#anText').value = SYNTH.samples[b.dataset.sample]; analyse(); }));
  $('#anRun').addEventListener('click', analyse);
}
async function analyse() {
  const out = $('#anOut');
  out.innerHTML = '<p class="hint">Analysing in Python…</p>';
  try {
    const r = await callPy('synthesis', { text: $('#anText').value, level: $('#anLevel').value });
    const tag = { descriptive: 'D', analytical: 'A', evaluative: 'E' };
    out.innerHTML = `<p class="mini-h">Your paragraph (${r.n} sentences)</p>${mixBar(r.profile, 'Your profile: ')}<p class="mini-h">Target for this level</p>${mixBar(r.target, 'Target: ')}
      <ol class="an-sent">${r.sentences.map((s) => `<li class="as as-${s.label}"><span class="as-tag" title="${s.label}">${tag[s.label]}</span><span>${esc(s.sentence)}</span>${s.cues.length ? `<span class="as-cues">cues: ${s.cues.map(esc).join(', ')}</span>` : ''}</li>`).join('')}</ol>
      <ul class="advice">${r.advice.map((a) => `<li class="adv adv-info"><span class="adv-k">Tip</span>${esc(a)}</li>`).join('')}</ul>`;
  } catch (e) {
    out.innerHTML = `<p class="warn-box">The Python engine is not available: ${esc(e.message || e)}</p>`;
  }
}

// ------------------------------------------------------------------ analysis: concept matrix and kappa
const CM = {
  concepts: ['Trust', 'Communication', 'Autonomy', 'Technology support', 'Productivity'],
  studies: [['Study A (2019), survey', [1, 1, 0, 1, 1]], ['Study B (2020), case study', [0, 1, 1, 0, 0]], ['Study C (2020), experiment', [0, 0, 1, 0, 1]], ['Study D (2021), survey', [1, 1, 1, 1, 1]], ['Study E (2021), interviews', [1, 1, 0, 0, 0]], ['Study F (2022), panel data', [0, 0, 0, 1, 1]], ['Study G (2023), case study', [1, 1, 1, 0, 0]], ['Study H (2023), survey', [0, 1, 1, 1, 1]]],
  sentences: {
    Trust: 'Trust appears in four studies; surveys (A, D) treat it as a driver of productivity, whereas qualitative studies (E, G) describe it as an outcome of frequent communication, which suggests a reciprocal relationship that cross-sectional designs cannot untangle.',
    Communication: 'Communication is the most studied concept (six of eight studies). Survey evidence links it to productivity, while case studies (B, G) highlight coordination costs; taken together, quality rather than quantity of communication seems to matter.',
    Autonomy: 'Autonomy is examined in five studies with mixed designs. The experiment (C) provides the strongest causal evidence of a productivity gain, but case studies suggest the effect depends on task interdependence.',
    'Technology support': 'Technology support is studied mainly quantitatively (A, D, F, H), always alongside productivity, yet no study examines it qualitatively: how employees actually use the tools remains a gap.',
    Productivity: 'Productivity is measured in five studies, all quantitative and mostly self-reported; only the panel study (F) uses objective output, so the evidence for productivity gains is weaker than the number of studies implies.',
  },
};
function initConceptMatrix() {
  const t = $('#cmatrix');
  t.innerHTML = `<thead><tr><th scope="col">Study</th>${CM.concepts.map((c, i) => `<th scope="col"><button type="button" class="col-btn" data-ci="${i}">${c}</button></th>`).join('')}</tr></thead><tbody>${CM.studies.map(([s, v]) => `<tr><th scope="row">${s}</th>${v.map((x) => `<td class="${x ? 'cm-yes' : ''}">${x ? '✓' : ''}<span class="sr-only">${x ? 'addressed' : 'not addressed'}</span></td>`).join('')}</tr>`).join('')}<tr class="cm-total"><th scope="row">Studies</th>${CM.concepts.map((_, i) => `<td>${CM.studies.filter((s) => s[1][i]).length}</td>`).join('')}</tr></tbody>`;
  $$('.col-btn', t).forEach((b) => b.addEventListener('click', () => {
    $$('.col-btn', t).forEach((x) => x.classList.toggle('on', x === b));
    const c = CM.concepts[+b.dataset.ci];
    $('#cmatrixOut').innerHTML = `<b>Analytical sentence from the "${c}" column:</b> ${CM.sentences[c]}`;
  }));
  $$('.col-btn', t)[1].click();
}

const KA = [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];
const KB = [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0];
function initKappa() {
  const g = $('#kappaGrid');
  const draw = () => {
    g.innerHTML = `<div class="k-row"><span class="k-lab">Reviewer A</span>${KA.map((v, i) => `<span class="k-cell ${v ? 'k-in' : 'k-out'}" title="Abstract ${i + 1}">${v ? 'I' : 'E'}</span>`).join('')}</div><div class="k-row"><span class="k-lab">Reviewer B</span>${KB.map((v, i) => `<button type="button" class="k-cell ${v ? 'k-in' : 'k-out'} ${v !== KA[i] ? 'k-diff' : ''}" data-k="${i}" aria-label="Abstract ${i + 1}: reviewer B ${v ? 'includes' : 'excludes'}${v !== KA[i] ? ', disagrees with A' : ''}">${v ? 'I' : 'E'}</button>`).join('')}</div><p class="hint">I = include, E = exclude. Outlined cells are disagreements.</p>`;
    $$('[data-k]', g).forEach((b) => b.addEventListener('click', () => { KB[+b.dataset.k] ^= 1; draw(); compute(); }));
  };
  const compute = async () => {
    try {
      const r = await callPy('kappa', { a: KA, b: KB });
      $('#kappaOut').innerHTML = `Observed agreement ${(r.observed * 100).toFixed(0)}%, agreement expected by chance ${(r.expected * 100).toFixed(0)}%, <b>κ = ${r.kappa.toFixed(2)}</b>: ${r.label}. In a real review, discuss every disagreement and refine the criteria until κ is at least substantial.`;
    } catch (e) { $('#kappaOut').textContent = 'Load the Python engine to compute kappa.'; }
  };
  draw();
  initKappa.compute = compute;
}

// ------------------------------------------------------------------ tools
function initTools() {
  const groups = {};
  TOOLS.forEach(([stage, tool, access, use]) => (groups[stage] = groups[stage] || []).push([tool, access, use]));
  $('#toolsTable').innerHTML = `<thead><tr><th scope="col">Stage</th><th scope="col">Tool</th><th scope="col">Access</th><th scope="col">What for</th></tr></thead><tbody>${Object.entries(groups).map(([stage, rows]) => rows.map((r, i) => `<tr>${i === 0 ? `<th scope="rowgroup" rowspan="${rows.length}">${stage}</th>` : ''}<td>${r[0]}</td><td>${r[1]}</td><td>${linkTextCites(r[2])}</td></tr>`).join('')).join('')}</tbody>`;
}

// ------------------------------------------------------------------ python console
function initConsole() {
  const sel = $('#pyExample');
  sel.innerHTML = Object.entries(PY_EXAMPLES).map(([k, e]) => `<option value="${k}">${e.label}</option>`).join('');
  const load = () => { $('#pyCode').value = PY_EXAMPLES[sel.value].code; };
  sel.addEventListener('change', load);
  load();
  const out = $('#pyOut');
  const run = async () => {
    out.textContent = '';
    const add = (s, kind) => { const span = document.createElement('span'); span.className = `o-${kind}`; span.textContent = s; out.appendChild(span); };
    add('>>> running…\n', 'info');
    await runCode($('#pyCode').value, add);
    add('>>> done\n', 'info');
  };
  $('#pyRun').addEventListener('click', run);
  $('#pyCode').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); const t = e.target; const s = t.selectionStart; t.value = t.value.slice(0, s) + '    ' + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s + 4; }
  });
}

// ------------------------------------------------------------------ python status and lazy loading
function initPyStatus() {
  onPyStatus((st) => {
    $$('[data-py-status]').forEach((el) => {
      el.dataset.state = st.state;
      $('.txt', el).textContent = st.text;
      const b = $('[data-py-load]', el);
      if (b) b.hidden = st.state === 'ready' || st.state === 'loading';
    });
  });
  $$('[data-py-load]').forEach((b) => b.addEventListener('click', startPython));
  const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { startPython(); io.disconnect(); } }, { rootMargin: '400px' });
  ['#meta', '#writing', '#python', '#analysis'].forEach((s) => io.observe($(s)));
}
let pyStarted = false;
function startPython() {
  if (pyStarted) return;
  pyStarted = true;
  loadPython().then(() => { runInitialMeta(); analyse(); initKappa.compute(); }).catch(() => { pyStarted = false; });
}

// ------------------------------------------------------------------ 3D scenes
const scenes = [];
async function initScenes() {
  let THREEok = true;
  try {
    const { TwinStage } = await import('./twin3d.js');
    const stage = new TwinStage($('#twStage'), { reducedMotion });
    const tw = initTwin({ stage: stage.ok ? stage : null });
    if (!stage.ok) throw new Error('webgl');
    scenes.push({ el: $('#twStage'), frame: (dt) => { tw.tick(dt); stage.frame(dt); }, visible: false });
    window.__twin = { stage, tw };
  } catch (e) {
    THREEok = false;
    $('#twStage').innerHTML = '<p class="fallback">The 3D view needs WebGL, which is not available here. The dashboard, PRISMA diagram and timeline below still update with every setting.</p>';
    try { const tw = initTwin({ stage: null }); scenes.push({ el: $('#twStage'), frame: (dt) => tw.tick(dt), visible: true }); } catch (err) { console.error(err); }
  }
  try {
    const { KnowledgeMap, CLUSTERS } = await import('./map3d.js');
    const map = new KnowledgeMap($('#mapStage'), $('#mapInfo'), { reducedMotion });
    $('#mapClusters').innerHTML = CLUSTERS.map((c, i) => `<label class="ck"><input type="checkbox" data-cl="${i}" checked><i class="sw" style="background:${c.color}"></i>${c.name}</label>`).join('');
    $$('[data-cl]').forEach((c) => c.addEventListener('change', () => map.toggleCluster(+c.dataset.cl, c.checked)));
    $('#mapColor').addEventListener('change', (e) => map.setColorBy(e.target.value));
    if (map.ok) {
      $('#mapKey').innerHTML = '<option value="">Choose…</option>' + map.keywords.map((k) => `<option>${esc(k)}</option>`).join('');
      $('#mapKey').addEventListener('change', (e) => map.selectByName(e.target.value));
      scenes.push({ el: $('#mapStage'), frame: () => map.frame(), visible: false });
    } else throw new Error('webgl');
  } catch (e) {
    $('#mapStage').innerHTML = '<p class="fallback">The 3D map needs WebGL.</p>';
  }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => { const s = scenes.find((x) => x.el === en.target); if (s) s.visible = en.isIntersecting; }), { rootMargin: '100px' });
  scenes.forEach((s) => io.observe(s.el));
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    scenes.forEach((s) => { if (s.visible) s.frame(dt); });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return THREEok;
}

// ------------------------------------------------------------------ transcript
async function loadTranscript() {
  try {
    const res = await fetch('video/captions.vtt');
    if (!res.ok) return;
    const blocks = (await res.text()).split(/\r?\n\r?\n/).slice(1);
    $('#transcript').innerHTML = blocks.map((b) => {
      const lines = b.trim().split(/\r?\n/);
      const tl = lines.find((l) => l.includes('-->'));
      if (!tl) return '';
      return `<p><span class="ts">${tl.split('-->')[0].trim().replace(/^00:/, '').replace(/\.\d+$/, '')}</span>${esc(lines.slice(lines.indexOf(tl) + 1).join(' '))}</p>`;
    }).join('');
  } catch (e) { /* offline */ }
}

// ------------------------------------------------------------------ nav highlight
function initNav() {
  const links = $$('.nav a');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#${e.target.id}`));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach((s) => io.observe(s));
}

// ------------------------------------------------------------------ boot
function boot() {
  renderCites();
  renderRefs();
  initElements();
  initPaths();
  initAtlas();
  initFinder();
  initHow();
  initWriting();
  initConceptMatrix();
  initKappa();
  initTools();
  initConsole();
  initMeta();
  initPyStatus();
  initNav();
  loadTranscript();
  $$('input[name="level"]').forEach((r) => r.addEventListener('change', () => setLevel(r.value)));
  setLevel(store.get('rl-level') || 'master');
  initScenes();
  window.__rl = { callPy, loadPython };
}
boot();
