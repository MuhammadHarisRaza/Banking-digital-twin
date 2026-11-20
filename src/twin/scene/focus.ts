import { Box3, Vector3 } from "three";
import type { BranchLayout, V3, ZoneId } from "../layout/types";
import { assetBounds, liveCamera, useTwinView, type ViewId, type ViewMode } from "../store";

export const CAMERA_FOV = 38;

/**
 * Framing for an asset (after the factory twin's focusPose): the bounding sphere fills most of the view
 * at a 38° elevation, keeping the camera's current compass direction but never looking from behind
 * the back wall, so the camera doesn't swing around the branch.
 */
export function focusPose(box: Box3, layout: BranchLayout): { pos: V3; target: V3 } {
  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  const radius = Math.max(1.6, size.length() / 2);
  const distance = Math.max(7, (radius / Math.sin((CAMERA_FOV * Math.PI) / 360)) * 0.95);
  let dx = liveCamera.x - liveCamera.tx;
  let dz = liveCamera.z - liveCamera.tz;
  if (dx * dx + dz * dz < 1e-4) {
    dx = 0.35;
    dz = 1;
  }
  let len = Math.hypot(dx, dz);
  dx /= len;
  dz /= len;
  // Look in from the street side; the back wall would block a view from behind.
  if (dz < 0.45 && center.z < layout.depth / 2) {
    dz = 0.45;
    len = Math.hypot(dx, dz);
    dx /= len;
    dz /= len;
  }
  const elevation = (38 * Math.PI) / 180;
  const target: V3 = [center.x, Math.min(center.y, 1.2), center.z];
  const out = Math.cos(elevation) * distance;
  const pos: V3 = [target[0] + dx * out, Math.max(3, target[1] + Math.sin(elevation) * distance), target[2] + dz * out];
  return { pos, target };
}

/** Things inside the building are framed in the Interior cutaway, so full-height walls don't block the view. */
function ensureInteriorView() {
  const s = useTwinView.getState();
  if (s.mode !== "exterior") return;
  s.setMode("interior");
  s.setLayer("walls", false);
  s.setLayer("roof", false);
}

export function focusAsset(id: string, layout: BranchLayout) {
  const box = assetBounds.get(id);
  if (!box) return;
  ensureInteriorView();
  const { pos, target } = focusPose(box, layout);
  useTwinView.getState().flyTo(pos, target);
}

export function focusZone(id: ZoneId, layout: BranchLayout) {
  const zone = layout.zones.find((z) => z.id === id);
  if (!zone) return;
  if (id !== "exterior") ensureInteriorView();
  const [x0, z0, x1, z1] = zone.rect;
  const box = new Box3(new Vector3(x0, 0, z0), new Vector3(x1, 2.4, z1));
  const { pos, target } = focusPose(box, layout);
  useTwinView.getState().flyTo(pos, target);
}

/** Camera presets, composed from the branch's own dimensions. */
export function viewPose(view: ViewId, layout: BranchLayout): { pos: V3; target: V3 } {
  const { width: W, depth: D } = layout;
  const tx = (layout.counter.x0 + layout.counter.x1) / 2;
  const vault = layout.assets.find((a) => a.kind === "vault");
  switch (view) {
    case "exterior":
      return { pos: [W * 0.8 + 4, 17 + W * 0.42, D / 2 + 24 + W * 0.75], target: [W * 0.08, 1, 1] };
    case "hall":
      return { pos: [W * 0.08, 8.5 + W * 0.1, D / 2 + 7], target: [0, 0.6, -D * 0.12] };
    case "tellers":
      return { pos: [tx + 1.5, 4.6, layout.counter.z + 8.5], target: [tx, 1.1, layout.counter.z] };
    case "vault":
      return vault
        ? { pos: [vault.x + 6.5, 7.5, vault.z + 9], target: [vault.x + 1.5, 0.8, vault.z] }
        : { pos: [0, 10, 0], target: [0, 0, -D / 2] };
    case "top":
      return { pos: [0, Math.max(W, D) * 1.55, 0.01], target: [0, 0, 0] };
  }
}

/** A high three-quarter view of the whole floor with the walls cut down (Interior mode). */
export function cutawayPose(layout: BranchLayout): { pos: V3; target: V3 } {
  const { width: W, depth: D } = layout;
  return { pos: [W * 0.12, 12 + W * 0.42, D / 2 + 8 + W * 0.32], target: [0, 0, -D * 0.04] };
}

/**
 * Switches camera mode. Exterior shows the full-height building; Interior cuts the walls down and
 * looks over the whole floor; Walk hands the camera to the first-person controls.
 */
export function enterMode(mode: ViewMode, layout: BranchLayout, showRoof = false) {
  const s = useTwinView.getState();
  s.select(null);
  s.selectZone(null);
  s.setMode(mode);
  if (mode === "walk") {
    s.setLayer("walls", true);
    return;
  }
  s.setLayer("walls", mode === "exterior");
  s.setLayer("roof", mode === "exterior" && showRoof);
  const { pos, target } = mode === "exterior" ? viewPose("exterior", layout) : cutawayPose(layout);
  // The orbit controls remount when leaving the walkthrough; fly on the next frame so they exist.
  requestAnimationFrame(() => useTwinView.getState().flyTo(pos, target));
}

export function goToView(view: ViewId, layout: BranchLayout) {
  const { pos, target } = viewPose(view, layout);
  const s = useTwinView.getState();
  if (s.mode === "walk") {
    s.setMode(view === "exterior" ? "exterior" : "interior");
    s.setLayer("walls", view === "exterior");
  }
  s.select(null);
  s.selectZone(null);
  s.flyTo(pos, target);
}
