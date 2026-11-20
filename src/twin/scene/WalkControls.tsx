import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Euler, InstancedMesh, Matrix4, Mesh, Raycaster, Vector2, type Object3D } from "three";
import { frontage, groundHeight } from "../layout/height";
import { buildNavGrid, findPath, resolveCircle, type NavGrid } from "../layout/navGrid";
import type { BranchLayout, V2, ZoneId } from "../layout/types";
import { allWalls, footprint, type Rect } from "../layout/walls";
import { liveCamera, useTwinView } from "../store";
import { doorNearCamera } from "./Exterior";

export const EYE = 1.65;
const RADIUS = 0.28;
const WALK = 1.45;
const RUN = 3.2;

/** Live walkthrough state for the HUD (position, heading, pointer lock), written every frame. */
export const walkState = { x: 0, z: 0, yaw: 0, locked: false, auto: false };

/** Zones visited by the guided tour, in walking order (those the branch has). */
const TOUR: ZoneId[] = ["lobby", "atm", "waiting", "tellers", "service", "manager", "meeting", "prayer", "vault", "backOffice", "staff"];

/** Where to stand to see a zone: its label point, nudged towards the hall. */
function zoneTarget(layout: BranchLayout, id: ZoneId): V2 | null {
  const z = layout.zones.find((zz) => zz.id === id);
  if (!z) return null;
  if (id === "lobby") return [layout.entrance.x, layout.depth / 2 - 2.2];
  if (id === "tellers") return [(layout.counter.x0 + layout.counter.x1) / 2, layout.counter.z + 1.6];
  if (id === "waiting") return [layout.points.hub[0], layout.points.hub[1] + 1.2];
  if (id === "vault") {
    const v = layout.rooms.find((r) => r.id === "vault");
    if (v) return [v.door.at, v.rect[3] + 1.3];
  }
  return [(z.rect[0] + z.rect[2]) / 2, (z.rect[1] + z.rect[3]) / 2];
}

/** Furniture footprints from the rendered meshes: anything you'd walk into (between knee and head height). */
function furnitureRects(root: Object3D | undefined): Rect[] {
  if (!root) return [];
  const out: Rect[] = [];
  const box = new Box3();
  const m = new Matrix4();
  root.updateWorldMatrix(true, true);
  const add = (b: Box3) => {
    if (b.isEmpty() || b.max.y < 0.25 || b.min.y > 1.7) return;
    const area = (b.max.x - b.min.x) * (b.max.z - b.min.z);
    if (area > 8 || area < 0.002) return;
    out.push([b.min.x, b.min.z, b.max.x, b.max.z]);
  };
  root.traverse((o) => {
    if (!(o instanceof Mesh) || (!o.visible && !o.userData.batched) || o.userData.selectId || !o.layers.isEnabled(0)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    if (o instanceof InstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        box.copy(o.geometry.boundingBox!).applyMatrix4(m).applyMatrix4(o.matrixWorld);
        add(box);
      }
    } else {
      box.copy(o.geometry.boundingBox!).applyMatrix4(o.matrixWorld);
      add(box);
    }
  });
  return out;
}

/**
 * First-person walkthrough. Mouse look with pointer lock (click the view), or drag to look without it;
 * WASD / arrow keys to walk, Shift to run. Walls, glass and furniture block the way; door gaps,
 * steps and the ramp don't. A zone request (click-to-go) or the guided tour walks the camera along an
 * A* path. Clicking while looking selects whatever is under the centre crosshair.
 */
export function WalkControls({ layout, sensitivity = 1 }: { layout: BranchLayout; sensitivity?: number }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const walkTo = useTwinView((s) => s.walkTo);
  const touring = useTwinView((s) => s.touring);
  const keys = useRef(new Set<string>());
  const look = useRef({ yaw: 0, pitch: -0.05 });
  const pos = useRef<V2>([0, 0]);
  const vel = useRef<V2>([0, 0]);
  const bob = useRef(0);
  const route = useRef<V2[] | null>(null);
  const tour = useRef<{ stops: V2[]; i: number; dwell: number } | null>(null);
  const world = useRef<{ rects: Rect[]; grid: NavGrid } | null>(null);
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null);

  const walls = useMemo(() => allWalls(layout).map((w) => footprint(w)), [layout]);

  // Start outside the entrance, facing the door.
  useEffect(() => {
    const f = frontage(layout);
    pos.current = [layout.entrance.x, f.front + 4.2];
    look.current = { yaw: 0, pitch: -0.04 };
    vel.current = [0, 0];
    route.current = null;
    const euler = new Euler(0, 0, 0, "YXZ");
    camera.rotation.copy(euler);
  }, [layout, camera]);

  /** Collision and path data, built once the furniture has rendered (and rebuilt after models load). */
  const ensureWorld = () => {
    if (world.current) return world.current;
    const f = frontage(layout);
    const bounds: Rect = [f.left - 4, layout.serviceBand.rear - 0.5, f.right + 4, f.kerb - 0.4];
    const [bx0, bz0, bx1, bz1] = bounds;
    const rects: Rect[] = [
      ...walls,
      ...furnitureRects(scene.getObjectByName("fixtures")),
      // The neighbouring building, and the edges of the plot (the kerb, the car park, the back lane).
      [f.left - 16, -layout.depth / 2 - 2, f.left - 2, layout.depth / 2],
      [bx0 - 1, bz0 - 1, bx0, bz1 + 1],
      [bx1, bz0 - 1, bx1 + 1, bz1 + 1],
      [bx0 - 1, bz0 - 1, bx1 + 1, bz0],
      [bx0 - 1, bz1, bx1 + 1, bz1 + 1],
    ];
    const grid = buildNavGrid(bounds, rects, RADIUS);
    world.current = { rects, grid };
    return world.current;
  };
  useEffect(() => {
    world.current = null;
    const t = setTimeout(() => (world.current = null), 4000);
    return () => clearTimeout(t);
  }, [layout, walls]);

  const goTo = (target: V2) => {
    const { grid } = ensureWorld();
    route.current = findPath(grid, pos.current, target);
  };

  // Click-to-go from the zone list.
  useEffect(() => {
    if (!walkTo.zone) return;
    const t = zoneTarget(layout, walkTo.zone);
    if (t) goTo(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkTo.nonce]);

  // Guided tour.
  useEffect(() => {
    if (!touring) {
      tour.current = null;
      return;
    }
    const stops = TOUR.map((id) => zoneTarget(layout, id)).filter((p): p is V2 => !!p);
    tour.current = { stops, i: 0, dwell: 0 };
    goTo(stops[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touring, layout]);

  // Input: keys, pointer lock, drag-to-look, and centre-click selection.
  useEffect(() => {
    const el = gl.domElement;
    const ray = new Raycaster();
    const typing = (e: KeyboardEvent) => (e.target as HTMLElement).closest("input, select, textarea");
    const onKeyDown = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
        keys.current.add(k);
        if (k !== "shift") {
          route.current = null;
          if (useTwinView.getState().touring) useTwinView.getState().setTouring(false);
        }
        if (k.startsWith("arrow")) e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const onBlur = () => keys.current.clear();
    const turn = (dx: number, dy: number) => {
      const k = 0.0022 * sensitivity;
      look.current.yaw -= dx * k;
      look.current.pitch = Math.max(-1.2, Math.min(1.2, look.current.pitch - dy * k));
    };
    const onMove = (e: PointerEvent) => {
      if (document.pointerLockElement === el) turn(e.movementX, e.movementY);
      else if (drag.current) {
        turn(e.clientX - drag.current.x, e.clientY - drag.current.y);
        drag.current.moved += Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y);
        drag.current.x = e.clientX;
        drag.current.y = e.clientY;
      }
    };
    const onDown = (e: PointerEvent) => {
      if (document.pointerLockElement === el) {
        // Select what's under the crosshair.
        ray.setFromCamera(new Vector2(0, 0), camera);
        const hit = ray.intersectObjects(scene.children, true).find((h) => h.object.userData.selectId || (h.object instanceof Mesh && h.object.visible));
        const id = hit?.object.userData.selectId as string | undefined;
        const asset = id ? layout.assets.find((a) => a.id === id) : undefined;
        useTwinView.setState({ selected: id ?? null, zone: asset?.zone ?? null });
        return;
      }
      drag.current = { x: e.clientX, y: e.clientY, moved: 0 };
    };
    const onUp = () => {
      const d = drag.current;
      drag.current = null;
      // A click (not a drag) on a fine pointer takes the pointer for mouse look.
      if (d && d.moved < 4 && window.matchMedia("(pointer: fine)").matches) el.requestPointerLock?.();
    };
    const onLockChange = () => {
      walkState.locked = document.pointerLockElement === el;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerlockchange", onLockChange);
      if (document.pointerLockElement === el) document.exitPointerLock();
      walkState.locked = false;
      doorNearCamera.current = false;
    };
  }, [gl, camera, scene, layout, sensitivity]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const k = keys.current;
    const { yaw } = look.current;
    let ix = 0;
    let iz = 0;
    if (k.has("w") || k.has("arrowup")) iz -= 1;
    if (k.has("s") || k.has("arrowdown")) iz += 1;
    if (k.has("a") || k.has("arrowleft")) ix -= 1;
    if (k.has("d") || k.has("arrowright")) ix += 1;
    let tx = 0;
    let tz = 0;
    const speed = k.has("shift") ? RUN : WALK;
    if (ix || iz) {
      const len = Math.hypot(ix, iz);
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      tx = ((ix * cos + iz * sin) / len) * speed;
      tz = ((-ix * sin + iz * cos) / len) * speed;
    } else if (route.current?.length) {
      // Following a path: head for the next corner and turn smoothly towards it.
      const [nx, nz] = route.current[0];
      const dx = nx - pos.current[0];
      const dz = nz - pos.current[1];
      const d = Math.hypot(dx, dz);
      if (d < 0.25) route.current.shift();
      else {
        const v = Math.min(WALK * 1.15, d * 2);
        tx = (dx / d) * v;
        tz = (dz / d) * v;
        const want = Math.atan2(-dx, -dz);
        let diff = want - look.current.yaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        look.current.yaw += diff * Math.min(1, dt * 3);
        look.current.pitch += (-0.06 - look.current.pitch) * Math.min(1, dt * 2);
      }
      if (!route.current.length) route.current = null;
    } else if (tour.current) {
      // At a tour stop: look around briefly, then go on.
      const t = tour.current;
      t.dwell += dt;
      look.current.yaw += dt * 0.35;
      if (t.dwell > 4) {
        t.dwell = 0;
        t.i += 1;
        if (t.i >= t.stops.length) useTwinView.getState().setTouring(false);
        else goTo(t.stops[t.i]);
      }
    }
    const a = 1 - Math.exp(-dt * 10);
    vel.current[0] += (tx - vel.current[0]) * a;
    vel.current[1] += (tz - vel.current[1]) * a;
    const nx = pos.current[0] + vel.current[0] * dt;
    const nz = pos.current[1] + vel.current[1] * dt;
    const { rects } = ensureWorld();
    pos.current = resolveCircle(nx, nz, RADIUS, rects);

    const moving = Math.hypot(vel.current[0], vel.current[1]);
    bob.current += dt * moving * 5.5;
    const y = groundHeight(layout, pos.current[0], pos.current[1]) + EYE + Math.sin(bob.current) * 0.022 * Math.min(1, moving);
    camera.position.set(pos.current[0], y, pos.current[1]);
    camera.rotation.set(look.current.pitch, look.current.yaw, 0, "YXZ");

    walkState.x = pos.current[0];
    walkState.z = pos.current[1];
    walkState.yaw = look.current.yaw;
    walkState.auto = !!route.current || !!tour.current;
    liveCamera.x = camera.position.x;
    liveCamera.y = camera.position.y;
    liveCamera.z = camera.position.z;
    const ahead = 4;
    liveCamera.tx = camera.position.x - Math.sin(look.current.yaw) * ahead;
    liveCamera.ty = 1.2;
    liveCamera.tz = camera.position.z - Math.cos(look.current.yaw) * ahead;
    doorNearCamera.current = Math.abs(pos.current[0] - layout.entrance.x) < 2.2 && Math.abs(pos.current[1] - layout.depth / 2) < 2.6;
  });

  return null;
}
