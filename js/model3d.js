import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

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
    exposure: 1.6,
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

const GLASS_SETTINGS = {
  thickness: 0.03,
  ior: 1.5,
  roughness: 0.005,
  envMapIntensity: 2.2,
  opacity: 0.5
};

// HDR for realistic reflections (only for big hero)
const HDR_URL = "./hdr/studio_small_08_1k.hdr";

function makeGlassMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    metalness: 0,

    // glass
    transmission: 1.0,
    transparent: true,
    opacity: 4,
    ior: 1.52,
    thickness: 0.01,
    roughness: 0.001,

    // reflections
    envMapIntensity: 3.0,
    specularIntensity: 1.0,
    specularColor: new THREE.Color(0xffffff),

    clearcoat: 1.0,
    clearcoatRoughness: 0.01,

    side: THREE.DoubleSide
  });

  // transparency sorting helpers
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

function createViewer(mountEl, MODEL_URL, targetSize = 1.6, offsetY = -0.4, group = "hero") {
  const s = GROUP_SETTINGS[group] || GROUP_SETTINGS.hero;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    new RGBELoader().load(
      HDR_URL,
      (hdr) => {
        scene.environment = pmrem.fromEquirectangular(hdr).texture;
        hdr.dispose();
        pmrem.dispose();
      },
      undefined,
      (err) => {
        console.error("❌ HDR load error:", err);
        console.error("➡️ HDR URL:", HDR_URL);
      }
    );
  }

  // ✅ ONLY LOAD THE GLASS MODEL (liquid removed)
  loadGLB(MODEL_URL)
    .then((mainGltf) => {
      const mainModel = mainGltf.scene.clone(true);

      const combined = new THREE.Group();
      combined.add(mainModel);

      // ✅ keep your hero glass look (this used to happen only when liquid existed)
      if (group === "hero") {
        applySingleMaterial(mainModel, makeGlassMaterial, 2);
      }

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

      // ✅ ADD 25° TILT (only on hero, so small slots don't tilt)
      if (group === "hero") {
        combined.rotation.x = THREE.MathUtils.degToRad(25);
      }

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
   ✅ ONLY REMOVE 3D INSIDE A SPECIFIC SECTION (everything else unchanged)
   ------------------------------------------------------------------ */

/**
 * CHANGE THIS SELECTOR to match your "middle section divs" wrapper.
 * Examples you might use instead:
 *  - "#middle-section"
 *  - ".section-middle"
 *  - "section.is-middle"
 *  - ".w-section.section-middle"
 */
const SECTION_WITHOUT_3D = document.querySelector("section.section-middle");

/* ------------------------------------------------------------------ */

const big = document.querySelector("._3d-container-big");
if (big) {
  const glassURL = big.getAttribute("data-model") || "./models/glass.glb";
  createViewer(big, glassURL, 1.6, -0.4, "hero");
} else {
  console.warn("No ._3d-container-big found (ok if you removed it).");
}

document.querySelectorAll(".three-slot").forEach((slot) => {
  // 🚫 If this slot is inside the chosen section: remove its canvas and skip init
  if (SECTION_WITHOUT_3D && SECTION_WITHOUT_3D.contains(slot)) {
    slot.querySelectorAll("canvas").forEach((c) => c.remove());
    return;
  }

  // ✅ everything else behaves exactly as before
  const url = slot.getAttribute("data-model");
  if (!url) return;

  const size = parseFloat(slot.getAttribute("data-size") || "1.6");
  const oy = parseFloat(slot.getAttribute("data-offset-y") || "-0.4");
  const group = slot.getAttribute("data-group") || "small";

  createViewer(slot, url, size, oy, group);
});
