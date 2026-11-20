import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { BufferGeometry, Group, InstancedMesh, Material, Mesh, type Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useTwinView } from "../store";
import { brandMaterialSet, MAT } from "./materials";

/**
 * Static batching: the kit builds a branch from several hundred small meshes, which would mean a
 * draw call each. Once the scene has settled, meshes that never move and share one of the scene's
 * shared materials are merged into a single mesh per material (and shadow setting), and the
 * originals are hidden. Animated parts opt out with userData.dynamic on an ancestor, models with
 * userData.noBatch. The batch is rebuilt whenever the visible set changes (walls, roof, mode).
 */

const ATTRS = ["position", "normal", "uv"];

function shared(): Set<Material> {
  const set = new Set<Material>();
  for (const v of Object.values(MAT)) for (const m of Array.isArray(v) ? v : [v]) set.add(m as Material);
  for (const m of brandMaterialSet()) set.add(m);
  return set;
}

function excluded(o: Object3D | null): boolean {
  for (let p = o; p; p = p.parent) if (p.userData.dynamic || p.userData.noBatch) return true;
  return false;
}

export function StaticBatcher({ roots }: { roots: string[] }) {
  const scene = useThree((s) => s.scene);
  const walls = useTwinView((s) => s.layers.walls);
  const roof = useTwinView((s) => s.layers.roof);
  const mode = useTwinView((s) => s.mode);
  const lighting = useTwinView((s) => s.lighting);

  useEffect(() => {
    const batch = new Group();
    batch.name = "static-batch";
    const hidden: Mesh[] = [];
    const timer = setTimeout(() => {
      const materials = shared();
      const groups = new Map<string, { material: Material; cast: boolean; geoms: BufferGeometry[] }>();
      for (const name of roots) {
        const root = scene.getObjectByName(name);
        if (!root) continue;
        root.updateWorldMatrix(true, true);
        root.traverse((o) => {
          if (!(o instanceof Mesh) || o instanceof InstancedMesh || !o.visible || o.userData.selectId) return;
          if (Array.isArray(o.material) || !materials.has(o.material) || !o.layers.isEnabled(0)) return;
          if (excluded(o)) return;
          // Only fully visible meshes: skip anything under a hidden group.
          for (let p = o.parent; p; p = p.parent) if (!p.visible) return;
          const src = o.geometry as BufferGeometry;
          if (!src.attributes.position || !src.attributes.normal || !src.attributes.uv) return;
          let g = src.index ? src.toNonIndexed() : src.clone();
          for (const key of Object.keys(g.attributes)) if (!ATTRS.includes(key)) g.deleteAttribute(key);
          g.morphAttributes = {};
          g = g.applyMatrix4(o.matrixWorld);
          const key = `${o.material.uuid}:${o.castShadow ? 1 : 0}`;
          let entry = groups.get(key);
          if (!entry) groups.set(key, (entry = { material: o.material, cast: o.castShadow, geoms: [] }));
          entry.geoms.push(g);
          o.visible = false;
          o.userData.batched = true;
          hidden.push(o);
        });
      }
      for (const { material, cast, geoms } of groups.values()) {
        const merged = mergeGeometries(geoms, false);
        geoms.forEach((g) => g.dispose());
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new Mesh(merged, material);
        mesh.castShadow = cast;
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        batch.add(mesh);
      }
      scene.add(batch);
    }, 900);
    return () => {
      clearTimeout(timer);
      for (const o of hidden) {
        o.visible = true;
        o.userData.batched = false;
      }
      scene.remove(batch);
      batch.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
    };
  }, [scene, roots, walls, roof, mode, lighting]);
  return null;
}
