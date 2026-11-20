import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, CatmullRomCurve3, MeshBasicMaterial, MeshStandardMaterial, Vector3, type Group } from "three";
import { frontage, groundHeight } from "../layout/height";
import type { BranchLayout, V2 } from "../layout/types";
import { arriveFrom } from "../sim/engine";
import { useBranchSim, useTwinView } from "../store";
import { MAT } from "./materials";
import { Cyl, RBox } from "./primitives";

/**
 * Street life: through traffic in both lanes, cars dropping customers at the kerb, cars turning into
 * the side car park, parking in a bay (the driver walks in) and later reversing out and leaving.
 * Customers who get out of a car join the branch simulation like any other walk-in. Cars run in real
 * time (a car at 60× would look absurd) but stop when the simulation is paused, and keep a gap to the
 * car in front.
 */

const POOL = 14;
/** Car paints: the shared palette plus a few common colours. */
const PAINT = [
  ...MAT.car,
  new MeshStandardMaterial({ color: "#c9ccd1", roughness: 0.3, metalness: 0.6 }),
  new MeshStandardMaterial({ color: "#1d3557", roughness: 0.3, metalness: 0.5 }),
  new MeshStandardMaterial({ color: "#f4f4f2", roughness: 0.35, metalness: 0.3 }),
];
const ACCEL = 3.2;
const BRAKE = 4.5;

type Segment = { pts: Vector3[]; lengths: number[]; total: number; reverse: boolean; vmax: number; stop: boolean };
type Event = "dropoff" | "parked" | null;

interface Car {
  active: boolean;
  /** Seconds spent held up by the car in front (after a few, it edges past to avoid a deadlock). */
  blocked: number;
  segs: Segment[];
  seg: number;
  s: number;
  v: number;
  wait: number;
  onStop: Event[];
  bay: number;
  /** Parked: real seconds until it leaves. */
  parkedFor: number;
  x: number;
  z: number;
  heading: number;
  wheel: number;
}

function segment(points: V2[], opts: { reverse?: boolean; vmax?: number; stop?: boolean; smooth?: boolean } = {}): Segment {
  const raw = points.map(([x, z]) => new Vector3(x, 0, z));
  const pts = opts.smooth === false || raw.length < 3 ? raw : new CatmullRomCurve3(raw, false, "centripetal", 0.5).getSpacedPoints(Math.max(8, Math.round(raw.length * 10)));
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, lengths, total: lengths[lengths.length - 1], reverse: !!opts.reverse, vmax: opts.vmax ?? 9, stop: !!opts.stop };
}

function sample(seg: Segment, s: number): { x: number; z: number; dx: number; dz: number } {
  const { pts, lengths } = seg;
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < s) i++;
  const a = pts[i - 1];
  const b = pts[i];
  const t = Math.min(1, Math.max(0, (s - lengths[i - 1]) / Math.max(1e-6, lengths[i] - lengths[i - 1])));
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: b.x - a.x, dz: b.z - a.z };
}

/** Street geometry for this layout: lanes, the kerb lay-by, the car-park aisle and its bays. */
function streets(layout: BranchLayout) {
  const f = frontage(layout);
  const right = layout.width / 2;
  const D = layout.depth;
  const bays: number[] = [];
  for (let z = -D / 2 + 1 + 1.4; z + 1.4 <= f.front - 1 + 0.01; z += 2.8) bays.push(z);
  return {
    near: f.kerb + 3.0, // eastbound (+x), nearest the branch
    far: f.kerb + 8.6, // westbound (−x)
    layby: f.kerb + 1.25,
    kerb: f.kerb,
    aisle: f.aisle,
    bayX: right + 8,
    bays,
    end: 80,
    entrance: layout.entrance.x,
    front: f.front,
    right,
  };
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function Traffic({ layout }: { layout: BranchLayout }) {
  const st = useMemo(() => streets(layout), [layout]);
  const cars = useRef<Car[]>([]);
  const groups = useRef<(Group | null)[]>([]);
  const wheels = useRef<(Group | null)[][]>([]);
  const timers = useRef({ through: 1, dropoff: 6, park: 10 });
  const occupied = useRef<boolean[]>([]);
  const lights = useMemo(
    () => ({
      head: new MeshStandardMaterial({ color: "#f3f1e6", emissive: "#fff6dc", emissiveIntensity: 0.2, roughness: 0.2 }),
      tail: new MeshStandardMaterial({ color: "#6b0d0d", emissive: "#ff2a2a", emissiveIntensity: 0.25, roughness: 0.4 }),
    }),
    [],
  );
  const shadowMat = useMemo(() => {
    // A rounded-rectangle shadow, darkest under the body and fading out past the wheels.
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.filter = "blur(7px)";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.roundRect(14, 14, 36, 100, 10);
    ctx.fill();
    return new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false });
  }, []);
  const night = useTwinView((s) => s.lighting === "night");
  useEffect(() => {
    lights.head.emissiveIntensity = night ? 3 : 0.2;
    lights.head.toneMapped = !night;
    lights.tail.emissiveIntensity = night ? 2 : 0.25;
    lights.tail.toneMapped = !night;
    lights.head.needsUpdate = lights.tail.needsUpdate = true;
  }, [night, lights]);
  useEffect(
    () => () => {
      lights.head.dispose();
      lights.tail.dispose();
      shadowMat.map?.dispose();
      shadowMat.dispose();
    },
    [lights, shadowMat],
  );

  // Start with a few cars already parked and one or two passing.
  useEffect(() => {
    occupied.current = st.bays.map(() => false);
    cars.current = Array.from({ length: POOL }, () => ({
      active: false,
      blocked: 0,
      segs: [],
      seg: 0,
      s: 0,
      v: 0,
      wait: 0,
      onStop: [],
      bay: -1,
      parkedFor: 0,
      x: 0,
      z: -999,
      heading: 0,
      wheel: 0,
    }));
    const initial = Math.min(st.bays.length - 1, 3);
    for (let i = 0; i < initial; i++) {
      const bay = Math.floor((i * st.bays.length) / initial);
      park(bay, true);
    }
    through(-20);
    through(25);
    if (import.meta.env.DEV) Object.assign(window, { __traffic: { cars: cars.current, occupied: occupied.current, timers: timers.current } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st]);

  function free() {
    return cars.current.find((c) => !c.active);
  }

  function start(c: Car, segs: Segment[], onStop: Event[]) {
    c.active = true;
    c.blocked = 0;
    c.segs = segs;
    c.seg = 0;
    c.s = 0;
    c.v = segs[0].vmax * 0.8;
    c.wait = 0;
    c.onStop = onStop;
    c.bay = -1;
  }

  function through(startX?: number) {
    const c = free();
    if (!c) return;
    const east = Math.random() < 0.5;
    const lane = east ? st.near : st.far;
    const from = east ? -st.end : st.end;
    const to = -from;
    start(c, [segment([[from, lane], [to, lane]], { vmax: rnd(8, 11), smooth: false })], []);
    if (startX !== undefined) c.s = Math.abs(startX - from);
  }

  function dropoff() {
    const c = free();
    if (!c) return;
    const x = st.entrance;
    start(
      c,
      [
        segment([[-st.end, st.near], [x - 14, st.near], [x - 5, st.layby + 0.3], [x + 0.8, st.layby]], { vmax: 9, stop: true }),
        segment([[x + 0.8, st.layby], [x + 6, st.layby + 0.4], [x + 13, st.near], [st.end, st.near]], { vmax: 9 }),
      ],
      ["dropoff", null],
    );
  }

  function park(bay: number, already = false) {
    const c = free();
    if (!c) return;
    const z = st.bays[bay];
    occupied.current[bay] = true;
    // Traffic keeps left: in on the driveway's left half (x − 1.3), out on the right half.
    const lane = st.aisle - 1.3;
    const aisleIn = st.aisle - 0.75;
    const entry = segment(
      [
        [-st.end, st.near],
        [lane - 9, st.near],
        [lane - 1.2, st.near - 0.7],
        [lane, st.kerb + 0.6],
        [lane, st.kerb - 1.5],
        [aisleIn, st.front - 1],
        [aisleIn, z + 3.2],
        [aisleIn - 1, z + 0.9],
        [st.bayX + 1.6, z],
        [st.bayX, z],
      ],
      { vmax: 8, stop: true },
    );
    start(c, [entry], ["parked"]);
    c.bay = bay;
    if (already) {
      // Place it straight in the bay.
      c.s = entry.total;
      c.v = 0;
      c.segs = [entry];
      c.seg = 0;
      c.wait = Infinity;
      c.parkedFor = rnd(20, 90);
      c.onStop = [null];
    }
  }

  function leaveBay(c: Car) {
    const z = st.bays[c.bay];
    const west = Math.random() < 0.5;
    const out = st.aisle + 0.75;
    const lane = st.aisle + 1.3;
    c.segs = [
      segment([[st.bayX, z], [st.bayX + 2.4, z], [out - 0.4, z - 1.6], [out, z - 2.6]], { reverse: true, vmax: 2.2, stop: true }),
      segment(
        west
          ? [[out, z - 2.6], [out, st.front - 1], [lane, st.front + 1], [lane, st.kerb + 0.4], [lane - 2.5, st.near + 2.2], [lane - 7, st.far], [-st.end, st.far]]
          : [[out, z - 2.6], [out, st.front - 1], [lane, st.front + 1], [lane, st.kerb + 0.4], [lane + 3, st.near], [st.end, st.near]],
        { vmax: 9 },
      ),
    ];
    c.seg = 0;
    c.s = 0;
    c.v = 0;
    c.wait = 0.8;
    c.onStop = [null, null];
    c.parkedFor = 0;
    occupied.current[c.bay] = false;
    c.bay = -1;
  }

  useFrame((_, rawDt) => {
    const { sim, layout: simLayout, paused } = useBranchSim.getState();
    if (paused) return;
    const dt = Math.min(rawDt, 0.1);
    const t = timers.current;
    const open = !!sim?.open;

    // Schedule new cars (real seconds).
    t.through -= dt;
    if (t.through <= 0) {
      through();
      t.through = rnd(3.5, 8);
    }
    t.dropoff -= dt;
    if (t.dropoff <= 0) {
      if (open) dropoff();
      t.dropoff = rnd(18, 35);
    }
    t.park -= dt;
    if (t.park <= 0) {
      const freeBays = occupied.current.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
      if (open && freeBays.length) park(freeBays[Math.floor(Math.random() * freeBays.length)]);
      t.park = rnd(22, 40);
    }

    const list = cars.current;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      const g = groups.current[i];
      if (!c.active) {
        if (g) g.visible = false;
        continue;
      }
      if (c.wait > 0) {
        c.wait -= dt;
        if (c.parkedFor > 0 && c.wait === Infinity) {
          c.parkedFor -= dt;
          if (c.parkedFor <= 0) leaveBay(c);
        }
      } else {
        const seg = c.segs[c.seg];
        // Speed: cruise, slow for the stop at the end, keep a gap to anyone ahead.
        let target = seg.vmax;
        if (seg.stop) target = Math.min(target, Math.sqrt(2 * BRAKE * 0.6 * Math.max(0, seg.total - c.s)) + 0.3);
        const fx = Math.sin(c.heading);
        const fz = Math.cos(c.heading);
        const dir = seg.reverse ? -1 : 1;
        const free = target;
        for (let j = 0; j < list.length && c.blocked < 4; j++) {
          if (j === i || !list[j].active) continue;
          const ox = list[j].x - c.x;
          const oz = list[j].z - c.z;
          const ahead = (ox * fx + oz * fz) * dir;
          const side = Math.abs(ox * fz - oz * fx);
          if (ahead > 0 && ahead < 10 && side < 1.6) target = Math.min(target, Math.max(0, (ahead - 5.2) * 1.2));
        }
        // Held up for 4 s (two cars nose to nose in the aisle): edge past for 2.5 s, then behave again.
        c.blocked = c.blocked >= 4 ? (c.blocked > 6.5 ? 0 : c.blocked + dt) : target < 0.2 && free > 0.5 ? c.blocked + dt : 0;
        c.v += Math.max(-BRAKE * dt, Math.min(ACCEL * dt, target - c.v));
        c.s += c.v * dt;
        if (c.s >= seg.total) {
          c.s = seg.total;
          const event = c.onStop[c.seg];
          if (event === "dropoff" && sim && simLayout) {
            // Passenger steps out onto the pavement and walks in.
            const p = sample(seg, seg.total);
            arriveFrom(sim, simLayout, [p.x - 0.4, st.kerb - 0.4], [[st.entrance + (p.x > st.entrance ? 1.2 : -1.2), st.kerb - 1.6]]);
            c.wait = rnd(4, 7);
          } else if (event === "parked" && sim && simLayout) {
            // The driver walks from the bay round to the front door.
            const z = st.bays[c.bay];
            arriveFrom(sim, simLayout, [st.bayX - 0.4, z + 1.3], [[st.right + 3.2, z + 1.3], [st.right + 3.2, st.front + 2.9]]);
            c.wait = Infinity;
            c.parkedFor = rnd(45, 110);
          } else if (seg.stop) c.wait = 0.6;
          if (c.wait !== Infinity) {
            c.seg += 1;
            c.s = 0;
            if (c.seg >= c.segs.length) {
              c.active = false;
              continue;
            }
          }
        }
      }
      // Pose.
      const seg = c.segs[Math.min(c.seg, c.segs.length - 1)];
      const p = sample(seg, c.s);
      const moved = Math.hypot(p.x - c.x, p.z - c.z);
      if (Math.hypot(p.dx, p.dz) > 1e-5) {
        const h = Math.atan2(p.dx, p.dz) + (seg.reverse ? Math.PI : 0);
        let d = h - c.heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        c.heading += moved > 2 ? d : d * Math.min(1, dt * 10);
      }
      c.x = p.x;
      c.z = p.z;
      c.wheel += (moved / 0.34) * (seg.reverse ? -1 : 1);
      if (g) {
        g.visible = true;
        g.position.set(c.x, groundHeight(layout, c.x, c.z), c.z);
        g.rotation.y = c.heading;
        for (const w of wheels.current[i] ?? []) if (w) w.rotation.x = c.wheel;
      }
    }
  });

  return (
    <group userData={{ dynamic: true }}>
      {Array.from({ length: POOL }, (_, i) => (
        <group key={i} ref={(g) => void (groups.current[i] = g)} visible={false}>
          {/* Soft shadow that travels with the car (the cached shadow map would leave a ghost behind) */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={shadowMat} renderOrder={1}>
            <planeGeometry args={[2.5, 5.1]} />
          </mesh>
          <group>
            <RBox p={[0, 0.62, 0]} s={[1.78, 0.6, 4.3]} m={PAINT[i % PAINT.length]} radius={0.12} cast={false} />
            <RBox p={[0, 1.1, -0.2]} s={[1.58, 0.48, 2.25]} m={MAT.glassDark} radius={0.12} cast={false} />
            {/* Headlights (front, +z) and tail lights */}
            {[-0.6, 0.6].map((x) => (
              <group key={x}>
                <RBox p={[x, 0.7, 2.14]} s={[0.36, 0.13, 0.04]} m={lights.head} radius={0.02} cast={false} />
                <RBox p={[x, 0.72, -2.14]} s={[0.36, 0.11, 0.04]} m={lights.tail} radius={0.02} cast={false} />
              </group>
            ))}
          </group>
          {[-0.82, 0.82].flatMap((dx) =>
            [-1.38, 1.38].map((dz, k) => (
              <group
                key={`${dx}${dz}`}
                position={[dx, 0.34, dz]}
                ref={(w) => {
                  (wheels.current[i] ??= [])[(dx > 0 ? 2 : 0) + k] = w;
                }}
              >
                <Cyl p={[0, 0, 0]} r={0.34} h={0.24} m={MAT.tyre} rot={[0, 0, Math.PI / 2]} low cast={false} />
                <Cyl p={[dx > 0 ? 0.125 : -0.125, 0, 0]} r={0.2} h={0.01} m={MAT.alu} rot={[0, 0, Math.PI / 2]} low cast={false} />
              </group>
            )),
          )}
        </group>
      ))}
    </group>
  );
}
