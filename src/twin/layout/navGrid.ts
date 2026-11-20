import type { V2 } from "./types";
import type { Rect } from "./walls";

/**
 * Walkable-space grid for the first-person walkthrough: collision against wall and furniture
 * footprints (circle against rectangles), and A* paths for click-to-go and the guided tour.
 */

/** Pushes a circle out of every rectangle it overlaps; returns the corrected centre. */
export function resolveCircle(x: number, z: number, r: number, rects: Rect[]): V2 {
  let px = x;
  let pz = z;
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const [x0, z0, x1, z1] of rects) {
      const cx = Math.max(x0, Math.min(px, x1));
      const cz = Math.max(z0, Math.min(pz, z1));
      const dx = px - cx;
      const dz = pz - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        px = cx + (dx / d) * r;
        pz = cz + (dz / d) * r;
      } else {
        // Centre inside the rectangle: leave by the nearest side.
        const out = [px - x0, x1 - px, pz - z0, z1 - pz];
        const m = Math.min(...out);
        if (m === out[0]) px = x0 - r;
        else if (m === out[1]) px = x1 + r;
        else if (m === out[2]) pz = z0 - r;
        else pz = z1 + r;
      }
      moved = true;
    }
    if (!moved) break;
  }
  return [px, pz];
}

export interface NavGrid {
  x0: number;
  z0: number;
  cell: number;
  cols: number;
  rows: number;
  blocked: Uint8Array;
}

export function buildNavGrid(bounds: Rect, rects: Rect[], radius: number, cell = 0.2): NavGrid {
  const [bx0, bz0, bx1, bz1] = bounds;
  const cols = Math.ceil((bx1 - bx0) / cell);
  const rows = Math.ceil((bz1 - bz0) / cell);
  const blocked = new Uint8Array(cols * rows);
  for (const [x0, z0, x1, z1] of rects) {
    const c0 = Math.max(0, Math.floor((x0 - radius - bx0) / cell));
    const c1 = Math.min(cols - 1, Math.floor((x1 + radius - bx0) / cell));
    const r0 = Math.max(0, Math.floor((z0 - radius - bz0) / cell));
    const r1 = Math.min(rows - 1, Math.floor((z1 + radius - bz0) / cell));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) blocked[r * cols + c] = 1;
  }
  return { x0: bx0, z0: bz0, cell, cols, rows, blocked };
}

const toCell = (g: NavGrid, [x, z]: V2) => [Math.floor((x - g.x0) / g.cell), Math.floor((z - g.z0) / g.cell)] as const;
const toPoint = (g: NavGrid, c: number, r: number): V2 => [g.x0 + (c + 0.5) * g.cell, g.z0 + (r + 0.5) * g.cell];
const free = (g: NavGrid, c: number, r: number) => c >= 0 && r >= 0 && c < g.cols && r < g.rows && !g.blocked[r * g.cols + c];

/** Nearest free cell to a point (spiral search). */
function nearestFree(g: NavGrid, p: V2): [number, number] | null {
  const [c, r] = toCell(g, p);
  for (let ring = 0; ring < 40; ring++)
    for (let dr = -ring; dr <= ring; dr++)
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        if (free(g, c + dc, r + dr)) return [c + dc, r + dr];
      }
  return null;
}

function lineOfSight(g: NavGrid, a: V2, b: V2) {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (g.cell * 0.5));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const [c, r] = toCell(g, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    if (!free(g, c, r)) return false;
  }
  return true;
}

/** A* over the grid (8 neighbours, no corner cutting), then pulled tight with line-of-sight checks. */
export function findPath(g: NavGrid, from: V2, to: V2): V2[] | null {
  const s = nearestFree(g, from);
  const t = nearestFree(g, to);
  if (!s || !t) return null;
  const idx = (c: number, r: number) => r * g.cols + c;
  const goal = idx(t[0], t[1]);
  const gScore = new Float32Array(g.cols * g.rows).fill(Infinity);
  const came = new Int32Array(g.cols * g.rows).fill(-1);
  const open: number[] = [idx(s[0], s[1])];
  const f = new Float32Array(g.cols * g.rows).fill(Infinity);
  gScore[open[0]] = 0;
  const h = (i: number) => Math.hypot((i % g.cols) - t[0], Math.floor(i / g.cols) - t[1]);
  f[open[0]] = h(open[0]);
  const closed = new Uint8Array(g.cols * g.rows);
  let guard = 0;
  while (open.length && guard++ < 60000) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[best]]) best = i;
    const cur = open.splice(best, 1)[0];
    if (cur === goal) break;
    closed[cur] = 1;
    const c = cur % g.cols;
    const r = Math.floor(cur / g.cols);
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (!free(g, nc, nr)) continue;
        if (dr && dc && (!free(g, c + dc, r) || !free(g, c, r + dr))) continue;
        const n = idx(nc, nr);
        if (closed[n]) continue;
        const tentative = gScore[cur] + (dr && dc ? Math.SQRT2 : 1);
        if (tentative < gScore[n]) {
          came[n] = cur;
          gScore[n] = tentative;
          f[n] = tentative + h(n);
          if (!open.includes(n)) open.push(n);
        }
      }
  }
  if (came[goal] === -1 && goal !== idx(s[0], s[1])) return null;
  const cells: V2[] = [];
  for (let cur = goal; cur !== -1; cur = came[cur]) cells.push(toPoint(g, cur % g.cols, Math.floor(cur / g.cols)));
  cells.reverse();
  // String-pull: keep only the corners needed to stay in free space.
  const out: V2[] = [cells[0]];
  let anchor = cells[0];
  for (let i = 1; i < cells.length; i++) {
    if (!lineOfSight(g, anchor, cells[i])) {
      anchor = cells[i - 1];
      out.push(anchor);
    }
  }
  out.push(cells[cells.length - 1]);
  return out;
}
