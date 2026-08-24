import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface DnaHelix3DProps {
  sequence: string;
  speciesName?: string;
  height?: string;
}

function computeGcContent(sequence: string): number {
  if (sequence.length === 0) return 0;
  const gcCount = (sequence.match(/[GC]/g) || []).length;
  return parseFloat(((gcCount / sequence.length) * 100).toFixed(1));
}

export default function DnaHelix3D({
  sequence,
  speciesName = "Unknown specimen",
  height = "h-[420px]",
}: DnaHelix3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(true);
  const isRotatingRef = useRef(isRotating);
  const [selectedBaseInfo, setSelectedBaseInfo] = useState<string | null>(null);

  useEffect(() => {
    isRotatingRef.current = isRotating;
  }, [isRotating]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width || container.clientWidth || 380, 100);
    const containerHeight = Math.max(rect.height || container.clientHeight || 420, 100);

    // 1. Three.js Scene, Camera & WebGL Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.018);

    const camera = new THREE.PerspectiveCamera(45, width / containerHeight, 0.1, 1000);
    // Pulled back further than the object's bounding box requires (see
    // radius/heightPerPair below) so the helix sits inside the ~70% of the
    // frame not already covered by the top HUD and bottom legend overlays,
    // rather than filling — and clipping under — the entire canvas.
    camera.position.set(0, 0, 36);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. High-End Bioluminescent Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x0284c7, 1.5);
    scene.add(ambientLight);

    const mainLight1 = new THREE.DirectionalLight(0x38bdf8, 3.5);
    mainLight1.position.set(15, 25, 20);
    scene.add(mainLight1);

    const mainLight2 = new THREE.DirectionalLight(0x34d399, 2.5);
    mainLight2.position.set(-15, -20, -10);
    scene.add(mainLight2);

    const pointLight = new THREE.PointLight(0xe879f9, 3.0, 40);
    pointLight.position.set(0, 0, 12);
    scene.add(pointLight);

    // 3. DNA Parent Group
    const dnaGroup = new THREE.Group();
    dnaGroup.rotation.z = -Math.PI / 10;
    scene.add(dnaGroup);

    // Color definitions for base pairs
    const colors: Record<string, THREE.Color> = {
      A: new THREE.Color(0x34d399), // Emerald
      T: new THREE.Color(0xfbbf24), // Amber
      G: new THREE.Color(0x38bdf8), // Cyan
      C: new THREE.Color(0xe879f9), // Fuchsia
    };

    const complementary: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
    const numPairs = Math.min(sequence.length, 36);
    // Wider radius relative to height than before, and a shorter rise per
    // pair — the old values (radius 4.4, heightPerPair 0.68) produced a
    // helix roughly 3x taller than wide, while the canvas is close to
    // square. That mismatch meant zooming out enough to fit the height left
    // most of the width empty, and zooming in enough to use the width
    // clipped the top/bottom under the HUD. These values bring the
    // helix's own aspect ratio much closer to the frame's.
    const radius = 5.2;
    const heightPerPair = 0.52;
    const turns = 2.6;

    const backbonePoints1: THREE.Vector3[] = [];
    const backbonePoints2: THREE.Vector3[] = [];
    const basePairObjects: THREE.Mesh[] = [];
    const disposables: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];

    // (numPairs - 1) so the first and last rungs sit symmetrically around
    // y=0 — using numPairs here left the whole helix offset upward by half
    // a step.
    const startY = -((numPairs - 1) * heightPerPair) / 2;

    for (let i = 0; i < numPairs; i++) {
      const t = i / Math.max(numPairs - 1, 1);
      const angle = t * Math.PI * 2 * turns;
      const y = startY + i * heightPerPair;

      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;

      const x2 = Math.cos(angle + Math.PI) * radius;
      const z2 = Math.sin(angle + Math.PI) * radius;

      const p1 = new THREE.Vector3(x1, y, z1);
      const p2 = new THREE.Vector3(x2, y, z2);

      backbonePoints1.push(p1);
      backbonePoints2.push(p2);

      const baseA = sequence[i % sequence.length] || "A";
      const baseB = complementary[baseA] || "T";
      const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

      // Glass Cylinder Base Pair Rung Half A — length must span the full
      // p1-to-midpoint segment (distance = radius, since p1/p2 sit on
      // opposite sides of the circle). The previous `radius / 2` was half
      // that, so each half-rung visibly floated short of both the
      // backbone and the centerline.
      const rungGeom1 = new THREE.CylinderGeometry(0.22, 0.22, radius, 14);
      const mat1 = new THREE.MeshStandardMaterial({
        color: colors[baseA] || colors.A,
        roughness: 0.1,
        metalness: 0.5,
        emissive: colors[baseA] || colors.A,
        emissiveIntensity: 0.6,
      });
      disposables.push({ geometry: rungGeom1, material: mat1 });

      const halfRung1 = new THREE.Mesh(rungGeom1, mat1);
      const posA = new THREE.Vector3().addVectors(p1, midPoint).multiplyScalar(0.5);
      halfRung1.position.copy(posA);
      halfRung1.lookAt(midPoint);
      halfRung1.rotateX(Math.PI / 2);
      halfRung1.userData = { index: i + 1, baseA, baseB, species: speciesName };
      dnaGroup.add(halfRung1);
      basePairObjects.push(halfRung1);

      // Glass Cylinder Base Pair Rung Half B
      const rungGeom2 = new THREE.CylinderGeometry(0.22, 0.22, radius, 14);
      const mat2 = new THREE.MeshStandardMaterial({
        color: colors[baseB] || colors.T,
        roughness: 0.1,
        metalness: 0.5,
        emissive: colors[baseB] || colors.T,
        emissiveIntensity: 0.6,
      });
      disposables.push({ geometry: rungGeom2, material: mat2 });

      const halfRung2 = new THREE.Mesh(rungGeom2, mat2);
      const posB = new THREE.Vector3().addVectors(midPoint, p2).multiplyScalar(0.5);
      halfRung2.position.copy(posB);
      halfRung2.lookAt(p2);
      halfRung2.rotateX(Math.PI / 2);
      halfRung2.userData = { index: i + 1, baseA, baseB, species: speciesName };
      dnaGroup.add(halfRung2);
      basePairObjects.push(halfRung2);

      // Glowing Spherical Nucleotide Nodes at backbone joints
      const sphereGeom = new THREE.SphereGeometry(0.42, 16, 16);
      disposables.push({ geometry: sphereGeom, material: mat1 });
      const node1 = new THREE.Mesh(sphereGeom, mat1);
      node1.position.copy(p1);
      dnaGroup.add(node1);

      const node2 = new THREE.Mesh(sphereGeom, mat2);
      node2.position.copy(p2);
      dnaGroup.add(node2);
    }

    // 4. Thick Bioluminescent Glass Spiral Backbones
    const curve1 = new THREE.CatmullRomCurve3(backbonePoints1);
    const curve2 = new THREE.CatmullRomCurve3(backbonePoints2);

    const tubeGeom1 = new THREE.TubeGeometry(curve1, 140, 0.32, 14, false);
    const tubeGeom2 = new THREE.TubeGeometry(curve2, 140, 0.32, 14, false);

    const backboneMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.05,
      metalness: 0.7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.9,
    });
    disposables.push({ geometry: tubeGeom1, material: backboneMat });
    disposables.push({ geometry: tubeGeom2, material: backboneMat });

    const backboneMesh1 = new THREE.Mesh(tubeGeom1, backboneMat);
    const backboneMesh2 = new THREE.Mesh(tubeGeom2, backboneMat);
    dnaGroup.add(backboneMesh1);
    dnaGroup.add(backboneMesh2);

    // 5. Deep Abyssal Particle Cloud
    const particleCount = 200;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount * 3; p += 3) {
      particlePositions[p] = (Math.random() - 0.5) * 35;
      particlePositions[p + 1] = (Math.random() - 0.5) * 45;
      particlePositions[p + 2] = (Math.random() - 0.5) * 30;
    }
    particleGeom.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.3,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    disposables.push({ geometry: particleGeom, material: particleMat });
    const particleSystem = new THREE.Points(particleGeom, particleMat);
    scene.add(particleSystem);

    // 6. Interactive Mouse Orbit & Raycasting Base Pair Inspector
    let isMouseDown = false;
    let previousMousePosition = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const domElement = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    // Raycasting only needs to run while the pointer is actually over this
    // canvas, so it's bound to domElement rather than window — previously
    // it ran on every mousemove anywhere on the page (72 mesh intersection
    // tests each time), including while this panel was scrolled off-screen.
    const onCanvasMouseMove = (e: MouseEvent) => {
      const rect = domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(basePairObjects);
      if (intersects.length > 0) {
        const data = intersects[0].object.userData;
        if (data && data.index) {
          setSelectedBaseInfo(`Base Pair #${data.index}: ${data.baseA} – ${data.baseB} (Q36.4)`);
        }
      } else {
        setSelectedBaseInfo(null);
      }
    };

    const onCanvasMouseLeave = () => {
      setSelectedBaseInfo(null);
    };

    // Dragging is bound to window (not domElement) so rotation keeps
    // tracking smoothly even if the cursor slips outside the canvas mid-drag.
    const onWindowMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      dnaGroup.rotation.y += deltaX * 0.008;
      dnaGroup.rotation.x += deltaY * 0.008;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(15, Math.min(55, camera.position.z + e.deltaY * 0.03));
    };

    domElement.addEventListener("mousedown", onMouseDown);
    domElement.addEventListener("wheel", onWheel, { passive: false });
    domElement.addEventListener("mousemove", onCanvasMouseMove);
    domElement.addEventListener("mouseleave", onCanvasMouseLeave);
    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // 7. Render Loop with Viewport Optimization
    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible || !renderer) return;

      if (isRotatingRef.current && !isMouseDown) {
        dnaGroup.rotation.y += 0.008;
      }
      particleSystem.rotation.y += 0.0015;
      renderer.render(scene, camera);
    };

    animate();

    // 8. Handle Window Resize
    const handleResize = () => {
      if (!container || !renderer) return;
      const r = container.getBoundingClientRect();
      const w = Math.max(r.width || container.clientWidth || 380, 100);
      const h = Math.max(r.height || container.clientHeight || 420, 100);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      domElement.removeEventListener("mousedown", onMouseDown);
      domElement.removeEventListener("wheel", onWheel);
      domElement.removeEventListener("mousemove", onCanvasMouseMove);
      domElement.removeEventListener("mouseleave", onCanvasMouseLeave);
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      for (const { geometry, material } of disposables) {
        geometry.dispose();
        material.dispose();
      }
      renderer.dispose();
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
    };
    // isRotating is intentionally read via a ref (isRotatingRef) instead of
    // being a dependency here — otherwise toggling Pause/Play tore down and
    // rebuilt the entire scene (and leaked the previous one's GPU
    // resources) on every click, and reset any manual rotation the user
    // had done by dragging.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence, speciesName]);

  const sequenceLength = sequence.length;
  const gcContent = computeGcContent(sequence);

  return (
    <div className={`relative w-full ${height} rounded-2xl overflow-hidden bg-slate-950/95 border border-cyan-400/50 shadow-[0_0_45px_rgba(56,189,248,0.35)]`}>
      {/* Interactive 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {/* Top Overlay HUD Bar — a single flex row (not two independently
          absolutely-positioned blocks) so the badge and the pause button
          share space instead of overlapping when the panel is narrow. */}
      <div className="absolute top-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 pointer-events-none">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300 bg-cyan-950/90 border border-cyan-500/50 px-2.5 py-1 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(56,189,248,0.4)] flex items-center gap-1.5 shrink-0">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
            Live 3D
          </span>
          <span className="text-[10px] text-slate-300 font-mono bg-black/70 px-2 py-1 rounded-lg border border-white/10 whitespace-nowrap">
            {sequenceLength} bp &bull; GC: {gcContent}%
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsRotating((r) => !r)}
          className="glass glass-hover rounded-xl px-3 py-1 text-[10px] font-semibold text-slate-100 backdrop-blur-md transition-all border-cyan-500/30 shrink-0"
        >
          {isRotating ? "⏸️ Pause" : "▶️ Rotate"}
        </button>
      </div>

      {/* Dynamic Raycast Hover Callout Bar */}
      {selectedBaseInfo && (
        <div className="absolute top-12 left-3 z-10 text-[11px] font-mono text-cyan-300 bg-cyan-950/90 border border-cyan-400/50 px-3 py-1 rounded-lg backdrop-blur-md shadow-[0_0_12px_rgba(56,189,248,0.3)] pointer-events-none">
          🎯 {selectedBaseInfo}
        </div>
      )}

      {/* Bottom Base Pair Legend */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-cyan-500/35 text-[10px] font-mono pointer-events-none">
        <span className="text-slate-400 font-sans">Drag to rotate 3D • Scroll to zoom</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /> A
          </span>
          <span className="flex items-center gap-1 text-amber-400 font-bold">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" /> T
          </span>
          <span className="flex items-center gap-1 text-cyan-400 font-bold">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" /> G
          </span>
          <span className="flex items-center gap-1 text-fuchsia-400 font-bold">
            <span className="h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#e879f9]" /> C
          </span>
        </div>
      </div>
    </div>
  );
}
