import { BoxGeometry, BufferGeometry, ExtrudeGeometry, LatheGeometry, PlaneGeometry, Shape, Vector2, type BufferAttribute } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Geometry with texture coordinates in metres, so a photographed material keeps its real-world
 * scale on every object (a 3 m wall shows three times the texture of a 1 m panel) instead of
 * stretching with a scaled unit box. Each face is projected onto the two axes it spans.
 * Geometries are cached by size and shared.
 */

const cache = new Map<string, BufferGeometry>();
const key = (kind: string, ...n: number[]) => `${kind}:${n.map((v) => v.toFixed(3)).join(",")}`;

function cached<T extends BufferGeometry>(k: string, make: () => T): T {
  let g = cache.get(k) as T | undefined;
  if (!g) {
    g = make();
    cache.set(k, g);
  }
  return g;
}

/** Re-projects UVs from positions: the face normal picks the plane, units are metres. */
export function metricUvs(geometry: BufferGeometry) {
  const pos = geometry.attributes.position as BufferAttribute;
  const nor = geometry.attributes.normal as BufferAttribute;
  const uv = geometry.attributes.uv as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, x, z);
    else if (ax >= az) uv.setXY(i, z, y);
    else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true;
  return geometry;
}

export function metricBox(w: number, h: number, d: number) {
  return cached(key("box", w, h, d), () => metricUvs(new BoxGeometry(w, h, d)));
}

/** A floor or ceiling plane lying flat (y up), UVs in metres. */
export function metricPlane(w: number, d: number) {
  return cached(key("plane", w, d), () => {
    const g = new PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    return metricUvs(g);
  });
}

/** A box with rounded edges (radius in metres), UVs in metres. */
export function roundedBox(w: number, h: number, d: number, r = 0.012) {
  const radius = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  return cached(key("rbox", w, h, d, radius), () => metricUvs(new RoundedBoxGeometry(w, h, d, 2, Math.max(radius, 1e-4))));
}

/** A rectangle with rounded corners, extruded along y (counter and desk tops with soft edges). */
export function slab(w: number, d: number, thickness: number, corner = 0.03, bevel = 0.006) {
  return cached(key("slab", w, d, thickness, corner, bevel), () => {
    const c = Math.min(corner, w / 2 - 0.001, d / 2 - 0.001);
    const s = new Shape();
    s.moveTo(-w / 2 + c, -d / 2);
    s.lineTo(w / 2 - c, -d / 2);
    s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + c);
    s.lineTo(w / 2, d / 2 - c);
    s.quadraticCurveTo(w / 2, d / 2, w / 2 - c, d / 2);
    s.lineTo(-w / 2 + c, d / 2);
    s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - c);
    s.lineTo(-w / 2, -d / 2 + c);
    s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + c, -d / 2);
    const depth = Math.max(0.001, thickness - bevel * 2);
    const g = new ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
    // Extruded along +z; lay it flat and centre it vertically.
    g.rotateX(-Math.PI / 2);
    g.translate(0, -depth / 2, 0);
    g.computeVertexNormals();
    return metricUvs(g);
  });
}

/** A turned profile (planters, chair bases, bollards): points are [radius, height] pairs in metres. */
export function lathe(points: [number, number][], segments = 24) {
  return cached(`lathe:${segments}:${points.flat().join(",")}`, () => metricUvs(new LatheGeometry(points.map(([r, y]) => new Vector2(r, y)), segments)));
}

/** Frees every cached geometry (on leaving the twin). */
export function disposeKitGeometry() {
  for (const g of cache.values()) g.dispose();
  cache.clear();
}
