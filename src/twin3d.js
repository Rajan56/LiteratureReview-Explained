// Review Process Digital Twin: the 3D view.
// Each review stage is a modelled station on a production line. Records travel on a conveyor,
// are rejected into bins in the same proportions as the model, and the included studies
// end in the knowledge crystal. A timeline mode replays the project week by week.
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { STAGES, DBS } from './twin-model.js';

const GAP = 3.7;
const X0 = -((STAGES.length - 1) * GAP) / 2;
const BELT_Y = 0.42;
const MAX_P = 700;

const C = {
  bg: 0x0f1424, floor: 0x161c30, grid1: 0x2c3658, grid2: 0x1d2440, metal: 0x3a4466, metalDark: 0x262e4a,
  accent: 0x42c6b0, gold: 0xf2b84b, red: 0xff6b5a, blue: 0x5aa2ff, idle: 0x5d6684, white: 0xeef2ff,
};

export class TwinStage {
  constructor(container, { reducedMotion = false } = {}) {
    this.container = container;
    this.reducedMotion = reducedMotion;
    this.ok = true;
    try { this.renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { this.ok = false; return; }
    const r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(r.domElement);
    r.domElement.setAttribute('aria-hidden', 'true');

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(C.bg);
    this.scene.fog = new THREE.Fog(C.bg, 30, 60);
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 200);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 55;

    this.scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x10131f, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.7);
    sun.position.set(8, 16, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 12, bottom: -12, near: 1, far: 50 });
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x6fb6ff, 0.6);
    rim.position.set(-10, 6, -10);
    this.scene.add(rim);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const grid = new THREE.GridHelper(40, 40, C.grid1, C.grid2);
    grid.position.y = 0.003;
    this.scene.add(grid);

    this.mat = {
      metal: new THREE.MeshStandardMaterial({ color: C.metal, metalness: 0.55, roughness: 0.45 }),
      dark: new THREE.MeshStandardMaterial({ color: C.metalDark, metalness: 0.4, roughness: 0.6 }),
      accent: new THREE.MeshStandardMaterial({ color: C.accent, emissive: C.accent, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.4 }),
      gold: new THREE.MeshStandardMaterial({ color: C.gold, emissive: C.gold, emissiveIntensity: 0.5, metalness: 0.5, roughness: 0.3 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x8fd6ff, transparent: true, opacity: 0.28, emissive: 0x2a6f9a, emissiveIntensity: 0.6, roughness: 0.1, side: THREE.DoubleSide }),
      paper: new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.8 }),
      binFill: new THREE.MeshStandardMaterial({ color: 0x8b93ad, roughness: 0.8 }),
    };

    this.buildBelt();
    this.stations = STAGES.map((s, i) => this.buildStation(s, i));
    this.dbGroup = new THREE.Group();
    this.scene.add(this.dbGroup);

    // records
    this.recMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.12, 0.2), new THREE.MeshStandardMaterial({ roughness: 0.6 }), MAX_P);
    this.recMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.recMesh.count = 0;
    this.recMesh.castShadow = true;
    this.recMesh.frustumCulled = false;
    this.scene.add(this.recMesh);
    this.parts = [];
    this.spawnAcc = 0;
    this._d = new THREE.Object3D();
    this._c = new THREE.Color();

    this.mode = 'live';
    this.week = 0;
    this.time = 0;
    this.setView('angle');
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  // ------------------------------------------------------------------ construction
  label(text, { size = 0.38, color = '#eef2ff', bg = 'rgba(15,20,36,0.78)', align = 0.5 } = {}) {
    const canvas = document.createElement('canvas');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.center.set(align, 0);
    sp.userData = { canvas, tex, size, color, bg };
    this.setText(sp, text);
    return sp;
  }

  setText(sp, text) {
    if (sp.userData.text === text) return;
    sp.userData.text = text;
    const { canvas, tex, size, color, bg } = sp.userData;
    const lines = String(text).split('\n');
    const ctx = canvas.getContext('2d');
    const px = 54;
    const font = (i) => `${i === 0 ? 700 : 500} ${i === 0 ? px : px * 0.82}px "Atkinson Hyperlegible", system-ui, sans-serif`;
    let w = 0;
    lines.forEach((l, i) => { ctx.font = font(i); w = Math.max(w, ctx.measureText(l).width); });
    const W = Math.ceil(w) + 40, H = Math.ceil(px * 1.25 * lines.length + 24);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; tex.dispose(); } else ctx.clearRect(0, 0, W, H);
    if (bg) { ctx.fillStyle = bg; rr(ctx, 0, 0, W, H, 18); ctx.fill(); }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => { ctx.font = font(i); ctx.fillStyle = i === 0 ? color : '#aab3d1'; ctx.fillText(l, W / 2, 14 + i * px * 1.22); });
    tex.needsUpdate = true;
    const h = size * lines.length * 1.25 + size * 0.5;
    sp.scale.set((h * W) / H, h, 1);
  }

  buildBelt() {
    const len = (STAGES.length - 1) * GAP + 2.4;
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 32;
    const g = canvas.getContext('2d');
    g.fillStyle = '#1b2236'; g.fillRect(0, 0, 256, 32);
    g.fillStyle = '#2d3756';
    for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 14, 32);
    this.beltTex = new THREE.CanvasTexture(canvas);
    this.beltTex.wrapS = THREE.RepeatWrapping;
    this.beltTex.repeat.set(len / 1.2, 1);
    this.beltTex.colorSpace = THREE.SRGBColorSpace;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.7), [this.mat.dark, this.mat.dark, new THREE.MeshStandardMaterial({ map: this.beltTex, roughness: 0.7 }), this.mat.dark, this.mat.dark, this.mat.dark]);
    belt.position.set(0, BELT_Y - 0.1, 0);
    belt.receiveShadow = true;
    this.scene.add(belt);
    for (const z of [-0.4, 0.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), this.mat.metal);
      rail.position.set(0, BELT_Y - 0.02, z);
      this.scene.add(rail);
    }
    for (let x = -len / 2 + 0.6; x < len / 2; x += 2.2) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, BELT_Y - 0.12, 0.6), this.mat.metal);
      leg.position.set(x, (BELT_Y - 0.12) / 2, 0);
      this.scene.add(leg);
    }
  }

  buildStation(stage, i) {
    const g = new THREE.Group();
    const x = X0 + i * GAP;
    g.position.set(x, 0, -1.55);
    this.scene.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 2.0), this.mat.dark);
    base.position.y = 0.09;
    base.receiveShadow = true;
    base.castShadow = true;
    g.add(base);
    const statusMat = new THREE.MeshStandardMaterial({ color: C.idle, emissive: C.idle, emissiveIntensity: 0.6 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.05, 8, 48), statusMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    g.add(ring);
    const machine = this.machine(stage.id);
    machine.position.y = 0.18;
    machine.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.add(machine);

    // reject bin in front of the belt
    const bin = new THREE.Group();
    bin.position.set(x + 0.9, 0, 1.55);
    this.scene.add(bin);
    const walls = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.52, 0.8, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x45506f, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }));
    walls.position.y = 0.4;
    bin.add(walls);
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 1, 20), this.mat.binFill);
    fill.position.y = 0.01;
    fill.scale.y = 0.001;
    bin.add(fill);
    bin.visible = !['search', 'extract', 'synth'].includes(stage.id);

    const tag = this.label(stage.short, { size: 0.34 });
    tag.position.set(0, 2.85, 0);
    g.add(tag);
    const binTag = this.label('0', { size: 0.26, bg: 'rgba(15,20,36,0.7)', color: '#ffb4a8' });
    binTag.position.set(0, 0.95, 0);
    bin.add(binTag);

    const avatars = new THREE.Group();
    g.add(avatars);
    return { stage, g, x, ring, statusMat, machine, bin, fill, tag, binTag, avatars };
  }

  machine(id) {
    const m = new THREE.Group();
    const M = this.mat;
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); m.add(o); return o; };
    if (id === 'search') {
      // hopper funnel that collects records from database towers
      add(new THREE.CylinderGeometry(0.9, 0.25, 1.0, 28, 1, true), M.glass, 0, 1.25, 0.35);
      add(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 16), M.metal, 0, 0.5, 0.35);
      add(new THREE.TorusGeometry(0.9, 0.04, 8, 32), M.accent, 0, 1.75, 0.35, Math.PI / 2);
    } else if (id === 'dedupe') {
      add(new THREE.BoxGeometry(1.5, 1.0, 1.1), M.metal, 0, 0.6, 0);
      add(new THREE.CylinderGeometry(0.22, 0.22, 1.3, 20), M.accent, -0.45, 1.25, 0, 0, 0, Math.PI / 2);
      add(new THREE.CylinderGeometry(0.22, 0.22, 1.3, 20), M.accent, 0.45, 1.25, 0, 0, 0, Math.PI / 2);
      add(new THREE.BoxGeometry(1.2, 0.08, 0.9), M.dark, 0, 1.12, 0);
    } else if (id === 'ta') {
      add(new THREE.BoxGeometry(0.22, 2.0, 0.4), M.metal, -0.9, 1.0, 1.15);
      add(new THREE.BoxGeometry(0.22, 2.0, 0.4), M.metal, 0.9, 1.0, 1.15);
      add(new THREE.BoxGeometry(2.0, 0.24, 0.45), M.metal, 0, 2.05, 1.15);
      this.scanPlane = add(new THREE.PlaneGeometry(1.6, 1.7), new THREE.MeshBasicMaterial({ color: 0x42c6b0, transparent: true, opacity: 0.18, side: THREE.DoubleSide }), 0, 1.05, 1.15);
      add(new THREE.BoxGeometry(0.9, 0.55, 0.05), new THREE.MeshStandardMaterial({ color: 0x0b2a35, emissive: 0x1b8a7a, emissiveIntensity: 0.6 }), 0, 1.3, -0.3, -0.2);
    } else if (id === 'retrieve') {
      add(new THREE.BoxGeometry(1.7, 1.9, 0.6), M.dark, 0, 0.95, -0.2);
      for (let r = 0; r < 4; r++) {
        add(new THREE.BoxGeometry(1.6, 0.05, 0.62), M.metal, 0, 0.3 + r * 0.45, -0.1);
        for (let b = 0; b < 7; b++) {
          const h = 0.25 + ((b * 37 + r * 11) % 10) / 70;
          add(new THREE.BoxGeometry(0.16, h, 0.42), new THREE.MeshStandardMaterial({ color: [0x9d5c3b, 0x3f6e9a, 0x6e8b4a, 0xb9893e, 0x7a4e86][(b + r) % 5], roughness: 0.8 }), -0.62 + b * 0.205, 0.33 + r * 0.45 + h / 2, -0.1);
        }
      }
    } else if (id === 'ft') {
      add(new THREE.BoxGeometry(1.8, 0.1, 1.2), M.metal, 0, 0.85, 0);
      for (const [lx, lz] of [[-0.8, -0.5], [0.8, -0.5], [-0.8, 0.5], [0.8, 0.5]]) add(new THREE.BoxGeometry(0.08, 0.8, 0.08), M.dark, lx, 0.42, lz);
      add(new THREE.BoxGeometry(0.7, 0.04, 0.9), M.paper, -0.2, 0.92, 0, 0, 0.2);
      add(new THREE.TorusGeometry(0.28, 0.05, 10, 28), M.accent, 0.35, 1.35, 0.1, 0.3, 0.4);
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), M.metal, 0.62, 1.12, 0.2, 0, 0, 0.8);
    } else if (id === 'appraise') {
      add(new THREE.CylinderGeometry(0.08, 0.12, 1.6, 12), M.metal, 0, 0.8, 0);
      this.beam = add(new THREE.BoxGeometry(1.8, 0.07, 0.07), M.accent, 0, 1.62, 0);
      for (const s of [-1, 1]) {
        add(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), M.metal, s * 0.85, 1.35, 0);
        add(new THREE.CylinderGeometry(0.3, 0.22, 0.08, 20), M.gold, s * 0.85, 1.08, 0);
      }
    } else if (id === 'extract') {
      add(new THREE.BoxGeometry(1.1, 1.9, 0.9), M.dark, 0, 0.95, 0);
      for (let r = 0; r < 6; r++) add(new THREE.BoxGeometry(0.9, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0x0a1a2a, emissive: r % 2 ? 0x42c6b0 : 0x5aa2ff, emissiveIntensity: 0.9 }), 0, 0.35 + r * 0.27, 0.46);
      add(new THREE.BoxGeometry(0.5, 0.5, 0.5), M.glass, 0.95, 0.3, 0.3);
    } else if (id === 'synth') {
      add(new THREE.CylinderGeometry(0.8, 0.95, 0.5, 32), M.metal, 0, 0.25, 0);
      add(new THREE.TorusGeometry(0.85, 0.04, 8, 40), M.gold, 0, 0.52, 0, Math.PI / 2);
      this.crystal = add(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xf2b84b, emissiveIntensity: 0.8, metalness: 0.2, roughness: 0.15, flatShading: true }), 0, 1.5, 0);
    }
    return m;
  }

  avatar(color) {
    const a = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.45, 6, 12), mat);
    body.position.y = 0.42;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf0c9a8, roughness: 0.7 }));
    head.position.y = 0.95;
    a.add(body, head);
    a.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return a;
  }

  // ------------------------------------------------------------------ data binding
  update(model) {
    this.model = model;
    // database towers behind the search hopper
    for (const c of [...this.dbGroup.children]) { this.dbGroup.remove(c); c.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); }); }
    const st0 = this.stations[0];
    const n = model.perDb.length;
    const maxRec = Math.max(1, ...model.perDb.map((d) => d.records));
    model.perDb.forEach((d, i) => {
      const h = 0.6 + 2.6 * (Math.log10(d.records + 1) / Math.log10(maxRec + 1));
      const col = new THREE.Color(d.color);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, h, 20), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.25, metalness: 0.3, roughness: 0.4 }));
      const ang = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2.4;
      const tx = st0.x - 1.2 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 2.6), tz = -4.3 - Math.abs(Math.sin(ang)) * 0.5;
      tower.position.set(tx, h / 2, tz);
      tower.castShadow = true;
      this.dbGroup.add(tower);
      for (let k = 1; k <= 3; k++) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.02, 6, 24), this.mat.dark);
        band.rotation.x = Math.PI / 2;
        band.position.set(tx, (h * k) / 4, tz);
        this.dbGroup.add(band);
      }
      const short = { scopus: 'Scopus', wos: 'WoS', pubmed: 'PubMed', psycinfo: 'PsycInfo', ebsco: 'EBSCO', ieee: 'IEEE', gscholar: 'Scholar' }[d.id] || d.name;
      const t = this.label(`${short}\n${fmt(d.records)}${d.capped ? '*' : ''}`, { size: 0.22 });
      t.position.set(tx, h + 0.1 + (i % 2) * 0.55, tz);
      this.dbGroup.add(t);
    });

    const flow = [model.identified, model.unique, model.passTA, model.assessed, model.eligible, model.included, model.included, model.included];
    this.rejectP = STAGES.map((s, i) => (flow[i] > 0 ? Math.min(0.995, model.rejects[s.id] / (i === 0 ? flow[0] : flow[i - 1])) : 0));
    const maxRej = Math.max(1, ...Object.values(model.rejects));
    this.stations.forEach((st, i) => {
      const id = st.stage.id;
      const rej = model.rejects[id];
      const lvl = rej > 0 ? 0.08 + 0.7 * Math.log10(rej + 1) / Math.log10(maxRej + 1) : 0.001;
      st.fillTarget = lvl;
      this.setText(st.binTag, `${fmt(rej)} out`);
      st.count = model.counts[id];
      st.hoursLabel = model.hours[id];
      this.setText(st.tag, `${st.stage.short}\n${fmt(model.counts[id])} · ${Math.round(model.hours[id])} h`);
      // reviewers at human-work stations
      for (const c of [...st.avatars.children]) st.avatars.remove(c);
      if (['ta', 'ft', 'appraise', 'extract'].includes(id)) {
        const k = Math.min(4, model.p.reviewers);
        for (let a = 0; a < k; a++) {
          const av = this.avatar([0x4f8cff, 0xf28b54, 0x5fc27e, 0xc77dff][a]);
          av.position.set(-0.9 + a * 0.6, 0.18, -0.95);
          av.rotation.y = Math.PI;
          st.avatars.add(av);
        }
      }
    });
    if (this.crystal) {
      const s = 0.6 + Math.min(1.4, Math.sqrt(model.included) / 10);
      this.crystalScale = s;
    }
    this.dbColors = model.perDb.map((d) => ({ c: new THREE.Color(d.color), w: d.records }));
    this.dbTotal = model.perDb.reduce((s, d) => s + d.records, 0);
  }

  setMode(mode) { this.mode = mode; this.parts = []; if (mode === 'timeline') this.week = 0; }
  setWeek(w) { this.week = w; }

  stageStatus(i) {
    if (!this.model || this.mode === 'live') return 'active';
    const s = this.model.schedule[i];
    if (this.week >= s.end) return 'done';
    if (this.week >= s.start) return 'active';
    return 'idle';
  }

  setView(name) {
    const c = this.camera, t = this.controls.target;
    if (name === 'front') { c.position.set(0, 5, 22); t.set(0, 1, 0); }
    else if (name === 'top') { c.position.set(0, 30, 6); t.set(0, 0, 0); }
    else if (name === 'start') { c.position.set(X0 - 3, 6, 9); t.set(X0 + 3, 1, -1); }
    else { c.position.set(4, 11, 25); t.set(0, 0.8, -1); }
    const aspect = this.camera.aspect || 16 / 9;
    if (aspect < 1.3 && name === 'angle') { c.position.set(X0 + 7, 9, 13); t.set(X0 + 5, 0.8, -1); }
    else if (aspect < 1.3 && name !== 'start') c.position.sub(t).multiplyScalar(1.2).add(t);
    this.controls.update();
  }

  resize() {
    const w = this.container.clientWidth || 800, h = this.container.clientHeight || 450;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const portrait = w / h < 1.3;
    if (portrait !== this._portrait) { this._portrait = portrait; this.setView('angle'); }
  }

  pickColor() {
    if (!this.dbColors || !this.dbColors.length) return this._c.set(0x9aa3c0);
    let r = Math.random() * this.dbTotal;
    for (const d of this.dbColors) { r -= d.w; if (r <= 0) return d.c; }
    return this.dbColors[0].c;
  }

  // ------------------------------------------------------------------ per frame
  frame(dt) {
    if (!this.ok) return;
    this.time += dt;
    if (this.model) {
      const speed = this.reducedMotion ? 0.6 : 1.9;
      this.beltTex.offset.x -= dt * speed * 0.8;
      // spawn
      const rate = this.reducedMotion ? 3 : 9;
      this.spawnAcc += dt * rate;
      while (this.spawnAcc >= 1 && this.parts.length < MAX_P) {
        this.spawnAcc -= 1;
        this.parts.push({ x: X0 - 0.2, z: (Math.random() - 0.5) * 0.4, stage: 0, state: 'move', t: 0, col: this.pickColor().clone(), dec: -1 });
      }
      // move
      const d = this._d;
      let n = 0;
      const keep = [];
      for (const p of this.parts) {
        if (p.state === 'move') {
          const nextIdx = p.stage + 1;
          const nextX = nextIdx < STAGES.length ? X0 + nextIdx * GAP : Infinity;
          const status = nextIdx < STAGES.length ? this.stageStatus(nextIdx) : 'done';
          const stopX = nextX - 0.35;
          if (status === 'idle' && p.x >= stopX - 0.0001) {
            p.x = stopX; // queue in front of a stage that has not started yet
          } else {
            p.x += dt * speed;
          }
          if (p.x >= nextX && nextIdx < STAGES.length) {
            p.stage = nextIdx;
            if (Math.random() < this.rejectP[nextIdx]) { p.state = 'reject'; p.t = 0; p.sx = p.x; }
            if (nextIdx === STAGES.length - 1) { p.state = 'absorb'; p.t = 0; }
          }
          d.position.set(p.x, BELT_Y + 0.07, p.z);
          d.rotation.set(0, 0, 0);
          d.scale.setScalar(1);
        } else if (p.state === 'reject') {
          p.t += dt / 0.7;
          const st = this.stations[p.stage];
          const bx = st.x + 0.9, bz = 1.55;
          const e = Math.min(1, p.t);
          d.position.set(p.sx + (bx - p.sx) * e, BELT_Y + 0.07 + Math.sin(Math.PI * e) * 1.1 - e * 0.1, p.z + (bz - p.z) * e);
          d.rotation.set(e * 4, e * 2, 0);
          d.scale.setScalar(1 - e * 0.5);
          if (p.t >= 1) continue;
        } else if (p.state === 'absorb') {
          p.t += dt / 0.9;
          const st = this.stations[STAGES.length - 1];
          const e = Math.min(1, p.t);
          d.position.set(p.x + (st.x - p.x) * e, BELT_Y + 0.07 + e * 1.5, p.z * (1 - e) + (-1.55) * e);
          d.rotation.set(0, e * 3, 0);
          d.scale.setScalar(1 - e * 0.9);
          p.col.lerp(this._c.set(C.gold), 0.1);
          if (p.t >= 1) { this.pulse = 1; continue; }
        }
        if (p.x > X0 + STAGES.length * GAP) continue;
        d.updateMatrix();
        this.recMesh.setMatrixAt(n, d.matrix);
        this.recMesh.setColorAt(n, p.col);
        n++;
        keep.push(p);
      }
      this.parts = keep;
      this.recMesh.count = n;
      this.recMesh.instanceMatrix.needsUpdate = true;
      if (this.recMesh.instanceColor) this.recMesh.instanceColor.needsUpdate = true;

      // stations
      this.stations.forEach((st, i) => {
        const s = this.stageStatus(i);
        const isB = this.model.bottleneck === st.stage.id;
        const col = s === 'done' ? C.blue : s === 'active' ? (isB ? C.red : C.accent) : C.idle;
        st.statusMat.color.setHex(col);
        st.statusMat.emissive.setHex(col);
        st.statusMat.emissiveIntensity = s === 'active' ? 0.6 + 0.4 * Math.sin(this.time * 4 + i) : 0.4;
        st.fill.scale.y += ((st.fillTarget || 0.001) * (s === 'idle' ? 0.02 : s === 'active' && this.mode === 'timeline' ? this.progress(i) : 1) - st.fill.scale.y) * Math.min(1, dt * 4);
        st.fill.position.y = st.fill.scale.y / 2 + 0.01;
        st.avatars.children.forEach((a, k) => { a.position.y = 0.18 + (s === 'active' ? Math.abs(Math.sin(this.time * 3 + k)) * 0.05 : 0); });
      });
      if (this.scanPlane) this.scanPlane.material.opacity = 0.12 + 0.12 * Math.abs(Math.sin(this.time * 3));
      if (this.beam) this.beam.rotation.z = Math.sin(this.time * 1.5) * 0.08;
      if (this.crystal) {
        this.pulse = Math.max(0, (this.pulse || 0) - dt * 2);
        const s = (this.crystalScale || 1) * (1 + 0.15 * this.pulse);
        this.crystal.scale.setScalar(s);
        this.crystal.rotation.y += dt * 0.8;
        this.crystal.position.y = 1.5 + 0.08 * Math.sin(this.time * 2);
      }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  progress(i) {
    if (!this.model) return 1;
    const s = this.model.schedule[i];
    return Math.max(0.02, Math.min(1, (this.week - s.start) / Math.max(1e-6, s.end - s.start)));
  }
}

export function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
export { DBS };
