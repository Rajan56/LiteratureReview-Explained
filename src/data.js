// Content model for Review Lab. Text is plain HTML; cite() builds APA in-text links.
import { cite, citeN } from './refs.js';

export const LEVELS = [
  { id: 'bachelor', label: "Bachelor's" },
  { id: 'master', label: "Master's" },
  { id: 'phd', label: 'PhD' },
  { id: 'researcher', label: 'Researchers' },
];

// families used for filtering the atlas
export const FAMILIES = {
  traditional: 'Traditional and critical',
  systematic: 'Systematic family',
  mapping: 'Mapping the field',
  quant: 'Quantitative synthesis',
  qual: 'Qualitative and theory-driven synthesis',
  speed: 'Fast or continuous',
};

/* Review types. suit = suitability by level (0 not typical, 1 possible, 2 good fit, 3 typical).
   salsa = Search, AppraisaL, Synthesis, Analysis (the frame used by Grant & Booth, 2009). */
export const TYPES = [
  {
    id: 'narrative', name: 'Narrative (traditional) review', family: 'traditional', short: 'Narrative',
    one: 'A selective, expert-led overview that tells the story of a topic and argues a position.',
    purpose: `Summarise and interpret what is known, introduce a topic, or frame the background for an empirical study. Selection is guided by the author's judgement rather than a protocol ${cite('baumeister1997', 'green2006')}.`,
    question: 'Broad: "What do we know about X, and what does it mean for Y?"',
    salsa: ['Selective; sources chosen for relevance and influence, search usually not reported in full.', 'Optional and informal; credibility is discussed in the text.', 'Narrative, usually thematic or chronological.', 'Interpretation of trends, debates and gaps; argument-led.'],
    output: 'Essay-style chapter or article organised by themes, schools of thought or chronology.',
    reporting: 'No formal guideline; SANRA scale is sometimes used by journals for appraisal.',
    time: '2–8 weeks', team: '1', suit: [3, 3, 2, 2],
    caution: 'Risk of selection bias and confirmation of the author\'s views; be transparent about how sources were chosen.',
    refs: ['baumeister1997', 'green2006', 'hart2018'],
  },
  {
    id: 'integrative', name: 'Integrative review', family: 'traditional', short: 'Integrative',
    one: 'Brings together diverse literatures (empirical, theoretical, methodological) into a new framework or perspective.',
    purpose: `Generate new frameworks and perspectives on mature or emerging topics by critically integrating different types of studies ${cite('torraco2005', 'whittemore2005', 'elsbach2020')}.`,
    question: 'Conceptual: "How can findings from different streams be integrated to explain X?"',
    salsa: ['Comprehensive and documented, often across disciplines and study designs.', 'Appraisal adapted to the mix of designs; may be used to weight contributions.', 'Integrative: data reduction, display, comparison, conclusion drawing.', 'Produces a model, framework or research agenda.'],
    output: 'A conceptual model or framework with propositions and an agenda.',
    reporting: 'Whittemore and Knafl\'s stages; PRISMA elements for the search.',
    time: '2–6 months', team: '1–3', suit: [1, 2, 3, 3],
    caution: 'Combining diverse designs needs explicit rules for how evidence of different quality is weighed.',
    refs: ['torraco2005', 'torraco2016', 'whittemore2005', 'elsbach2020'],
  },
  {
    id: 'critical', name: 'Critical review', family: 'traditional', short: 'Critical',
    one: 'Goes beyond description to evaluate the literature and develop a new argument or hypothesis.',
    purpose: `Show that the author has extensively researched the literature and critically evaluated its quality, resulting in a hypothesis or model rather than an answer ${cite('grant2009')}. Kraus et al. (2022) describe non-systematic reviews as essentially critical reviews shaped by the authors' exposure, expertise and experience.`,
    question: 'Problematising: "What assumptions underlie research on X, and are they justified?"',
    salsa: ['Seeks the most significant items in the field; not necessarily exhaustive.', 'No formal appraisal; evaluation of contribution is the core of the text.', 'Narrative, conceptual, chronological.', 'Identifies conceptual contributions and challenges assumptions.'],
    output: 'A position paper, hypothesis, model or set of new research questions.',
    reporting: 'No formal guideline.',
    time: '1–4 months', team: '1–2', suit: [0, 1, 2, 3],
    caution: 'Requires deep familiarity with the field; hard to do well early in a career.',
    refs: ['grant2009', 'alvesson2011', 'kraus2022'],
  },
  {
    id: 'stateart', name: 'State-of-the-art review', family: 'traditional', short: 'State of the art',
    one: 'Focuses on the most current research and where the frontier is heading.',
    purpose: `Offer a fresh perspective on recent developments and priorities for future research ${cite('grant2009')}.`,
    question: '"What is the current frontier of X and what comes next?"',
    salsa: ['Comprehensive for recent literature, often a short time window.', 'Usually none.', 'Narrative, often tabular.', 'Current state, priorities, likely directions.'],
    output: 'Overview of recent advances plus a forward-looking agenda.',
    reporting: 'No formal guideline.',
    time: '1–3 months', team: '1–3', suit: [1, 2, 2, 3],
    caution: 'Dates quickly; state the cut-off date clearly.',
    refs: ['grant2009'],
  },
  {
    id: 'semisys', name: 'Semi-systematic (meta-narrative) review', family: 'traditional', short: 'Semi-systematic',
    one: 'Maps how a topic has been conceptualised across research traditions over time.',
    purpose: `Useful for broad topics studied differently by groups of researchers; overviews research traditions and how they have progressed ${cite('snyder2019', 'wong2013')}.`,
    question: '"How has X been studied in different disciplines, and how do these traditions differ?"',
    salsa: ['Documented but flexible; follows research traditions rather than one exhaustive string.', 'Judged within each tradition.', 'Meta-narrative: storylines of each tradition.', 'Compares and contrasts traditions; explains differences.'],
    output: 'Storylines of research traditions and how they could be combined.',
    reporting: 'RAMESES publication standards for meta-narrative reviews.',
    time: '2–6 months', team: '1–3', suit: [1, 2, 3, 2],
    caution: 'Needs clear decisions about what counts as a tradition and why.',
    refs: ['snyder2019', 'wong2013'],
  },
  {
    id: 'slr', name: 'Systematic literature review (SLR)', family: 'systematic', short: 'SLR',
    one: 'Identifies, appraises and synthesises all relevant studies with an explicit, reproducible protocol.',
    purpose: `Answer a focused question transparently and with minimal bias. Originating in evidence-based medicine, adapted for management by Tranfield et al. (2003) and used across disciplines ${cite('tranfield2003', 'higgins2023', 'kraus2020')}.`,
    question: 'Focused, often framed with PICO, PICOC or SPIDER: "What is the evidence that X affects Y in context Z?"',
    salsa: ['Exhaustive, documented search across several databases plus snowballing.', 'Quality or risk-of-bias assessment with a recognised tool.', 'Narrative, tabular, thematic or quantitative (if meta-analysis).', 'What is known, what is not, recommendations for practice and research.'],
    output: 'Transparent synthesis, PRISMA flow diagram, evidence tables, research agenda.',
    reporting: 'PRISMA 2020; SPAR-4-SLR is common in business and management.',
    time: '6–18 months', team: '2+ (dual screening recommended)', suit: [1, 3, 3, 3],
    caution: 'Resource intensive; a narrow question and a protocol written in advance keep it manageable.',
    refs: ['tranfield2003', 'page2021', 'paul2021', 'kraus2020', 'okoli2015'],
  },
  {
    id: 'scoping', name: 'Scoping review', family: 'mapping', short: 'Scoping',
    one: 'Maps the extent, range and nature of research on a broad topic, usually without appraising quality.',
    purpose: `Clarify key concepts, identify the types of available evidence and gaps, and decide whether a full systematic review is feasible ${cite('arksey2005', 'levac2010', 'peters2020')}.`,
    question: 'Exploratory: "What is known about X, how has it been studied, and where are the gaps?" (PCC: Population, Concept, Context).',
    salsa: ['Comprehensive within time and scope limits; documented.', 'Usually not done (by design).', 'Charting: tables, maps, descriptive numerical summaries.', 'Characterises the quantity and quality of literature, gaps.'],
    output: 'Evidence map, charting tables, list of gaps and priorities.',
    reporting: 'PRISMA-ScR; JBI guidance.',
    time: '3–9 months', team: '2 recommended', suit: [2, 3, 3, 2],
    caution: 'Not suitable for answering "does it work?"; avoid drawing effectiveness conclusions.',
    refs: ['arksey2005', 'levac2010', 'peters2020', 'tricco2018'],
  },
  {
    id: 'map', name: 'Systematic map (mapping review)', family: 'mapping', short: 'Systematic map',
    one: 'Catalogues the evidence base on a broad question in a searchable database and visual map.',
    purpose: `Describe what evidence exists, where clusters and gaps are, and where a full review would be useful ${cite('james2016', 'grant2009')}.`,
    question: '"What evidence exists on X across contexts and designs?"',
    salsa: ['Systematic and documented, often very broad.', 'Usually none.', 'Coding of study characteristics into a database; graphical maps.', 'Gaps and clusters.'],
    output: 'Searchable database plus heat maps of evidence.',
    reporting: 'ROSES forms (environmental sciences) or PRISMA elements.',
    time: '6–12 months', team: '2+', suit: [0, 1, 2, 3],
    caution: 'Large coding effort; define the coding scheme before you start.',
    refs: ['james2016', 'grant2009'],
  },
  {
    id: 'bibliometric', name: 'Bibliometric review', family: 'mapping', short: 'Bibliometric',
    one: 'Uses quantitative analysis of publication and citation data to map a field\'s structure and evolution.',
    purpose: `Analyse large corpora (hundreds to thousands of documents) through performance analysis and science mapping such as co-citation, bibliographic coupling and co-word analysis ${cite('donthu2021', 'zupic2015', 'mukherjee2022')}.`,
    question: '"What is the intellectual, conceptual and social structure of the field of X, and how has it evolved?"',
    salsa: ['Database export (Scopus, Web of Science) with a documented query and cleaning.', 'Not of individual studies; data quality checks of records.', 'Networks, clusters, trend analysis.', 'Productive actors, themes, research fronts, gaps.'],
    output: 'Performance tables, science maps, thematic evolution, research agenda.',
    reporting: 'Donthu et al. (2021) guidelines; PRISMA flow for the data set.',
    time: '2–6 months', team: '1–3', suit: [1, 2, 3, 3],
    caution: 'Maps show structure, not meaning; combine with content analysis to interpret clusters.',
    refs: ['donthu2021', 'zupic2015', 'aria2017', 'vaneck2010', 'linnenluecke2020'],
  },
  {
    id: 'meta', name: 'Meta-analysis', family: 'quant', short: 'Meta-analysis',
    one: 'Statistically combines effect sizes from comparable studies into a pooled estimate with a confidence interval.',
    purpose: `Estimate the size and direction of an effect, how consistent it is across studies (heterogeneity), and what explains differences (moderators) ${cite('glass1976', 'borenstein2021', 'higgins2023')}.`,
    question: 'Quantitative: "How large is the effect of X on Y, and does it vary by Z?"',
    salsa: ['Exhaustive, including grey literature to limit publication bias.', 'Risk of bias assessed and used in sensitivity analysis; certainty with GRADE.', 'Statistical pooling: forest plots, heterogeneity, subgroups, meta-regression.', 'Pooled effect, prediction interval, moderators, bias checks.'],
    output: 'Pooled effect size, forest and funnel plots, sensitivity analyses, certainty rating.',
    reporting: 'PRISMA 2020; MARS (APA) in psychology; GRADE for certainty.',
    time: '6–18 months', team: '2+ with statistical support', suit: [0, 1, 3, 3],
    caution: 'Pooling incomparable studies ("apples and oranges") or few small biased studies can mislead.',
    refs: ['borenstein2021', 'lipsey2001', 'higgins2023', 'viechtbauer2010'],
  },
  {
    id: 'qes', name: 'Qualitative evidence synthesis', family: 'qual', short: 'Qualitative synthesis',
    one: 'Integrates findings from qualitative studies (thematic synthesis, meta-ethnography, meta-aggregation).',
    purpose: `Understand experiences, meanings, barriers and facilitators by translating concepts across qualitative studies ${cite('thomas2008', 'noblit1988')}.`,
    question: '"How do people experience X, and what shapes those experiences?" (SPIDER or SPICE framing).',
    salsa: ['Systematic, may use purposive sampling of studies.', 'Qualitative appraisal (CASP, JBI); confidence with GRADE-CERQual.', 'Thematic synthesis: coding, descriptive themes, analytical themes.', 'New interpretations, lines of argument.'],
    output: 'Analytical themes, conceptual model, implications for practice.',
    reporting: 'ENTREQ; eMERGe for meta-ethnography.',
    time: '6–12 months', team: '2+', suit: [0, 2, 3, 3],
    caution: 'Respect context: findings are interpretations, so keep links to the original quotes and settings.',
    refs: ['thomas2008', 'noblit1988', 'booth2022'],
  },
  {
    id: 'realist', name: 'Realist review', family: 'qual', short: 'Realist',
    one: 'Explains how and why complex interventions work (or not), for whom and in what circumstances.',
    purpose: `Build and test programme theories expressed as context-mechanism-outcome (CMO) configurations ${cite('pawson2005', 'wong2013')}.`,
    question: '"What works, for whom, in what circumstances, and why?"',
    salsa: ['Iterative and purposive, guided by the developing programme theory.', 'Relevance and rigour judged for each piece of evidence.', 'CMO configurations; theory refinement.', 'Refined programme theory and recommendations.'],
    output: 'Programme theory with CMO statements.',
    reporting: 'RAMESES publication standards.',
    time: '9–18 months', team: '2+ with content expertise', suit: [0, 1, 2, 3],
    caution: 'Demanding; requires training in realist logic.',
    refs: ['pawson2005', 'wong2013'],
  },
  {
    id: 'framework', name: 'Framework / theory-based review', family: 'qual', short: 'Framework-based',
    one: 'Organises the literature with a predefined framework such as TCCM or ADO to structure findings and agenda.',
    purpose: `Structure what is known and where to go next using frameworks such as Theory-Context-Characteristics-Methodology (TCCM) or Antecedents-Decisions-Outcomes (ADO) ${cite('paul2019', 'lim2021', 'paul2020')}.`,
    question: '"Which theories, contexts and methods have been used to study X, and what should future studies do?"',
    salsa: ['Systematic search, usually with an SLR protocol.', 'Often journal-quality filters; may include appraisal.', 'Coding into framework categories; frequency tables plus narrative.', 'Framework-structured agenda.'],
    output: 'Framework tables, integrated model, future research agenda by framework element.',
    reporting: 'SPAR-4-SLR; PRISMA 2020.',
    time: '4–9 months', team: '1–3', suit: [1, 3, 3, 3],
    caution: 'A framework can force-fit studies; justify why it suits the topic.',
    refs: ['paul2019', 'lim2021', 'paul2020', 'paul2021'],
  },
  {
    id: 'hybrid', name: 'Hybrid review (e.g., SLR + bibliometrics + meta-analysis)', family: 'quant', short: 'Hybrid',
    one: 'Combines methods, for example bibliometric mapping with a systematic content review.',
    purpose: `Use the strengths of several methods on one corpus: objective structure from bibliometrics, depth from content analysis, effect sizes from meta-analysis ${cite('kraus2022', 'linnenluecke2020')}.`,
    question: '"What is the structure of the field, what do its clusters say, and what is the overall effect?"',
    salsa: ['Systematic, documented, usually database export.', 'Depends on component methods.', 'Mixed: networks, themes, pooled estimates.', 'Multi-level insights plus agenda.'],
    output: 'Integrated findings across methods.',
    reporting: 'PRISMA 2020 plus the guideline of each component.',
    time: '6–12 months', team: '2+', suit: [0, 1, 3, 3],
    caution: 'Each method needs its own rigour; do not let one weaken the other.',
    refs: ['kraus2022', 'linnenluecke2020', 'donthu2021'],
  },
  {
    id: 'umbrella', name: 'Umbrella review (review of reviews)', family: 'speed', short: 'Umbrella',
    one: 'Synthesises existing systematic reviews and meta-analyses rather than primary studies.',
    purpose: `Summarise the evidence from multiple reviews on a broad question and highlight consistency or conflict ${cite('aromataris2015', 'grant2009')}.`,
    question: '"What do existing systematic reviews conclude about X?"',
    salsa: ['Searches for reviews only.', 'Appraisal of reviews with AMSTAR 2 or ROBIS.', 'Tabular and narrative, sometimes re-pooling.', 'Overall conclusions, conflicts, gaps between reviews.'],
    output: 'Overview of reviews with quality ratings.',
    reporting: 'PRIOR (Preferred Reporting Items for Overviews of Reviews); JBI guidance.',
    time: '4–9 months', team: '2+', suit: [0, 1, 2, 3],
    caution: 'Overlap of primary studies across reviews must be checked (e.g., corrected covered area).',
    refs: ['aromataris2015', 'shea2017'],
  },
  {
    id: 'rapid', name: 'Rapid review', family: 'speed', short: 'Rapid',
    one: 'A systematic review with streamlined steps to deliver evidence quickly, usually for decision makers.',
    purpose: `Provide timely evidence by limiting databases, dates, languages or using single screening with verification ${cite('garritty2021', 'grant2009')}.`,
    question: 'Focused and urgent: "What does the best available evidence say about X, now?"',
    salsa: ['Limited by time; restrictions reported.', 'Simplified or limited.', 'Narrative and tabular.', 'Overall evidence direction with stated limitations.'],
    output: 'Brief report or policy brief with explicit shortcuts.',
    reporting: 'Cochrane Rapid Reviews guidance; PRISMA 2020 adapted.',
    time: '2–12 weeks', team: '2+', suit: [1, 2, 1, 2],
    caution: 'Report every shortcut and its likely effect on the conclusions.',
    refs: ['garritty2021'],
  },
  {
    id: 'living', name: 'Living systematic review', family: 'speed', short: 'Living',
    one: 'A systematic review that is continually updated as new evidence appears.',
    purpose: `Keep a review current in fast-moving fields by searching and incorporating new studies at set intervals ${cite('elliott2014')}.`,
    question: 'Same as SLR or meta-analysis, but for a fast-moving evidence base.',
    salsa: ['Continuous or regular searches.', 'As for SLR.', 'Updated synthesis, often online.', 'Changing conclusions tracked over time.'],
    output: 'Continuously updated publication or online platform.',
    reporting: 'PRISMA 2020 plus update notes.',
    time: 'Ongoing', team: 'Stable team', suit: [0, 0, 1, 3],
    caution: 'Requires sustained resources and clear update triggers.',
    refs: ['elliott2014'],
  },
];

/* Step-by-step processes for each type: [title, what to do, typical tools] */
const S = {
  question: ['Define the question', 'Write a focused question and scope. Use a framework: PICO/PICOC (interventions), SPIDER or SPICE (qualitative), PCC (scoping).', 'Mind map, PICO worksheet'],
  protocol: ['Write and register a protocol', 'Specify question, eligibility criteria, databases, search string, screening, appraisal and synthesis plans before searching. Register it (PROSPERO for health, OSF Registries for others).', 'PRISMA-P, OSF, PROSPERO'],
  search: ['Search systematically', 'Combine synonyms with OR inside each concept and concepts with AND. Search at least two complementary databases plus snowballing; record dates and exact strings.', 'Scopus, Web of Science, discipline databases'],
  dedupe: ['Remove duplicates', 'Export records with abstracts and merge them; deduplicate before screening and record the number removed.', 'Zotero, EndNote, Rayyan'],
  screenTA: ['Screen titles and abstracts', 'Apply eligibility criteria. Ideally two reviewers independently, resolving conflicts; report agreement (Cohen\'s kappa).', 'Rayyan, Covidence, ASReview'],
  screenFT: ['Assess full texts', 'Retrieve full texts and decide inclusion; record a reason for every exclusion for the PRISMA diagram.', 'Reference manager, spreadsheet'],
  appraise: ['Appraise quality or risk of bias', 'Use a tool that matches the designs: RoB 2 (trials), ROBINS-I (non-randomised), CASP or JBI (qualitative), MMAT (mixed).', 'RoB 2, ROBINS-I, CASP, MMAT'],
  extract: ['Extract data', 'Use a piloted extraction form: bibliographic details, context, sample, design, theory, measures, findings. Double-check a sample.', 'Excel, Covidence, SRDR+'],
  synthNarr: ['Synthesise', 'Group studies by theme or framework, compare and explain differences, and judge the strength of evidence. Use SWiM if you synthesise effects without meta-analysis.', 'NVivo, concept matrix'],
  report: ['Report', 'Follow the reporting guideline, include the flow diagram, evidence tables, limitations and an agenda for research and practice.', 'PRISMA checklist, flow-diagram app'],
};

export const STEPS = {
  narrative: [
    ['Choose and bound the topic', 'Decide the purpose (background, overview, argument) and the boundaries: time span, disciplines, key concepts.', 'Mind map'],
    ['Search purposefully', 'Start from key reviews and seminal works, then follow citations backward and forward. Keep a search log even if informal.', 'Google Scholar, Scopus, citation chaining'],
    ['Read and take structured notes', 'For each source note the claim, evidence, method, context and how it relates to others.', 'Zotero notes, synthesis matrix'],
    ['Organise by themes or debates', 'Cluster sources into themes, schools of thought or chronological phases; avoid source-by-source summaries.', 'Concept matrix'],
    ['Write the argument', 'For each theme: describe briefly, compare and explain, then evaluate and state what it means for your question.', 'Outline'],
    ['Conclude with the gap', 'Show what is unresolved and how your study or the next studies should address it.', ''],
  ],
  integrative: [S.question, ['Search across literatures', 'Search empirical, theoretical and methodological work; document databases and strings.', 'Scopus, WoS, discipline databases'], S.screenFT, ['Evaluate data', 'Appraise each source with criteria suited to its design and record quality as a weighting variable.', 'MMAT, CASP'], ['Analyse: reduce, display, compare', 'Reduce data into categories, display them in matrices, compare across sources and iteratively draw conclusions (Whittemore & Knafl, 2005).', 'Matrices, NVivo'], ['Build the integrative framework', 'Propose a model or framework with propositions linking the integrated concepts.', 'Diagrams'], S.report],
  critical: [['Identify the debate', 'Pick a body of work and the assumptions it rests on.', ''], ['Read the core literature deeply', 'Select the most significant contributions and their critics.', 'Citation analysis'], ['Problematise', 'Identify and challenge underlying assumptions; ask what would change if they were wrong (Alvesson & Sandberg, 2011).', ''], ['Evaluate contributions', 'Assess the strength of arguments and evidence, and contradictions between them.', ''], ['Propose', 'Develop a new hypothesis, model or set of research questions.', ''], ['Write persuasively', 'Make the argument explicit and support each evaluative claim with sources.', '']],
  stateart: [['Fix the time window', 'Define "current" (e.g., last 3–5 years) and justify it.', ''], ['Search recent work', 'Databases, preprint servers and conference proceedings.', 'Scopus, arXiv, SSRN'], ['Group by research fronts', 'Identify the active questions and methods.', ''], ['Assess momentum', 'Which fronts are growing, saturating or emerging?', 'Publication counts'], ['Write the outlook', 'Priorities and likely directions, with a clear cut-off date.', '']],
  semisys: [['Map research traditions', 'Identify groups of researchers who study the topic differently.', 'Citation networks'], ['Search each tradition', 'Use tradition-specific terms and key papers.', ''], ['Appraise within traditions', 'Judge each study by the standards of its own tradition.', ''], ['Build storylines', 'Describe how each tradition developed and what it found.', ''], ['Compare and synthesise', 'Explain conflicts and complementarities between traditions.', ''], S.report],
  slr: [S.question, S.protocol, S.search, S.dedupe, S.screenTA, S.screenFT, S.appraise, S.extract, S.synthNarr, S.report],
  scoping: [['Identify the research question', 'Broad question framed with PCC (Population, Concept, Context) (Arksey & O\'Malley, 2005; Peters et al., 2020).', 'PCC'], ['Identify relevant studies', 'Comprehensive, documented search including grey literature.', 'Databases, Google Scholar, websites'], ['Select studies', 'Iterative, team-based selection with eligibility criteria refined as you learn.', 'Rayyan, Covidence'], ['Chart the data', 'Extract study characteristics into a charting form (piloted).', 'Excel'], ['Collate, summarise and report', 'Numerical summary of the evidence (where, when, how) and thematic overview; no quality appraisal by default.', 'Charts, evidence maps'], ['Consult stakeholders (optional)', 'Validate findings with practitioners or experts (Levac et al., 2010).', '']],
  map: [S.question, S.protocol, S.search, S.dedupe, S.screenTA, ['Code study characteristics', 'Code every included study by population, intervention, outcome, design, location.', 'Database, EPPI-Reviewer'], ['Visualise the map', 'Heat maps and interactive databases showing clusters and gaps.', 'EPPI-Mapper, Tableau'], S.report],
  bibliometric: [['Define the field and query', 'Set the scope and write a documented query; justify the database.', 'Scopus, Web of Science'], ['Export and clean data', 'Export full records with cited references; harmonise author names, keywords and sources.', 'bibliometrix, OpenRefine'], ['Performance analysis', 'Productivity and impact of authors, sources, countries and documents (counts, citations, h-index).', 'bibliometrix, Excel'], ['Science mapping', 'Co-citation (intellectual structure), bibliographic coupling (research fronts), co-word (conceptual structure), co-authorship (social structure).', 'VOSviewer, biblioshiny, CiteSpace'], ['Interpret clusters', 'Read the core papers of each cluster to name and interpret themes (content analysis).', ''], ['Agenda', 'Derive gaps and future research directions from cluster evolution.', '']],
  meta: [S.question, S.protocol, S.search, S.dedupe, S.screenTA, S.screenFT, S.appraise, ['Extract effect sizes', 'Extract or compute comparable effect sizes (Hedges\' g, log odds ratio, Fisher\'s z) with their variances; code moderators.', 'Review Lab tool below, metafor'], ['Pool and test heterogeneity', 'Random-effects model (REML, Hartung-Knapp CI), report tau², I², prediction interval.', 'metafor, JASP, Review Lab'], ['Explore and test robustness', 'Subgroups, meta-regression, leave-one-out, small-study effects (funnel plot, Egger, trim-and-fill).', 'metafor'], ['Rate certainty and report', 'GRADE certainty of evidence; PRISMA 2020 reporting with forest plots.', 'GRADEpro, PRISMA']],
  qes: [S.question, S.search, S.screenTA, S.screenFT, ['Appraise qualitative studies', 'CASP or JBI checklist; plan GRADE-CERQual for confidence in findings.', 'CASP, JBI'], ['Extract findings and quotes', 'Extract both participant quotes and authors\' interpretations.', 'NVivo, ATLAS.ti'], ['Line-by-line coding', 'Code the findings sections inductively (Thomas & Harden, 2008).', 'NVivo'], ['Develop descriptive themes', 'Group codes into themes that stay close to the primary studies.', ''], ['Generate analytical themes', 'Go beyond the primary studies to answer the review question.', ''], S.report],
  realist: [['Clarify scope and initial programme theory', 'Describe how the intervention is supposed to work.', ''], ['Search purposively for evidence', 'Iterative searches to test parts of the theory.', ''], ['Select and appraise', 'Judge relevance (does it inform the theory?) and rigour.', ''], ['Extract CMO data', 'Contexts, mechanisms and outcomes from each source.', ''], ['Synthesise and refine the theory', 'Build CMO configurations and refine the programme theory.', ''], ['Report with RAMESES', '', 'RAMESES']],
  framework: [S.question, S.search, S.screenTA, S.screenFT, ['Choose and justify the framework', 'TCCM, ADO, or a theory-derived framework; explain why it fits.', ''], ['Code into the framework', 'Code each study by framework element; count and describe.', 'Excel, NVivo'], ['Synthesise per element', 'Describe patterns in each element, explain links between elements.', ''], ['Agenda per element', 'Future research directions for theory, context, characteristics and method.', ''], S.report],
  hybrid: [S.question, S.search, S.dedupe, ['Bibliometric mapping', 'Performance analysis and science mapping of the full corpus.', 'VOSviewer, bibliometrix'], ['Select core studies', 'Select studies from each cluster for in-depth review.', ''], ['Content or meta-analysis', 'Thematic coding or effect-size pooling of the core set.', 'NVivo, metafor'], ['Integrate', 'Link structure (clusters) with content (themes, effects).', ''], S.report],
  umbrella: [S.question, ['Search for reviews', 'Databases and review registries; filter for systematic reviews and meta-analyses.', 'Cochrane Library, Epistemonikos'], S.screenTA, ['Appraise reviews', 'AMSTAR 2 or ROBIS.', 'AMSTAR 2'], ['Check overlap', 'Citation matrix of primary studies; corrected covered area.', ''], ['Synthesise conclusions', 'Tabulate results, compare conclusions, explain conflicts.', ''], S.report],
  rapid: [['Agree the question with users', 'Clarify the decision the evidence will support and the deadline.', ''], ['Streamline the protocol', 'Choose explicit shortcuts: fewer databases, date or language limits, single screening with verification.', ''], S.search, ['Screen efficiently', 'Single screening with a second reviewer checking a sample and all exclusions at full text.', 'Rayyan, ASReview'], ['Simplified appraisal and synthesis', 'Appraise key outcomes only; narrative and tabular synthesis.', ''], ['Report shortcuts', 'State limitations clearly for decision makers.', '']],
  living: [S.protocol, S.search, ['Set update triggers', 'Decide search frequency and what new evidence triggers re-analysis.', ''], ['Screen continuously', 'Automated alerts and machine learning prioritisation.', 'ASReview, alerts'], ['Update synthesis', 'Re-run meta-analysis or synthesis; track changes in conclusions.', ''], ['Publish versions', 'Versioned updates with change logs.', 'Online platform']],
};

/* Learning paths by level */
export const PATHS = {
  bachelor: {
    title: "Bachelor's students",
    where: 'A literature review chapter in a bachelor thesis, or a literature-based thesis.',
    expect: 'Show you can find, read, summarise and organise the main literature on a well-bounded topic, and connect it to your research question.',
    types: ['narrative', 'scoping', 'semisys'],
    scale: 'Typically 20–50 sources; often 15–25% of the thesis length. Your programme guide always takes precedence.',
    time: '4–8 weeks alongside other work',
    mix: { descriptive: 45, analytical: 40, evaluative: 15 },
    skills: ['Turn a topic into 2–3 searchable concepts and synonyms', 'Use Google Scholar and one subject database (e.g., Scopus) with Boolean operators', 'Keep references in Zotero from day one', 'Write by theme, not source by source', 'Paraphrase and cite correctly in APA 7'],
    mistakes: ['Annotated-bibliography style ("Smith said... Jones said...")', 'Too many quotations, too little explanation', 'Only recent or only web sources', 'No link back to your own research question'],
    next: 'Learn the basics of a documented search so your method section can explain how you found sources.',
    read: ['ridley2012', 'hart2018', 'fink2019'],
  },
  master: {
    title: "Master's students",
    where: 'A literature review chapter in a master thesis, or an SLR or scoping review as the thesis itself.',
    expect: 'Show a documented, reproducible search and a synthesis that compares and explains findings, leading to a clear gap and framework for your study.',
    types: ['slr', 'scoping', 'integrative', 'framework'],
    scale: 'Typically 40–100 sources; a review-based thesis may screen hundreds of records.',
    time: '2–4 months',
    mix: { descriptive: 30, analytical: 45, evaluative: 25 },
    skills: ['Frame the question with PICO, PICOC, SPIDER or PCC', 'Search 2+ databases, document strings and dates', 'Screen in Rayyan; report a PRISMA flow diagram', 'Appraise studies with CASP or MMAT', 'Build a concept matrix and thematic synthesis'],
    mistakes: ['Search not reproducible', 'Eligibility criteria changed silently', 'Synthesis that lists studies instead of comparing them', 'Claiming "no study has examined..." without a systematic search'],
    next: 'Consider publishing a good SLR thesis as an article with your supervisor.',
    read: ['xiao2019', 'okoli2015', 'siddaway2019', 'gough2017'],
  },
  phd: {
    title: 'PhD candidates',
    where: 'The dissertation literature review chapter(s), and often a standalone review article early in the doctorate.',
    expect: `Boote and Beile (2005) call doctoral candidates "scholars before researchers": the review must show mastery of the field, its methods and theories, and justify the significance of your work. Publishing a systematic review early builds both the dissertation and a publication record ${cite('pickering2014')}.`,
    types: ['slr', 'meta', 'bibliometric', 'framework', 'qes', 'integrative'],
    scale: 'Often 100–300+ included sources; thousands of screened records in a systematic review.',
    time: '6–12 months for a publishable SLR or meta-analysis',
    mix: { descriptive: 20, analytical: 45, evaluative: 35 },
    skills: ['Register a protocol (OSF, PROSPERO)', 'Dual screening with agreement statistics', 'Risk-of-bias tools and GRADE', 'Meta-analysis (random effects, heterogeneity, bias tests) where data allow', 'Bibliometric mapping to position your work', 'Theorising from the review'],
    mistakes: ['A review that summarises but makes no theoretical contribution', 'Scope too broad to finish', 'Single screening without checks', 'Outdated search by submission time (update before defence)'],
    next: 'Plan an update search shortly before submission and record it in the PRISMA diagram.',
    read: ['boote2005', 'randolph2009', 'pickering2014', 'booth2022'],
  },
  researcher: {
    title: 'Researchers and faculty',
    where: 'Standalone review articles, meta-analyses, evidence syntheses for policy and practice, and teaching.',
    expect: `Journals expect a clear contribution: an overview of current knowledge, an evaluation of knowledge progression, and a proposal for advancing knowledge ${cite('lim2022')}, and increasingly theory development ${cite('post2020', 'breslin2023')}. Review articles should be well-scoped, transparent and replicable ${cite('kraus2022', 'palmatier2018')}.`,
    types: ['meta', 'slr', 'hybrid', 'umbrella', 'living', 'realist', 'critical'],
    scale: 'Determined by question and method; quality over volume.',
    time: '6–18 months; living reviews ongoing',
    mix: { descriptive: 15, analytical: 45, evaluative: 40 },
    skills: ['Pre-registration and open materials (data, code, search strings)', 'PRISMA 2020, SPAR-4-SLR, PRISMA-ScR, RAMESES as appropriate', 'AMSTAR 2-ready conduct', 'Machine-learning-assisted screening with transparent stopping rules', 'Theory-building synthesis and research agendas'],
    mistakes: [`Redundant reviews on questions already answered ${cite('ioannidis2016')}`, 'Unreported deviations from protocol', 'Undisclosed use of AI tools', 'Weak contribution beyond description'],
    next: 'Use this platform in teaching: every simulation can be projected and explored live with students.',
    read: ['cooper1988', 'rousseau2008', 'denyer2009', 'hiebl2023', 'popay2006', 'kitchenham2007'],
  },
};

/* Synthesis levels */
export const SYNTH = {
  levels: [
    {
      id: 'descriptive', name: 'Descriptive', q: 'What did the studies do and find?',
      def: 'Reports the evidence accurately: who studied what, where, how, and with what results. It establishes the evidence base and makes the review transparent.',
      why: 'Readers need to know the shape of the evidence before they can trust any comparison or judgement. Too much description turns a review into a catalogue.',
      verbs: 'found, reported, examined, surveyed, defined, used, showed',
      ex: 'Smith (2019) surveyed 412 employees in Finland and found that remote work increased self-reported productivity, while Lee et al. (2021) reported lower team performance in a sample of 60 software teams.',
    },
    {
      id: 'analytical', name: 'Analytical', q: 'How do the studies relate, and why do they differ?',
      def: 'Relates studies to each other: compares, contrasts, groups them into themes and explains differences through methods, contexts, theories or mechanisms.',
      why: 'This is where synthesis creates new understanding that no single study offers. It is the core of most reviews at every level.',
      verbs: 'whereas, in contrast, taken together, this pattern suggests, one explanation is, depends on',
      ex: 'Taken together, the positive findings come from individual, self-reported measures, whereas negative effects appear when team-level outcomes are measured; this pattern suggests that remote work shifts benefits from teams to individuals.',
    },
    {
      id: 'evaluative', name: 'Evaluative', q: 'How good is the evidence, and what follows?',
      def: 'Judges the quality, credibility and significance of the evidence, weighs stronger against weaker studies, identifies gaps and argues for a position or next step.',
      why: 'Evaluation turns a synthesis into an argument and justifies your contribution. It must rest on the description and analysis you have already provided.',
      verbs: 'robust, limited by, the stronger evidence, overstates, remains unclear, should, therefore',
      ex: 'Because most studies rely on cross-sectional self-reports, the evidence for individual gains is weaker than it appears; longitudinal designs with objective output measures are needed before firms can rely on these findings.',
    },
  ],
  // recommended mix by review type: [descriptive, analytical, evaluative] (teaching heuristic)
  byType: [
    ['Scoping review / systematic map', [50, 35, 15], 'The aim is to map evidence, not to judge it; appraisal is usually omitted by design, so evaluative claims stay modest (Arksey & O\'Malley, 2005; Peters et al., 2020).'],
    ['Bibliometric review', [40, 45, 15], 'Performance analysis is descriptive; science mapping and cluster interpretation are analytical; evaluation is mainly in the agenda.'],
    ['Background chapter of an empirical thesis', [35, 40, 25], 'Enough description to define concepts and evidence, analysis to build the framework, evaluation to justify the gap your study fills.'],
    ['Systematic literature review', [25, 45, 30], 'Description of the corpus (tables), analytical thematic synthesis, evaluation of quality and gaps (Tranfield et al., 2003).'],
    ['Meta-analysis', [30, 35, 35], 'Study characteristics are described; pooling and moderators are analytical; risk of bias, heterogeneity and GRADE certainty are evaluative.'],
    ['Integrative / theory-building review', [20, 50, 30], 'The contribution is a new framework, which comes from integrating and explaining across studies (Torraco, 2016).'],
    ['Critical review', [15, 35, 50], 'The point is to evaluate and challenge assumptions (Grant & Booth, 2009; Alvesson & Sandberg, 2011).'],
  ],
  samples: {
    descriptive: 'Smith (2019) surveyed 412 employees in Finland and found that remote work increased self-reported productivity. Lee et al. (2021) examined 60 software teams and reported lower team performance after the switch to remote work. Garcia (2020) interviewed 25 managers, who described communication problems. Patel and Chen (2022) used firm-level data from 300 companies and showed no change in output.',
    balanced: 'Smith (2019) surveyed 412 employees in Finland and found that remote work increased self-reported productivity. However, Lee et al. (2021) reported lower team performance, which suggests that the level of analysis matters. Taken together, positive findings come from individual self-reports, whereas negative effects appear in team-level measures. Most studies rely on cross-sectional self-reported data, a limitation that weakens confidence in the individual gains. Future research should therefore use longitudinal designs with objective output measures.',
    evaluative: 'The evidence for productivity gains is weaker than often claimed. Most studies rely on cross-sectional self-reports, a design that is vulnerable to common method bias. The few robust longitudinal studies show smaller effects. Firms should therefore treat optimistic survey findings with caution, and future research must test team-level outcomes with objective data.',
  },
  openingTemplate: `The analysis proceeds at three levels of synthesis. <b>First</b>, a descriptive account (Section 4.1) maps the 68 included studies by year, country, design and theory, to show the shape of the evidence; this part is deliberately short (about one quarter of the analysis) because the tables carry most of the detail. <b>Second</b>, an analytical synthesis (Sections 4.2–4.4) groups findings into three themes and explains where and why results diverge; this is the largest part, because explaining divergence is the main contribution of the review. <b>Third</b>, an evaluative synthesis (Section 4.5) appraises the strength of the evidence with the Mixed Methods Appraisal Tool and identifies the gaps that motivate the research agenda.`,
};

/* Tools by stage: [stage, tool, access, use] */
export const TOOLS = [
  ['Plan and register', 'PRISMA-P checklist', 'Free', 'Structure of a review protocol'],
  ['Plan and register', 'OSF Registries / PROSPERO', 'Free', 'Time-stamped protocol registration (PROSPERO for health-related reviews)'],
  ['Search', 'Scopus, Web of Science', 'Subscription', 'Large multidisciplinary databases with export of full records and references'],
  ['Search', 'Discipline databases (PubMed, PsycINFO, ERIC, IEEE Xplore, ACM DL, Business Source Complete)', 'Free / subscription', 'Field-specific coverage'],
  ['Search', 'Google Scholar, OpenAlex, Semantic Scholar', 'Free', 'Supplementary searching and citation chaining; Google Scholar is not suited as a principal source for systematic searches (Gusenbauer & Haddaway, 2020)'],
  ['Reference management', 'Zotero, Mendeley, EndNote', 'Free / paid', 'Store, deduplicate and cite references'],
  ['Screening', 'Rayyan', 'Free tier', 'Blind dual screening, conflict resolution (Ouzzani et al., 2016)'],
  ['Screening', 'Covidence, EPPI-Reviewer, DistillerSR', 'Subscription', 'End-to-end review management'],
  ['Screening', 'ASReview', 'Free, open source', 'Machine-learning prioritised screening (van de Schoot et al., 2021)'],
  ['Appraisal', 'RoB 2, ROBINS-I, CASP, JBI, MMAT, AMSTAR 2', 'Free', 'Quality and risk-of-bias assessment by study design'],
  ['Certainty', 'GRADEpro / GRADE-CERQual', 'Free', 'Certainty of quantitative and qualitative evidence'],
  ['Extraction', 'Excel / Google Sheets, SRDR+', 'Free', 'Piloted extraction forms and concept matrices'],
  ['Qualitative synthesis', 'NVivo, ATLAS.ti, MAXQDA, Taguette', 'Paid / free (Taguette)', 'Coding and thematic synthesis'],
  ['Meta-analysis', 'R: metafor, meta', 'Free', 'Reference implementation of meta-analytic models (Viechtbauer, 2010)'],
  ['Meta-analysis', 'JASP, jamovi (MAJOR)', 'Free', 'Point-and-click meta-analysis built on metafor'],
  ['Meta-analysis', 'Python: statsmodels, Review Lab engine', 'Free', 'Scriptable analysis; this site\'s engine runs in your browser'],
  ['Meta-analysis', 'Stata meta, Comprehensive Meta-Analysis, RevMan', 'Paid / free (RevMan for Cochrane)', 'Established meta-analysis software'],
  ['Bibliometrics', 'VOSviewer, bibliometrix / biblioshiny, CiteSpace', 'Free', 'Performance analysis and science mapping (van Eck & Waltman, 2010; Aria & Cuccurullo, 2017)'],
  ['Reporting', 'PRISMA 2020 flow-diagram app', 'Free', 'Interactive flow diagrams (Haddaway et al., 2022)'],
  ['AI assistance', 'Elicit, Research Rabbit, Connected Papers, LLM assistants', 'Free / paid', 'Discovery and summarising support; verify every claim and disclose use'],
];

/* Finder: questions and scoring */
export const FINDER = {
  questions: [
    { id: 'aim', q: 'What is the main aim?', opts: [
      ['background', 'Background and framework for my own empirical study'],
      ['summarise', 'Summarise and interpret what is known about a topic'],
      ['map', 'Map what research exists, how it was done, and the gaps'],
      ['effect', 'Estimate how large an effect is, and whether it varies'],
      ['experience', 'Understand experiences, meanings or perceptions'],
      ['how', 'Explain how and why interventions work in different contexts'],
      ['structure', 'Show the structure and evolution of a whole field'],
      ['theory', 'Build or extend theory or a framework'],
      ['fast', 'Give decision makers evidence quickly'],
      ['reviews', 'Compare conclusions of existing reviews'],
    ] },
    { id: 'evidence', q: 'What kind of studies will you mostly include?', opts: [
      ['quant', 'Quantitative studies reporting comparable effects'], ['qual', 'Qualitative studies'], ['mixed', 'A mix of designs'], ['any', 'Not sure yet / any'],
    ] },
    { id: 'size', q: 'How much literature is there?', opts: [
      ['small', 'Small: fewer than about 50 studies'], ['medium', 'Medium: 50 to a few hundred'], ['large', 'Large: hundreds to thousands'], ['unknown', 'I do not know yet'],
    ] },
    { id: 'time', q: 'How much time do you have?', opts: [
      ['weeks', 'A few weeks'], ['months', '1–3 months'], ['long', '3–12 months'], ['ongoing', 'Ongoing'],
    ] },
    { id: 'team', q: 'Who will do the work?', opts: [['alone', 'Just me'], ['team', 'Two or more reviewers']] },
    { id: 'output', q: 'What will it become?', opts: [['chapter', 'A chapter of a thesis or dissertation'], ['article', 'A standalone review article'], ['brief', 'A report or policy brief']] },
  ],
  // score contributions: answer -> {type: points}
  scores: {
    aim: {
      background: { narrative: 4, integrative: 2, semisys: 2, slr: 2, scoping: 1, framework: 1 },
      summarise: { narrative: 3, slr: 3, semisys: 2, stateart: 2, framework: 1 },
      map: { scoping: 5, map: 4, bibliometric: 2 },
      effect: { meta: 6, slr: 2, living: 1 },
      experience: { qes: 6, slr: 1 },
      how: { realist: 6, qes: 1 },
      structure: { bibliometric: 6, hybrid: 3, semisys: 1 },
      theory: { integrative: 5, critical: 3, framework: 3, qes: 1 },
      fast: { rapid: 6 },
      reviews: { umbrella: 6 },
    },
    evidence: { quant: { meta: 2, slr: 1 }, qual: { qes: 2, realist: 1, meta: -6 }, mixed: { integrative: 2, slr: 1, framework: 1, meta: -2 }, any: {} },
    size: { small: { meta: 0, bibliometric: -4, narrative: 1 }, medium: { slr: 1, framework: 1 }, large: { bibliometric: 3, hybrid: 2, scoping: 1, map: 1, narrative: -1 }, unknown: { scoping: 1 } },
    time: { weeks: { narrative: 2, rapid: 3, slr: -3, meta: -3, map: -3, realist: -3, living: -5 }, months: { scoping: 1, bibliometric: 1, framework: 1, meta: -1, realist: -2 }, long: { slr: 1, meta: 1, qes: 1 }, ongoing: { living: 5 } },
    team: { alone: { slr: -1, meta: -1, map: -2, living: -2, narrative: 1, bibliometric: 1, critical: 1 }, team: { slr: 1, meta: 1, scoping: 1, map: 1 } },
    output: { chapter: { narrative: 1, slr: 1, scoping: 1 }, article: { slr: 1, meta: 1, bibliometric: 1, framework: 1, integrative: 1, critical: 1 }, brief: { rapid: 2, umbrella: 1 } },
  },
};

/* Illustrative and real datasets for the meta-analysis lab */
export const DATASETS = {
  bcg: {
    name: 'BCG vaccine trials (log risk ratio)', measure: 'logRR', kind: 'rr', real: true,
    note: 'Classic teaching dataset of 13 trials on BCG vaccine and tuberculosis (Colditz et al., 1994), as used in metafor. Negative values mean the vaccine reduced risk; the strong heterogeneity is a famous example of why random-effects models matter.',
    cols: ['Study', 'Year', 'Vaccinated: TB', 'Vaccinated: n', 'Control: TB', 'Control: n'],
    rows: [
      ['Aronson', 1948, 4, 123, 11, 139], ['Ferguson & Simes', 1949, 6, 306, 29, 303], ['Rosenthal et al.', 1960, 3, 231, 11, 220],
      ['Hart & Sutherland', 1977, 62, 13598, 248, 12867], ['Frimodt-Moller et al.', 1973, 33, 5069, 47, 5808], ['Stein & Aronson', 1953, 180, 1541, 372, 1451],
      ['Vandiviere et al.', 1973, 8, 2545, 10, 629], ['TPT Madras', 1980, 505, 88391, 499, 88391], ['Coetzee & Berjak', 1968, 29, 7499, 45, 7277],
      ['Rosenthal et al.', 1961, 17, 1716, 65, 1665], ['Comstock et al.', 1974, 186, 50634, 141, 27338], ['Comstock & Webster', 1969, 5, 2498, 3, 2341],
      ['Comstock et al.', 1976, 27, 16913, 29, 17854],
    ],
  },
  remote: {
    name: 'Remote work and productivity (Hedges\' g, illustrative)', measure: 'g', kind: 'smd', real: false,
    note: 'Invented data for teaching: 12 two-group studies comparing remote and office workers on a productivity scale. Not real studies.',
    cols: ['Study', 'Year', 'Remote: mean', 'Remote: SD', 'Remote: n', 'Office: mean', 'Office: SD', 'Office: n'],
    rows: [
      ['Study A', 2016, 3.62, 0.81, 48, 3.41, 0.85, 52], ['Study B', 2017, 3.90, 0.72, 120, 3.70, 0.75, 118], ['Study C', 2018, 3.30, 0.90, 35, 3.45, 0.88, 33],
      ['Study D', 2019, 3.75, 0.70, 210, 3.55, 0.74, 205], ['Study E', 2020, 3.88, 0.95, 26, 3.32, 0.92, 24], ['Study F', 2020, 3.50, 0.80, 300, 3.43, 0.79, 310],
      ['Study G', 2021, 4.02, 0.85, 22, 3.48, 0.90, 20], ['Study H', 2021, 3.61, 0.77, 95, 3.52, 0.80, 98], ['Study I', 2022, 3.95, 1.00, 18, 3.30, 0.98, 19],
      ['Study J', 2022, 3.58, 0.74, 160, 3.50, 0.76, 158], ['Study K', 2023, 3.70, 0.82, 64, 3.48, 0.84, 61], ['Study L', 2023, 3.40, 0.88, 140, 3.44, 0.86, 142],
    ],
  },
  dt: {
    name: 'Digital transformation and firm performance (correlations, illustrative)', measure: 'r (Fisher z)', kind: 'r', real: false,
    note: 'Invented data for teaching: 10 survey studies reporting the correlation between digital transformation maturity and firm performance. Pooled on Fisher\'s z and back-transformed to r.',
    cols: ['Study', 'Year', 'r', 'n'],
    rows: [['Study 1', 2017, 0.31, 180], ['Study 2', 2018, 0.22, 240], ['Study 3', 2019, 0.45, 95], ['Study 4', 2019, 0.18, 410], ['Study 5', 2020, 0.38, 150], ['Study 6', 2021, 0.27, 320], ['Study 7', 2021, 0.52, 60], ['Study 8', 2022, 0.15, 500], ['Study 9', 2023, 0.34, 210], ['Study 10', 2023, 0.29, 275]],
  },
};

export const PY_EXAMPLES = {
  meta: {
    label: 'Random-effects meta-analysis (BCG trials)',
    code: `import review_lab as rl

yi, vi, labels = rl.bcg_effects()          # log risk ratios and variances
res = rl.meta_analysis(yi, vi, method="REML", hksj=True)

print(f"k = {res['k']} trials, model = {res['method']}")
print(f"pooled log RR = {res['estimate']:.3f}  95% CI [{res['ci'][0]:.3f}, {res['ci'][1]:.3f}]")
import math
print(f"pooled risk ratio = {math.exp(res['estimate']):.2f}")
print(f"tau^2 = {res['tau2']:.3f},  I^2 = {res['I2']:.1f}%,  Q({res['df']}) = {res['Q']:.1f}")
lo, hi = res['pi']
print(f"95% prediction interval for a new trial: RR {math.exp(lo):.2f} to {math.exp(hi):.2f}")
print("Egger test:", {k: round(v, 3) for k, v in rl.egger_test(yi, vi).items()})`,
  },
  bias: {
    label: 'What if journals only publish significant results?',
    code: `import review_lab as rl

for bias in (0.0, 0.5, 0.9):
    sim = rl.simulate_studies(k=30, mu=0.10, tau=0.05, bias=bias, seed=7)
    pub = sim["published"]
    est = rl.meta_analysis([s["yi"] for s in pub], [s["vi"] for s in pub])["estimate"]
    print(f"bias={bias:.1f}: pooled g of published studies = {est:.3f} "
          f"(true mean 0.10), studies left in the file drawer: {len(sim['drawer'])}")`,
  },
  es: {
    label: 'Convert reported statistics to effect sizes',
    code: `import review_lab as rl

g, v = rl.es_hedges_g(m1=3.9, sd1=0.8, n1=40, m2=3.5, sd2=0.9, n2=42)
print(f"Hedges' g = {g:.3f}, variance = {v:.4f}")

z, vz = rl.es_fisher_z(r=0.32, n=150)
print(f"Fisher z = {z:.3f}, variance = {vz:.4f}, back to r = {rl.z_to_r(z):.2f}")

lor, vor = rl.es_log_or(a=12, b=88, c=25, d=75)
print(f"log odds ratio = {lor:.3f}, variance = {vor:.4f}")`,
  },
  kappa: {
    label: "Screening agreement (Cohen's kappa)",
    code: `import review_lab as rl

# 1 = include, 0 = exclude for the same 20 abstracts
reviewer_a = [1,0,0,1,1,0,0,0,1,0, 0,1,0,0,1,0,0,1,0,0]
reviewer_b = [1,0,0,1,0,0,0,0,1,0, 1,1,0,0,1,0,0,1,0,0]
print(rl.cohen_kappa(reviewer_a, reviewer_b))`,
  },
  own: {
    label: 'Your own data (edit me)',
    code: `import review_lab as rl

# effect sizes (e.g., Hedges' g) and their variances from your extraction sheet
yi = [0.30, 0.12, 0.45, 0.20, 0.05, 0.38]
vi = [0.04, 0.02, 0.09, 0.03, 0.01, 0.06]
res = rl.meta_analysis(yi, vi, method="REML")
for key in ("estimate", "ci", "tau2", "I2", "pi"):
    print(key, "=", res[key])`,
  },
};
