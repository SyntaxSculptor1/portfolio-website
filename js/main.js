// ================================================================
//  main.js  —  3D scene engine
//
//  You should not need to edit this file unless you want to change
//  the 3D behaviour (camera speed, lighting, hover effects, etc.).
//  All portfolio content lives in data.js.
//
//  File structure (search for the ── headings to jump around):
//    RENDERER & SCENE      Three.js setup
//    CAMERA                Home position, fly-to logic
//    LIGHTS                Scene lighting
//    STATE                 Shared mutable variables
//    LOADER                Progress bar, minimum load time
//    MODEL LOADING         GLTF load + scale/center
//    SCREEN SETUP          Detect screen meshes, assign textures
//    SCREEN TEXTURES       Canvas drawing for each screen type
//    BOOT SEQUENCE         CRT flicker-on animation
//    HERO TEXT             Typed name animation
//    ENTER GATE            Post-loader click gate (needed for audio)
//    HOVER                 Mouse raycasting, cursor, glitch effect
//    CLICK & KEYBOARD      Screen selection inputs
//    TOUCH                 Mobile tap + swipe support
//    FLY TO SCREEN         Camera flight animation
//    FLY HOME              Return camera animation
//    TERMINAL              Overlay window that opens on fly-in
//    CONTENT RENDERERS     HTML templates for each screen type
//    VIDEO PLAYER          YouTube embed modal
//    BACKGROUND MUSIC      Ambient loop + mute button
//    AUDIO FX              Click buzz + per-screen ambient tones
//    RENDER LOOP           Animation frame + parallax
//    FILM GRAIN            Post-processing noise overlay
// ================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

(function () {
'use strict';

// ── RENDERER ─────────────────────────────────────────────────────
const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace    = THREE.SRGBColorSpace;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;

// ── SCENE ─────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020604);
scene.fog        = new THREE.FogExp2(0x020604, 0.055);

// ── CAMERA ────────────────────────────────────────────────────────
// HOME_POS / HOME_TAR are updated after the model loads so the
// camera sits exactly in front of the model regardless of scale.
const camera   = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 200);
const HOME_POS = new THREE.Vector3(0, 0.3, 5.5);
const HOME_TAR = new THREE.Vector3(0, 0.3, 0);
camera.position.copy(HOME_POS);
camera.lookAt(HOME_TAR);

// ── LIGHTS ────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x1a1a1a, 0.8));

const keyLight = new THREE.DirectionalLight(0xffeedd, 0.6);
keyLight.position.set(2, 6, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8899cc, 0.25);
fillLight.position.set(-4, 2, 2);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffd0a0, 0.15);
rimLight.position.set(0, 3, -5);
scene.add(rimLight);

scene.add(new THREE.HemisphereLight(0x223311, 0x111111, 0.3));

// ── STATE ─────────────────────────────────────────────────────────
let screenEntries = [];   // one entry per screen mesh (populated in SCREEN SETUP)
let activeScreen  = null; // currently zoomed-in screen entry, or null
let isAnimating   = false;// true during any camera flight
let hoveredEntry  = null; // screen the cursor is currently over
let minorIndex    = 0;    // current page index inside the Archive screen
let minorProjects = [];   // project list for Archive pagination

// Camera proxy — GSAP animates this object, the render loop reads it.
// This avoids GSAP fighting with the parallax offset.
const camProxy = { x: HOME_POS.x, y: HOME_POS.y, z: HOME_POS.z };

// Mouse parallax state — smooth drift applied on top of camProxy at home
const parallax = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };

// Drift flag — disabled during camera flights to prevent jitter
const drift = { active: true };

// Smooth look-at target (lerped during flights)
const smoothTarget = new THREE.Vector3().copy(HOME_TAR);

const mouse     = new THREE.Vector2(-999, -999);
const raycaster = new THREE.Raycaster();


// ================================================================
//  LOADER
//  Shows a terminal-style progress bar for at least MIN_LOAD_MS.
//  Even if the model loads in 1s the bar fills for the full 5s
//  to build atmosphere. Messages cycle during the wait.
// ================================================================

const MIN_LOAD_MS = 5000; // milliseconds — raise to slow down, lower to speed up

const loaderEl     = document.getElementById('loader');
const loaderBar    = document.getElementById('loader-bar');
const loaderPct    = document.getElementById('loader-pct');
const loaderStatus = document.getElementById('loader-status');
const LOAD_START   = performance.now();

// Blinking cursor on the loader bar
let _cursorVisible = true;
setInterval(() => {
  const c = document.getElementById('loader-cursor');
  if (c) { c.style.opacity = _cursorVisible ? '1' : '0'; _cursorVisible = !_cursorVisible; }
}, 500);

// Called by the GLTF loader during download (p: 0.0 → 1.0)
function setLoaderPct(p) {
  loaderBar.style.width = (p * 240) + 'px';
  loaderPct.textContent = Math.round(p * 100) + '%';
  if (p > 0.6) loaderStatus.textContent = 'LOADING 3D ASSETS...';
  if (p > 0.9) loaderStatus.textContent = 'BOOTING SCREENS...';
}

// Called when the model is fully ready.
// Waits until MIN_LOAD_MS has elapsed, then fades out and calls cb.
function hideLoader(cb) {
  const elapsed = performance.now() - LOAD_START;
  const wait    = Math.max(0, MIN_LOAD_MS - elapsed);

  const messages = [
    'INITIALIZING SYSTEMS...',
    'CALIBRATING DISPLAYS...',
    'WARMING CRT TUBES...',
    'ESTABLISHING LINK...',
  ];

  if (wait > 100) {
    // Animate bar from wherever it stopped to 100% over remaining wait time
    const startPx   = parseFloat(loaderBar.style.width) || 0;
    const startTime = performance.now();
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      loaderStatus.textContent = messages[++msgIdx % messages.length];
    }, wait / messages.length);

    (function tickBar() {
      const t      = Math.min((performance.now() - startTime) / wait, 1);
      const eased  = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out
      const px     = startPx + (240 - startPx) * eased;
      loaderBar.style.width = px + 'px';
      loaderPct.textContent = Math.round((px / 240) * 100) + '%';
      if (t < 1) {
        requestAnimationFrame(tickBar);
      } else {
        clearInterval(msgInterval);
        loaderStatus.textContent = 'READY.';
        gsap.to(loaderEl, { opacity: 0, duration: 0.8, delay: 0.5,
          onComplete: () => { loaderEl.style.display = 'none'; cb && cb(); } });
      }
    })();
  } else {
    loaderStatus.textContent = 'READY.';
    gsap.to(loaderEl, { opacity: 0, duration: 0.8, delay: 0.4,
      onComplete: () => { loaderEl.style.display = 'none'; cb && cb(); } });
  }
}


// ================================================================
//  MODEL LOADING
// ================================================================

const gltfLoader = new GLTFLoader();
gltfLoader.load(
  'assets/model/scene.gltf',
  onModelLoaded,
  xhr => { if (xhr.total) setLoaderPct(xhr.loaded / xhr.total); },
  err => console.error('GLTF load error:', err)
);

function onModelLoaded(gltf) {
  setLoaderPct(1);
  const model = gltf.scene;

  // Fit model to a consistent world size regardless of source scale
  const box    = new THREE.Box3().setFromObject(model);
  const size   = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale  = 4.0 / Math.max(size.x, size.y, size.z);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  scene.add(model);

  // Fix colour space on all textures (GLTF files export in sRGB)
  model.traverse(node => {
    if (!node.isMesh) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    mats.forEach(mat => {
      if (mat.map)         { mat.map.colorSpace         = THREE.SRGBColorSpace; mat.map.needsUpdate = true; }
      if (mat.emissiveMap) { mat.emissiveMap.colorSpace = THREE.SRGBColorSpace; mat.emissiveMap.needsUpdate = true; }
      mat.needsUpdate = true;
    });
  });

  // Recompute bounds after transform, then position home camera in front
  const box2   = new THREE.Box3().setFromObject(model);
  const ctr    = box2.getCenter(new THREE.Vector3());
  const sz     = box2.getSize(new THREE.Vector3());
  HOME_POS.set(ctr.x, ctr.y + 0.05, ctr.z + sz.z * 0.5 - 0.1);
  HOME_TAR.set(ctr.x, ctr.y - 0.1,  ctr.z);
  smoothTarget.copy(HOME_TAR);
  camProxy.x = HOME_POS.x; camProxy.y = HOME_POS.y; camProxy.z = HOME_POS.z;
  camera.position.copy(HOME_POS);
  camera.lookAt(HOME_TAR);

  setupScreens(model);
  hideLoader(() => showEnterGate());
}


// ================================================================
//  SCREEN SETUP
//  Finds all meshes named 'Screen' in the model, sorts them
//  spatially (top→bottom, left→right), assigns a canvas texture
//  from data.js, adds a coloured point light, and records a
//  camera position for the fly-in animation.
// ================================================================

function setupScreens(model) {
  const meshes = [];

  model.traverse(node => {
    if (!node.isMesh) return;
    const mat = Array.isArray(node.material) ? node.material[0] : node.material;
    if (!mat || mat.name !== 'Screen') return;

    const wp     = new THREE.Vector3();
    const normal = new THREE.Vector3(0, 0, 1);
    node.getWorldPosition(wp);
    if (node.parent) {
      const q = new THREE.Quaternion();
      node.parent.getWorldQuaternion(q);
      normal.applyQuaternion(q);
    }
    meshes.push({ mesh: node, wp, normal });
  });

  // Sort top-to-bottom (y desc) then left-to-right (x asc).
  // The 0.25 threshold groups screens into rows despite arc depth differences.
  meshes.sort((a, b) => {
    const dy = b.wp.y - a.wp.y;
    return Math.abs(dy) > 0.25 ? dy : a.wp.x - b.wp.x;
  });

  meshes.forEach(({ mesh, wp, normal }, i) => {
    if (i >= PORTFOLIO_DATA.screens.length) return;
    const data = PORTFOLIO_DATA.screens[i];

    // Each screen gets its own cloned material so emissive can vary independently
    mesh.material = mesh.material.clone();
    const tex     = buildScreenTexture(data);
    tex.needsUpdate = true;

    mesh.material.map               = tex;
    mesh.material.emissiveMap       = tex;
    mesh.material.emissive          = new THREE.Color(1, 1, 1);
    mesh.material.emissiveIntensity = 0;   // boot sequence lights it up
    mesh.material.color             = new THREE.Color(0x000000);
    mesh.material.needsUpdate       = true;

    // Coloured point light matches the screen glow
    const ptLight = new THREE.PointLight(data.glowColor, 0, 4.0);
    ptLight.position.copy(wp);
    scene.add(ptLight);

    // Fly-in camera position: stand along the screen's outward normal
    const offset = normal.clone().multiplyScalar(0.55);
    if (offset.z < 0) offset.z = Math.abs(offset.z) + 0.55; // don't go behind model
    const camPos = wp.clone().add(offset);
    camPos.z = Math.max(camPos.z, wp.z + 0.4);

    screenEntries.push({
      screenMesh: mesh,
      ptLight,
      data,
      worldPos: wp.clone(),
      camPos,
      _intensity: 0,
      booted: false, // becomes true after the flicker animation completes
    });
  });
}


// ================================================================
//  SCREEN TEXTURES
//  Each screen type gets a 512×384 canvas baked into a texture.
//  Background = glowColor; icons/numbers are drawn dark on top.
//  The UV coordinates in scene.bin were rewritten to clean 0→1
//  so textures map directly with no repeat/offset tricks needed.
// ================================================================

function buildScreenTexture(data) {
  const W = 512, H = 384;
  const cv  = document.createElement('canvas');
  cv.width  = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const mx  = W / 2;
  const dark = 'rgba(0,0,0,0.75)';

  // Bright coloured background
  ctx.fillStyle   = data.glowColor;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // CRT scanlines
  for (let y = 0; y < H; y += 5) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, y, W, 2);
  }

  // Vignette edges
  const vgr = ctx.createRadialGradient(W/2, H/2, H * 0.25, W/2, H/2, H * 0.75);
  vgr.addColorStop(0, 'rgba(0,0,0,0)');
  vgr.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vgr;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  if (data.type === 'project') {
    // Large two-digit number (01, 02, …)
    const idx = PORTFOLIO_DATA.screens.filter(s => s.type === 'project').indexOf(data);
    ctx.font        = 'bold 280px monospace';
    ctx.fillStyle   = dark;
    ctx.globalAlpha = 0.55;
    ctx.fillText(String(idx + 1).padStart(2, '0'), mx, H * 0.85);
    ctx.globalAlpha = 1;

  } else if (data.type === 'minor-projects') {
    // Folder brackets
    ctx.font        = 'bold 190px monospace';
    ctx.fillStyle   = dark;
    ctx.globalAlpha = 0.75;
    ctx.fillText('[  ]', mx, H * 0.63);
    ctx.globalAlpha = 1;
    ctx.font        = 'bold 44px monospace';
    ctx.globalAlpha = 0.65;
    ctx.fillText('ARCHIVE', mx, H * 0.88);
    ctx.globalAlpha = 1;

  } else if (data.type === 'about') {
    // Person silhouette (head circle + shoulder arc)
    ctx.strokeStyle = dark; ctx.lineWidth = 8; ctx.globalAlpha = 0.50;
    ctx.beginPath(); ctx.arc(mx, H * 0.42, 55, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx - 80, H * 0.88);
    ctx.quadraticCurveTo(mx, H * 0.65, mx + 80, H * 0.88);
    ctx.stroke();
    ctx.globalAlpha = 1;

  } else if (data.type === 'skills') {
    // Progress bars
    const bx = W * 0.12, bw = W * 0.76, bh = 22, gap = 32;
    [0.88, 0.72, 0.91, 0.60, 0.78].forEach((pct, i) => {
      const y = H * 0.18 + i * (bh + gap);
      ctx.fillStyle = dark; ctx.globalAlpha = 0.15; ctx.fillRect(bx, y, bw,      bh);
      ctx.fillStyle = dark; ctx.globalAlpha = 0.55; ctx.fillRect(bx, y, bw * pct, bh);
    });
    ctx.globalAlpha = 1;

  } else if (data.type === 'contact') {
    // Envelope icon
    const [ex, ey, ew, eh] = [mx - 80, H * 0.28, 160, 100];
    ctx.strokeStyle = dark; ctx.lineWidth = 7; ctx.globalAlpha = 0.55;
    ctx.strokeRect(ex, ey, ew, eh);
    ctx.beginPath();
    ctx.moveTo(ex, ey); ctx.lineTo(mx, ey + eh * 0.5); ctx.lineTo(ex + ew, ey);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Subtle border
  ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.globalAlpha = 0.3;
  ctx.strokeRect(2, 2, W - 4, H - 4);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


// ================================================================
//  BOOT SEQUENCE
//  Called after the user clicks ENTER. Lights up each screen one
//  by one with a CRT flicker effect. Sets entry.booted = true when
//  done so the screen becomes interactive.
// ================================================================

function bootSequence() {
  setTimeout(showHero, 800);

  screenEntries.forEach((entry, i) => {
    gsap.to(entry, {
      _intensity: 3,
      duration: 0.06,
      delay: 0.6 + i * 0.22,
      onUpdate() {
        entry.screenMesh.material.emissiveIntensity = entry._intensity;
        entry.ptLight.intensity                     = entry._intensity * 2.5;
      },
      onComplete() {
        flickerOn(entry, () => {
          entry._intensity                            = 3;
          entry.screenMesh.material.emissiveIntensity = 3;
          entry.ptLight.intensity                     = 2.5;
          entry.booted = true; // screen is now interactive
        });
      },
    });
  });
}

// Simulates a CRT tube flickering on (rapid intensity changes)
function flickerOn(entry, onComplete) {
  const tl = gsap.timeline({ onComplete });
  [0.1, 3.0, 0.05, 3.5, 0.3, 3.0].forEach(v => {
    tl.to(entry, {
      _intensity: v,
      duration: 0.04,
      onUpdate() {
        entry.screenMesh.material.emissiveIntensity = entry._intensity;
        entry.ptLight.intensity                     = entry._intensity * 2.5;
      },
    });
  });
}


// ================================================================
//  HERO TEXT
//  Shown at the bottom of the screen after the boot sequence.
//  The name types out character-by-character like a CRT terminal.
// ================================================================

function showHero() {
  const hero      = document.getElementById('hero-overlay');
  const nameEl    = document.getElementById('hero-name');
  const tagEl     = document.getElementById('hero-tag');
  const taglineEl = document.getElementById('hero-tagline');
  const hintEl    = document.getElementById('hero-hint');

  hero.classList.remove('hidden');
  hero.style.opacity = '1';

  // Persist the full name across repeated calls (flyHome re-calls showHero)
  const fullName = nameEl.dataset.full || nameEl.textContent;
  nameEl.dataset.full = fullName;

  // Tag fades in first
  tagEl.style.opacity = '0';
  gsap.to(tagEl, { opacity: 1, duration: 0.6 });

  // Name types out character by character at 85ms per character
  nameEl.textContent  = '';
  nameEl.style.opacity = '1';
  let charIdx = 0;
  const TYPE_SPEED_MS = 85; // ms per character — lower = faster typing
  const typeTimer = setInterval(() => {
    charIdx++;
    nameEl.textContent = fullName.slice(0, charIdx) + (charIdx < fullName.length ? '_' : '');
    if (charIdx >= fullName.length) {
      clearInterval(typeTimer);
      setTimeout(() => { nameEl.textContent = fullName; }, 500);
    }
  }, TYPE_SPEED_MS);

  // Tagline and hint fade in after the name finishes
  const afterName = fullName.length * TYPE_SPEED_MS + 600;
  taglineEl.style.opacity = '0';
  hintEl.style.opacity    = '0';
  setTimeout(() => gsap.to(taglineEl, { opacity: 1, duration: 0.8 }), afterName);
  setTimeout(() => gsap.to(hintEl,    { opacity: 1, duration: 0.8 }), afterName + 300);
}

function hideHero() {
  const hero = document.getElementById('hero-overlay');
  gsap.to(hero, { opacity: 0, duration: 0.4,
    onComplete: () => hero.classList.add('hidden') });
}


// ================================================================
//  ENTER GATE
//  Browsers block all audio until the user directly interacts with
//  the page. There is no workaround. We use this gate as an
//  intentional intro moment (like a game title screen) rather than
//  trying to fight the policy. One click → music + boot.
// ================================================================

const enterGate = document.getElementById('enter-gate');
const enterBtn  = document.getElementById('enter-btn');

function showEnterGate() {
  enterGate.classList.remove('hidden');
  gsap.fromTo(enterBtn,
    { opacity: 0, scale: 0.85 },
    { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)', delay: 0.15 }
  );
}

enterBtn.addEventListener('click', () => {
  startBgMusic(); // must be inside a click handler for browser audio policy
  gsap.to(enterGate, { opacity: 0, duration: 0.4, onComplete: () => {
    enterGate.classList.add('hidden');
    bootSequence();
  }});
});

// Keyboard / touch fallback — triggers the button click
['keydown', 'touchstart'].forEach(evt =>
  window.addEventListener(evt, () => {
    if (!enterGate.classList.contains('hidden')) enterBtn.click();
  }, { once: true })
);


// ================================================================
//  HOVER
//  Raycasts from mouse each frame. Only booted screens are hittable.
//  Triggers a brief UV-shift glitch when cursor first lands on a screen.
// ================================================================

const screenLabelEl = document.getElementById('screen-label');
const cursorDot     = document.getElementById('custom-cursor');
const cursorRing    = document.getElementById('custom-cursor-ring');
let ringX = 0, ringY = 0;

window.addEventListener('mousemove', e => {
  // NDC mouse coords for raycaster
  mouse.x =  (e.clientX / innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;

  // Hover label follows cursor
  screenLabelEl.style.left = e.clientX + 'px';
  screenLabelEl.style.top  = (e.clientY - 20) + 'px';

  // Custom cursor dot (instant) and ring (lags — see updateCursorRing)
  cursorDot.style.left = e.clientX + 'px';
  cursorDot.style.top  = e.clientY  + 'px';
  cursorDot._tx = e.clientX;
  cursorDot._ty = e.clientY;

  // Mouse parallax target — inverted so camera drifts away from cursor
  parallax.targetX = -(e.clientX / innerWidth  - 0.5) * 0.30;
  parallax.targetY =  (e.clientY / innerHeight - 0.5) * 0.15;
});

// Cursor ring follows the dot with a lag (updated in render loop)
function updateCursorRing() {
  if (!cursorDot._tx) return;
  ringX += (cursorDot._tx - ringX) * 0.12;
  ringY += (cursorDot._ty - ringY) * 0.12;
  cursorRing.style.left = ringX + 'px';
  cursorRing.style.top  = ringY + 'px';
}

// Brief UV offset glitch when the cursor first hovers a screen.
// Subtle — just enough to feel reactive without being distracting.
function triggerGlitch(mesh) {
  const mat = mesh.material;
  if (!mat.map) return;
  const ox = mat.map.offset.x, oy = mat.map.offset.y;
  // 4 frames of small offset jitter then reset
  const frames = [[0.008, 0.002], [-0.006, -0.003], [0.004, -0.001], [0, 0]];
  let f = 0;
  (function step() {
    if (f >= frames.length) { mat.map.offset.set(ox, oy); mat.map.needsUpdate = true; return; }
    mat.map.offset.set(ox + frames[f][0], oy + frames[f][1]);
    mat.map.needsUpdate = true;
    f++;
    setTimeout(step, 30);
  })();
}

function checkHover() {
  if (activeScreen || isAnimating) { clearHover(); return; }

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(screenEntries.map(e => e.screenMesh), false);

  // Only accept a hit on a screen that has finished its boot animation
  const hit = hits.length ? screenEntries.find(e => e.screenMesh === hits[0].object && e.booted) : null;

  if (hit && hit !== hoveredEntry) {
    clearHover();
    hoveredEntry = hit;
    gsap.to(hit.screenMesh.material, { emissiveIntensity: 5.0, duration: 0.2 });
    gsap.to(hit.ptLight,             { intensity: 5.0,          duration: 0.2 });
    triggerGlitch(hit.screenMesh);

    // Format label: "PROJECT.01", "ABOUT.ME", etc.
    const label = hit.data.label.replace(/([A-Z_]+)_(\d+)$/, (_, a, b) => a.replace(/_/g, '') + '.' + b);
    screenLabelEl.textContent = label;
    screenLabelEl.classList.add('visible');
    document.body.classList.add('hovering-screen');

  } else if (!hit) {
    clearHover();
  }
}

function clearHover() {
  if (hoveredEntry) {
    gsap.to(hoveredEntry.screenMesh.material, { emissiveIntensity: 3,   duration: 0.25 });
    gsap.to(hoveredEntry.ptLight,             { intensity: 2.5,          duration: 0.25 });
    hoveredEntry = null;
  }
  screenLabelEl.classList.remove('visible');
  document.body.classList.remove('hovering-screen');
}


// ================================================================
//  CLICK & KEYBOARD
//  Mouse click on a hovered screen flies to it.
//  Keys 1–9 jump directly to that screen number.
//  Escape returns home from any screen.
// ================================================================

canvas.addEventListener('click', () => {
  if (isAnimating || activeScreen || !hoveredEntry) return;
  playClickBuzz();
  flyToScreen(hoveredEntry);
});

window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && activeScreen) {
    document.getElementById('back-btn').click();
    return;
  }
  const n = parseInt(e.key);
  if (n >= 1 && n <= 9 && !activeScreen && !isAnimating) {
    const entry = screenEntries[n - 1];
    if (entry && entry.booted) { playClickBuzz(); flyToScreen(entry); }
  }
});


// ================================================================
//  TOUCH SUPPORT
//  Tap on a screen to fly to it.
//  Swipe horizontally (>60px) while inside a screen to go back.
// ================================================================

let touchStartX = 0, touchStartY = 0;

canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  mouse.x =  (touchStartX / innerWidth)  * 2 - 1;
  mouse.y = -(touchStartY / innerHeight) * 2 + 1;
  checkHover(); // populate hoveredEntry before touchend fires
}, { passive: true });

canvas.addEventListener('touchend', e => {
  const dx   = e.changedTouches[0].clientX - touchStartX;
  const dy   = e.changedTouches[0].clientY - touchStartY;
  const dist = Math.hypot(dx, dy);
  if (dist < 10 && !isAnimating && !activeScreen && hoveredEntry) {
    playClickBuzz(); flyToScreen(hoveredEntry); // tap
  } else if (Math.abs(dx) > 60 && activeScreen) {
    document.getElementById('back-btn').click(); // swipe back
  }
}, { passive: true });


// ================================================================
//  FLY TO SCREEN
//  Smoothly animates the camera from home to in front of a screen.
//  Uses camProxy as the GSAP target; render loop reads it each frame.
//  The look-at is interpolated in sync so there's no pop/snap.
// ================================================================

function flyToScreen(entry) {
  playScreenAmbient(entry.data.type);
  isAnimating  = true;
  drift.active = false;
  parallax.targetX = 0; parallax.targetY = 0;
  parallax.currentX = 0; parallax.currentY = 0;
  clearHover();
  hideHero();

  const lookFrom = smoothTarget.clone(); // current look-at (HOME_TAR)
  const lookTo   = entry.worldPos;

  gsap.to(camProxy, {
    x: entry.camPos.x, y: entry.camPos.y, z: entry.camPos.z,
    duration: 1.6,
    ease: 'power3.inOut',
    onUpdate() {
      camera.position.set(camProxy.x, camProxy.y, camProxy.z);
      smoothTarget.lerpVectors(lookFrom, lookTo, this.progress());
      camera.lookAt(smoothTarget);
    },
    onComplete() {
      camera.position.set(entry.camPos.x, entry.camPos.y, entry.camPos.z);
      camera.lookAt(entry.worldPos);
      smoothTarget.copy(entry.worldPos);
      isAnimating  = false;
      activeScreen = entry;
      openTerminal(entry);

      // Back button adopts the screen's accent colour
      const btn = document.getElementById('back-btn');
      const col = entry.data.glowColor;
      btn.classList.remove('hidden');
      btn.style.color       = col;
      btn.style.borderColor = col;
      btn.style.textShadow  = `0 0 8px ${col}`;
      btn.style.boxShadow   = `0 0 10px ${col}40`;
    },
  });
}


// ================================================================
//  FLY HOME
//  Returns camera to the home position and re-enables parallax.
// ================================================================

function flyHome() {
  closeTerminal();

  // Reset back button to default green
  const btn = document.getElementById('back-btn');
  btn.classList.add('hidden');
  btn.style.color = btn.style.borderColor = btn.style.textShadow = btn.style.boxShadow = '';

  isAnimating  = true;
  activeScreen = null;

  const lookFrom = smoothTarget.clone(); // screen worldPos
  const lookTo   = HOME_TAR.clone();

  gsap.to(camProxy, {
    x: HOME_POS.x, y: HOME_POS.y, z: HOME_POS.z,
    duration: 1.4,
    ease: 'power3.inOut',
    onUpdate() {
      camera.position.set(camProxy.x, camProxy.y, camProxy.z);
      smoothTarget.lerpVectors(lookFrom, lookTo, this.progress());
      camera.lookAt(smoothTarget);
    },
    onComplete() {
      camera.position.copy(HOME_POS);
      smoothTarget.copy(HOME_TAR);
      camera.lookAt(HOME_TAR);
      camProxy.x = HOME_POS.x; camProxy.y = HOME_POS.y; camProxy.z = HOME_POS.z;
      drift.active = true;
      isAnimating  = false;
      showHero();
    },
  });
}

document.getElementById('back-btn').addEventListener('click', flyHome);
document.getElementById('terminal-close').addEventListener('click', flyHome);


// ================================================================
//  TERMINAL
//  The info overlay that slides in after a fly-in completes.
//  The --screen-color CSS variable is set here so every coloured
//  element inside the terminal (borders, labels, bars) matches
//  the current screen's glowColor automatically.
// ================================================================

const overlay    = document.getElementById('terminal-overlay');
const termTitle  = document.getElementById('terminal-title');
const termBody   = document.getElementById('terminal-body');
const termNav    = document.getElementById('terminal-nav');
const navCounter = document.getElementById('nav-counter');

function openTerminal(entry) {
  termTitle.textContent = entry.data.label;
  termBody.innerHTML    = '';
  termNav.classList.add('hidden');

  // Set accent colour — all CSS classes inside the terminal read from this variable
  document.getElementById('terminal-window')
    .style.setProperty('--screen-color', entry.data.glowColor);

  const { type, content } = entry.data;
  if      (type === 'about')          renderAbout(content);
  else if (type === 'skills')         renderSkills(content);
  else if (type === 'contact')        renderContact(content);
  else if (type === 'project')        renderProject(content);
  else if (type === 'minor-projects') renderMinorProjects(content);

  overlay.classList.remove('hidden');
  gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.35 });
}

function closeTerminal() {
  gsap.to(overlay, { opacity: 0, duration: 0.2,
    onComplete: () => overlay.classList.add('hidden') });
}


// ================================================================
//  CONTENT RENDERERS
//  Each function builds the HTML for one screen type and injects
//  it into termBody. Edit the templates here to change the layout.
// ================================================================

function renderAbout(c) {
  termBody.innerHTML = `
    <p class="t-prompt">&gt; ${c.heading}_</p>
    <p class="t-label">ROLE</p>
    <p class="t-value">${c.subheading}</p>
    <hr class="t-divider"/>
    <p class="t-label">ABOUT</p>
    <p class="t-value" style="white-space:pre-line">${c.bio}</p>
    <hr class="t-divider"/>
    <p class="t-label">LINKS</p>
    <p>${c.links.map(l => `<a class="t-link" href="${l.url}" target="_blank">[ ${l.label} ]</a>`).join('  ')}</p>`;
}

function renderSkills(c) {
  let html = `<p class="t-prompt">&gt; ${c.heading}_</p>`;
  c.categories.forEach(cat => {
    html += `<p class="t-label">${cat.name}</p>`;
    cat.skills.forEach(sk => {
      html += `
        <div class="skill-bar-wrap">
          <div class="skill-bar-label"><span>${sk.name}</span><span>${sk.level}%</span></div>
          <div class="skill-bar-track"><div class="skill-bar-fill" data-level="${sk.level}"></div></div>
        </div>`;
    });
    html += '<hr class="t-divider"/>';
  });
  termBody.innerHTML = html;
  // Animate bars in one at a time
  requestAnimationFrame(() => {
    document.querySelectorAll('.skill-bar-fill').forEach((el, i) => {
      setTimeout(() => { el.style.width = el.dataset.level + '%'; }, i * 55);
    });
  });
}

function renderContact(c) {
  termBody.innerHTML = `
    <p class="t-prompt">&gt; ${c.heading}_</p>
    <hr class="t-divider"/>
    ${c.lines.map(l => {
      const val = l.url
        ? `<a class="t-link" href="${l.url}" target="_blank">${l.value}</a>`
        : `<span class="t-value">${l.value}</span>`;
      return `<p class="t-label">${l.label}</p><p>${val}</p>`;
    }).join('')}
    <hr class="t-divider"/>
    <p class="t-value" style="color:var(--amber);letter-spacing:2px;">${c.availability}</p>`;
}

function renderProject(c) {
  const compBadge = c.competition
    ? `<span class="t-tag" style="color:var(--amber);border-color:var(--amber);">${c.competition}</span>` : '';
  const demoLink = c.demo
    ? `<a class="t-link" href="${c.demo}" target="_blank">[ LIVE DEMO ]</a>&nbsp;&nbsp;` : '';

  // Extract YouTube video ID from any supported URL format
  const ytId = c.youtube
    ? (c.youtube.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/) || [])[1] : null;

  const videoPanel = ytId ? `
    <div class="proj-video-wrap">
      <div class="proj-video-thumb" style="background-image:url(https://img.youtube.com/vi/${ytId}/mqdefault.jpg)">
        <div class="proj-video-play-btn">&#9654;</div>
      </div>
    </div>` : '';

  // Two-column layout: metadata left, video thumbnail right
  termBody.innerHTML = `
    <div class="proj-layout">
      <div class="proj-left">
        <p class="t-prompt">&gt; ${c.title}_</p>
        <p class="t-label">SYNOPSIS</p>
        <p class="t-value">${c.subtitle}</p>
        <div class="t-divider-sm"></div>
        <p class="t-label">STACK</p>
        <p>${c.stack.map(t => `<span class="t-tag">${t}</span>`).join('')}${compBadge}</p>
        <div class="t-divider-sm"></div>
        <p class="t-label">LINKS</p>
        <p>${demoLink}<a class="t-link" href="${c.github}" target="_blank">[ GITHUB ]</a></p>
        <div class="t-divider-sm"></div>
        <p class="t-label">YEAR</p><p class="t-value">${c.year}</p>
      </div>
      ${ytId ? `<div class="proj-right">${videoPanel}</div>` : ''}
    </div>
    <hr class="t-divider"/>
    <p class="t-label">DESCRIPTION</p>
    <p class="t-value" style="white-space:pre-line">${c.description}</p>`;

  if (ytId) {
    termBody.querySelector('.proj-video-thumb')
      ?.addEventListener('click', () => openVideoPlayer(ytId, c.title));
  }
}

function renderMinorProjects(c) {
  minorProjects = c.projects;
  minorIndex    = 0;
  termNav.classList.remove('hidden');
  renderMinorPage(0);
  updateNavCounter();
}

function renderMinorPage(idx) {
  const p = minorProjects[idx];
  termBody.innerHTML = `
    <p class="t-prompt">&gt; ${p.title}_</p>
    <p class="t-label">YEAR</p><p class="t-value">${p.year}</p>
    <hr class="t-divider"/>
    <p class="t-label">ABOUT</p><p class="t-value">${p.desc}</p>
    <hr class="t-divider"/>
    <p class="t-label">STACK</p>
    <p>${p.stack.map(t => `<span class="t-tag">${t}</span>`).join('')}</p>
    <hr class="t-divider"/>
    <p class="t-label">REPO</p>
    <p><a class="t-link" href="${p.github}" target="_blank">[ GITHUB ]</a></p>`;
  gsap.fromTo(termBody, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.2 });
}

function updateNavCounter() {
  navCounter.textContent = `${minorIndex + 1} / ${minorProjects.length}`;
}

document.getElementById('nav-next').addEventListener('click', () => {
  if (minorIndex < minorProjects.length - 1) { minorIndex++; renderMinorPage(minorIndex); updateNavCounter(); }
});
document.getElementById('nav-prev').addEventListener('click', () => {
  if (minorIndex > 0) { minorIndex--; renderMinorPage(minorIndex); updateNavCounter(); }
});


// ================================================================
//  VIDEO PLAYER
//  Full-screen-style modal that embeds a YouTube video.
//  Background music pauses while the video is open and resumes
//  when it's closed.
// ================================================================

function openVideoPlayer(ytId, title) {
  if (bgMusic && !bgMusic.paused) {
    bgMusic._pausedForVideo = true;
    bgMusic.pause();
  }

  const modal = document.getElementById('video-modal');
  const inner = document.getElementById('video-modal-inner');

  // Inherit the current screen's accent colour
  const col = document.getElementById('terminal-window')
    ?.style.getPropertyValue('--screen-color') || '#00ff88';
  inner.style.setProperty('--screen-color', col);
  inner.style.borderTopColor = col;
  const titleEl = document.getElementById('video-title');
  titleEl.textContent  = title.toUpperCase();
  titleEl.style.color  = col;
  titleEl.style.textShadow = `0 0 8px ${col}`;

  document.getElementById('video-iframe').src =
    `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`;

  modal.classList.remove('hidden');
  gsap.fromTo(modal, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
}

function closeVideoPlayer() {
  gsap.to(document.getElementById('video-modal'), { opacity: 0, duration: 0.25, onComplete: () => {
    document.getElementById('video-modal').classList.add('hidden');
    document.getElementById('video-iframe').src = ''; // stops playback
  }});
  if (bgMusic && bgMusic._pausedForVideo) {
    bgMusic._pausedForVideo = false;
    bgMusic.play().catch(() => {});
  }
}

document.getElementById('video-close').addEventListener('click', closeVideoPlayer);
// Click the backdrop to close
document.getElementById('video-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('video-modal')) closeVideoPlayer();
});
// Native browser fullscreen for the iframe
document.getElementById('video-fullscreen').addEventListener('click', () => {
  const f = document.getElementById('video-iframe');
  (f.requestFullscreen || f.webkitRequestFullscreen)?.call(f);
});


// ================================================================
//  BACKGROUND MUSIC
//  Fades in from silence after the user clicks ENTER.
//  Controlled by the mute button (bottom-right corner).
//  Volume target: 0.18 (quiet enough not to dominate speech).
// ================================================================

let bgMusic        = null;
let bgMusicStarted = false;
let bgMuted        = false;
const BG_VOLUME    = 0.18; // raise for louder music (max 1.0)

function startBgMusic() {
  if (bgMusicStarted || !PORTFOLIO_DATA.bgMusic) return;
  bgMusicStarted = true;
  bgMusic        = new Audio(PORTFOLIO_DATA.bgMusic);
  bgMusic.loop   = true;
  bgMusic.volume = 0;
  bgMusic.play().catch(() => {}); // silently fails if browser still blocks

  let vol = 0;
  const fadeIn = setInterval(() => {
    vol = Math.min(vol + 0.008, BG_VOLUME);
    bgMusic.volume = bgMuted ? 0 : vol;
    if (vol >= BG_VOLUME) clearInterval(fadeIn);
  }, 100);
}

document.getElementById('mute-btn')?.addEventListener('click', () => {
  bgMuted = !bgMuted;
  if (bgMusic) bgMusic.volume = bgMuted ? 0 : BG_VOLUME;
  const btn = document.getElementById('mute-btn');
  btn.textContent = bgMuted ? '🔇' : '🔊';
  btn.title       = bgMuted ? 'Unmute music' : 'Mute music';
  btn.classList.toggle('muted', bgMuted);
});


// ================================================================
//  AUDIO FX
//  Two synthesised sounds — no audio files required.
//
//  playClickBuzz  — fired on every screen click
//  playScreenAmbient — fired on fly-in; distinct tone per screen type
//
//  To tweak ambient tones, edit AMBIENT_CONFIGS below.
//  freq = base pitch in Hz, detune = fine-tune in cents (±100 = semitone).
// ================================================================

function playClickBuzz() {
  try {
    const ac = new (AudioContext || webkitAudioContext)();
    // Low sawtooth sweep
    const o1 = ac.createOscillator(), g1 = ac.createGain();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(80, ac.currentTime);
    o1.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.12);
    g1.gain.setValueAtTime(0.35, ac.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
    o1.connect(g1); g1.connect(ac.destination);
    o1.start(); o1.stop(ac.currentTime + 0.15);
    // High square harmonic
    const o2 = ac.createOscillator(), g2 = ac.createGain();
    o2.type = 'square';
    o2.frequency.setValueAtTime(160, ac.currentTime);
    o2.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.08);
    g2.gain.setValueAtTime(0.15, ac.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.10);
    o2.connect(g2); g2.connect(ac.destination);
    o2.start(); o2.stop(ac.currentTime + 0.10);
    setTimeout(() => ac.close(), 300);
  } catch (e) {}
}

// Ambient tone configs — two oscillators per screen type
const AMBIENT_CONFIGS = {
  'project':        [{ type: 'sine',     freq: 220, detune: 0 }, { type: 'sine',     freq: 330, detune: 5 }],
  'about':          [{ type: 'sine',     freq: 174, detune: 0 }, { type: 'triangle', freq: 261, detune: 3 }],
  'skills':         [{ type: 'sawtooth', freq: 110, detune: 0 }, { type: 'sine',     freq: 220, detune: 7 }],
  'contact':        [{ type: 'sine',     freq: 196, detune: 0 }, { type: 'sine',     freq: 294, detune: 4 }],
  'minor-projects': [{ type: 'triangle', freq: 146, detune: 0 }, { type: 'sine',     freq: 220, detune: 6 }],
};

function playScreenAmbient(screenType) {
  try {
    const ac     = new (AudioContext || webkitAudioContext)();
    const master = ac.createGain();
    master.gain.setValueAtTime(0,    ac.currentTime);
    master.gain.linearRampToValueAtTime(0.12, ac.currentTime + 0.3);
    master.gain.linearRampToValueAtTime(0,    ac.currentTime + 2.2);
    master.connect(ac.destination);

    (AMBIENT_CONFIGS[screenType] || AMBIENT_CONFIGS.project).forEach(({ type, freq, detune }) => {
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type            = type;
      osc.frequency.value = freq;
      osc.detune.value    = detune;
      g.gain.value        = 0.5;
      osc.connect(g); g.connect(master);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 2.5);
    });

    setTimeout(() => ac.close(), 3000);
  } catch (e) {}
}


// ================================================================
//  RENDER LOOP
//  Runs every animation frame. Applies mouse parallax at home,
//  updates the lagging cursor ring, and renders the scene.
// ================================================================

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

(function animate() {
  requestAnimationFrame(animate);
  checkHover();

  // Mouse parallax — smooth lerp, only active at home
  if (!activeScreen && !isAnimating && drift.active) {
    parallax.currentX += (parallax.targetX - parallax.currentX) * 0.04;
    parallax.currentY += (parallax.targetY - parallax.currentY) * 0.04;
    camera.position.set(
      camProxy.x + parallax.currentX,
      camProxy.y + parallax.currentY,
      camProxy.z
    );
    camera.lookAt(HOME_TAR);
  }

  updateCursorRing();
  renderer.render(scene, camera);
})();


// ================================================================
//  FILM GRAIN
//  Animates a half-resolution noise canvas at 60fps.
//  CSS scales it up and blends it over the 3D canvas.
//  Rendered at 50% size for performance.
// ================================================================

(function initGrain() {
  const gc   = document.getElementById('grain-canvas');
  const gctx = gc.getContext('2d');
  let gw, gh;

  function resize() {
    gw = gc.width  = Math.floor(innerWidth  / 2);
    gh = gc.height = Math.floor(innerHeight / 2);
  }
  resize();
  window.addEventListener('resize', resize);

  (function drawGrain() {
    const img = gctx.createImageData(gw, gh);
    const d   = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255 | 0;
      d[i] = d[i+1] = d[i+2] = v;
      d[i+3] = 255;
    }
    gctx.putImageData(img, 0, 0);
    requestAnimationFrame(drawGrain);
  })();
})();

})(); // end IIFE
