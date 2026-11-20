import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Shape, ShapeGeometry, type Group } from "three";
import { useThemeColors } from "../../config/useBrand";
import { APRON, DRIVEWAY_HALF, frontage, PLINTH, RAMP_LENGTH, RAMP_WIDTH, ROAD_DROP, STEP_RISE, STEP_RUN } from "../layout/height";
import type { BranchLayout, V3 } from "../layout/types";
import { CEILING_H, frontGaps, WALL_T, wallRun } from "../layout/walls";
import { useBranchSim, useTwinView } from "../store";
import { lathe, metricPlane } from "./kit/geometry";
import { brandMaterials, MAT } from "./materials";
import { Label } from "./kit/labels";
import { Box, Cyl, Instances, RBox, type Instance } from "./primitives";
import { Traffic } from "./Traffic";

/** Street-lamp positions (x, z), shared with the night lighting. */
/** Keeps street furniture off the car-park driveway. */
const clearOfDriveway = (layout: BranchLayout, x: number, margin = 1.2) => Math.abs(x - frontage(layout).aisle) > DRIVEWAY_HALF + margin;

export function streetLamps(layout: BranchLayout): [number, number][] {
  const f = frontage(layout);
  const out: [number, number][] = [];
  for (let x = -layout.width / 2 - 6; x <= layout.width / 2 + 14; x += 13) {
    // Shift a lamp that would stand in the driveway to its far side.
    const lx = clearOfDriveway(layout, x) ? x : f.aisle + DRIVEWAY_HALF + 1.4;
    out.push([lx, f.kerb - 0.5]);
  }
  return out;
}

/** A painted road arrow, 1.6 m long, pointing along +y of its plane (laid flat, that is −z: into the car park). */
const ARROW = (() => {
  const s = new Shape();
  const shaft = 0.08;
  const head = 0.28;
  s.moveTo(-shaft, -0.8);
  s.lineTo(shaft, -0.8);
  s.lineTo(shaft, 0.25);
  s.lineTo(head, 0.25);
  s.lineTo(0, 0.8);
  s.lineTo(-head, 0.25);
  s.lineTo(-shaft, 0.25);
  s.closePath();
  return new ShapeGeometry(s);
})();

/** Car-park entrance: a dropped-kerb driveway across the pavement, lane markings, give-way line and a P sign. */
function Driveway({ layout }: { layout: BranchLayout }) {
  const f = frontage(layout);
  const x = f.aisle;
  const w = DRIVEWAY_HALF * 2;
  const z0 = f.front + 0.5; // car park edge
  const z1 = f.kerb;
  const y = -PLINTH + 0.006;
  const road = -PLINTH - ROAD_DROP;
  const ramp = Math.atan2(ROAD_DROP, 1.2);
  const aisleMarks = useMemo<Instance[]>(() => {
    const out: Instance[] = [];
    // Centre line of the aisle and the driveway, dashed.
    for (let z = -layout.depth / 2 + 1; z < z1 - 1.2; z += 2.2) out.push({ p: [x, y + 0.002, z], s: [0.1, 0.01, 1.1] });
    return out;
  }, [layout.depth, x, y, z1]);
  return (
    <group>
      {/* Asphalt across the pavement, with a ramp down where the kerb is dropped */}
      <mesh geometry={metricPlane(w, z1 - 0.9 - z0)} position={[x, y, (z0 + z1 - 0.9) / 2]} material={MAT.asphalt} receiveShadow />
      <Box p={[x, (y + road) / 2 - 0.02, z1 - 0.3]} s={[w, 0.04, Math.hypot(1.2, ROAD_DROP)]} r={[ramp, 0, 0]} m={MAT.asphalt} cast={false} />
      {/* Kerb edges either side and the white edge lines */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box p={[x + side * (DRIVEWAY_HALF + 0.12), -PLINTH + 0.04, (z0 + z1) / 2]} s={[0.24, 0.08, z1 - z0]} m={MAT.kerb} cast={false} />
          <Box p={[x + side * (DRIVEWAY_HALF - 0.2), y + 0.003, (z0 + z1 - 0.9) / 2]} s={[0.1, 0.01, z1 - 0.9 - z0]} m={MAT.roadLine} cast={false} />
        </group>
      ))}
      <Instances items={aisleMarks} m={MAT.roadLine} cast={false} />
      {/* Give-way line where the driveway meets the road */}
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} p={[x - w / 2 + 0.5 + i * (w - 1) / 5, road + 0.008, z1 + 0.5]} s={[0.6, 0.01, 0.15]} m={MAT.roadLine} cast={false} />
      ))}
      {/* Lane arrows (traffic keeps left): in on the left half, out on the right half */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={ARROW}
          material={MAT.roadLine}
          position={[x + side * 1.5, y + 0.004, z0 + 2.2]}
          rotation={[-Math.PI / 2, 0, side < 0 ? 0 : Math.PI]}
        />
      ))}
      {/* Parking sign at the entrance */}
      <group position={[x + DRIVEWAY_HALF + 0.7, -PLINTH, z0 + 1.2]} rotation={[0, -0.6, 0]}>
        <Cyl p={[0, 1.2, 0]} r={0.04} h={2.4} m={MAT.aluDark} low />
        <RBox p={[0, 2.3, 0.05]} s={[0.62, 0.62, 0.04]} m={MAT.plastic} radius={0.04} />
        <Label text="P" sub="Customer parking" p={[0, 2.3, 0.075]} w={0.56} h={0.56} bg="#1f5fbf" />
      </group>
    </group>
  );
}

function StreetLamp({ x, z }: { x: number; z: number }) {
  const y = -PLINTH;
  return (
    <group position={[x, y, z]}>
      <mesh geometry={lathe([[0.16, 0], [0.16, 0.5], [0.09, 0.6], [0.07, 6.2], [0, 6.2]], 16)} material={MAT.aluDark} castShadow />
      <Box p={[0, 6.1, -0.7]} s={[0.08, 0.08, 1.4]} m={MAT.aluDark} />
      <RBox p={[0, 6.02, -1.35]} s={[0.32, 0.12, 0.62]} m={MAT.aluDark} radius={0.03} />
      <Box p={[0, 5.955, -1.35]} s={[0.24, 0.01, 0.5]} m={MAT.downlight} cast={false} />
    </group>
  );
}

function Tree({ x, z, seed }: { x: number; z: number; seed: number }) {
  const s = 0.85 + ((seed * 37) % 10) / 30;
  return (
    <group position={[x, -PLINTH, z]} scale={s}>
      <Box p={[0, 0.01, 0]} s={[1.3, 0.02, 1.3]} m={MAT.aluDark} cast={false} />
      <mesh geometry={lathe([[0.16, 0], [0.12, 0.3], [0.1, 2.4], [0.05, 3.2], [0, 3.2]], 10)} material={MAT.trunk} castShadow />
      {[
        [0, 3.6, 0, 1.45],
        [0.75, 3.2, 0.3, 1.0],
        [-0.65, 3.3, -0.35, 1.05],
        [0.1, 4.25, -0.2, 0.95],
      ].map(([px, py, pz, r], i) => (
        <mesh key={i} position={[px, py, pz]} scale={[r, r * 0.85, r]} material={i % 2 ? MAT.plantDark : MAT.plant} castShadow>
          <icosahedronGeometry args={[1, 2]} />
        </mesh>
      ))}
    </group>
  );
}

function Ground({ layout }: { layout: BranchLayout }) {
  const { width: W, depth: D } = layout;
  const f = frontage(layout);
  const right = W / 2;
  const roadZ = f.kerb + 5.9;
  const road = -PLINTH - ROAD_DROP;
  const dashes = useMemo<Instance[]>(() => {
    const out: Instance[] = [];
    for (let x = -60; x <= 60; x += 6) out.push({ p: [x, road + 0.006, roadZ], s: [3, 0.01, 0.16] });
    return out;
  }, [roadZ, road]);
  const bays = useMemo<Instance[]>(() => {
    const out: Instance[] = [];
    for (let z = -D / 2 + 1; z <= f.front - 1; z += 2.8) out.push({ p: [right + 8, -PLINTH + 0.006, z], s: [5.2, 0.01, 0.1] });
    return out;
  }, [D, f.front, right]);
  const trees = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = -W / 2 - 10; x <= right + 16; x += 7.5)
      if (Math.abs(x - layout.entrance.x) > 3.5 && clearOfDriveway(layout, x, 1.6)) out.push([x, f.kerb - 2.2]);
    return out;
  }, [W, f.kerb, right, layout]);
  const neighbourWindows = useMemo<Instance[]>(() => {
    const out: Instance[] = [];
    for (const [cx, w, h] of [
      [-W / 2 - 9, 14, 9],
      [right + 23, 14, 7],
    ] as const) {
      for (let y = 1.6; y < h - 0.8; y += 3) out.push({ p: [cx, -PLINTH + y + 0.6, D / 2 + 0.03], s: [w - 1.6, 1.4, 0.04] });
    }
    return out;
  }, [W, right, D]);

  return (
    <group>
      <mesh geometry={metricPlane(240, 240)} position={[0, road - 0.03, 0]} material={MAT.ground} receiveShadow />
      {/* Pavement across the frontage and round the side to the car park */}
      {/* Pavement and kerb, broken where the car-park driveway crosses them */}
      {[
        [-65, f.aisle - DRIVEWAY_HALF],
        [f.aisle + DRIVEWAY_HALF, 65],
      ].map(([a, b]) => (
        <group key={a}>
          <Box p={[(a + b) / 2, -PLINTH - 0.1, (f.front - 2 + f.kerb) / 2]} s={[b - a, 0.2, f.kerb - f.front + 2]} m={MAT.paving} cast={false} />
          <Box p={[(a + b) / 2, -PLINTH - ROAD_DROP / 2 - 0.02, f.kerb + 0.12]} s={[b - a, ROAD_DROP + 0.04, 0.25]} m={MAT.kerb} cast={false} />
        </group>
      ))}
      <Box
        p={[f.aisle, -PLINTH - 0.1, (f.front - 2 + f.kerb - 0.9) / 2]}
        s={[DRIVEWAY_HALF * 2, 0.2, f.kerb - 0.9 - f.front + 2]}
        m={MAT.paving}
        cast={false}
      />
      <mesh geometry={metricPlane(130, 11.5)} position={[0, road, roadZ]} material={MAT.asphalt} receiveShadow />
      <Instances items={dashes} m={MAT.roadLine} cast={false} />
      {/* Side car park, level with the pavement */}
      <mesh geometry={metricPlane(12, D + 1)} position={[right + 8, -PLINTH + 0.003, 0]} material={MAT.asphalt} receiveShadow />
      <Instances items={bays} m={MAT.roadLine} cast={false} />
      {/* Moving, parking and drop-off traffic */}
      <Traffic layout={layout} />
      {trees.map(([x, z], i) => (
        <Tree key={x} x={x} z={z} seed={i + 1} />
      ))}
      {streetLamps(layout).map(([x, z]) => (
        <StreetLamp key={x} x={x} z={z} />
      ))}
      <Driveway layout={layout} />
      {/* Bollards along the kerb in front of the entrance */}
      {[-3, -1.5, 0, 1.5, 3].map((dx) => (
        <mesh key={dx} geometry={lathe([[0.1, 0], [0.1, 0.8], [0.07, 0.9], [0, 0.92]], 14)} material={MAT.aluDark} position={[layout.entrance.x + dx, -PLINTH, f.kerb - 0.5]} castShadow />
      ))}
      {/* Neighbouring buildings for context */}
      <Box p={[-W / 2 - 9, -PLINTH + 4.5, -1]} s={[14, 9, D + 2]} m={MAT.neighbour} />
      <Box p={[right + 23, -PLINTH + 3.5, -1]} s={[14, 7, D + 2]} m={MAT.neighbourDark} />
      <Instances items={neighbourWindows} m={MAT.glassDark} cast={false} />
    </group>
  );
}

/** Plinth, landing, steps across the frontage and the accessible ramp with handrails. */
function Plinth({ layout }: { layout: BranchLayout }) {
  const { width: W, depth: D } = layout;
  const f = frontage(layout);
  const { steps, ramp } = f;
  const slope = Math.atan2(PLINTH, RAMP_LENGTH);
  const rampLen = Math.hypot(PLINTH, RAMP_LENGTH);
  const posts = useMemo<Instance[]>(() => {
    const out: Instance[] = [];
    for (const z of [ramp.z0 + 0.06, ramp.z1 - 0.06])
      for (let i = 0; i <= 4; i++) {
        const x = ramp.x0 + 0.15 + ((RAMP_LENGTH - 0.3) * i) / 4;
        const y = -PLINTH * (1 - (x - ramp.x0) / RAMP_LENGTH);
        out.push({ p: [x, y + 0.45, z], s: [0.045, 0.9, 0.045] });
      }
    return out;
  }, [ramp]);
  return (
    <group>
      {/* Plinth under the building and landing, clad in granite */}
      <Box p={[0, -PLINTH / 2, (APRON) / 2]} s={[W + 0.6, PLINTH, D + 0.6 + APRON]} m={MAT.cladding} cast={false} />
      <Box p={[0, -0.012, f.front + APRON / 2]} s={[W + 0.6, 0.03, APRON]} m={MAT.stone} cast={false} />
      {/* Steps: two treads down to the pavement, with aluminium nosings */}
      {[0, 1].map((k) => (
        <group key={k}>
          <Box
            p={[(steps.x0 + steps.x1) / 2, (-PLINTH - STEP_RISE * (k + 1)) / 2, steps.z0 + STEP_RUN * (k + 0.5)]}
            s={[steps.x1 - steps.x0, PLINTH - STEP_RISE * (k + 1), STEP_RUN]}
            m={MAT.stone}
            cast={false}
          />
          <Box p={[(steps.x0 + steps.x1) / 2, -STEP_RISE * (k + 1) - 0.006, steps.z0 + STEP_RUN * k + 0.025]} s={[steps.x1 - steps.x0, 0.014, 0.05]} m={MAT.alu} cast={false} />
        </group>
      ))}
      {/* Ramp */}
      <Box p={[(ramp.x0 + ramp.x1) / 2, -PLINTH / 2 - 0.06, (ramp.z0 + ramp.z1) / 2]} s={[rampLen, 0.12, RAMP_WIDTH]} r={[0, 0, slope]} m={MAT.concrete} cast={false} />
      <Instances items={posts} m={MAT.chrome} />
      {[ramp.z0 + 0.06, ramp.z1 - 0.06].map((z) => (
        <Box key={z} p={[(ramp.x0 + ramp.x1) / 2, -PLINTH / 2 + 0.9, z]} s={[rampLen, 0.045, 0.045]} r={[0, 0, slope]} m={MAT.chrome} />
      ))}
      {/* Ramp cheek wall where it runs below the landing */}
      <Box p={[(ramp.x0 + ramp.x1) / 2, -PLINTH / 2, ramp.z0 - 0.04]} s={[RAMP_LENGTH, PLINTH, 0.08]} m={MAT.cladding} cast={false} />
      {/* Planters at the ends of the landing */}
      {[f.left + 0.35, f.right - 0.35].map((x) => (
        <group key={x} position={[x, 0, f.front + APRON - 0.45]}>
          <RBox p={[0, 0.3, 0]} s={[0.6, 0.6, 0.6]} m={MAT.cladding} radius={0.02} />
          <mesh position={[0, 0.85, 0]} scale={[0.42, 0.5, 0.42]} material={MAT.plantDark} castShadow>
            <icosahedronGeometry args={[1, 2]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Glass sliding doors that open when someone is near. */
function SlidingDoors({ x, z, width }: { x: number; z: number; width: number }) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const open = useRef(0);
  useFrame((_, dt) => {
    const sim = useBranchSim.getState().sim;
    const cam = useTwinView.getState().mode === "walk";
    const near = (sim?.customers.some((c) => Math.abs(c.x - x) < 2.2 && Math.abs(c.z - z) < 2.4) ?? false) || (cam && doorNearCamera.current);
    const target = near ? 1 : 0;
    open.current += (target - open.current) * Math.min(1, dt * 6);
    const shift = open.current * (width / 2 - 0.1);
    if (left.current) left.current.position.x = -width / 4 - shift;
    if (right.current) right.current.position.x = width / 4 + shift;
  });
  return (
    <group position={[x, 0, z]} userData={{ dynamic: true }}>
      {[left, right].map((ref, i) => (
        <group key={i} ref={ref}>
          <Box p={[0, 1.2, 0]} s={[width / 2, 2.4, 0.03]} m={MAT.glass} cast={false} />
          <Box p={[(i ? -1 : 1) * (width / 4 - 0.03), 1.2, 0]} s={[0.05, 2.4, 0.06]} m={MAT.aluDark} cast={false} />
          <Box p={[0, 0.04, 0]} s={[width / 2, 0.08, 0.06]} m={MAT.aluDark} cast={false} />
        </group>
      ))}
      {/* Door head with the sensor and the portal frame */}
      <Box p={[0, 2.52, 0]} s={[width + 0.3, 0.24, 0.22]} m={MAT.aluDark} cast={false} />
      <Box p={[0, 2.5, 0.12]} s={[0.25, 0.06, 0.04]} m={MAT.plasticDark} cast={false} />
    </group>
  );
}

/** Set by the walkthrough when the camera is close to the entrance, so the doors open for the viewer too. */
export const doorNearCamera = { current: false };

/** Curtain wall, piers, brand band, canopy and parapet. */
function Facade({ layout, walls }: { layout: BranchLayout; walls: boolean }) {
  const { brand, islamic } = useThemeColors();
  const accent = layout.archetype === "islamic" ? islamic : brand;
  const brandMats = brandMaterials(accent);
  const { width: W, height: H } = layout;
  const left = -W / 2;
  const right = W / 2;
  const front = layout.depth / 2;
  const glassH = walls ? CEILING_H : 1.1;
  const runs = wallRun("x", front, left, right, frontGaps(layout), glassH, 0.03);
  const frame = useMemo(() => {
    const mullions: Instance[] = [];
    const transoms: Instance[] = [];
    for (const r of runs) {
      const a = r.p[0] - r.s[0] / 2;
      const b = r.p[0] + r.s[0] / 2;
      const n = Math.max(1, Math.round((b - a) / 1.5));
      for (let i = 0; i <= n; i++) mullions.push({ p: [a + ((b - a) * i) / n, glassH / 2, front], s: [0.06, glassH, 0.16] });
      transoms.push({ p: [(a + b) / 2, 0.12, front], s: [b - a, 0.24, 0.16] });
      transoms.push({ p: [(a + b) / 2, glassH - 0.04, front], s: [b - a, 0.08, 0.16] });
      if (walls) transoms.push({ p: [(a + b) / 2, 2.6, front], s: [b - a, 0.05, 0.12] });
    }
    return { mullions, transoms };
  }, [runs, glassH, front, walls]);
  const canopyW = layout.entrance.width + 2.6;
  return (
    <group>
      {runs.map((r, i) => (
        <Box key={i} p={r.p} s={r.s} m={MAT.glass} cast={false} />
      ))}
      <Instances items={frame.mullions} m={MAT.aluDark} cast={false} />
      <Instances items={frame.transoms} m={MAT.aluDark} cast={false} />
      <SlidingDoors x={layout.entrance.x} z={front} width={layout.entrance.width} />
      {walls && (
        <>
          {/* Stone-clad corner piers, proud of the glass */}
          {[left - WALL_T / 2 + 0.1, right + WALL_T / 2 - 0.1].map((x) => (
            <Box key={x} p={[x, (H + 0.7) / 2, front + 0.12]} s={[0.7, H + 0.7, 0.5]} m={MAT.cladding} />
          ))}
          {/* Band above the glass with the brand stripe, and the parapet coping */}
          <Box p={[0, (CEILING_H + H + 0.7) / 2, front + 0.08]} s={[W, H + 0.7 - CEILING_H, 0.36]} m={MAT.facade} />
          <Box p={[0, CEILING_H + 0.06, front + 0.27]} s={[W, 0.12, 0.04]} m={brandMats.brand} cast={false} />
          {/* Parapet coping: a metal cap along the four parapets */}
          <Box p={[0, H + 0.73, front + 0.08]} s={[W + 0.6, 0.06, 0.42]} m={MAT.aluDark} cast={false} />
          <Box p={[0, H + 0.73, -layout.depth / 2 - WALL_T / 2]} s={[W + WALL_T * 2 + 0.06, 0.06, WALL_T + 0.06]} m={MAT.aluDark} cast={false} />
          {[left - WALL_T / 2, right + WALL_T / 2].map((x) => (
            <Box key={x} p={[x, H + 0.73, 0]} s={[WALL_T + 0.06, 0.06, layout.depth]} m={MAT.aluDark} cast={false} />
          ))}
          {/* Entrance canopy with downlights */}
          <group position={[layout.entrance.x, 3.02, front + 0.9]}>
            <RBox p={[0, 0, 0]} s={[canopyW, 0.2, 1.8]} m={MAT.aluDark} radius={0.03} />
            <Box p={[0, -0.101, 0]} s={[canopyW - 0.1, 0.004, 1.7]} m={MAT.alu} cast={false} />
            {[-1, 0, 1].map((i) => (
              <Cyl key={i} p={[(i * canopyW) / 3.2, -0.106, 0.15]} r={0.07} h={0.01} m={MAT.downlight} cast={false} />
            ))}
          </group>
        </>
      )}
    </group>
  );
}

/** The outside of the branch: street, plinth, steps and ramp, façade and roof. */
export function Exterior({ layout }: { layout: BranchLayout }) {
  const walls = useTwinView((s) => s.layers.walls);
  const roof = useTwinView((s) => s.layers.roof);
  const mode = useTwinView((s) => s.mode);
  const { width: W, depth: D, height: H } = layout;
  const showRoof = roof && mode === "exterior" && walls;
  const units: V3[] = useMemo(
    () => [
      [-W / 4, H + 0.55, -D / 4],
      [-W / 4 + 2.2, H + 0.55, -D / 4],
      [W / 5, H + 0.55, -D / 5],
    ],
    [W, D, H],
  );
  return (
    <group>
      <Ground layout={layout} />
      <Plinth layout={layout} />
      <Facade layout={layout} walls={walls} />
      {showRoof && (
        <>
          <Box p={[0, H + 0.08, 0]} s={[W + WALL_T * 2, 0.16, D + WALL_T]} m={MAT.roof} />
          {/* Rooftop condensers */}
          {units.map((p, i) => (
            <group key={i} position={p}>
              <RBox p={[0, 0, 0]} s={[1.6, 0.8, 0.9]} m={MAT.ups} radius={0.04} />
              <Cyl p={[0, 0.41, 0]} r={0.32} h={0.03} m={MAT.mesh} cast={false} />
            </group>
          ))}
        </>
      )}
    </group>
  );
}
