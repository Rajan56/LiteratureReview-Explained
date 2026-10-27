// Meta-analysis lab: data editor, Python-powered analysis, forest and funnel plots,
// and a "what if" simulator for heterogeneity and publication bias.
import { DATASETS } from './data.js';
import { callPy } from './py.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let current = 'bcg';
let rows = [];

const BACK = {
  rr: { f: Math.exp, label: 'Risk ratio', nul: 0, fmt: (v) => Math.exp(v).toFixed(2) },
  or: { f: Math.exp, label: 'Odds ratio', nul: 0, fmt: (v) => Math.exp(v).toFixed(2) },
  smd: { f: (v) => v, label: "Hedges' g", nul: 0, fmt: (v) => v.toFixed(2) },
  r: { f: Math.tanh, label: 'Correlation r', nul: 0, fmt: (v) => Math.tanh(v).toFixed(2) },
};

export function initMeta() {
  const sel = $('#maData');
  sel.innerHTML = Object.entries(DATASETS).map(([k, d]) => `<option value="${k}">${esc(d.name)}</option>`).join('');
  sel.addEventListener('change', () => loadDataset(sel.value));
  $('#maAdd').addEventListener('click', () => { rows.push(rows.length ? rows[rows.length - 1].map((v, i) => (i === 0 ? `New study ${rows.length + 1}` : v)) : []); renderTable(); });
  $('#maRun').addEventListener('click', run);
  $('#maModel').addEventListener('change', run);
  $('#maHksj').addEventListener('change', run);
  $('#maCsv').addEventListener('click', exportCsv);
  loadDataset('bcg', false);

  // scenario lab
  const sims = ['#siMu', '#siTau', '#siK', '#siBias', '#siNmax'];
  sims.forEach((id) => {
    const el = $(id);
    el.addEventListener('input', () => { $(`${id}Out`).textContent = fmtSim(id, el.value); });
    $(`${id}Out`).textContent = fmtSim(id, el.value);
  });
  $('#siRun').addEventListener('click', () => simulate());
  $('#siSeed').addEventListener('click', () => { $('#siRun').dataset.seed = String(Math.floor(Math.random() * 1e6)); simulate(); });
  $('#siDrawer').addEventListener('change', () => lastSim && drawSimFunnel(lastSim));
  document.querySelectorAll('[data-scn]').forEach((b) => b.addEventListener('click', () => {
    const s = SCENARIOS[b.dataset.scn];
    Object.entries(s.set).forEach(([id, v]) => { $(id).value = v; $(`${id}Out`).textContent = fmtSim(id, v); });
    $('#siQuestion').innerHTML = `<b>What if…</b> ${s.q} <span class="hint">Predict first, then look at the result.</span>`;
    simulate();
  }));
}

const SCENARIOS = {
  clean: { q: 'there is no publication bias and little heterogeneity?', set: { '#siMu': 0.3, '#siTau': 0.05, '#siK': 25, '#siBias': 0, '#siNmax': 200 } },
  bias: { q: 'journals rarely publish non-significant results (90% stay in the file drawer)?', set: { '#siMu': 0.2, '#siTau': 0.05, '#siK': 25, '#siBias': 0.9, '#siNmax': 200 } },
  zero: { q: 'the true effect is zero, but non-significant studies are not published?', set: { '#siMu': 0, '#siTau': 0, '#siK': 20, '#siBias': 0.95, '#siNmax': 150 } },
  hetero: { q: 'the effect really varies a lot between contexts (high τ)?', set: { '#siMu': 0.3, '#siTau': 0.35, '#siK': 30, '#siBias': 0, '#siNmax': 300 } },
  small: { q: 'all studies are small (n ≤ 40 per group) and biased?', set: { '#siMu': 0.15, '#siTau': 0.05, '#siK': 20, '#siBias': 0.7, '#siNmax': 40 } },
};

function fmtSim(id, v) {
  v = Number(v);
  if (id === '#siMu') return `g = ${v.toFixed(2)}`;
  if (id === '#siTau') return `τ = ${v.toFixed(2)}`;
  if (id === '#siK') return `${v} studies`;
  if (id === '#siBias') return v === 0 ? 'none' : `${Math.round(v * 100)}% suppressed`;
  if (id === '#siNmax') return `n per group 10–${v}`;
  return v;
}

function loadDataset(key, autorun = true) {
  current = key;
  const d = DATASETS[key];
  rows = d.rows.map((r) => [...r]);
  $('#maNote').innerHTML = `${esc(d.note)} ${d.real ? '<span class="tag tag-real">real data</span>' : '<span class="tag tag-ill">illustrative data</span>'}`;
  renderTable();
  if (autorun) run();
}

function renderTable() {
  const d = DATASETS[current];
  const head = `<tr>${d.cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}<th scope="col"><span class="sr-only">Remove</span></th></tr>`;
  const body = rows.map((r, i) => `<tr>${r.map((v, j) => `<td><input aria-label="${esc(d.cols[j])}, row ${i + 1}" data-r="${i}" data-c="${j}" value="${esc(v)}" ${j === 0 ? '' : 'inputmode="decimal"'} class="${j === 0 ? 'cell-name' : 'cell-num'}"></td>`).join('')}<td><button type="button" class="icon-btn" data-del="${i}" aria-label="Remove row ${i + 1}">×</button></td></tr>`).join('');
  const t = $('#maTable');
  t.innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
  t.querySelectorAll('input').forEach((inp) => inp.addEventListener('change', () => {
    const r = +inp.dataset.r, c = +inp.dataset.c;
    rows[r][c] = c === 0 ? inp.value : Number(inp.value);
    run();
  }));
  t.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { rows.splice(+b.dataset.del, 1); renderTable(); run(); }));
}

function exportCsv() {
  const d = DATASETS[current];
  const csv = [d.cols.join(','), ...rows.map((r) => r.map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${current}-meta-analysis-data.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function run() {
  const d = DATASETS[current];
  const out = $('#maOut');
  if (rows.length < 2) { out.innerHTML = '<p class="warn-box">At least two studies are needed.</p>'; return; }
  const bad = rows.some((r) => r.slice(2).some((v) => !isFinite(Number(v))));
  if (bad) { out.innerHTML = '<p class="warn-box">Every numeric cell needs a number.</p>'; return; }
  $('#maStatus').textContent = 'Running the Python engine…';
  try {
    const res = await callPy('meta', { kind: d.kind, rows, method: $('#maModel').value, hksj: $('#maHksj').checked });
    $('#maStatus').textContent = `Computed in Python: ${res.method}, k = ${res.k}`;
    renderResults(res, d.kind);
  } catch (e) {
    $('#maStatus').textContent = 'The Python engine is not available.';
    out.innerHTML = `<p class="warn-box">${esc(e.message || e)}</p>`;
  }
}

function pfmt(p) { return p < 0.001 ? '< .001' : p.toFixed(3).replace(/^0/, ''); }

function renderResults(r, kind) {
  const B = BACK[kind];
  const est = B.fmt(r.estimate), lo = B.fmt(r.ci[0]), hi = B.fmt(r.ci[1]);
  const pi = r.pi ? `${B.fmt(r.pi[0])} to ${B.fmt(r.pi[1])}` : 'n/a';
  const hetWord = r.I2 < 25 ? 'low' : r.I2 < 50 ? 'moderate' : r.I2 < 75 ? 'substantial' : 'considerable';
  const sig = r.p < 0.05;
  const nullTxt = kind === 'rr' || kind === 'or' ? '1' : '0';
  const crossesNull = r.pi && r.pi[0] < 0 && r.pi[1] > 0;
  const eg = r.egger;
  const tf = r.trimfill;
  const cards = [
    [`Pooled ${B.label}`, est, `95% CI ${lo} to ${hi}`],
    ['Test of effect', `p ${pfmt(r.p)}`, `${r.dist} = ${r.stat.toFixed(2)}`],
    ['Heterogeneity', `I² = ${r.I2.toFixed(1)}%`, `τ² = ${r.tau2.toFixed(3)} · Q(${r.df}) = ${r.Q.toFixed(1)}, p ${pfmt(r.pQ)}`],
    ['95% prediction interval', pi, 'range for the effect in a new setting'],
    ["Egger's test", eg ? `p ${pfmt(eg.p)}` : 'n/a', eg ? `intercept ${eg.intercept.toFixed(2)}` : 'needs 3+ studies'],
    ['Trim-and-fill', tf ? `${tf.k0} imputed` : 'n/a', tf ? `adjusted ${B.fmt(tf.adjusted.estimate)} (${tf.side} side)` : ''],
  ];
  const interp = [
    `Across ${r.k} studies, the ${r.method.startsWith('FE') ? 'common-effect' : 'random-effects'} estimate is <b>${est}</b> (95% CI ${lo} to ${hi}), ${sig ? `which excludes the null value of ${nullTxt}` : `which includes the null value of ${nullTxt}, so the data are compatible with no effect`}.`,
    `Heterogeneity is ${hetWord} (I² = ${r.I2.toFixed(0)}%; thresholds of 25/50/75% are rough guides, ${'<a class="cite" href="#ref-higgins2003">Higgins et al., 2003</a>'}).`,
    r.pi ? `The prediction interval (${pi}) shows where the effect in a new comparable setting is likely to fall ${'(<a class="cite" href="#ref-riley2011">Riley et al., 2011</a>)'}${crossesNull ? '; it crosses the null, so in some settings the effect may be absent or reversed' : ''}.` : '',
    eg ? (r.k < 10 ? `Egger's test has low power with fewer than 10 studies, so read the funnel plot with caution.` : (eg.p < 0.1 ? `Egger's test suggests funnel asymmetry (p ${pfmt(eg.p)}); small-study effects or publication bias are possible.` : `Egger's test shows no clear funnel asymmetry (p ${pfmt(eg.p)}).`)) : '',
    tf && tf.k0 > 0 ? `Trim-and-fill imputes ${tf.k0} missing ${tf.k0 === 1 ? 'study' : 'studies'}; the adjusted estimate is ${B.fmt(tf.adjusted.estimate)}. Treat this as a sensitivity analysis, not a correction ${'(<a class="cite" href="#ref-duval2000">Duval & Tweedie, 2000</a>)'}.` : '',
    `Fail-safe N = ${r.failsafe} (reported for history only; it is not a valid bias test).`,
  ].filter(Boolean).join(' ');
  const looRange = r.loo.map((x) => x.estimate);
  const minL = Math.min(...looRange), maxL = Math.max(...looRange);
  const infl = r.loo.reduce((a, b) => (Math.abs(b.estimate - r.estimate) > Math.abs(a.estimate - r.estimate) ? b : a));
  $('#maOut').innerHTML = `
    <div class="ma-cards">${cards.map(([l, v, s]) => `<div class="kpi"><span class="kpi-l">${l}</span><span class="kpi-v">${v}</span><span class="kpi-s">${s}</span></div>`).join('')}</div>
    <p class="ma-interp"><b>Reading the result.</b> ${interp}</p>
    <div class="ma-plots">
      <figure class="plot-card"><figcaption>Forest plot</figcaption>${forest(r, B)}</figure>
      <figure class="plot-card"><figcaption>Funnel plot <span class="hint">filled = observed, hollow = imputed by trim-and-fill</span></figcaption>${funnel(r.yi, r.vi, r.fe_estimate, tf ? tf.filled : [], B, r.estimate)}</figure>
    </div>
    <details class="loo"><summary>Leave-one-out sensitivity: estimates range ${B.fmt(minL)} to ${B.fmt(maxL)}; most influential: ${esc(infl.omitted)}</summary>
      <table class="mini"><thead><tr><th>Omitted study</th><th>Estimate</th><th>95% CI</th><th>I²</th></tr></thead><tbody>${r.loo.map((x) => `<tr><td>${esc(x.omitted)}</td><td>${B.fmt(x.estimate)}</td><td>${B.fmt(x.ci[0])} to ${B.fmt(x.ci[1])}</td><td>${x.I2.toFixed(0)}%</td></tr>`).join('')}</tbody></table>
    </details>`;
}

function forest(r, B) {
  const k = r.k, rowH = 22, top = 34, W = 760, plotL = 330, plotR = 600;
  const H = top + (k + 3) * rowH + 30;
  const lows = r.yi.map((y, i) => y - 1.96 * Math.sqrt(r.vi[i]));
  const highs = r.yi.map((y, i) => y + 1.96 * Math.sqrt(r.vi[i]));
  let xmin = Math.min(...lows, r.pi ? r.pi[0] : r.ci[0], 0), xmax = Math.max(...highs, r.pi ? r.pi[1] : r.ci[1], 0);
  const pad = (xmax - xmin) * 0.05; xmin -= pad; xmax += pad;
  const X = (v) => plotL + ((Math.max(xmin, Math.min(xmax, v)) - xmin) / (xmax - xmin)) * (plotR - plotL);
  const maxW = Math.max(...r.weights);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="forest" role="img" aria-label="Forest plot of ${k} studies. Pooled ${B.label} ${B.fmt(r.estimate)}, 95% confidence interval ${B.fmt(r.ci[0])} to ${B.fmt(r.ci[1])}.">`;
  s += `<text x="8" y="20" class="fh">Study</text><text x="${plotL + (plotR - plotL) / 2}" y="20" class="fh" text-anchor="middle">${B.label} (95% CI)</text><text x="${W - 120}" y="20" class="fh">Estimate</text><text x="${W - 8}" y="20" class="fh" text-anchor="end">Weight</text>`;
  s += `<line x1="${X(0)}" x2="${X(0)}" y1="${top - 6}" y2="${top + (k + 2) * rowH}" class="fnull"/>`;
  r.yi.forEach((y, i) => {
    const cy = top + i * rowH + rowH / 2;
    const sz = 4 + 10 * Math.sqrt(r.weights[i] / maxW);
    s += `<text x="8" y="${cy + 4}" class="ft">${esc(r.labels[i]).slice(0, 34)}</text>`;
    s += `<line x1="${X(lows[i])}" x2="${X(highs[i])}" y1="${cy}" y2="${cy}" class="fci"/>`;
    if (lows[i] < xmin) s += `<path d="M${X(xmin)},${cy} l6,-4 l0,8z" class="fci-arrow"/>`;
    s += `<rect x="${X(y) - sz / 2}" y="${cy - sz / 2}" width="${sz}" height="${sz}" class="fsq"/>`;
    s += `<text x="${W - 120}" y="${cy + 4}" class="ft fnum">${B.fmt(y)} [${B.fmt(lows[i])}, ${B.fmt(highs[i])}]</text><text x="${W - 8}" y="${cy + 4}" class="ft fnum" text-anchor="end">${r.weights[i].toFixed(1)}%</text>`;
  });
  const dy = top + (k + 0.6) * rowH;
  s += `<line x1="8" x2="${W - 8}" y1="${dy - 12}" y2="${dy - 12}" class="fsep"/>`;
  s += `<path d="M${X(r.ci[0])},${dy} L${X(r.estimate)},${dy - 8} L${X(r.ci[1])},${dy} L${X(r.estimate)},${dy + 8} Z" class="fdia"/>`;
  s += `<text x="8" y="${dy + 4}" class="ft fbold">${r.method.startsWith('FE') ? 'Common effect' : 'Random effects'} (${r.method})</text><text x="${W - 120}" y="${dy + 4}" class="ft fnum fbold">${B.fmt(r.estimate)} [${B.fmt(r.ci[0])}, ${B.fmt(r.ci[1])}]</text><text x="${W - 8}" y="${dy + 4}" class="ft fnum" text-anchor="end">100%</text>`;
  if (r.pi) {
    const py = dy + rowH;
    s += `<line x1="${X(r.pi[0])}" x2="${X(r.pi[1])}" y1="${py}" y2="${py}" class="fpi"/><text x="8" y="${py + 4}" class="ft">Prediction interval</text><text x="${W - 120}" y="${py + 4}" class="ft fnum">[${B.fmt(r.pi[0])}, ${B.fmt(r.pi[1])}]</text>`;
  }
  const ay = top + (k + 2.4) * rowH;
  s += `<line x1="${plotL}" x2="${plotR}" y1="${ay}" y2="${ay}" class="faxis"/>`;
  const ticks = niceTicks(xmin, xmax, 5);
  ticks.forEach((t) => { s += `<line x1="${X(t)}" x2="${X(t)}" y1="${ay}" y2="${ay + 5}" class="faxis"/><text x="${X(t)}" y="${ay + 18}" class="ft" text-anchor="middle">${B.fmt(t)}</text>`; });
  s += '</svg>';
  return s;
}

function funnel(yi, vi, center, filled, B, reEst) {
  const W = 420, H = 320, L = 50, R = 16, T = 16, Bm = 40;
  const se = vi.map(Math.sqrt);
  const allSe = se.concat(filled.map((f) => Math.sqrt(f.vi)));
  const maxSe = Math.max(...allSe) * 1.1;
  const ys = yi.concat(filled.map((f) => f.yi));
  let xmin = Math.min(...ys, center - 1.96 * maxSe), xmax = Math.max(...ys, center + 1.96 * maxSe);
  const X = (v) => L + ((v - xmin) / (xmax - xmin)) * (W - L - R);
  const Y = (s) => T + (s / maxSe) * (H - T - Bm);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="funnel" role="img" aria-label="Funnel plot: effect sizes against standard error, ${filled.length} studies imputed by trim-and-fill.">`;
  svg += `<path d="M${X(center)},${Y(0)} L${X(center - 1.96 * maxSe)},${Y(maxSe)} L${X(center + 1.96 * maxSe)},${Y(maxSe)} Z" class="ffun"/>`;
  svg += `<line x1="${X(center)}" x2="${X(center)}" y1="${Y(0)}" y2="${Y(maxSe)}" class="fcen"/>`;
  if (reEst !== undefined) svg += `<line x1="${X(reEst)}" x2="${X(reEst)}" y1="${Y(0)}" y2="${Y(maxSe)}" class="fre"/>`;
  yi.forEach((y, i) => { svg += `<circle cx="${X(y)}" cy="${Y(se[i])}" r="5" class="fpt"/>`; });
  filled.forEach((f) => { svg += `<circle cx="${X(f.yi)}" cy="${Y(Math.sqrt(f.vi))}" r="5" class="fimp"/>`; });
  svg += `<line x1="${L}" x2="${W - R}" y1="${H - Bm}" y2="${H - Bm}" class="faxis"/><line x1="${L}" x2="${L}" y1="${T}" y2="${H - Bm}" class="faxis"/>`;
  niceTicks(xmin, xmax, 5).forEach((t) => { svg += `<text x="${X(t)}" y="${H - Bm + 16}" class="ft" text-anchor="middle">${B.fmt(t)}</text>`; });
  niceTicks(0, maxSe, 4).forEach((t) => { svg += `<text x="${L - 6}" y="${Y(t) + 4}" class="ft" text-anchor="end">${t.toFixed(2)}</text>`; });
  svg += `<text x="${(L + W - R) / 2}" y="${H - 6}" class="ft" text-anchor="middle">${B.label}</text><text x="14" y="${(T + H - Bm) / 2}" class="ft" transform="rotate(-90 14 ${(T + H - Bm) / 2})" text-anchor="middle">Standard error</text></svg>`;
  return svg;
}

let lastSim = null;
async function simulate() {
  const args = { k: +$('#siK').value, mu: +$('#siMu').value, tau: +$('#siTau').value, bias: +$('#siBias').value, n_min: 10, n_max: +$('#siNmax').value, seed: +($('#siRun').dataset.seed || 11) };
  $('#siStatus').textContent = 'Simulating in Python…';
  try {
    const r = await callPy('simulate', args);
    r.args = args;
    lastSim = r;
    $('#siStatus').textContent = `Simulated ${r.sim.attempts} studies; ${r.sim.published.length} published, ${r.sim.drawer.length} in the file drawer.`;
    const m = r.meta, all = r.all;
    const biasAmt = m.estimate - args.mu;
    $('#siCards').innerHTML = [
      ['True mean effect', args.mu.toFixed(2), 'set by you (unknown in reality)'],
      ['Published studies estimate', m.estimate.toFixed(2), `95% CI ${m.ci[0].toFixed(2)} to ${m.ci[1].toFixed(2)}`, Math.abs(biasAmt) > 0.08 ? 'warn' : ''],
      ['All studies (incl. file drawer)', all ? all.estimate.toFixed(2) : m.estimate.toFixed(2), all ? 'what an unbiased review would see' : 'no studies were suppressed'],
      ['Heterogeneity (published)', `I² = ${m.I2.toFixed(0)}%`, `τ² = ${m.tau2.toFixed(3)}`],
      ["Egger's test", r.egger ? `p ${pfmt(r.egger.p)}` : 'n/a', r.egger && r.egger.p < 0.1 ? 'asymmetry detected' : 'no clear asymmetry'],
      ['Trim-and-fill', `${r.trimfill.k0} imputed`, `adjusted ${r.trimfill.adjusted.estimate.toFixed(2)}`],
    ].map(([l, v, s, c]) => `<div class="kpi ${c || ''}"><span class="kpi-l">${l}</span><span class="kpi-v">${v}</span><span class="kpi-s">${s}</span></div>`).join('');
    $('#siLesson').innerHTML = lesson(args, r);
    drawSimFunnel(r);
  } catch (e) {
    $('#siStatus').textContent = `Python engine not available: ${e.message || e}`;
  }
}

function lesson(a, r) {
  const m = r.meta;
  const inflated = m.estimate - a.mu;
  const parts = [];
  if (a.bias >= 0.5) parts.push(`Publication bias inflated the pooled effect by <b>${inflated.toFixed(2)}</b> (from a true ${a.mu.toFixed(2)} to ${m.estimate.toFixed(2)}). The missing studies sit in the lower part of the funnel, where small non-significant studies would be.`);
  if (a.mu === 0 && a.bias > 0.5) parts.push('With a true effect of zero, a biased literature can still produce a "significant" pooled effect. This is why reviewers search grey literature, trial registries and preprints.');
  if (a.tau >= 0.25) parts.push(`With τ = ${a.tau}, studies disagree for real reasons. Report the prediction interval and look for moderators instead of relying on the average alone.`);
  if (r.egger && r.egger.p >= 0.1 && a.bias >= 0.5) parts.push("Egger's test missed the bias here: these tests have limited power, especially with few studies.");
  if (r.trimfill.k0 > 0 && a.bias >= 0.5) parts.push(`Trim-and-fill moved the estimate toward the truth (${r.trimfill.adjusted.estimate.toFixed(2)}) but rarely all the way.`);
  if (!parts.length) parts.push('Without suppression the published studies give an unbiased estimate, and the funnel is roughly symmetric.');
  return parts.join(' ');
}

function drawSimFunnel(r) {
  const pub = r.sim.published, drawer = $('#siDrawer').checked ? r.sim.drawer : [];
  const W = 640, H = 340, L = 56, R = 16, T = 16, Bm = 40;
  const all = pub.concat(drawer);
  const maxSe = Math.max(...all.map((s) => Math.sqrt(s.vi))) * 1.08;
  let xmin = Math.min(...all.map((s) => s.yi), r.args.mu - 2 * maxSe), xmax = Math.max(...all.map((s) => s.yi), r.args.mu + 2 * maxSe);
  const X = (v) => L + ((v - xmin) / (xmax - xmin)) * (W - L - R);
  const Y = (s) => T + (s / maxSe) * (H - T - Bm);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="funnel" role="img" aria-label="Simulated funnel plot: ${pub.length} published and ${r.sim.drawer.length} unpublished studies.">`;
  svg += `<path d="M${X(0)},${Y(0)} L${X(-1.96 * maxSe)},${Y(maxSe)} L${X(1.96 * maxSe)},${Y(maxSe)} Z" class="fsig"/>`;
  const vline = (v, cls, label, dy) => `<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H - Bm}" class="${cls}"/><text x="${X(v) + 4}" y="${T + 12 + dy}" class="ft ${cls}-t">${label}</text>`;
  svg += vline(r.args.mu, 'ftrue', `true ${r.args.mu.toFixed(2)}`, 0);
  svg += vline(r.meta.estimate, 'fpub', `published ${r.meta.estimate.toFixed(2)}`, 16);
  if (r.trimfill.k0) svg += vline(r.trimfill.adjusted.estimate, 'ftf', `trim-and-fill ${r.trimfill.adjusted.estimate.toFixed(2)}`, 32);
  drawer.forEach((s) => { svg += `<circle cx="${X(s.yi)}" cy="${Y(Math.sqrt(s.vi))}" r="4.5" class="fdrawer"/>`; });
  pub.forEach((s) => { svg += `<circle cx="${X(s.yi)}" cy="${Y(Math.sqrt(s.vi))}" r="4.5" class="fpt"/>`; });
  svg += `<line x1="${L}" x2="${W - R}" y1="${H - Bm}" y2="${H - Bm}" class="faxis"/>`;
  niceTicks(xmin, xmax, 6).forEach((t) => { svg += `<text x="${X(t)}" y="${H - Bm + 16}" class="ft" text-anchor="middle">${t.toFixed(1)}</text>`; });
  niceTicks(0, maxSe, 4).forEach((t) => { svg += `<text x="${L - 6}" y="${Y(t) + 4}" class="ft" text-anchor="end">${t.toFixed(2)}</text>`; });
  svg += `<text x="${(L + W - R) / 2}" y="${H - 6}" class="ft" text-anchor="middle">Hedges' g (shaded: not significant at p < .05)</text><text x="14" y="${(T + H - Bm) / 2}" class="ft" transform="rotate(-90 14 ${(T + H - Bm) / 2})" text-anchor="middle">Standard error</text></svg>`;
  $('#siPlot').innerHTML = svg;
}

function niceTicks(a, b, count) {
  const span = b - a;
  if (!(span > 0)) return [a];
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) out.push(Math.round(v / step) * step);
  return out;
}

export function runInitialMeta() { run(); simulate(); }
