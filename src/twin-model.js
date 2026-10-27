// Review Process Digital Twin: the model.
// A transparent, deterministic model of how search and screening decisions propagate
// through a systematic review. Every assumption is listed in ASSUMPTIONS and shown on the page.

export const DBS = {
  scopus: { name: 'Scopus', cov: 0.78, noise: 1.0, color: '#f2a03d' },
  wos: { name: 'Web of Science', cov: 0.70, noise: 0.85, color: '#7c6cf0' },
  pubmed: { name: 'PubMed / MEDLINE', cov: 0.45, noise: 0.9, color: '#3fb6d9' },
  psycinfo: { name: 'APA PsycInfo', cov: 0.35, noise: 0.8, color: '#e46fa8' },
  ebsco: { name: 'Business Source (EBSCO)', cov: 0.50, noise: 1.0, color: '#5fc27e' },
  ieee: { name: 'IEEE Xplore', cov: 0.30, noise: 0.9, color: '#58a6ff' },
  gscholar: { name: 'Google Scholar', cov: 0.85, noise: 3.0, color: '#c9c9c9', cap: 1000 },
};

export const STAGES = [
  { id: 'search', name: 'Search', short: 'Search' },
  { id: 'dedupe', name: 'Deduplicate', short: 'Dedupe' },
  { id: 'ta', name: 'Title/abstract screening', short: 'Screen T/A' },
  { id: 'retrieve', name: 'Full-text retrieval', short: 'Retrieve' },
  { id: 'ft', name: 'Full-text eligibility', short: 'Eligibility' },
  { id: 'appraise', name: 'Quality appraisal', short: 'Appraise' },
  { id: 'extract', name: 'Data extraction', short: 'Extract' },
  { id: 'synth', name: 'Synthesis and writing', short: 'Synthesise' },
];

export const DEFAULTS = {
  R: 120, noise: 'medium', dbs: ['scopus', 'wos'], syn: 4, blocks: 2, field: 'tak', years: 'all', english: true, peer: true,
  back: true, fwd: false, strategy: 'single_check', strict: 0.5, kappa: 0.75, access: 0.9, appraisalCut: 0,
  reviewers: 2, hours: 10, secTA: 30, minFT: 15, minAppraise: 20, minExtract: 45,
};

export const PRESETS = {
  bachelor: { label: "Bachelor's thesis review", R: 60, noise: 'medium', dbs: ['scopus', 'gscholar'], syn: 2, blocks: 2, field: 'tak', years: 'all', english: true, peer: true, back: false, fwd: false, strategy: 'single', strict: 0.5, kappa: 0.7, access: 0.85, appraisalCut: 0, reviewers: 1, hours: 8 },
  master: { label: "Master's SLR", R: 120, noise: 'medium', dbs: ['scopus', 'wos'], syn: 4, blocks: 2, field: 'tak', years: 'all', english: true, peer: true, back: true, fwd: false, strategy: 'single_check', strict: 0.5, kappa: 0.75, access: 0.9, appraisalCut: 0, reviewers: 2, hours: 10 },
  phd: { label: 'PhD, publishable SLR', R: 250, noise: 'medium', dbs: ['scopus', 'wos', 'ebsco'], syn: 5, blocks: 3, field: 'tak', years: 'all', english: true, peer: true, back: true, fwd: true, strategy: 'dual', strict: 0.4, kappa: 0.8, access: 0.92, appraisalCut: 0.1, reviewers: 2, hours: 15 },
  cochrane: { label: 'Cochrane-style review', R: 180, noise: 'high', dbs: ['pubmed', 'scopus', 'wos', 'psycinfo'], syn: 7, blocks: 3, field: 'tak', years: 'all', english: false, peer: false, back: true, fwd: true, strategy: 'dual', strict: 0.3, kappa: 0.85, access: 0.95, appraisalCut: 0, reviewers: 3, hours: 20 },
  rapid: { label: 'Rapid review', R: 120, noise: 'medium', dbs: ['scopus'], syn: 3, blocks: 2, field: 'tak', years: '10', english: true, peer: true, back: false, fwd: false, strategy: 'single_check', strict: 0.6, kappa: 0.75, access: 0.85, appraisalCut: 0, reviewers: 2, hours: 30 },
  ai: { label: 'AI-assisted screening', R: 250, noise: 'high', dbs: ['scopus', 'wos', 'ebsco'], syn: 6, blocks: 2, field: 'tak', years: 'all', english: true, peer: true, back: true, fwd: true, strategy: 'ai', strict: 0.4, kappa: 0.8, access: 0.92, appraisalCut: 0, reviewers: 2, hours: 12 },
};

export const ASSUMPTIONS = [
  ['Relevant studies in the field', 'You set the true number of eligible studies (unknown in real life). Recall is measured against it.'],
  ['Database coverage', 'Share of the relevant studies each database can find with a good string: Scopus 78%, Web of Science 70%, Business Source 50%, PubMed 45%, PsycInfo 35%, IEEE 30%, Google Scholar 85% (but only the first 1,000 hits can be viewed and results are not reproducible; Gusenbauer & Haddaway, 2020). Real coverage depends on the topic (Bramer et al., 2017).'],
  ['Noise', 'Irrelevant hits per relevant hit: low 8, medium 20, high 45, scaled by database, synonyms, AND blocks, search field and filters.'],
  ['Synonyms', 'Sensitivity rises with synonyms per concept: 1 → 40%, 3 → 80%, 5 → 93% of database coverage; each extra synonym adds 30% more noise.'],
  ['AND blocks', 'Each extra concept block cuts noise by 60% but loses 6–8% of relevant studies.'],
  ['Search field', 'Title only: 62% recall, 35% noise. Title-abstract-keywords: reference. Full text: +4% recall, 4.5× noise.'],
  ['Filters', 'Last 20 years: 93% of relevant kept; last 10 years: 70%. English only: 95%. Peer-reviewed journals only: 88% (grey literature lost).'],
  ['Duplicates', 'Relevant studies overlap across databases independently; irrelevant hits overlap 35% less than fully.'],
  ['Snowballing', 'Backward snowballing recovers 45% of missed relevant studies, forward 25% of those still missed, with 6 screened references per find (Wohlin, 2014).'],
  ['Screening errors', 'Share of relevant studies wrongly excluded at title/abstract: single 10%, single + 20% check 6%, dual independent 2.5%, AI-prioritised with stopping rule 5%; stricter criteria add up to 10%. Direction from Waffenschmidt et al. (2019); exact values are illustrative.'],
  ['AI-prioritised screening', 'Reviewers screen about 35% of records before the stopping rule; the rest are excluded by the rule (van de Schoot et al., 2021).'],
  ['Agreement', 'Dual screening conflicts follow from Cohen\'s kappa and the inclusion rate; each conflict takes 2 minutes to resolve.'],
  ['Effort', 'Defaults: 30 s per abstract, 15 min per full text, 20 min appraisal, 45 min extraction per study (+20% checking), 25 h protocol and search design plus 3 h per database, synthesis and writing 60 h + 1.5 h per included study. All adjustable.'],
  ['Schedule', 'Stages run in sequence; team capacity = reviewers × hours per week.'],
];

const NOISE = { low: 8, medium: 20, high: 45 };

export function computeTwin(input) {
  const p = { ...DEFAULTS, ...input };
  const synF = 1 - 0.6 * Math.exp(-0.55 * (p.syn - 1));
  const synN = 1 + 0.3 * (p.syn - 1);
  const blockR = [1, 1, 0.96, 0.9, 0.82][p.blocks];
  const blockN = [1, 2.5, 1, 0.4, 0.16][p.blocks];
  const fieldR = { ti: 0.62, tak: 1, all: 1.04 }[p.field];
  const fieldN = { ti: 0.35, tak: 1, all: 4.5 }[p.field];
  const yearR = { all: 1, 20: 0.93, 10: 0.7 }[p.years];
  const yearN = { all: 1, 20: 0.9, 10: 0.68 }[p.years];
  const langR = p.english ? 0.95 : 1, langN = p.english ? 0.85 : 1;
  const peerR = p.peer ? 0.88 : 1, peerN = p.peer ? 0.7 : 1;
  const ratio = NOISE[p.noise] || 20;

  const perDb = p.dbs.map((id) => {
    const d = DBS[id];
    const recall = Math.min(0.99, d.cov * synF * blockR * fieldR * yearR * langR * peerR);
    let rel = p.R * recall;
    let noise = rel * ratio * d.noise * synN * blockN * fieldN * yearN * langN * peerN;
    let capped = false;
    if (d.cap && rel + noise > d.cap) {
      const s = d.cap / (rel + noise);
      // the first 1,000 hits are relevance-ranked, so relevant records are kept at a better rate
      rel *= Math.min(1, s * 2.2);
      noise = d.cap - rel;
      capped = true;
    }
    return { id, name: d.name, color: d.color, recall: rel / p.R, rel, noise, records: Math.round(rel + noise), capped };
  });

  const n = perDb.length;
  const identified = perDb.reduce((s, d) => s + d.records, 0);
  const missProb = perDb.reduce((acc, d) => acc * (1 - d.recall), 1);
  const uniqueRel = n ? p.R * (1 - missProb) : 0;
  const sumNoise = perDb.reduce((s, d) => s + d.noise, 0);
  const uniqueNoise = n ? sumNoise * (1 - 0.35 * (1 - 1 / n)) : 0;
  const unique = Math.round(uniqueRel + uniqueNoise);
  const duplicates = Math.max(0, identified - unique);

  // other methods (snowballing)
  let missed = p.R - uniqueRel, otherRel = 0;
  if (p.back) { const f = missed * 0.45; otherRel += f; missed -= f; }
  if (p.fwd) { const f = missed * 0.25; otherRel += f; missed -= f; }
  const otherScreened = Math.round(otherRel * 6);

  // title/abstract screening
  const errBase = { single: 0.10, single_check: 0.06, dual: 0.025, ai: 0.05 }[p.strategy];
  const relMiss = Math.min(0.6, errBase + 0.10 * p.strict);
  const noisePass = 0.075 - 0.05 * p.strict;
  const passRel = uniqueRel * (1 - relMiss);
  const passNoise = uniqueNoise * noisePass;
  const passTA = Math.round(passRel + passNoise);
  const screened = unique;
  const humanScreened = p.strategy === 'ai' ? Math.round(unique * 0.35) : unique;
  const stoppedByRule = p.strategy === 'ai' ? unique - humanScreened : 0;
  const excludedTA = screened - passTA - stoppedByRule;

  // agreement / conflicts for dual screening
  const incl = unique ? passTA / unique : 0;
  const pe = incl * incl + (1 - incl) * (1 - incl);
  const po = pe + p.kappa * (1 - pe);
  const conflicts = p.strategy === 'dual' ? Math.round(unique * (1 - po)) : (p.strategy === 'single_check' ? Math.round(unique * 0.2 * (1 - po)) : 0);

  // retrieval
  const sought = passTA;
  const otherSought = Math.round(otherRel * 1.3);
  const notRetrieved = Math.round(sought * (1 - p.access));
  const otherNotRetrieved = Math.round(otherSought * (1 - p.access) * 0.6);
  const assessed = sought - notRetrieved;
  const otherAssessed = otherSought - otherNotRetrieved;

  // full-text eligibility
  const ftMiss = { single: 0.05, single_check: 0.04, dual: 0.02, ai: 0.04 }[p.strategy];
  const relShareTA = passTA ? passRel / passTA : 0;
  const relAssessed = assessed * relShareTA;
  const noiseAssessed = assessed - relAssessed;
  const inclFT = relAssessed * (1 - ftMiss - 0.03) + noiseAssessed * 0.012;
  const otherIncl = otherAssessed * (otherSought ? (otherRel * 0.95) / otherSought : 0);
  const excludedFT = Math.max(0, Math.round(assessed - inclFT));
  const otherExcluded = Math.max(0, Math.round(otherAssessed - otherIncl));
  const reasons = [
    ['Wrong population or context', 0.30], ['Concept or outcome not studied', 0.25], ['Ineligible study design', 0.20],
    ['Not peer-reviewed / duplicate publication', 0.10], ['Language', p.english ? 0.05 : 0.0], ['Other', p.english ? 0.10 : 0.15],
  ].map(([r, s]) => [r, Math.round(excludedFT * s)]);

  const eligible = Math.round(inclFT + otherIncl);
  const lowQuality = Math.round(eligible * p.appraisalCut);
  const included = eligible - lowQuality;
  const includedRel = (relAssessed * (1 - ftMiss - 0.03) + otherIncl) * (1 - p.appraisalCut * 0.6);
  const recall = Math.min(1, includedRel / p.R);
  const precision = unique ? uniqueRel / unique : 0;

  // effort (person-hours)
  const taMult = { single: 1, single_check: 1.2, dual: 2, ai: 1 }[p.strategy];
  const ftMult = { single: 1, single_check: 1.2, dual: 2, ai: 1.2 }[p.strategy];
  const hours = {
    search: 25 + 3 * n,
    dedupe: (identified * 8) / 3600 + 2,
    ta: ((humanScreened + otherScreened) * p.secTA * taMult) / 3600 + (conflicts * 2) / 60,
    retrieve: ((sought + otherSought) * 4) / 60,
    ft: ((assessed + otherAssessed) * p.minFT * ftMult) / 60,
    appraise: (eligible * p.minAppraise * (p.strategy === 'dual' ? 1.5 : 1)) / 60,
    extract: (included * p.minExtract * 1.2) / 60,
    synth: 60 + included * 1.5,
  };
  const capacity = Math.max(1, p.reviewers) * p.hours;
  const weeks = Object.fromEntries(Object.entries(hours).map(([k, h]) => [k, h / capacity]));
  const totalHours = Object.values(hours).reduce((a, b) => a + b, 0);
  const totalWeeks = totalHours / capacity;
  const bottleneck = Object.entries(hours).sort((a, b) => b[1] - a[1])[0][0];
  let t = 0;
  const schedule = STAGES.map((s) => { const start = t; t += weeks[s.id]; return { id: s.id, start, end: t }; });

  const counts = {
    search: identified, dedupe: unique, ta: passTA, retrieve: assessed, ft: eligible, appraise: included, extract: included, synth: included,
  };
  const rejects = {
    search: 0, dedupe: duplicates, ta: excludedTA + stoppedByRule, retrieve: notRetrieved, ft: excludedFT, appraise: lowQuality, extract: 0, synth: 0,
  };

  return {
    p, perDb, identified, duplicates, unique, screened, humanScreened, stoppedByRule, excludedTA, passTA,
    sought, notRetrieved, assessed, excludedFT, reasons, eligible, lowQuality, included,
    other: { found: Math.round(otherRel), screened: otherScreened, sought: otherSought, notRetrieved: otherNotRetrieved, assessed: otherAssessed, excluded: otherExcluded, included: Math.round(otherIncl) },
    conflicts, po, recall, precision, uniqueRel, hours, weeks, totalHours, totalWeeks, bottleneck, schedule, counts, rejects, capacity,
    advice: advise(p, { recall, totalWeeks, n, perDb, unique }),
  };
}

function advise(p, r) {
  const a = [];
  const has = (id) => p.dbs.includes(id);
  if (r.n === 0) a.push(['bad', 'Select at least one database.']);
  if (r.n === 1) a.push(['warn', 'One database rarely finds everything. Combine at least two complementary sources (Bramer et al., 2017; Kraus et al., 2022).']);
  if (has('gscholar') && r.n <= 2) a.push(['warn', 'Google Scholar shows only the first 1,000 hits and its results are not reproducible; use it for supplementary searching, not as a principal source (Gusenbauer & Haddaway, 2020).']);
  if (p.syn <= 2) a.push(['warn', 'Few synonyms per concept: sensitivity is low. Brainstorm terms from key papers, thesauri and experts.']);
  if (p.blocks === 1) a.push(['warn', 'A single concept block returns a very large, noisy set. Add a second concept joined with AND.']);
  if (p.blocks >= 4) a.push(['warn', 'Four AND blocks make the search very specific; check that known key papers are still found.']);
  if (p.field === 'all') a.push(['warn', 'Full-text searching inflates noise dramatically; title-abstract-keywords is the usual choice.']);
  if (p.strategy === 'single') a.push(['warn', 'Single screening misses more eligible studies than dual screening (Waffenschmidt et al., 2019). At least have a second person check a sample.']);
  if (p.strategy === 'dual' && p.reviewers < 2) a.push(['bad', 'Dual screening needs at least two reviewers.']);
  if (p.strategy === 'ai') a.push(['info', 'With AI-prioritised screening, report the software, the stopping rule and how many records were screened by humans.']);
  if (p.strategy !== 'single' && p.kappa < 0.6) a.push(['warn', 'Agreement below 0.6 means the criteria are being read differently. Pilot and calibrate on 50–100 records before continuing (Landis & Koch, 1977).']);
  if (p.access < 0.85) a.push(['info', 'Many full texts missing: use interlibrary loan and contact authors; report the number not retrieved.']);
  if (p.peer) a.push(['info', 'Restricting to peer-reviewed journals is common in management reviews but can add publication bias; justify it.']);
  if (p.years === '10') a.push(['info', 'A 10-year window needs a clear justification (e.g., the phenomenon only emerged recently).']);
  if (!p.back && !p.fwd) a.push(['info', 'Add backward and forward snowballing to find studies the database search missed (Wohlin, 2014).']);
  if (r.recall < 0.6) a.push(['bad', `Estimated recall is only ${Math.round(r.recall * 100)}%: the review would miss many eligible studies.`]);
  else if (r.recall >= 0.85) a.push(['good', `Estimated recall ${Math.round(r.recall * 100)}%: a thorough search and screening process.`]);
  if (r.totalWeeks > 52) a.push(['warn', `About ${Math.round(r.totalWeeks)} weeks of work with this team. Narrow the question, add reviewers or use prioritised screening.`]);
  return a;
}
