// model3d.js  ✅ SINGLE CANVAS for ALL ".three-slot" models (Android-friendly)
// Replaces the per-slot canvases with ONE WebGL context + 8 viewports (scissor/viewport).
// Keeps your hero viewer unchanged and keeps autorotation behavior.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

console.log("model3d.js loaded ✅");

const loader = new GLTFLoader();
const gltfCache = new Map();

const dLoader = new DRACOLoader();
dLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
loader.setDRACOLoader(dLoader);

function loadGLB(url) {
  if (!url) return Promise.reject(new Error("Missing GLB url"));
  if (gltfCache.has(url)) return gltfCache.get(url);
  const p = new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
  gltfCache.set(url, p);
  return p;
}

const GROUP_SETTINGS = {
  hero: {
    exposure: 2.2,
    ambient: 1.2,
    hemi: 1.2,
    key: 2.5,
    fill: 1.2,
    autoRotate: true,
    rotateSpeed: 0.6
  },
  lines: {
    exposure: 1.25,
    ambient: 0.9,
    hemi: 0.9,
    key: 1.8,
    fill: 0.8,
    autoRotate: false,
    rotateSpeed: 0
  },
  small: {
    exposure: 1.6,
    ambient: 1.2,
    hemi: 1.2,
    key: 2.5,
    fill: 1.2,
    autoRotate: true,
    rotateSpeed: 2.0
  }
};

function makeGlassMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    metalness: 0.005,
    transmission: 1.0,
    transparent: true,
    opacity: 0.95,
    ior: 1.52,
    thickness: 0.01,
    roughness: 0.001,
    envMapIntensity: 5.0,
    specularIntensity: 1.0,
    specularColor: new THREE.Color(0xffffff),
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    side: THREE.DoubleSide
  });

  m.depthWrite = false;
  m.depthTest = true;
  return m;
}

function applySingleMaterial(root, materialFactory, renderOrder) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;

    const oldMat = obj.material;
    if (Array.isArray(oldMat)) oldMat.forEach((m) => m && m.dispose());
    else if (oldMat) oldMat.dispose();

    obj.material = materialFactory();
    obj.renderOrder = renderOrder;
  });
}

/* ------------------------------------------------------------------
   ✅ ORIGINAL per-mount viewer (keep for HERO big model)
   ------------------------------------------------------------------ */
function createViewer(mountEl, MODEL_URL, targetSize = 1.6, offsetY = -0.4, group = "hero") {
  const s = GROUP_SETTINGS[group] || GROUP_SETTINGS.hero;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const isAndroid = /Android/i.test(navigator.userAgent);
  renderer.setPixelRatio(isAndroid ? 1.25 : Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = s.exposure;
  mountEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(0, 0.8, 3.2);

  scene.add(new THREE.AmbientLight(0xffffff, s.ambient));

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, s.hemi);
  hemi.position.set(0, 2, 0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, s.key);
  key.position.set(3, 5, 2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, s.fill);
  fill.position.set(-4, 2, 4);
  scene.add(fill);

  if (group === "hero") {
    const rim = new THREE.DirectionalLight(0xffffff, 0.9);
    rim.position.set(-3, 2.5, -3);
    scene.add(rim);
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableRotate = mountEl.dataset.userRotate !== "false";
  controls.minPolarAngle = Math.PI / 2;
  controls.maxPolarAngle = Math.PI / 2;
  controls.autoRotate = s.autoRotate;
  controls.autoRotateSpeed = s.rotateSpeed ?? 0.6;

  function resize() {
    const w = mountEl.clientWidth;
    const h = mountEl.clientHeight || Math.round((w * 2) / 3);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(mountEl);
  resize();

  if (group === "hero") {
    const pmrem = new THREE.PMREMGenerator(renderer);

    // Studio-like reflections without loading an HDR file
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    pmrem.dispose();
  }

  loadGLB(MODEL_URL)
    .then((mainGltf) => {
      const mainModel = mainGltf.scene.clone(true);
      const combined = new THREE.Group();
      combined.add(mainModel);

      if (group === "hero") applySingleMaterial(mainModel, makeGlassMaterial, 2);

      if (group === "small") {
        combined.rotation.y = Math.random() * Math.PI * 2;
        combined.rotation.x = (Math.random() - 0.5) * 0.25;
        combined.rotation.z = (Math.random() - 0.5) * 0.15;

        combined.traverse((obj) => {
          if (!obj.isMesh) return;

          const oldMat = obj.material;
          if (Array.isArray(oldMat)) oldMat.forEach((m) => m && m.dispose());
          else if (oldMat) oldMat.dispose();

          obj.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#5b5b5b"),
            metalness: 0.0,
            roughness: 0.9
          });
        });
      }

      const box = new THREE.Box3().setFromObject(combined);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      combined.position.sub(center);
      combined.position.y += offsetY;

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = targetSize / maxDim;
      combined.scale.setScalar(scale);

      if (group === "hero") combined.rotation.x = THREE.MathUtils.degToRad(25);

      scene.add(combined);
      controls.target.set(0, 0, 0);
      controls.update();
    })
    .catch((err) => {
      console.error("❌ GLB load error:", err);
      console.error("➡️ main:", MODEL_URL);
    });

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

/* ------------------------------------------------------------------
   ✅ NEW: Shared canvas viewer for ALL small slots (ONE WebGL context)
   ------------------------------------------------------------------ */
function createSharedSlotsViewer(containerEl, slots) {
  // Make sure container is a positioning context for the overlay canvas
  containerEl.style.position = containerEl.style.position || "relative";

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const isAndroid = /Android/i.test(navigator.userAgent);
  renderer.setPixelRatio(isAndroid ? 1.25 : Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setScissorTest(true);

  // Overlay canvas that covers the whole container
  const canvas = renderer.domElement;
  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.zIndex = "1"; // IMPORTANT: on top so you actually see it
  canvas.style.pointerEvents = "none"; // matches data-user-rotate="false"
  containerEl.appendChild(canvas);

  // Ensure the empty slot divs don't cover the canvas visually
  // (they can still define layout/size)
  slots.forEach((slot) => {
    slot.style.position = slot.style.position || "relative";
    slot.style.zIndex = "0";
    slot.style.background = "transparent";
  });

  const views = [];

  // --- Rect caching (avoid getBoundingClientRect every frame) ---
  let canvasRect = null;
  const slotRects = new Map(); // slotEl -> DOMRect
  let rectsDirty = true;
  let rectsRaf = 0;

  function updateRects() {
    rectsRaf = 0;
    rectsDirty = false;

    canvasRect = canvas.getBoundingClientRect();
    slotRects.clear();

    // Cache rects for all slots we track (views array)
    for (const v of views) {
      slotRects.set(v.slot, v.slot.getBoundingClientRect());
    }
  }

  function scheduleRectsUpdate() {
    rectsDirty = true;
    if (rectsRaf) return;
    rectsRaf = requestAnimationFrame(updateRects);
  }

  // Initial compute
  scheduleRectsUpdate();

  // Update on scroll + resize (batched via rAF)
  window.addEventListener("scroll", scheduleRectsUpdate, { passive: true });
  window.addEventListener("resize", scheduleRectsUpdate, { passive: true });

  // Lazy-load each GLB only when its slot becomes visible
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const view = entry.target.__threeView;
        if (!view || view.__loaded) return;

        view.__loaded = true;
        io.unobserve(entry.target);

        loadGLB(view.url)
          .then((mainGltf) => {
            const mainModel = mainGltf.scene.clone(true);

            const combined = new THREE.Group();
            combined.add(mainModel);

            // Same "small" look as before
            if (view.group === "small") {
              combined.rotation.y = Math.random() * Math.PI * 2;
              combined.rotation.x = (Math.random() - 0.5) * 0.25;
              combined.rotation.z = (Math.random() - 0.5) * 0.15;

              combined.traverse((obj) => {
                if (!obj.isMesh) return;

                const oldMat = obj.material;
                if (Array.isArray(oldMat)) oldMat.forEach((m) => m && m.dispose());
                else if (oldMat) oldMat.dispose();

                obj.material = new THREE.MeshStandardMaterial({
                  color: new THREE.Color("#919191"),
                  metalness: 0.0,
                  roughness: 0.9
                });
              });
            }

            const box = new THREE.Box3().setFromObject(combined);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            combined.position.sub(center);
            combined.position.y += view.offsetY;

            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const scale = view.targetSize / maxDim;
            combined.scale.setScalar(scale);

            view.scene.add(combined);
            view.controls.target.set(0, 0, 0);
            view.controls.update();

            // ✅ slot rects can change slightly once model appears; keep cache correct
            scheduleRectsUpdate();
          })
          .catch((err) => {
            console.error("❌ GLB load error:", err);
            console.error("➡️ main:", view.url);
          });
      });
    },
    { root: null, threshold: 0.1 }
  );

  slots.forEach((slot) => {
    const url = slot.getAttribute("data-model");
    if (!url) return;

    const targetSize = parseFloat(slot.getAttribute("data-size") || "1.6");
    const offsetY = parseFloat(slot.getAttribute("data-offset-y") || "-0.4");
    const group = slot.getAttribute("data-group") || "small";
    const s = GROUP_SETTINGS[group] || GROUP_SETTINGS.small;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    camera.position.set(0, 0.8, 3.2);

    scene.add(new THREE.AmbientLight(0xffffff, s.ambient));

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, s.hemi);
    hemi.position.set(0, 2, 0);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, s.key);
    key.position.set(3, 5, 2);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, s.fill);
    fill.position.set(-4, 2, 4);
    scene.add(fill);

    // IMPORTANT:
    // We avoid attaching OrbitControls to the shared canvas (would conflict for 8 views).
    // Dummy element means no pointer listeners; we keep autoRotate via controls.update().
    const dummyEl = document.createElement("div");
    const controls = new OrbitControls(camera, dummyEl);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.enableZoom = false;

    controls.enableRotate = slot.dataset.userRotate !== "false";
    controls.minPolarAngle = Math.PI / 2;
    controls.maxPolarAngle = Math.PI / 2;
    controls.autoRotate = s.autoRotate;
    controls.autoRotateSpeed = s.rotateSpeed ?? 0.6;

    // Register view for lazy-loading
    const view = { slot, scene, camera, controls, url, targetSize, offsetY, group, __loaded: false };
    slot.__threeView = view;
    views.push(view);

    // Load only when visible
    io.observe(slot);

    return;
  });

  function resizeRendererToContainer() {
    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
  }

  // ✅ Keep rect cache in sync when the container/layout changes
  new ResizeObserver(() => {
    resizeRendererToContainer();
    scheduleRectsUpdate();
  }).observe(containerEl);

  resizeRendererToContainer();
  scheduleRectsUpdate();

  function render() {
    requestAnimationFrame(render);

    // ✅ Only recompute DOM geometry when needed (scroll/resize/etc.)
    if (rectsDirty || !canvasRect) updateRects();

    const cw = canvasRect.width;
    const ch = canvasRect.height;
    if (cw <= 0 || ch <= 0) return;

    renderer.setClearColor(0x000000, 0);

    for (const v of views) {
      const r = slotRects.get(v.slot);
      if (!r) continue;

      const left = r.left - canvasRect.left;
      const top = r.top - canvasRect.top;
      const width = r.width;
      const height = r.height;

      // Skip if off / too small
      if (width <= 1 || height <= 1) continue;

      // Convert to WebGL coordinates (origin bottom-left)
      const x = left;
      const y = ch - (top + height);

      // Clamp + floor (Android can be fractional/weird)
      const vx = Math.max(0, Math.floor(x));
      const vy = Math.max(0, Math.floor(y));
      const vw = Math.max(1, Math.floor(width));
      const vh = Math.max(1, Math.floor(height));

      // If fully outside canvas, skip
      if (vx > cw || vy > ch || vx + vw < 0 || vy + vh < 0) continue;

      renderer.setViewport(vx, vy, vw, vh);
      renderer.setScissor(vx, vy, vw, vh);

      v.camera.aspect = vw / vh;
      v.camera.updateProjectionMatrix();

      v.controls.update(); // keeps autorotation
      renderer.render(v.scene, v.camera);
    }
  }

  render();
}

/* ------------------------------------------------------------------
   ✅ ONLY REMOVE 3D INSIDE A SPECIFIC SECTION (kept from your file)
   ------------------------------------------------------------------ */
const SECTION_WITHOUT_3D = document.querySelector("section.section-middle");

/* ------------------------------------------------------------------
   ✅ Init: Hero big viewer stays 1 canvas
   ------------------------------------------------------------------ */
const big = document.querySelector("._3d-container-big");
if (big) {
  const glassURL = big.getAttribute("data-model") || "./models/glass.glb";
  createViewer(big, glassURL, 1.6, -0.4, "hero");
} else {
  console.warn("No ._3d-container-big found (ok if you removed it).");
}

/* ------------------------------------------------------------------
   ✅ Init: Small slots now use ONE shared canvas
   ------------------------------------------------------------------ */

// This is the wrapper that contains all 8 slots in your HTML:
const slotsContainer = document.querySelector(".flex-text-container-3d.w-container, .flex-text-container-3d");

// Collect slots, skip those inside the excluded section (same behavior as before)
const allSlots = Array.from(document.querySelectorAll(".three-slot"));
const slots = allSlots.filter((slot) => !(SECTION_WITHOUT_3D && SECTION_WITHOUT_3D.contains(slot)));

if (!slotsContainer) {
  console.warn("❌ Shared slots viewer: container '.flex-text-container-3d' not found.");
} else if (!slots.length) {
  console.warn("❌ Shared slots viewer: no slots found.");
} else {
  // IMPORTANT: remove any old canvases that might be inside slots (from previous code runs)
  allSlots.forEach((slot) => slot.querySelectorAll("canvas").forEach((c) => c.remove()));

  createSharedSlotsViewer(slotsContainer, slots);
}
