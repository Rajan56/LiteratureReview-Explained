// 3D co-word knowledge map (illustrative data) to teach science mapping:
// node size = keyword frequency, colour = cluster or average publication year, links = co-occurrence.
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';

export const CLUSTERS = [
  { name: 'Enabling technologies', color: '#58a6ff', c: [-5, 1.5, 0] },
  { name: 'Sustainability performance', color: '#5fc27e', c: [4.5, 2, -1] },
  { name: 'Performance management', color: '#f2b84b', c: [0.5, -3, 2.5] },
  { name: 'Human-centric Industry 5.0', color: '#e46fa8', c: [-1.5, 3, -4.5] },
];
// [keyword, cluster, frequency, average publication year]
const NODES = [
  ['digital twin', 0, 96, 2021.8], ['Internet of Things', 0, 88, 2019.6], ['artificial intelligence', 0, 74, 2021.4], ['big data analytics', 0, 52, 2019.1],
  ['cloud computing', 0, 30, 2018.2], ['blockchain', 0, 26, 2020.3], ['cyber-physical systems', 0, 41, 2018.6], ['machine learning', 0, 45, 2021.9],
  ['circular economy', 1, 70, 2021.2], ['energy efficiency', 1, 48, 2019.9], ['carbon emissions', 1, 39, 2022.1], ['life cycle assessment', 1, 28, 2020.7],
  ['ESG reporting', 1, 22, 2022.8], ['sustainable manufacturing', 1, 55, 2020.4], ['twin transition', 1, 18, 2023.4],
  ['performance measurement', 2, 60, 2019.3], ['key performance indicators', 2, 44, 2020.1], ['dynamic capabilities', 2, 38, 2020.9], ['business model innovation', 2, 35, 2020.5],
  ['supply chain', 2, 57, 2020.2], ['decision support', 2, 31, 2021.0], ['maturity model', 2, 24, 2019.8],
  ['Industry 5.0', 3, 40, 2023.1], ['human-robot collaboration', 3, 29, 2022.3], ['workforce skills', 3, 33, 2021.5], ['change management', 3, 21, 2020.6],
  ['resilience', 3, 36, 2022.6], ['human-centricity', 3, 19, 2023.2],
];
// a few strong bridges between clusters
const BRIDGES = [['digital twin', 'sustainable manufacturing', 22], ['digital twin', 'performance measurement', 18], ['Internet of Things', 'energy efficiency', 16], ['artificial intelligence', 'decision support', 15],
  ['circular economy', 'business model innovation', 14], ['Industry 5.0', 'twin transition', 13], ['dynamic capabilities', 'resilience', 12], ['big data analytics', 'supply chain', 14],
  ['key performance indicators', 'ESG reporting', 11], ['digital twin', 'human-robot collaboration', 10], ['machine learning', 'carbon emissions', 9], ['workforce skills', 'maturity model', 8]];

function rng(seed) { let a = seed; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export class KnowledgeMap {
  constructor(container, info, { reducedMotion = false } = {}) {
    this.container = container;
    this.info = info;
    this.ok = true;
    try { this.renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { this.ok = false; return; }
    const r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(r.domElement);
    r.domElement.setAttribute('aria-hidden', 'true');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1424);
    this.camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 200);
    this.camera.position.set(0, 3, 17);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = !reducedMotion;
    this.controls.autoRotateSpeed = 0.5;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x223, 1.2));
    const l = new THREE.PointLight(0xffffff, 60, 80);
    l.position.set(6, 10, 10);
    this.scene.add(l);

    const rand = rng(42);
    this.nodes = NODES.map(([name, cl, f, yr], i) => {
      const c = CLUSTERS[cl].c;
      const sp = 2.6;
      const pos = new THREE.Vector3(c[0] + (rand() - 0.5) * sp * 2, c[1] + (rand() - 0.5) * sp * 1.6, c[2] + (rand() - 0.5) * sp * 2);
      return { name, cl, f, yr, pos, i };
    });
    // edges: within-cluster co-occurrence plus bridges
    const idx = Object.fromEntries(this.nodes.map((n) => [n.name, n]));
    this.edges = [];
    this.nodes.forEach((a, i) => this.nodes.forEach((b, j) => {
      if (j <= i || a.cl !== b.cl) return;
      const w = Math.round(Math.sqrt(a.f * b.f) / 6 * (0.5 + rand()));
      if (w >= 5) this.edges.push({ a, b, w });
    }));
    BRIDGES.forEach(([x, y, w]) => this.edges.push({ a: idx[x], b: idx[y], w }));
    this.nodes.forEach((n) => { n.links = this.edges.filter((e) => e.a === n || e.b === n); n.strength = n.links.reduce((s, e) => s + e.w, 0); });

    this.group = new THREE.Group();
    this.scene.add(this.group);
    const sphere = new THREE.SphereGeometry(1, 28, 18);
    this.meshes = this.nodes.map((n) => {
      const m = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ color: CLUSTERS[n.cl].color, roughness: 0.35, metalness: 0.1, emissive: CLUSTERS[n.cl].color, emissiveIntensity: 0.15 }));
      const s = 0.18 + Math.sqrt(n.f) * 0.055;
      m.scale.setScalar(s);
      m.position.copy(n.pos);
      m.userData.node = n;
      this.group.add(m);
      n.mesh = m;
      n.label = this.label(n.name);
      n.label.position.copy(n.pos).add(new THREE.Vector3(0, s + 0.15, 0));
      this.group.add(n.label);
      return m;
    });
    const pos = [];
    const cols = [];
    this.edges.forEach((e) => {
      pos.push(...e.a.pos.toArray(), ...e.b.pos.toArray());
      const ca = new THREE.Color(CLUSTERS[e.a.cl].color), cb = new THREE.Color(CLUSTERS[e.b.cl].color);
      const k = Math.min(1, e.w / 25);
      cols.push(ca.r * k, ca.g * k, ca.b * k, cb.r * k, cb.g * k, cb.b * k);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 }));
    this.group.add(this.lines);
    this.hiLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff }));
    this.group.add(this.hiLines);

    this.ray = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    r.domElement.addEventListener('pointermove', (ev) => this.hover(ev));
    r.domElement.addEventListener('click', (ev) => { this.hover(ev, true); });
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.colorBy = 'cluster';
    this.visible = new Set(CLUSTERS.map((_, i) => i));
  }

  label(text) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const font = '600 40px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 16;
    c.width = w; c.height = 52;
    ctx.font = font;
    ctx.fillStyle = 'rgba(15,20,36,0.6)';
    ctx.fillRect(0, 0, w, 52);
    ctx.fillStyle = '#eef2ff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 8, 28);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.center.set(0.5, 0);
    sp.scale.set((0.42 * w) / 52, 0.42, 1);
    return sp;
  }

  setColorBy(mode) {
    this.colorBy = mode;
    this.nodes.forEach((n) => {
      let col;
      if (mode === 'year') {
        const t = Math.max(0, Math.min(1, (n.yr - 2018) / 5.5));
        col = new THREE.Color().setHSL(0.62 - 0.55 * t, 0.75, 0.55);
      } else col = new THREE.Color(CLUSTERS[n.cl].color);
      n.mesh.material.color.copy(col);
      n.mesh.material.emissive.copy(col);
    });
  }

  toggleCluster(i, on) {
    if (on) this.visible.add(i); else this.visible.delete(i);
    this.nodes.forEach((n) => { const v = this.visible.has(n.cl); n.mesh.visible = v; n.label.visible = v; });
    const pos = [];
    const cols = [];
    this.edges.forEach((e) => {
      if (!this.visible.has(e.a.cl) || !this.visible.has(e.b.cl)) return;
      pos.push(...e.a.pos.toArray(), ...e.b.pos.toArray());
      const ca = new THREE.Color(CLUSTERS[e.a.cl].color), cb = new THREE.Color(CLUSTERS[e.b.cl].color);
      const k = Math.min(1, e.w / 25);
      cols.push(ca.r * k, ca.g * k, ca.b * k, cb.r * k, cb.g * k, cb.b * k);
    });
    this.lines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.lines.geometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  }

  select(n) {
    this.sel = n;
    const pos = [];
    if (n) n.links.forEach((e) => pos.push(...e.a.pos.toArray(), ...e.b.pos.toArray()));
    this.hiLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.nodes.forEach((m) => { m.mesh.material.emissiveIntensity = n && (m === n || n.links.some((e) => e.a === m || e.b === m)) ? 0.75 : 0.15; });
    if (n && this.info) {
      const top = n.links.slice().sort((a, b) => b.w - a.w).slice(0, 5).map((e) => `${(e.a === n ? e.b : e.a).name} (${e.w})`).join(', ');
      this.info.innerHTML = `<b>${n.name}</b>: ${n.f} documents, average year ${n.yr.toFixed(1)}, cluster “${CLUSTERS[n.cl].name}”, total link strength ${n.strength}.<br>Strongest co-occurrences: ${top}.`;
    }
  }

  selectByName(name) { this.select(this.nodes.find((n) => n.name === name)); }

  hover(ev, click = false) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.mouse, this.camera);
    const hit = this.ray.intersectObjects(this.meshes.filter((m) => m.visible))[0];
    this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
    if (click) { this.select(hit ? hit.object.userData.node : null); this.controls.autoRotate = false; }
  }

  resize() {
    const w = this.container.clientWidth || 600, h = this.container.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.position.setLength(w / h < 1 ? 26 : 17);
    this.camera.updateProjectionMatrix();
  }

  frame() {
    if (!this.ok) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  get keywords() { return this.nodes.map((n) => n.name).sort(); }
}
