// Python in the browser: loads Pyodide (CPython compiled to WebAssembly) and the review_lab engine.
// Nothing is sent to a server; all computation happens on the visitor's device.
const PYODIDE_VERSION = '0.26.4';
const CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyPromise = null;
let status = { state: 'idle', text: 'Python engine not loaded yet' };
const listeners = new Set();

export function onPyStatus(fn) { listeners.add(fn); fn(status); return () => listeners.delete(fn); }
function setStatus(state, text) { status = { state, text }; listeners.forEach((f) => f(status)); }

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(s);
  });
}

export function loadPython() {
  if (pyPromise) return pyPromise;
  pyPromise = (async () => {
    setStatus('loading', 'Loading Python (Pyodide, about 8 MB, once)…');
    const url = new URLSearchParams(location.search).get('pyodide') || window.PYODIDE_URL || CDN;
    if (!window.loadPyodide) await loadScript(`${url}pyodide.js`);
    const py = await window.loadPyodide({ indexURL: url });
    const src = await (await fetch('py/review_lab.py', { cache: 'no-cache' })).text();
    py.FS.mkdirTree('/home/pyodide/lab');
    py.FS.writeFile('/home/pyodide/lab/review_lab.py', src);
    py.runPython('import sys\nsys.path.insert(0, "/home/pyodide/lab")\nimport review_lab');
    const ver = py.runPython('import sys; sys.version.split()[0]');
    setStatus('ready', `Python ${ver} ready (Pyodide ${PYODIDE_VERSION}, runs in your browser)`);
    return py;
  })().catch((e) => {
    setStatus('error', `Python engine could not load: ${e.message}. Check your connection and reload.`);
    pyPromise = null;
    throw e;
  });
  return pyPromise;
}

export async function callPy(fn, args) {
  const py = await loadPython();
  py.globals.set('_payload', JSON.stringify({ fn, args }));
  const out = py.runPython('review_lab.run_json(_payload)');
  return JSON.parse(out);
}

export async function runCode(code, onOut) {
  const py = await loadPython();
  py.setStdout({ batched: (s) => onOut(s + '\n', 'out') });
  py.setStderr({ batched: (s) => onOut(s + '\n', 'err') });
  try {
    await py.loadPackagesFromImports(code, { messageCallback: (m) => onOut(`[${m}]\n`, 'info') });
    const result = await py.runPythonAsync(code);
    if (result !== undefined && result !== null) onOut(String(result) + '\n', 'out');
  } catch (e) {
    onOut(String(e.message || e).split('\n').slice(-6).join('\n') + '\n', 'err');
  } finally {
    py.setStdout({});
    py.setStderr({});
  }
}
