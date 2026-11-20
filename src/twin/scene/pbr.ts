import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Color, NoColorSpace, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector2, type MeshStandardMaterial, type Texture } from "three";
import { MAT } from "./materials";

/**
 * Photo-scanned PBR texture sets (Poly Haven, CC0; see public/twin/CREDITS.md) applied to the shared
 * materials once they have loaded, so every existing and new object picks them up without waiting on
 * Suspense. Geometry carries texture coordinates in metres (kit/geometry.ts), so `size` is the real
 * width one texture repeat covers. Low quality skips all of this and keeps the canvas textures.
 */

type TextureId =
  | "terrazzo_tiles"
  | "granite_tile"
  | "rectangular_facade_tiles"
  | "brushed_concrete"
  | "square_concrete_pavers"
  | "oak_veneer_01"
  | "american_walnut_veneer"
  | "plank_flooring_02"
  | "smooth_concrete_floor"
  | "long_white_tiles"
  | "ceiling_interior"
  | "painted_plaster_wall"
  | "fabric_pattern_05"
  | "brown_leather";

/** Metres covered by one repeat of each texture set. */
const SIZE: Record<TextureId, number> = {
  terrazzo_tiles: 1.2,
  granite_tile: 1.2,
  rectangular_facade_tiles: 2,
  brushed_concrete: 2.5,
  square_concrete_pavers: 1.8,
  oak_veneer_01: 1,
  american_walnut_veneer: 1,
  plank_flooring_02: 2,
  smooth_concrete_floor: 3,
  long_white_tiles: 1.2,
  ceiling_interior: 2,
  painted_plaster_wall: 2.5,
  fabric_pattern_05: 0.4,
  brown_leather: 0.6,
};

interface Finish {
  texture: TextureId;
  /** Multiplies the colour map (or replaces the colour when `color` is false). */
  tint?: string;
  /** Use the photographed colour; false keeps the material's own colour and takes only the surface detail. */
  color?: boolean;
  roughness?: number;
  normal?: number;
}

type MaterialKey = { [K in keyof typeof MAT]: (typeof MAT)[K] extends MeshStandardMaterial ? K : never }[keyof typeof MAT];

const FINISHES: Partial<Record<MaterialKey, Finish>> = {
  floor: { texture: "terrazzo_tiles", roughness: 0.75, normal: 0.35 },
  backFloor: { texture: "smooth_concrete_floor", tint: "#e6e3dc", normal: 0.4 },
  vaultFloor: { texture: "smooth_concrete_floor", tint: "#a9aeb3", normal: 0.5 },
  officeFloor: { texture: "plank_flooring_02", tint: "#c4986e", roughness: 0.8, normal: 0.5 },
  paving: { texture: "square_concrete_pavers", tint: "#dcd8d0", normal: 0.8 },
  kerb: { texture: "brushed_concrete", tint: "#cfccc5" },
  plinth: { texture: "brushed_concrete", tint: "#9a9ea3" },
  concrete: { texture: "brushed_concrete", tint: "#d6d3cc" },
  roof: { texture: "brushed_concrete", tint: "#c3c3c1" },
  wall: { texture: "painted_plaster_wall", tint: "#f6f2ea", normal: 0.5 },
  wallInner: { texture: "painted_plaster_wall", tint: "#efebe4", normal: 0.4 },
  facade: { texture: "painted_plaster_wall", tint: "#f1ece2", normal: 0.6 },
  neighbour: { texture: "painted_plaster_wall", tint: "#ddd7cc" },
  neighbourDark: { texture: "painted_plaster_wall", tint: "#bdb6aa" },
  cladding: { texture: "rectangular_facade_tiles", tint: "#ffffff", roughness: 0.9 },
  stone: { texture: "granite_tile", roughness: 0.6 },
  wood: { texture: "american_walnut_veneer", tint: "#c98f62", roughness: 0.85 },
  woodLight: { texture: "oak_veneer_01", roughness: 0.85 },
  seat: { texture: "fabric_pattern_05", color: false, normal: 0.8 },
  sofa: { texture: "fabric_pattern_05", color: false, normal: 0.8 },
  chair: { texture: "fabric_pattern_05", color: false, normal: 0.6 },
  rug: { texture: "fabric_pattern_05", color: false, normal: 0.6 },
  carpet: { texture: "fabric_pattern_05", color: false, normal: 0.5 },
  leather: { texture: "brown_leather", roughness: 0.9 },
  ceiling: { texture: "ceiling_interior", tint: "#f7f6f2", normal: 0.6 },
  tiles: { texture: "long_white_tiles", roughness: 0.6 },
};

type TextureSet = { color: Texture; normal: Texture; rough: Texture };
const loaded = new Map<TextureId, Promise<TextureSet>>();
const loader = new TextureLoader();

function loadSet(id: TextureId, anisotropy: number): Promise<TextureSet> {
  let p = loaded.get(id);
  if (!p) {
    const base = `${import.meta.env.BASE_URL}twin/textures/${id}/`;
    const one = (name: string, srgb: boolean) =>
      loader.loadAsync(`${base}${name}.webp`).then((t) => {
        t.wrapS = t.wrapT = RepeatWrapping;
        t.repeat.setScalar(1 / SIZE[id]);
        t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
        t.anisotropy = anisotropy;
        return t;
      });
    p = Promise.all([one("color", true), one("normal", false), one("rough", false)]).then(([color, normal, rough]) => ({ color, normal, rough }));
    loaded.set(id, p);
  }
  return p;
}

type Original = { map: Texture | null; normalMap: Texture | null; roughnessMap: Texture | null; color: Color; roughness: number };
const originals = new Map<MaterialKey, Original>();

function apply(key: MaterialKey, finish: Finish, set: TextureSet) {
  const m = MAT[key] as MeshStandardMaterial;
  if (!originals.has(key)) originals.set(key, { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, color: m.color.clone(), roughness: m.roughness });
  const original = originals.get(key)!;
  if (finish.color !== false) {
    m.map = set.color;
    m.color.set(finish.tint ?? "#ffffff");
  }
  m.normalMap = set.normal;
  m.normalScale = new Vector2(finish.normal ?? 1, finish.normal ?? 1);
  m.roughnessMap = set.rough;
  m.roughness = finish.roughness ?? Math.max(0.6, original.roughness);
  m.needsUpdate = true;
}

function restore() {
  for (const [key, o] of originals) {
    const m = MAT[key] as MeshStandardMaterial;
    m.map = o.map;
    m.normalMap = o.normalMap;
    m.roughnessMap = o.roughnessMap;
    m.color.copy(o.color);
    m.roughness = o.roughness;
    m.needsUpdate = true;
  }
  originals.clear();
}

/** Applies (or removes) the PBR finishes on the shared materials. Mount inside the Canvas. */
export function PbrMaterials({ enabled }: { enabled: boolean }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!enabled) {
      restore();
      return;
    }
    let cancelled = false;
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    for (const [key, finish] of Object.entries(FINISHES) as [MaterialKey, Finish][]) {
      loadSet(finish.texture, anisotropy)
        .then((set) => {
          if (!cancelled) apply(key, finish, set);
        })
        .catch(() => {
          // A missing texture leaves the material as it was.
          loaded.delete(finish.texture);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [enabled, gl]);
  return null;
}

/** A loaded texture set (or null while loading); for materials outside MAT such as the reflective floor. */
export function usePbrSet(id: TextureId, enabled = true) {
  const gl = useThree((s) => s.gl);
  const [set, setSet] = useState<TextureSet | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadSet(id, Math.min(8, gl.capabilities.getMaxAnisotropy()))
      .then((t) => alive && setSet(t))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [id, enabled, gl]);
  return enabled ? set : null;
}
