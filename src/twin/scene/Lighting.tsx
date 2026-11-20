import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, DirectionalLight, EquirectangularReflectionMapping, Fog, PMREMGenerator, type Texture } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { PLINTH } from "../layout/height";
import type { BranchLayout } from "../layout/types";
import { CEILING_H } from "../layout/walls";
import { useTwinView, type Lighting as LightingMode } from "../store";
import { streetLamps } from "./Exterior";
import { MAT, setSignGlow } from "./materials";

RectAreaLightUniformsLib.init();

const LOOK: Record<LightingMode, { sky: string; ground: string; hemi: number; sun: number; sunColor: string; env: number; bg: string; panel: number; area: number; glow: number }> = {
  day: { sky: "#e4ecf3", ground: "#8d8476", hemi: 0.7, sun: 2.4, sunColor: "#fff4e5", env: 0.55, bg: "#dfe6ec", panel: 1.0, area: 0.9, glow: 0.55 },
  night: { sky: "#1d2c44", ground: "#08090c", hemi: 0.22, sun: 0.22, sunColor: "#a9bcff", env: 0.12, bg: "#0b1420", panel: 1.6, area: 1.8, glow: 1.1 },
};

let hdrPromise: Promise<Texture> | null = null;
function loadHdr() {
  if (!hdrPromise) {
    hdrPromise = new HDRLoader().loadAsync(`${import.meta.env.BASE_URL}twin/env/wide_street_01.hdr`).then((t) => {
      t.mapping = EquirectangularReflectionMapping;
      return t;
    });
  }
  return hdrPromise;
}

/**
 * Reflections: a photographed street (HDRI) on Medium/High quality, a generated room otherwise. Used
 * for reflections and ambient light only; the visible background stays a plain sky colour.
 */
function Environment({ hdr, lighting }: { hdr: boolean; lighting: LightingMode }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    let env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    let cancelled = false;
    if (hdr)
      loadHdr()
        .then((t) => {
          if (cancelled) return;
          const next = pmrem.fromEquirectangular(t).texture;
          env.dispose();
          env = next;
          scene.environment = next;
        })
        .catch(() => undefined);
    return () => {
      cancelled = true;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, hdr]);
  useEffect(() => {
    scene.environmentIntensity = LOOK[lighting].env;
  }, [scene, lighting]);
  return null;
}

/**
 * Shadows are drawn once and refreshed only when something static changes (layout, layers, mode,
 * day/night) and a few times while models finish loading, instead of every frame.
 */
function ShadowRefresher({ layout }: { layout: BranchLayout }) {
  const gl = useThree((s) => s.gl);
  const layers = useTwinView((s) => s.layers);
  const mode = useTwinView((s) => s.mode);
  const lighting = useTwinView((s) => s.lighting);
  const until = useRef(0);
  const last = useRef(0);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    until.current = performance.now() + 5000;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl, layout, layers, mode, lighting]);
  useFrame(() => {
    const now = performance.now();
    if (now < until.current && now - last.current > 400) {
      last.current = now;
      gl.shadowMap.needsUpdate = true;
    }
  });
  return null;
}

/** Sun, sky light, interior area lights and, at night, the street lamps. */
export function Lighting({ layout, shadows, hdr }: { layout: BranchLayout; shadows: boolean; hdr: boolean }) {
  const lighting = useTwinView((s) => s.lighting);
  const look = LOOK[lighting];
  const scene = useThree((s) => s.scene);
  const sun = useMemo(() => new DirectionalLight("#fff4e5", 2.4), []);
  const { width: W, depth: D } = layout;
  const hallZ = (layout.counter.z + D / 2) / 2;

  useEffect(() => {
    const reach = Math.max(W, D) + 18;
    sun.position.set(-28, 46, 30);
    sun.target.position.set(2, 0, 0);
    sun.castShadow = shadows;
    sun.shadow.mapSize.set(4096, 4096);
    const cam = sun.shadow.camera;
    cam.left = -reach;
    cam.right = reach;
    cam.top = reach;
    cam.bottom = -reach;
    cam.near = 5;
    cam.far = 140;
    sun.shadow.bias = -2e-4;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    cam.updateProjectionMatrix();
  }, [sun, W, D, shadows]);

  useEffect(() => {
    sun.intensity = look.sun;
    sun.color.set(look.sunColor);
    scene.background = new Color(look.bg);
    scene.fog = new Fog(look.bg, lighting === "night" ? 60 : 90, lighting === "night" ? 200 : 260);
    MAT.ceilingPanel.emissiveIntensity = look.panel;
    MAT.downlight.emissiveIntensity = look.panel * 1.4;
    setSignGlow(look.glow);
  }, [look, lighting, scene, sun]);

  const lamps = lighting === "night" ? streetLamps(layout).slice(0, 4) : [];
  return (
    <>
      <Environment hdr={hdr} lighting={lighting} />
      {shadows && <ShadowRefresher layout={layout} />}
      <hemisphereLight args={[look.sky, look.ground, look.hemi]} />
      <primitive object={sun} />
      <primitive object={sun.target} />
      <directionalLight position={[30, 20, -25]} intensity={lighting === "night" ? 0.05 : 0.35} color="#d3e2ff" />
      {/* Ceiling light over the banking hall and the counter line, and the back offices */}
      <rectAreaLight position={[0, CEILING_H - 0.05, hallZ]} rotation={[-Math.PI / 2, 0, 0]} width={W * 0.75} height={(D / 2 - layout.counter.z) * 0.8} intensity={look.area} color="#fff4e2" />
      <rectAreaLight position={[(layout.counter.x0 + layout.counter.x1) / 2, CEILING_H - 0.05, layout.counter.z - 1]} rotation={[-Math.PI / 2, 0, 0]} width={layout.counter.x1 - layout.counter.x0} height={3} intensity={look.area * 0.6} color="#fff4e2" />
      {lighting === "night" && (
        <>
          <rectAreaLight position={[0, CEILING_H - 0.05, (layout.serviceBand.rear + layout.counter.z - 2) / 2]} rotation={[-Math.PI / 2, 0, 0]} width={W * 0.8} height={5} intensity={1.2} color="#fff4e2" />
          <pointLight position={[layout.entrance.x, 2.85, D / 2 + 0.9]} intensity={3} distance={8} decay={2} color="#ffe2b8" />
          {lamps.map(([x, z]) => (
            <pointLight key={x} position={[x, -PLINTH + 5.8, z - 1.35]} intensity={40} distance={18} decay={2} color="#ffd9a0" />
          ))}
        </>
      )}
    </>
  );
}
