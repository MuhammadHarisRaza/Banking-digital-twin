import type { Asset, BranchLayout, V3 } from "../layout/types";
import { CEILING_H } from "../layout/walls";

/** Resolution of the camera feed (16:9). Kept small: it is read back from the GPU several times a second. */
export const FEED_W = 480;
export const FEED_H = 270;
export const FEED_FPS = 12;

/**
 * The canvas in the inspector that the in-scene renderer paints into, and the asset it shows.
 * A plain object, not React state: the render loop reads it every frame.
 */
export const feedOutput: { canvas: HTMLCanvasElement | null; assetId: string | null } = { canvas: null, assetId: null };

/** Assets that have a camera feed. */
export const hasFeed = (asset: Asset) => asset.kind === "atm" || asset.kind === "cctv";

/** Where the camera for an asset hangs and what it looks at. */
export function feedPose(asset: Asset, layout: BranchLayout): { pos: V3; target: V3; fov: number } | null {
  if (asset.kind === "atm") {
    // Ceiling camera behind the customer's shoulder, looking down at the fascia and keypad.
    return { pos: [asset.x + 0.75, 2.7, asset.z + 2.3], target: [asset.x, 1.1, asset.z + 0.35], fov: 68 };
  }
  if (asset.kind === "cctv" && asset.aim) {
    const [ax, , az] = asset.aim;
    const dx = ax - asset.x;
    const dz = az - asset.z;
    const len = Math.hypot(dx, dz) || 1;
    // Just in front of the housing, so the lens isn't inside the wall.
    const y = Math.min(layout.height - 0.5, CEILING_H - 0.12);
    return { pos: [asset.x + (dx / len) * 0.3, y, asset.z + (dz / len) * 0.3], target: asset.aim, fov: 74 };
  }
  return null;
}

/** Short on-screen camera id, e.g. "CAM 04" or "ATM-1". */
export function feedLabel(asset: Asset) {
  return asset.kind === "atm" ? `ATM-${asset.index} CAM` : `CAM ${String(asset.index).padStart(2, "0")}`;
}

// ── CCTV look ───────────────────────────────────────────────────────────────────

let vignette: Float32Array | null = null;
function vignetteMap() {
  if (vignette) return vignette;
  vignette = new Float32Array(FEED_W * FEED_H);
  for (let y = 0; y < FEED_H; y++)
    for (let x = 0; x < FEED_W; x++) {
      const nx = (x / FEED_W - 0.5) * 2;
      const ny = (y / FEED_H - 0.5) * 2;
      const r = nx * nx * 0.55 + ny * ny * 0.75;
      vignette[y * FEED_W + x] = Math.max(0.35, 1 - r * 0.45) * (y % 2 ? 0.94 : 1);
    }
  return vignette;
}

let seed = 1;
const noise = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 4294967296 - 0.5) * 2;
};

/**
 * Paints GPU pixels (bottom-up RGBA) into the output canvas with a security-camera look:
 * low saturation, lifted contrast, sensor noise, scan lines and a vignette.
 */
export function paintFeed(out: HTMLCanvasElement, pixels: Uint8Array, image: ImageData) {
  const ctx = out.getContext("2d");
  if (!ctx) return;
  const v = vignetteMap();
  const dst = image.data;
  for (let y = 0; y < FEED_H; y++) {
    const src = (FEED_H - 1 - y) * FEED_W * 4;
    const row = y * FEED_W * 4;
    for (let x = 0; x < FEED_W; x++) {
      const i = src + x * 4;
      const o = row + x * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const l = 0.3 * r + 0.59 * g + 0.11 * b;
      const n = noise() * 10;
      const k = v[y * FEED_W + x];
      // 35% colour, slight cool-green cast; highlights rolled off (a render target skips tone mapping).
      const c = (ch: number, tint: number) => {
        const t = (l + (ch - l) * 0.35) / 255;
        return ((t * 1.15) / (1 + t * 0.42)) * 232 - 10 + tint + n;
      };
      dst[o] = c(r, -4) * k;
      dst[o + 1] = c(g, 3) * k;
      dst[o + 2] = c(b, 2) * k;
      dst[o + 3] = 255;
    }
  }
  if (out.width !== FEED_W) out.width = FEED_W;
  if (out.height !== FEED_H) out.height = FEED_H;
  ctx.putImageData(image, 0, 0);
}
