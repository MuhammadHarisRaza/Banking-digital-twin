import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, CapsuleGeometry, Color, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, SphereGeometry, type InstancedMesh } from "three";
import { useThemeColors } from "../../config/useBrand";
import { groundHeight } from "../layout/height";
import type { BranchLayout } from "../layout/types";
import { CLOTHES, isWalking } from "../sim/engine";
import { useBranchSim, useTwinView } from "../store";

const MAX_CUSTOMERS = 90;
const BODY = new CapsuleGeometry(0.2, 1.05, 4, 10);
const HEAD = new SphereGeometry(0.12, 12, 10);
const BLOB = new PlaneGeometry(0.75, 0.75).rotateX(-Math.PI / 2);

/** Soft contact shadow under each figure (people don't redraw the shadow map every frame). */
function blobMaterial() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, "rgba(0,0,0,0.42)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false });
}

const SKIN = ["#c69172", "#a87456", "#8d5b3e", "#d9a688", "#b98463"];

/**
 * Customers and staff as simple instanced figures: one draw call for all bodies and one for all heads.
 * Positions come straight from the simulation each frame, with a small step bob while walking.
 * Staff wear the brand colour; a teller on a break or absent leaves an empty chair.
 */
export function People({ layout }: { layout: BranchLayout }) {
  const visible = useTwinView((s) => s.layers.people);
  const { brand } = useThemeColors();
  const bodies = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const blobs = useRef<InstancedMesh>(null);
  const blobMat = useMemo(blobMaterial, []);
  const capacity = layout.staff.length + MAX_CUSTOMERS;
  const bodyMat = useMemo(() => new MeshStandardMaterial({ roughness: 0.8 }), []);
  const headMat = useMemo(() => new MeshStandardMaterial({ roughness: 0.7 }), []);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const clothes = useMemo(() => CLOTHES.map((c) => new Color(c)), []);
  const skins = useMemo(() => SKIN.map((c) => new Color(c)), []);
  const uniform = useMemo(() => new Color(brand), [brand]);
  const guard = useMemo(() => new Color("#1e293b"), []);

  // Instance colours must exist before the first frame.
  useLayoutEffect(() => {
    for (let i = 0; i < capacity; i++) {
      bodies.current?.setColorAt(i, clothes[i % clothes.length]);
      heads.current?.setColorAt(i, skins[i % skins.length]);
    }
    if (bodies.current?.instanceColor) bodies.current.instanceColor.needsUpdate = true;
    if (heads.current?.instanceColor) heads.current.instanceColor.needsUpdate = true;
  }, [capacity, clothes, skins]);

  useFrame(({ clock }) => {
    const b = bodies.current;
    const h = heads.current;
    const sim = useBranchSim.getState().sim;
    if (!b || !h || !sim) return;
    const t = clock.elapsedTime;
    let n = 0;

    const place = (x: number, z: number, heading: number, seated: boolean, bob: number, body: Color, skin: Color) => {
      const y = (seated ? 0.2 : bob) + groundHeight(layout, x, z);
      dummy.position.set(x, (seated ? 0.78 : 0.82) + y, z);
      dummy.rotation.set(0, heading, 0);
      dummy.scale.set(1, seated ? 0.72 : 1, seated ? 1.1 : 0.85);
      dummy.updateMatrix();
      b.setMatrixAt(n, dummy.matrix);
      b.setColorAt(n, body);
      dummy.position.set(x, (seated ? 1.42 : 1.6) + y, z);
      dummy.scale.set(1, 1.1, 1);
      dummy.updateMatrix();
      h.setMatrixAt(n, dummy.matrix);
      h.setColorAt(n, skin);
      dummy.position.set(x, groundHeight(layout, x, z) + 0.012, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(seated ? 1.2 : 1);
      dummy.updateMatrix();
      blobs.current?.setMatrixAt(n, dummy.matrix);
      n++;
    };

    let onBreak = 0;
    layout.staff.forEach((s, i) => {
      const station = s.assetId ? sim.stations.find((st) => st.id === s.assetId) : undefined;
      color.copy(s.role === "Security Guard" ? guard : uniform);
      if (station?.state === "offline") return;
      if (station?.state === "break") {
        // On a break: a seat at the staff-room table, while one is free.
        const seat = layout.breakSeats[onBreak++];
        if (seat) place(seat.x, seat.z, seat.rot, true, 0, color, skins[i % skins.length]);
        return;
      }
      place(s.x, s.z, s.rot, s.seated, 0, color, skins[i % skins.length]);
    });

    for (const c of sim.customers) {
      if (n >= capacity) break;
      const walking = isWalking(c);
      const bob = walking ? Math.abs(Math.sin(t * 7 * c.pace + c.id)) * 0.05 : 0;
      place(c.x, c.z, c.heading, c.seated, bob, clothes[c.color], skins[c.id % skins.length]);
    }

    b.count = n;
    h.count = n;
    if (blobs.current) {
      blobs.current.count = n;
      blobs.current.instanceMatrix.needsUpdate = true;
    }
    b.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
    if (h.instanceColor) h.instanceColor.needsUpdate = true;
  });

  return (
    <group visible={visible}>
      <instancedMesh ref={bodies} args={[BODY, bodyMat, capacity]} frustumCulled={false} />
      <instancedMesh ref={heads} args={[HEAD, headMat, capacity]} frustumCulled={false} />
      <instancedMesh ref={blobs} args={[BLOB, blobMat, capacity]} frustumCulled={false} renderOrder={1} />
    </group>
  );
}
