import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO } from "@react-three/postprocessing";
import { ACESFilmicToneMapping, MathUtils, PerspectiveCamera, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { TwinQuality } from "../../config/bankConfig";
import type { BranchLayout } from "../layout/types";
import { step } from "../sim/engine";
import { liveCamera, useBranchSim, useTwinView } from "../store";
import { Building } from "./Building";
import { CameraFeedRenderer } from "./CameraFeedRenderer";
import { CAMERA_FOV, focusZone, viewPose } from "./focus";
import { Fixtures } from "./Fixtures";
import { Lighting } from "./Lighting";
import { StaticBatcher } from "./StaticBatcher";

const BATCH_ROOTS = ["fixtures", "building"];
import { People } from "./People";
import { WalkControls } from "./WalkControls";
import { PbrMaterials } from "./pbr";
import { Signage } from "./Signage";

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Advances the simulation every frame and tells the panels when something changed (at most 4× a second). */
function SimDriver() {
  const lastPublish = useRef(0);
  useFrame(({ clock }, dt) => {
    const s = useBranchSim.getState();
    if (!s.sim || !s.layout || s.paused) return;
    step(s.sim, s.layout, dt, s.speed, s.scenarios);
    if (s.sim.dirty && clock.elapsedTime - lastPublish.current > 0.25) {
      s.sim.dirty = false;
      lastPublish.current = clock.elapsedTime;
      s.bump();
    }
  });
  return null;
}

type Flight = { fromPos: Vector3; fromTarget: Vector3; toPos: Vector3; toTarget: Vector3; duration: number; elapsed: number; lift: number };

/**
 * Flies the camera to the latest request along an eased arc (from the factory twin), keeps the orbit
 * target near the branch, and publishes the camera position for the focus maths. A drag cancels a flight.
 */
function CameraRig({ layout }: { layout: BranchLayout }) {
  const request = useTwinView((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const flight = useRef<Flight | null>(null);

  useEffect(() => {
    if (!controls || request.nonce === 0) return;
    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();
    const toPos = new Vector3(...request.pos);
    const toTarget = new Vector3(...request.target);
    const travel = Math.max(fromPos.distanceTo(toPos), fromTarget.distanceTo(toTarget));
    flight.current = {
      fromPos,
      fromTarget,
      toPos,
      toTarget,
      duration: MathUtils.clamp(0.7 + travel / 60, 0.8, 1.8),
      elapsed: 0,
      lift: travel > 20 ? Math.min(8, travel * 0.12) : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.nonce, controls]);

  useEffect(() => {
    if (!controls) return;
    const cancel = () => {
      flight.current = null;
    };
    controls.addEventListener("start", cancel);
    return () => controls.removeEventListener("start", cancel);
  }, [controls]);

  useFrame((state, dt) => {
    if (!controls) return;
    const f = flight.current;
    if (f) {
      // Real elapsed time (capped), so a flight takes the same time on a slow device.
      f.elapsed += Math.min(dt, 0.25);
      const t = Math.min(1, f.elapsed / f.duration);
      const e = easeInOutCubic(t);
      state.camera.position.lerpVectors(f.fromPos, f.toPos, e);
      state.camera.position.y += Math.sin(Math.PI * e) * f.lift;
      controls.target.lerpVectors(f.fromTarget, f.toTarget, e);
      if (t >= 1) flight.current = null;
    }
    const target = controls.target;
    const reach = Math.max(layout.width, layout.depth);
    target.x = MathUtils.clamp(target.x, -reach, reach);
    target.z = MathUtils.clamp(target.z, -reach, reach);
    target.y = MathUtils.clamp(target.y, 0, 8);
    if (state.camera.position.y < 1.4) state.camera.position.y = 1.4;
    liveCamera.x = state.camera.position.x;
    liveCamera.y = state.camera.position.y;
    liveCamera.z = state.camera.position.z;
    liveCamera.tx = target.x;
    liveCamera.ty = target.y;
    liveCamera.tz = target.z;
  }, -2);
  return null;
}

/** Re-centres the view beside the inspector panel with a projection offset, so the subject isn't hidden behind it. */
function ViewInset() {
  const shown = useRef(0);
  useFrame((state, dt) => {
    const camera = state.camera;
    if (!(camera instanceof PerspectiveCamera)) return;
    const { width, height } = state.size;
    const want = Math.min(useTwinView.getState().insetRight, width * 0.6) / 2;
    let x = shown.current;
    if (x !== want) x = Math.abs(want - x) < 0.5 ? want : x + (want - x) * (1 - Math.exp(-Math.min(dt, 0.05) * 9));
    shown.current = x;
    if (x === 0) {
      if (camera.view?.enabled) camera.clearViewOffset();
      return;
    }
    camera.setViewOffset(width, height, x, 0, width, height);
  }, -3);
  return null;
}

/** Widens the vertical field of view on narrow screens so the branch still fits across. */
function ResponsiveFov() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    const half = (CAMERA_FOV * Math.PI) / 360;
    const fov = aspect >= 1.6 ? CAMERA_FOV : (2 * Math.atan((Math.tan(half) * 1.6) / aspect) * 180) / Math.PI;
    camera.fov = Math.min(fov, 60);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function ZoneLabels({ layout }: { layout: BranchLayout }) {
  const labels = useTwinView((s) => s.layers.labels);
  const walking = useTwinView((s) => s.mode === "walk");
  const active = useTwinView((s) => s.zone);
  // Hidden rather than unmounted: unmounting many drei <Html> roots at once trips a React removeChild error.
  const panelsHidden = useTwinView((s) => s.panelsHidden);
  const hidden = !labels || walking || panelsHidden;
  return (
    <>
      {layout.zones
        .filter((z) => z.id !== "exterior")
        .map((zone) => (
          <Html key={zone.id} position={[zone.label[0], 0.2, zone.label[1]]} center zIndexRange={[8, 0]} style={hidden ? { display: "none" } : undefined}>
            <button
              type="button"
              onClick={() => {
                useTwinView.getState().selectZone(zone.id);
                focusZone(zone.id, layout);
              }}
              title={`Go to ${zone.name}`}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-medium shadow-sm backdrop-blur transition-colors ${
                active === zone.id ? "border-ink bg-ink text-white" : "border-white/70 bg-white/80 text-ink hover:bg-white"
              }`}
            >
              <span className="size-2 rounded-full" style={{ background: zone.color }} />
              {zone.short}
            </button>
          </Html>
        ))}
    </>
  );
}

/** Dev only: exposes the renderer, scene and camera for console profiling. */
function DevHandles() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { r3f: { gl, scene, camera } });
  }, [gl, scene, camera]);
  return null;
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    if (++frames.current === 3) onReady();
  });
  return null;
}

/** Ambient occlusion grounds the geometry; Bloom adds a soft halo to lit signs and night lighting only. */
function Effects({ ao, bloom }: { ao: boolean; bloom: boolean }) {
  const night = useTwinView((s) => s.lighting === "night");
  if (!ao && !bloom) return null;
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      {ao ? <N8AO aoRadius={1.2} distanceFalloff={0.8} intensity={1.8} quality="medium" halfRes color="#1c2026" /> : <></>}
      {bloom ? <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.05} intensity={night ? 0.5 : 0.25} /> : <></>}
    </EffectComposer>
  );
}

export default function BranchScene({
  layout,
  branchName,
  quality,
  signage,
  sensitivity = 1,
  onReady,
}: {
  layout: BranchLayout;
  branchName: string;
  quality: TwinQuality;
  signage: boolean;
  sensitivity?: number;
  onReady: () => void;
}) {
  const start = useMemo(() => viewPose("exterior", layout), [layout]);
  const mode = useTwinView((s) => s.mode);
  const fullWalls = useTwinView((s) => s.layers.walls);
  // Automatic quality steps down one level at a time: reflections, then bloom and AO, then resolution.
  const [level, setLevel] = useState(0);
  const low = quality === "low";
  const high = quality === "high";
  const auto = quality === "auto";
  const reflections = high || (auto && level < 1);
  const effects = high || (auto && level < 2);
  const fullRes = high || (auto && level < 3);

  return (
    <Canvas
      shadows={low ? false : "soft"}
      dpr={low || !fullRes ? 1 : [1, 1.75]}
      camera={{ position: start.pos, fov: CAMERA_FOV, near: 0.12, far: 600 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.02;
      }}
      onPointerMissed={(e) => {
        if (e.type === "click" && !document.pointerLockElement) useTwinView.getState().select(null);
      }}
    >
      {auto && <PerformanceMonitor onDecline={() => setLevel((l) => Math.min(3, l + 1))} flipflops={3} />}
      <Lighting layout={layout} shadows={!low} hdr={!low} />
      <PbrMaterials enabled={!low} />
      <SimDriver />
      <Suspense fallback={null}>
        <Building layout={layout} reflect={reflections && !low} />
        <Fixtures layout={layout} />
        {signage && fullWalls && <Signage layout={layout} branchName={branchName} />}
        <People layout={layout} />
        <ZoneLabels layout={layout} />
      </Suspense>
      <StaticBatcher roots={BATCH_ROOTS} />
      {mode === "walk" ? (
        <WalkControls layout={layout} sensitivity={sensitivity} />
      ) : (
        <OrbitControls
          makeDefault
          target={start.target}
          enableDamping
          dampingFactor={0.12}
          maxPolarAngle={1.45}
          minDistance={3}
          maxDistance={140}
          screenSpacePanning={false}
        />
      )}
      <CameraRig layout={layout} />
      <CameraFeedRenderer layout={layout} />
      <ViewInset />
      <ResponsiveFov />
      <ReadySignal onReady={onReady} />
      <DevHandles />
      {!low && <Effects ao={effects} bloom={effects} />}
    </Canvas>
  );
}
