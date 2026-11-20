import { Suspense, useLayoutEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Mesh, type Object3D } from "three";
import type { V3 } from "../../layout/types";

/**
 * CC0 models from Poly Haven (see public/twin/CREDITS.md), meshopt-compressed GLB. Each placement
 * loads in its own Suspense boundary so the building never waits on a model, and clones share
 * geometry and materials with the cached original.
 */
export type ModelId = "potted_plant_01" | "potted_plant_02" | "modern_arm_chair_01" | "sofa_03" | "modern_coffee_table_01";

const url = (id: ModelId) => `${import.meta.env.BASE_URL}twin/models/${id}.glb`;

function Loaded({ id, p, rot = 0, scale = 1, shadows = true }: { id: ModelId; p: V3; rot?: number; scale?: number; shadows?: boolean }) {
  const { scene } = useGLTF(url(id));
  const clone = useMemo<Object3D>(() => scene.clone(true), [scene]);
  useLayoutEffect(() => {
    clone.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = shadows;
        o.receiveShadow = true;
      }
    });
  }, [clone, shadows]);
  return <primitive object={clone} position={p} rotation={[0, rot, 0]} scale={scale} userData={{ noBatch: true }} />;
}

export function Model(props: { id: ModelId; p: V3; rot?: number; scale?: number; shadows?: boolean }) {
  return (
    <Suspense fallback={null}>
      <Loaded {...props} />
    </Suspense>
  );
}

/** Starts the downloads early (called when the twin page mounts). */
export function preloadModels() {
  (["potted_plant_01", "potted_plant_02", "modern_arm_chair_01", "sofa_03", "modern_coffee_table_01"] as ModelId[]).forEach((id) => useGLTF.preload(url(id)));
}

export function clearModels() {
  (["potted_plant_01", "potted_plant_02", "modern_arm_chair_01", "sofa_03", "modern_coffee_table_01"] as ModelId[]).forEach((id) => useGLTF.clear(url(id)));
}
