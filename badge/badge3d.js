// Interactive 3D build of the 2025 Space Carnival badge.
// Board art is rendered from the real Gerbers; part positions come from the pick-and-place file
// (github.com/salmanfarisvp/space-carnival-badge-2025, MIT). Units are millimetres.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.getElementById('lab');
const stage = root.querySelector('.lab-stage');
const hintEl = root.querySelector('.lab-hint');
const doBtn = root.querySelector('[data-act="do"]');
const statusEl = root.querySelector('[data-status]');
const countEl = root.querySelector('[data-count]');

const STEPS = [
  { id: 'leds', hint: 'Last year\'s badge, from its real Gerber files. Press <b>Place LEDs</b> or tap a glowing hole. Long leg goes in <b>+</b>.', act: 'Place LEDs' },
  { id: 'holder', hint: 'Flipped to the back. Fit the <b>coin-cell holder</b> on the ring.', act: 'Fit holder' },
  { id: 'solder', hint: 'Tap each glowing pad to <b>solder</b> it: LED legs on the back, then flip, holder legs on the front.', act: 'Solder all' },
  { id: 'cell', hint: 'Last bit: slide the <b>CR2032</b> into the holder.', act: 'Insert cell' },
  { id: 'lit', hint: '<b>It lives!</b> Two self-cycling RGB LEDs, one coin cell. Your turn to design the next one.', act: 'Build again' },
];

// what the status line says while each step is waiting — rotates like a "thinking" line
const STATUS = {
  leds: ['Sorting LEDs by leg length…', 'Finding the + hole…', 'Bending the legs just so…', 'Waiting for your LEDs…'],
  holder: ['Flipping to the back…', 'Lining up the coin-cell holder…', 'Matching it to the silkscreen circle…'],
  solder: ['Heating the iron to 350 °C…', 'Tinning the tip…', 'Flowing solder into the joint…', 'Waiting for the smoke to clear…', 'Checking for shiny volcanoes…'],
  cell: ['Fetching a fresh CR2032…', 'Checking the + side faces up…', 'Sliding it under the clip…'],
  lit: ['It lives! Cycling through every colour…', 'Two RGB LEDs, one coin cell, zero bugs…', 'Now go design the next one…'],
};
let statusList = STATUS.leds, statusI = 0, statusFor = '';
function showStatus() {
  statusEl.classList.remove('in'); void statusEl.offsetWidth; // restart the fade
  statusEl.textContent = statusList[statusI % statusList.length];
  statusEl.classList.add('in');
}
setInterval(() => { statusI++; showStatus(); }, 2600);
const SPIN = '·✢✳✶✻✽✻✶✳✢';
let spinI = 0;
const spinEl = root.querySelector('.lab-status .spin');
setInterval(() => { spinEl.textContent = SPIN[spinI++ % SPIN.length]; }, 130);

// board-local positions, origin at the board centre (from Gerber / pick-and-place, board corner at 10.51, 73.347)
const toLocal = (x, y) => new THREE.Vector2(x - 10.51 - 20, y - 73.347 - 20);
const LED_AT = [toLocal(14.859, 108.966), toLocal(45.974, 77.978)];
// holder outline arc from the bottom silkscreen Gerber: r 11.05 mm around (34.088, 93.862)
const HOLDER_AT = toLocal(34.088, 93.862);
const PADS = [
  toLocal(13.589, 108.966), toLocal(16.129, 108.966),
  toLocal(44.704, 77.978), toLocal(47.244, 77.978),
  toLocal(25.439, 102.825), toLocal(39.332, 88.438),
];
const T = 0.8; // half board thickness

/* ---------- renderer ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) {
  root.classList.add('no-webgl');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(32, 1, 1, 1000);
camera.position.set(0, -14, 118);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.target.set(0, -2, 0);
controls.enableZoom = false; // keep the page wheel for scrolling
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.1;
controls.addEventListener('start', () => { controls.autoRotate = false; root.classList.add('touched'); });

scene.add(new THREE.HemisphereLight('#cfe0ff', '#1b2350', 1.1));
const key = new THREE.DirectionalLight('#fff3dc', 2.2);
key.position.set(40, 60, 90);
scene.add(key);
const rim = new THREE.DirectionalLight('#ff8fd0', 1.2);
rim.position.set(-60, -30, -80);
scene.add(rim);

/* ---------- board ---------- */
const loader = new THREE.TextureLoader();
const tex = url => {
  const t = loader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.repeat.set(1 / 40, 1 / 40);
  return t;
};
function boardShape(holeX) {
  const s = new THREE.Shape(), r = 2.5, w = 40;
  s.moveTo(r, 0); s.lineTo(w - r, 0); s.absarc(w - r, r, r, -Math.PI / 2, 0);
  s.lineTo(w, w - r); s.absarc(w - r, w - r, r, 0, Math.PI / 2);
  s.lineTo(r, w); s.absarc(r, w - r, r, Math.PI / 2, Math.PI);
  s.lineTo(0, r); s.absarc(r, r, r, Math.PI, Math.PI * 1.5);
  const hole = new THREE.Path(); hole.absarc(holeX, 36, 2.5, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}
const board = new THREE.Group();
scene.add(board);
const edge = new THREE.ExtrudeGeometry(boardShape(34), { depth: 2 * T, bevelEnabled: false, curveSegments: 24 });
edge.translate(-20, -20, -T);
board.add(new THREE.Mesh(edge, new THREE.MeshStandardMaterial({ color: '#d7c27a', roughness: 0.7 })));
const front = new THREE.Mesh(
  new THREE.ShapeGeometry(boardShape(34), 24).translate(-20, -20, 0),
  new THREE.MeshStandardMaterial({ map: tex('../assets/badge/pcb-top.webp'), roughness: 0.6, metalness: 0, envMapIntensity: 0.35 })
);
front.position.z = T + 0.01;
const back = new THREE.Mesh(
  new THREE.ShapeGeometry(boardShape(6), 24).translate(-20, -20, 0),
  new THREE.MeshStandardMaterial({ map: tex('../assets/badge/pcb-bottom.webp'), roughness: 0.6, metalness: 0, envMapIntensity: 0.35 })
);
back.rotation.y = Math.PI;
back.position.z = -T - 0.01;
board.add(front, back);

/* ---------- parts ---------- */
const metal = new THREE.MeshStandardMaterial({ color: '#d9dce2', metalness: 1, roughness: 0.22 });
const plastic = new THREE.MeshStandardMaterial({ color: '#17171c', roughness: 0.55 });
const zCyl = (r, h, seg = 32, open = false) => new THREE.CylinderGeometry(r, r, h, seg, 1, open).rotateX(Math.PI / 2);

function makeLed() {
  const g = new THREE.Group();
  const lens = new THREE.MeshPhysicalMaterial({
    color: '#f4f7ff', roughness: 0.18, transmission: 0.55, thickness: 2.5, ior: 1.45,
    emissive: '#000000', emissiveIntensity: 1,
  });
  const flange = new THREE.Mesh(zCyl(2.9, 1), lens); flange.position.z = 0.5;
  const body = new THREE.Mesh(zCyl(2.5, 5.2), lens); body.position.z = 3.6;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), lens);
  dome.position.z = 6.2;
  g.add(flange, body, dome);
  for (const [x, len] of [[-1.27, 7], [1.27, 6]]) { // long leg = anode
    const leg = new THREE.Mesh(zCyl(0.25, len, 8), metal);
    leg.position.set(x, 0, 0.5 - len / 2);
    g.add(leg);
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.NormalBlending, depthWrite: false, transparent: true, opacity: 0 }));
  halo.position.z = 5;
  halo.scale.setScalar(26);
  const light = new THREE.PointLight('#ffffff', 0, 60, 1.6);
  light.position.z = 5;
  g.add(halo, light);
  g.userData = { lens, halo, light };
  return g;
}

const brass = new THREE.MeshStandardMaterial({ color: '#d8c27c', metalness: 1, roughness: 0.28 });
// BS-2-1 coin-cell holder, built with +z pointing away from the board. It is mounted on the back by a plain
// 180° turn about x, which maps local (x, y) to board (x, -y) — so board positions are entered with y negated.
// Solid floor, thick C-shaped wall open towards the – leg, a tab over the + leg, a lip and brass clip over the cell.
const holderPlastic = new THREE.MeshStandardMaterial({ color: '#1d1d22', roughness: 0.55, side: THREE.DoubleSide });
function makeHolder() {
  const g = new THREE.Group();
  const loc = p => new THREE.Vector2(p.x - HOLDER_AT.x, -(p.y - HOLDER_AT.y));
  const P1 = loc(PADS[4]); // + leg, under the tab
  const P2 = loc(PADS[5]); // – leg, inside the ring
  const tabA = Math.atan2(P1.y, P1.x), openA = tabA + Math.PI, gap = 0.78;
  const R = 11.6, H = 4.2;
  // thick arc from cylinder walls, ring caps and two end faces
  const arc = (r0, r1, a0, a1, h, z) => {
    const g2 = new THREE.Group(), len = a1 - a0;
    for (const r of [r0, r1]) { // cylinder theta runs a quarter turn behind the xy angle once turned onto z
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 72, 1, true, a0 + Math.PI / 2, len).rotateX(Math.PI / 2), holderPlastic);
      wall.position.z = h / 2; g2.add(wall);
    }
    for (const zz of [0, h]) {
      const cap = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 72, 1, a0, len), holderPlastic);
      cap.position.z = zz; g2.add(cap);
    }
    for (const a of [a0, a1]) {
      const end = new THREE.Mesh(new THREE.PlaneGeometry(r1 - r0, h), holderPlastic);
      end.position.set(Math.cos(a) * (r0 + r1) / 2, Math.sin(a) * (r0 + r1) / 2, h / 2);
      end.rotation.set(Math.PI / 2, 0, a, 'ZYX');
      g2.add(end);
    }
    g2.position.z = z; return g2;
  };
  const floor = new THREE.Mesh(zCyl(R, 0.8, 72), holderPlastic); floor.position.z = 0.4;
  g.add(floor);
  g.add(arc(10.2, R, openA + gap, openA + Math.PI * 2 - gap, H, 0));           // wall
  g.add(arc(8.8, R, tabA - 0.95, tabA + 0.95, 0.7, H));                         // lip over the cell
  const tab = new THREE.Mesh(new THREE.BoxGeometry(4.6, 5.2, H), holderPlastic); // tab reaching the + leg
  tab.position.set(Math.cos(tabA) * 12.6, Math.sin(tabA) * 12.6, H / 2); tab.rotation.z = tabA;
  g.add(tab);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(11.5, 3.4, 0.35), brass);    // + clip from the tab over the cell
  arm.position.set(Math.cos(tabA) * 7, Math.sin(tabA) * 7, H + 0.9); arm.rotation.z = tabA;
  const tip = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.4, 0.35), brass);     // bent down onto the cell
  tip.position.set(Math.cos(tabA) * 0.9, Math.sin(tabA) * 0.9, H + 0.35); tip.rotation.set(0, 0.6, tabA, 'ZYX');
  g.add(arm, tip);
  const spring = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 0.3), brass);      // – contact on the floor
  spring.position.set(P2.x * 0.55, P2.y * 0.55, 1.0); spring.rotation.z = Math.atan2(P2.y, P2.x);
  g.add(spring);
  for (const p of [P1, P2]) { // legs down through the board, poking out of the front
    const leg = new THREE.Mesh(zCyl(0.45, 3, 8), brass);
    leg.position.set(p.x, p.y, -1.5); g.add(leg);
  }
  g.userData.openA = openA;
  return g;
}

function makeCell() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#c9ccd2'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#5b5f66'; x.textAlign = 'center';
  x.font = '700 46px Poppins, sans-serif'; x.fillText('CR2032', 128, 120);
  x.font = '600 30px Poppins, sans-serif'; x.fillText('3V  +', 128, 165);
  const top = new THREE.CanvasTexture(c); top.colorSpace = THREE.SRGBColorSpace;
  const mats = [metal, new THREE.MeshStandardMaterial({ map: top, metalness: 0.85, roughness: 0.3 }), metal];
  const m = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 3.2, 64), mats);
  m.rotation.x = Math.PI / 2; // cap with the print faces +z
  const g = new THREE.Group(); g.add(m);
  return g;
}

const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

// soldering iron, built along +y with the tip at the origin
function makeIron() {
  const g = new THREE.Group();
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 5, 20).rotateX(Math.PI).translate(0, 2.5, 0), metal);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 12, 20), new THREE.MeshStandardMaterial({ color: '#b9bec7', metalness: 1, roughness: 0.35 }));
  shaft.position.y = 11;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.4, 2.4, 24), plastic); collar.position.y = 18;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.2, 20, 28), new THREE.MeshStandardMaterial({ color: '#ff49b4', roughness: 0.5 }));
  grip.position.y = 29.2;
  for (const y of [22, 25, 28]) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.25, 8, 28).rotateX(Math.PI / 2), plastic); r.position.y = y; g.add(r); }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.8, 6, 16), plastic); tail.position.y = 42;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ff9a3c', transparent: true, opacity: 0, depthWrite: false }));
  glow.scale.setScalar(5);
  g.add(tip, shaft, collar, grip, tail, glow);
  g.userData.glow = glow;
  return g;
}
// held at an angle off the back of the board
// through-hole joints are soldered on the side opposite the part: LED legs on the back, holder legs on the front
const IRON = {
  back: new THREE.Vector3(0.42, 0.52, -0.74).normalize(),
  front: new THREE.Vector3(0.42, 0.52, 0.74).normalize(),
};
const ironQ = side => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), IRON[side]);
const padSide = i => (i < 4 ? 'back' : 'front');
const sideZ = side => (side === 'back' ? -1 : 1);

/* ---------- tiny tween engine ---------- */
const tweens = new Set();
const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const tween = (ms, fn, e = ease) => new Promise(res => tweens.add({ t0: performance.now(), ms, fn, res, e }));
const backOut = k => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
// a part appears above its spot and drops in with a little bounce
function dropIn(obj, at, from) {
  obj.position.copy(from); obj.scale.setScalar(0.001);
  return tween(650, k => {
    obj.position.lerpVectors(from, at, k);
    obj.scale.setScalar(Math.max(0.001, Math.min(1, k * 2.5)));
  }, backOut);
}
function moveTo(obj, pos, quat, ms = 700, lift = 14) {
  const p0 = obj.position.clone(), q0 = obj.quaternion.clone();
  return tween(ms, k => {
    obj.position.lerpVectors(p0, pos, k);
    obj.position.z += Math.sin(k * Math.PI) * lift * Math.sign(pos.z || 1);
    obj.quaternion.slerpQuaternions(q0, quat, k);
  });
}
// flips are relative to wherever the visitor has spun the camera, so the side we need always ends up facing them
const azimuth = () => Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
const facing = () => (Math.cos(board.rotation.y - azimuth()) >= 0 ? 'front' : 'back');
const flipTo = side => {
  const a0 = board.rotation.y;
  let d = azimuth() + (side === 'back' ? Math.PI : 0) - a0;
  d = Math.atan2(Math.sin(d), Math.cos(d)); // shortest way round
  return tween(900, k => { board.rotation.y = a0 + d * k; });
};

/* ---------- state ---------- */
let step = 0, busy = false, lit = false, parts = {}, tapTargets = [];

function clearParts() {
  for (const o of Object.values(parts).flat()) o?.parent?.remove(o);
  parts = {}; tapTargets = [];
}

const ringMat = new THREE.MeshBasicMaterial({ color: '#ff49b4' });
// a pulsing pink ring on the board that says "put something here"; tap it to do that step
function ring(p, r, z, tap) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, r > 5 ? 0.35 : 0.22, 10, 48), ringMat);
  m.position.set(p.x, p.y, z);
  const hit = new THREE.Mesh(new THREE.CircleGeometry(Math.max(r + 1.5, 3), 24), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  m.add(hit);
  m.userData.tap = tap;
  board.add(m);
  parts.markers.push(m);
  return m;
}
const unring = m => { m.visible = false; m.parent?.remove(m); };

function setup() {
  clearParts();
  lit = false; step = 0; board.rotation.y = azimuth();
  parts.markers = []; parts.blobs = [];
  parts.leds = [makeLed(), makeLed()];
  parts.ledRings = LED_AT.map((p, i) => ring(p, 3.4, T + 0.3, () => placeLed(i)));
  parts.holder = makeHolder();
  parts.cell = makeCell();
  refresh();
}

function refresh() {
  const s = STEPS[step];
  hintEl.innerHTML = s.hint;
  root.querySelector('[data-cap]').textContent = s.act;
  root.querySelector('[data-steplabel]').textContent = lit ? 'It lives!' : `Step ${step + 1} of 5`;
  countEl.textContent = `${Math.min(step + 1, 5)}/5`;
  if (statusFor !== s.id) { statusFor = s.id; statusList = STATUS[s.id]; statusI = 0; showStatus(); }
  tapTargets = parts.markers.filter(m => m.visible && m.parent);
  if (s.id === 'cell') tapTargets.push(parts.holder);
}

async function run(fn) { if (busy) return; busy = true; try { await fn(); } finally { busy = false; refresh(); } }

function placeLed(i) {
  return run(async () => {
    const led = parts.leds[i];
    if (STEPS[step].id !== 'leds' || led.parent) return;
    if (facing() !== 'front') await flipTo('front');
    unring(parts.ledRings[i]);
    // D2 is rotated 180° in the layout
    led.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), i ? Math.PI : 0);
    board.add(led);
    await dropIn(led, new THREE.Vector3(LED_AT[i].x, LED_AT[i].y, T), new THREE.Vector3(LED_AT[i].x, LED_AT[i].y, T + 26));
    if (parts.leds.every(l => l.parent)) {
      step = 1; refresh();
      await flipTo('back');
      parts.holderRing = ring(HOLDER_AT, 11.4, -T - 0.3, placeHolder);
    }
  });
}

function placeHolder() {
  return run(async () => {
    if (STEPS[step].id !== 'holder') return;
    if (facing() !== 'back') await flipTo('back');
    unring(parts.holderRing);
    const h = parts.holder;
    h.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI); // +z away from the back of the board
    board.add(h);
    await dropIn(h, new THREE.Vector3(HOLDER_AT.x, HOLDER_AT.y, -T), new THREE.Vector3(HOLDER_AT.x, HOLDER_AT.y, -T - 26));
    step = 2;
    parts.padRings = PADS.map((p, i) => ring(p, 1.2, sideZ(padSide(i)) * (T + 0.4), () => solder(i)));
  });
}

function solder(i) {
  return run(async () => {
    const m = parts.padRings?.[i];
    if (!m || !m.visible) return;
    const side = padSide(i), dir = IRON[side], z = sideZ(side);
    // the back joints are all done before we move round to the front
    if (side === 'front' && parts.padRings.slice(0, 4).some(x => x.visible)) return;
    let iron = parts.iron;
    if (iron && iron.userData.side !== side) { // lift off, flip the board, come back on the other side
      const h0 = iron.position.clone(), away = h0.clone().addScaledVector(IRON[iron.userData.side], 60);
      await tween(450, k => iron.position.lerpVectors(h0, away, k));
      board.remove(iron); iron = parts.iron = null;
    }
    if (facing() !== side) await flipTo(side);
    const touch = new THREE.Vector3(m.position.x, m.position.y, z * (T + 0.55)), hover = touch.clone().addScaledVector(dir, 7);
    if (!iron) { // the iron swoops in from off the board
      iron = parts.iron = makeIron();
      iron.userData.side = side;
      iron.quaternion.copy(ironQ(side));
      iron.position.copy(touch).addScaledVector(dir, 60);
      board.add(iron);
    }
    const p0 = iron.position.clone();
    await tween(p0.distanceTo(hover) > 20 ? 600 : 300, k => iron.position.lerpVectors(p0, hover, k));
    await tween(170, k => iron.position.lerpVectors(hover, touch, k));
    unring(m);
    const glow = iron.userData.glow;
    const blob = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 12), metal);
    blob.position.set(touch.x, touch.y, z * (T + 0.25));
    blob.scale.setScalar(0.001);
    board.add(blob); parts.blobs.push(blob);
    puff(blob);
    await tween(420, k => { blob.scale.set(k, k, k * 0.6 + 0.001); glow.material.opacity = Math.sin(k * Math.PI) * 0.9; });
    await tween(180, k => iron.position.lerpVectors(touch, hover, k));
    if (parts.padRings.every(x => !x.visible)) {
      const h0 = iron.position.clone(), away = h0.clone().addScaledVector(dir, 60);
      await tween(500, k => iron.position.lerpVectors(h0, away, k));
      board.remove(iron); parts.iron = null;
      step = 3;
      parts.cellRing = ring(HOLDER_AT, 12.6, -T - 4.9, insertCell);
    }
  });
}

function puff(at) {
  const wp = at.getWorldPosition(new THREE.Vector3());
  for (let n = 0; n < 6; n++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false }));
    s.position.copy(wp); scene.add(s);
    const dx = (Math.random() - 0.5) * 6, dy = 6 + Math.random() * 8, dz = 4 + Math.random() * 6;
    const toCam = camera.position.clone().sub(wp).normalize();
    tween(900 + n * 80, k => {
      s.position.set(wp.x + dx * k, wp.y + dy * k, wp.z).addScaledVector(toCam, dz * k);
      s.scale.setScalar(2 + k * 7); s.material.opacity = 0.6 * (1 - k);
    }).then(() => scene.remove(s));
  }
}

function insertCell() {
  return run(async () => {
    if (STEPS[step].id !== 'cell') return;
    if (facing() !== 'back') await flipTo('back');
    unring(parts.cellRing);
    const c = parts.cell, a = parts.holder.userData.openA;
    parts.holder.add(c);
    c.quaternion.identity();
    // appears outside the holder's open side, then slides in under the clip
    const out = new THREE.Vector3(Math.cos(a) * 24, Math.sin(a) * 24, 2.4);
    await dropIn(c, out, out.clone().setZ(14));
    await tween(450, k => c.position.set(out.x * (1 - k), out.y * (1 - k), 2.4));
    step = 4; lit = true; refresh();
    await flipTo('front');
  });
}

async function autoBuild() {
  if (busy) return;
  if (lit || step > 0) setup();
  for (let i = 0; i < 2; i++) await placeLed(i);
  await new Promise(r => setTimeout(r, 250));
  await placeHolder();
  for (let i = 0; i < PADS.length; i++) await solder(i);
  await new Promise(r => setTimeout(r, 200));
  await insertCell();
}

root.querySelector('[data-act="flip"]').addEventListener('click', () => !busy && run(() => flipTo(facing() === 'front' ? 'back' : 'front')));
root.querySelector('[data-act="auto"]').addEventListener('click', autoBuild);
root.querySelector('[data-act="reset"]').addEventListener('click', () => !busy && setup());
doBtn.addEventListener('click', () => {
  root.classList.add('touched');
  const id = STEPS[step].id;
  if (id === 'leds') { const i = parts.leds.findIndex(l => !l.parent); if (i >= 0) placeLed(i); }
  else if (id === 'holder') placeHolder();
  else if (id === 'solder') (async () => { for (let i = 0; i < PADS.length; i++) await solder(i); })();
  else if (id === 'cell') insertCell();
  else setup();
});

/* ---------- picking ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(tapTargets, true)[0];
  if (!hit) return null;
  let o = hit.object;
  while (o && !o.userData.tap) o = o.parent;
  return o;
}
renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  const o = pick(e);
  if (o) o.userData.tap();
});
renderer.domElement.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') renderer.domElement.style.cursor = pick(e) ? 'pointer' : 'grab';
});

/* ---------- loop ---------- */
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // fit the board plus the parts tray on either side
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.setLength(Math.max(37 / tan, 31 / (tan * camera.aspect)));
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

const col = new THREE.Color();
let visible = true;
new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);

renderer.setAnimationLoop(now => {
  if (!visible) return;
  for (const t of tweens) {
    const k = Math.min(1, (now - t.t0) / t.ms);
    t.fn(t.e(k));
    if (k === 1) { tweens.delete(t); t.res(); }
  }
  const s = now / 1000;
  ringMat.opacity = 1; const pulse = 1 + Math.sin(s * 5) * 0.12;
  for (const m of parts.markers || []) if (m.visible) m.scale.setScalar(pulse);
  (parts.leds || []).forEach((l, i) => {
    const { lens, halo, light } = l.userData;
    if (lit) {
      col.setHSL((s * 0.18 + i * 0.37) % 1, 1, 0.5);
      lens.color.copy(col); lens.emissive.copy(col); lens.emissiveIntensity = 2.2;
      halo.material.color.copy(col); halo.material.opacity = 0.75;
      light.color.copy(col); light.intensity = 1400;
    } else {
      lens.color.set('#f4f7ff'); lens.emissive.setRGB(0, 0, 0); halo.material.opacity = 0; light.intensity = 0;
    }
  });
  root.classList.toggle('is-lit', lit);
  controls.update();
  renderer.render(scene, camera);
});

setup();
resize();
root.classList.add('ready');
