/**
 * Procedural building blocks (ported from the factory twin). Everything is in metres, y up.
 *   p = position, s = size, m = material, r = rotation.
 */
import { useLayoutEffect, useRef } from "react";
import { Object3D, type BufferGeometry, type InstancedMesh, type Material } from "three";
import type { V3 } from "../layout/types";
import { metricBox, roundedBox } from "./kit/geometry";
import { UNIT_BOX, UNIT_CYLINDER, UNIT_CYLINDER_LOW } from "./materials";

/** A box sized in metres. Its texture coordinates are in metres too, so textured materials keep their real scale. */
export function Box({ p, s, m, r, cast = true }: { p: V3; s: V3; m: Material; r?: V3; cast?: boolean }) {
  return <mesh geometry={metricBox(s[0], s[1], s[2])} material={m} position={p} rotation={r} castShadow={cast} receiveShadow />;
}

/** A box with softly rounded edges (radius in metres): furniture, counters, cabinets. */
export function RBox({ p, s, m, r, radius = 0.012, cast = true }: { p: V3; s: V3; m: Material; r?: V3; radius?: number; cast?: boolean }) {
  return <mesh geometry={roundedBox(s[0], s[1], s[2], radius)} material={m} position={p} rotation={r} castShadow={cast} receiveShadow />;
}

export function Cyl({ p, r, h, m, rot, low = false, cast = true }: { p: V3; r: number; h: number; m: Material; rot?: V3; low?: boolean; cast?: boolean }) {
  return (
    <mesh
      geometry={low ? UNIT_CYLINDER_LOW : UNIT_CYLINDER}
      material={m}
      position={p}
      scale={[r, h, r]}
      rotation={rot}
      castShadow={cast}
      receiveShadow
    />
  );
}

export type Instance = { p: V3; s: V3; r?: V3 };

/** Many boxes (or cylinders, or any unit-sized geometry) with one material in a single draw call. */
export function Instances({ items, m, cyl = false, cast = true, geometry }: { items: Instance[]; m: Material; cyl?: boolean; cast?: boolean; geometry?: BufferGeometry }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    items.forEach((it, i) => {
      dummy.position.set(...it.p);
      dummy.scale.set(...it.s);
      if (it.r) dummy.rotation.set(it.r[0], it.r[1], it.r[2]);
      else dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
  }, [items]);
  if (!items.length) return null;
  return (
    <instancedMesh
      ref={ref}
      key={items.length}
      args={[geometry ?? (cyl ? UNIT_CYLINDER_LOW : UNIT_BOX), m, items.length]}
      castShadow={cast}
      receiveShadow
    />
  );
}

/** Local placement helper: a group at an asset's floor position and rotation. */
export function At({ x, z, rot = 0, y = 0, children }: { x: number; z: number; rot?: number; y?: number; children: React.ReactNode }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      {children}
    </group>
  );
}
