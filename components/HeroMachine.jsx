"use client";

/**
 * HeroMachine — ambient, self-playing 3D CBCT machine for the MyCBCT hero.
 *
 * Ported from the 360 Visualise homepage hero loop (which was vanilla JS
 * driving the DOM by id). Here it lives inside React's lifecycle: the scene
 * is built once in a useEffect and fully torn down on unmount, so it never
 * leaks a WebGL context or double-runs in React's dev double-mount.
 *
 * The .glb model is fetched same-origin from /cs8100-parts.glb (drop the file
 * into the app's public/ folder). The machine slowly orbits; every ~16s the
 * covers lift to reveal the electronics, then rebuild. It pauses when scrolled
 * out of view or when the tab is hidden, and shows a single static frame for
 * visitors who prefer reduced motion.
 *
 * Requires the `three` package:  npm install three
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/* ── procedural-electronics materials (service-photo palette) ── */
const M = {
  pcb:      new THREE.MeshStandardMaterial({ color: 0x1c6b3a, roughness: 0.55, metalness: 0.05 }),
  pcbDark:  new THREE.MeshStandardMaterial({ color: 0x14512c, roughness: 0.6,  metalness: 0.05 }),
  chip:     new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.45, metalness: 0.1 }),
  capBody:  new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.4,  metalness: 0.2 }),
  capTop:   new THREE.MeshStandardMaterial({ color: 0xb9c0c8, roughness: 0.3,  metalness: 0.85 }),
  copper:   new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.32, metalness: 0.9 }),
  redCoil:  new THREE.MeshStandardMaterial({ color: 0x8e1f24, roughness: 0.45, metalness: 0.25 }),
  alu:      new THREE.MeshStandardMaterial({ color: 0xc3c9cf, roughness: 0.35, metalness: 0.85 }),
  shield:   new THREE.MeshStandardMaterial({ color: 0xd7dbdf, roughness: 0.4,  metalness: 0.7 }),
  connW:    new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.5,  metalness: 0.0 }),
  tray:     new THREE.MeshStandardMaterial({ color: 0xaeb4ba, roughness: 0.45, metalness: 0.6 }),
  wireGrey: new THREE.MeshStandardMaterial({ color: 0x8a8f95, roughness: 0.6 }),
  wireBlue: new THREE.MeshStandardMaterial({ color: 0x2e6fb0, roughness: 0.6 }),
  wireRed:  new THREE.MeshStandardMaterial({ color: 0xb03030, roughness: 0.6 }),
  yellow:   new THREE.MeshStandardMaterial({ color: 0xd8c93a, roughness: 0.5 }),
};

function rand(a, b) { return a + Math.random() * (b - a); }
function addBox(g, mat, w, h, d, x, y, z, ry) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.castShadow = true; g.add(m); return m; }
function addCap(g, x, z, r, h) { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), M.capBody); b.position.set(x, h / 2, z); b.castShadow = true; g.add(b); const t = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.96, h * 0.06, 20), M.capTop); t.position.set(x, h, z); g.add(t); }
function addToroid(g, mat, x, z, R, r) { const t = new THREE.Mesh(new THREE.TorusGeometry(R, r, 14, 36), mat); t.position.set(x, r + 0.004, z); t.rotation.x = Math.PI / 2; t.castShadow = true; g.add(t); }
function addHeatsink(g, x, z, w, d, h, fins) { for (let i = 0; i < fins; i++) { addBox(g, M.alu, w / fins * 0.55, h, d, x - w / 2 + (i + 0.5) * (w / fins), h / 2, z); } addBox(g, M.alu, w, h * 0.12, d, x, h * 0.06, z); }
function addWire(g, mat, pts, r) { const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))); const t = new THREE.Mesh(new THREE.TubeGeometry(c, 40, r, 8), mat); t.castShadow = true; g.add(t); }

function buildBoard(w, d, dense) {
  const g = new THREE.Group();
  const board = addBox(g, dense ? M.pcbDark : M.pcb, w, 0.004, d, 0, 0.002, 0);
  board.receiveShadow = true;
  const n = dense ? 14 : 9;
  for (let i = 0; i < n; i++) {
    const x = rand(-w / 2 + 0.03, w / 2 - 0.03), z = rand(-d / 2 + 0.03, d / 2 - 0.03), pick = Math.random();
    if (pick < 0.42) { addBox(g, M.chip, rand(0.02, 0.045), rand(0.005, 0.01), rand(0.015, 0.03), x, 0.008, z, rand(0, Math.PI / 2)); }
    else if (pick < 0.72) { addCap(g, x, z, rand(0.007, 0.013), rand(0.02, 0.034)); }
    else if (pick < 0.86) { addBox(g, M.connW, rand(0.02, 0.04), 0.012, 0.014, x, 0.01, z, Math.random() < 0.5 ? Math.PI / 2 : 0); }
    else { addBox(g, M.yellow, 0.024, 0.016, 0.018, x, 0.012, z); }
  }
  return g;
}

function buildElectronicsBay(width, depth) {
  const bay = new THREE.Group();
  const tray = addBox(bay, M.tray, width, 0.006, depth, 0, 0, 0); tray.receiveShadow = true;
  const u = Math.min(width, depth);
  const b1 = buildBoard(width * 0.34, depth * 0.72, true); b1.position.set(-width * 0.28, 0.006, 0); bay.add(b1);
  const b2 = buildBoard(width * 0.40, depth * 0.34, false); b2.position.set(width * 0.16, 0.006, -depth * 0.16); bay.add(b2);
  addToroid(b2, M.redCoil, -width * 0.10, 0.0, u * 0.055, u * 0.02);
  addBox(b2, M.chip, u * 0.09, u * 0.06, u * 0.07, width * 0.05, u * 0.03, 0.01);
  const b3 = buildBoard(width * 0.40, depth * 0.30, false); b3.position.set(width * 0.16, 0.006, depth * 0.20); bay.add(b3);
  addToroid(b3, M.copper, width * 0.10, 0.02, u * 0.07, u * 0.028);
  addHeatsink(b3, -width * 0.08, -0.02, u * 0.12, u * 0.05, u * 0.06, 6);
  addBox(bay, M.shield, width * 0.20, u * 0.05, depth * 0.22, width * 0.30, u * 0.03, -depth * 0.18);
  const yW = u * 0.06;
  addWire(bay, M.wireGrey, [[-width * 0.42, 0.01, -depth * 0.30], [-width * 0.15, yW, -depth * 0.34], [width * 0.10, yW * 0.8, -depth * 0.30], [width * 0.34, 0.012, -depth * 0.10]], u * 0.010);
  addWire(bay, M.wireBlue, [[-width * 0.30, 0.01, depth * 0.30], [0, yW * 0.9, depth * 0.34], [width * 0.22, yW * 0.5, depth * 0.26], [width * 0.36, 0.012, depth * 0.05]], u * 0.007);
  addWire(bay, M.wireRed, [[-width * 0.40, 0.012, 0], [-width * 0.10, yW * 0.7, depth * 0.08], [width * 0.12, yW * 0.6, -depth * 0.04], [width * 0.30, 0.012, 0.0]], u * 0.006);
  return bay;
}

function smooth(t) { t = Math.min(Math.max(t, 0), 1); return t * t * (3 - 2 * t); }
function phase(p, inA, inB, outA, outB) {
  if (p < inA) return 0;
  if (p < inB) return smooth((p - inA) / (inB - inA));
  if (p < outA) return 1;
  if (p < outB) return 1 - smooth((p - outA) / (outB - outA));
  return 0;
}

/* Builds one independent 3D view of the machine and returns a handle. */
function createRig(canvas, holder, bin, opts) {
  const rig = { ready: false };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(2.5, 4.5, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe9f5, 0.4);
  fill.position.set(-3, 1.5, -2);
  scene.add(fill);

  let root, covers = [], internals = [];
  let modelCentre = new THREE.Vector3(), headCentre = new THREE.Vector3();
  let camDist = 3, modelRadius = 1;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.parse(bin, "", (gltf) => {
    root = gltf.scene;

    let bb = new THREE.Box3().setFromObject(root);
    let size = bb.getSize(new THREE.Vector3());
    if (size.z > size.y * 1.4) root.rotation.x = -Math.PI / 2;

    scene.add(root);
    root.updateMatrixWorld(true);

    bb = new THREE.Box3().setFromObject(root);
    bb.getCenter(modelCentre);
    size = bb.getSize(new THREE.Vector3());
    modelRadius = size.length() / 2;
    camDist = modelRadius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * opts.camPad;
    const floorY = bb.min.y;
    const topY = bb.max.y;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(modelRadius * 8, modelRadius * 8),
      new THREE.ShadowMaterial({ opacity: opts.shadowOpacity })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY + 0.001;
    floor.receiveShadow = true;
    scene.add(floor);

    key.shadow.camera.left = -modelRadius * 1.6;
    key.shadow.camera.right = modelRadius * 1.6;
    key.shadow.camera.top = modelRadius * 2.2;
    key.shadow.camera.bottom = -modelRadius * 1.2;
    key.shadow.camera.far = modelRadius * 12;

    root.traverse((o) => {
      if (!o.isMesh) return;
      const matName = (o.material.name || "").toLowerCase();
      const col = o.material.color ? o.material.color.clone() : new THREE.Color(0xffffff);
      const box = new THREE.Box3().setFromObject(o);
      const c = box.getCenter(new THREE.Vector3());
      const diag = box.getSize(new THREE.Vector3()).length();

      const isWhiteFamily = matName.includes("white") || matName.includes("lightgrey");
      const isRed = matName.includes("material.001");
      const isScreen = matName.includes("monitor");
      const isSmall = diag < modelRadius * 0.14;

      if (isWhiteFamily) {
        o.material = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.38, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.28 });
      } else if (isRed) {
        o.material = new THREE.MeshPhysicalMaterial({ color: 0xd42b1e, roughness: 0.3, metalness: 0.0, clearcoat: 0.9, clearcoatRoughness: 0.15 });
      } else if (isScreen) {
        o.material = new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.4 });
      } else if (isSmall) {
        o.material = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, roughness: 0.3, metalness: 0.9 });
      } else {
        o.material = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.55, metalness: 0.05, clearcoat: 0.25, clearcoatRoughness: 0.5 });
      }
      o.castShadow = true;

      const rel = c.clone().sub(modelCentre);
      const heightFrac = (c.y - floorY) / (topY - floorY);
      let dirH = new THREE.Vector3(rel.x, 0, rel.z);
      if (dirH.lengthSq() < 1e-6) dirH.set(0.7, 0, 0.7);
      dirH.normalize();

      const parent = o.parent;
      const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
      const nm = new THREE.Matrix3().getNormalMatrix(inv);

      const entry = {
        mesh: o, basePos: o.position.clone(), baseQuat: o.quaternion.clone(),
        heightFrac, seed: Math.random(),
        tiltAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        worldBox: box,
      };

      if (isWhiteFamily && !isSmall) {
        const dir = dirH.clone().multiplyScalar(0.65).add(new THREE.Vector3(0, heightFrac > 0.85 ? 1.1 : 0.55, 0)).normalize();
        entry.dirLocal = dir.applyMatrix3(nm).normalize();
        entry.travel = modelRadius * (opts.coverTravel + entry.seed * opts.coverTravel * 0.3);
        entry.tilt = 0.22 + entry.seed * 0.14;
        covers.push(entry);
      } else {
        const rel3 = rel.clone();
        if (rel3.lengthSq() < 1e-8) rel3.set(0, 1, 0);
        entry.dirLocal = rel3.normalize().applyMatrix3(nm).normalize();
        entry.travel = modelRadius * (opts.coverTravel * 0.36 + entry.seed * 0.08);
        entry.tilt = 0;
        internals.push(entry);
      }
    });

    covers.sort((a, b) => b.heightFrac - a.heightFrac);
    covers.forEach((cv, i) => (cv.order = covers.length > 1 ? i / (covers.length - 1) : 0));
    internals.forEach((p) => (p.order = p.seed));

    const canopyCandidates = covers.filter((cv) => cv.heightFrac > 0.78);
    let canopy = null, bestArea = 0;
    canopyCandidates.forEach((cv) => {
      const s = cv.worldBox.getSize(new THREE.Vector3());
      if (s.x * s.z > bestArea) { bestArea = s.x * s.z; canopy = cv; }
    });
    if (canopy) {
      const cb = canopy.worldBox;
      const cs = cb.getSize(new THREE.Vector3());
      const cc = cb.getCenter(new THREE.Vector3());
      const bay = buildElectronicsBay(cs.x * 0.72, cs.z * 0.72);
      bay.position.set(cc.x, cb.min.y + cs.y * 0.12, cc.z);
      scene.add(bay);
      bay.updateMatrixWorld(true);
      headCentre.set(cc.x, cb.min.y, cc.z);
      bay.children.forEach((child) => {
        if (child.isGroup) {
          internals.push({
            mesh: child, basePos: child.position.clone(), baseQuat: child.quaternion.clone(),
            dirLocal: new THREE.Vector3(rand(-0.3, 0.3), 1, rand(-0.3, 0.3)).normalize(),
            travel: modelRadius * 0.08, tilt: 0, order: Math.random() * 0.5, seed: Math.random(),
          });
        }
      });
    } else {
      headCentre.copy(modelCentre).setY(topY - (topY - floorY) * 0.12);
    }

    canvas.style.opacity = "1";
    rig.ready = true;
    if (opts.reduce) { rig.applyProgress(opts.reducedPose); rig.render(); }
  }, (err) => { console.error("HeroMachine rig:", err); });

  const qTmp = new THREE.Quaternion();
  const lookTarget = new THREE.Vector3();
  function applyGroup(list, amount, stagger) {
    list.forEach((part) => {
      const delay = part.order * stagger;
      const local = smooth((amount - delay) / (1 - delay));
      part.mesh.position.copy(part.basePos).addScaledVector(part.dirLocal, local * part.travel);
      if (part.tilt) {
        qTmp.setFromAxisAngle(part.tiltAxis, local * part.tilt);
        part.mesh.quaternion.copy(part.baseQuat).multiply(qTmp);
      }
    });
  }

  rig.applyProgress = function (p) {
    if (!root) return;
    const cA = phase(p, 0.16, 0.36, 0.62, 0.82);
    const iA = phase(p, 0.36, 0.50, 0.55, 0.70);
    applyGroup(covers, cA, 0.45);
    applyGroup(internals, iA, 0.30);

    const theta = -0.35 + p * Math.PI * 2;
    const openness = Math.max(cA * 0.4, iA);
    const phi = 1.22 - openness * 0.20;
    const d = camDist * (1 + cA * 0.14 - iA * 0.10);
    lookTarget.copy(modelCentre).lerp(headCentre, openness * 0.5);
    camera.position.set(
      lookTarget.x + d * Math.sin(phi) * Math.sin(theta),
      lookTarget.y + d * Math.cos(phi),
      lookTarget.z + d * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(lookTarget);
  };

  rig.render = function () { renderer.render(scene, camera); };

  rig.resize = function () {
    const w = holder.clientWidth, h = holder.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const onResize = () => { rig.resize(); if (opts.reduce && rig.ready) { rig.applyProgress(opts.reducedPose); rig.render(); } };
  window.addEventListener("resize", onResize);
  rig.resize();

  rig.dispose = function () {
    window.removeEventListener("resize", onResize);
    try { pmrem.dispose(); } catch (e) {}
    try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {}
  };

  return rig;
}

export default function HeroMachine({ glbUrl = "/cs8100-parts.glb" }) {
  const canvasRef = useRef(null);
  const holderRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current, holder = holderRef.current;
    if (!canvas || !holder) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false, raf = 0, rig = null, io = null;

    (async () => {
      let bin;
      try {
        const res = await fetch(glbUrl);
        if (!res.ok) throw new Error("GLB " + res.status);
        bin = await res.arrayBuffer();
      } catch (e) {
        console.error("HeroMachine: could not load model:", e);
        return;
      }
      if (disposed) return;

      rig = createRig(canvas, holder, bin, {
        shadowOpacity: 0.32, camPad: 1.06, coverTravel: 0.5, reducedPose: 0.04, reduce,
      });
      if (disposed) { rig.dispose(); rig = null; return; }
      if (reduce) return; // a single static frame is drawn on load

      let visible = true;
      if ("IntersectionObserver" in window) {
        io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0.05 });
        io.observe(holder);
      }

      const CYCLE = 16000; // ms per full covers-off cycle
      const t0 = performance.now();
      const tick = (now) => {
        raf = requestAnimationFrame(tick);
        if (disposed || document.hidden || !visible || !rig || !rig.ready) return;
        const p = ((now - t0) % CYCLE) / CYCLE;
        rig.applyProgress(p);
        rig.render();
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
      if (rig) rig.dispose();
    };
  }, [glbUrl]);

  return (
    <div ref={holderRef} style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", opacity: 0, transition: "opacity .8s ease" }}
      />
    </div>
  );
}
