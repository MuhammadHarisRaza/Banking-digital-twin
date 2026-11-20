import type { BranchLayout, Room, V2, V3 } from "./types";

/** Exterior wall thickness. */
export const WALL_T = 0.25;
/** Height of the glass front and the suspended ceiling. */
export const CEILING_H = 3.2;

export type WallKind = "exterior" | "partition" | "glassRoom" | "vault" | "glassFront" | "vestibule";

export interface WallBox {
  kind: WallKind;
  /** Centre and size of the wall box (y from 0). */
  p: V3;
  s: V3;
  /** Which room it belongs to, if any. */
  room?: string;
}

/** A wall run along x or z with door gaps, as box segments. */
export function wallRun(
  axis: "x" | "z",
  fixed: number,
  from: number,
  to: number,
  gaps: { at: number; width: number }[],
  height: number,
  thickness: number,
): { p: V3; s: V3 }[] {
  const cuts = gaps
    .map((g) => [g.at - g.width / 2, g.at + g.width / 2] as const)
    .filter(([a, b]) => b > from && a < to)
    .sort((a, b) => a[0] - b[0]);
  const out: { p: V3; s: V3 }[] = [];
  let start = from;
  for (const [a, b] of [...cuts, [to, to] as const]) {
    const end = Math.min(a, to);
    if (end - start > 0.05) {
      const mid = (start + end) / 2;
      const len = end - start;
      out.push(axis === "x" ? { p: [mid, height / 2, fixed], s: [len, height, thickness] } : { p: [fixed, height / 2, mid], s: [thickness, height, len] });
    }
    start = Math.max(start, b);
  }
  return out;
}

export function roomStyle(room: Room) {
  const vault = room.style === "vault";
  return {
    thickness: vault ? 0.4 : room.style === "glass" ? 0.08 : 0.15,
    height: room.style === "glass" ? 2.7 : vault ? CEILING_H : 3.0,
  };
}

/** A room's own walls, leaving out sides that lie on the building's exterior walls. */
export function roomWalls(room: Room, layout: BranchLayout, lowered = false): { p: V3; s: V3 }[] {
  const [x0, z0, x1, z1] = room.rect;
  const W = layout.width / 2;
  const D = layout.depth / 2;
  const sides: { side: Room["door"]["side"]; axis: "x" | "z"; fixed: number; from: number; to: number }[] = [
    { side: "n", axis: "x", fixed: z1, from: x0, to: x1 },
    { side: "s", axis: "x", fixed: z0, from: x0, to: x1 },
    { side: "w", axis: "z", fixed: x0, from: z0, to: z1 },
    { side: "e", axis: "z", fixed: x1, from: z0, to: z1 },
  ];
  const { thickness, height } = roomStyle(room);
  const h = lowered ? Math.min(height, 1.1) : height;
  return sides
    .filter((s) => !(Math.abs(s.fixed + W) < 0.01 || Math.abs(s.fixed - W) < 0.01 || Math.abs(s.fixed + D) < 0.01))
    .flatMap((s) => wallRun(s.axis, s.fixed, s.from, s.to, room.door.side === s.side ? [{ at: room.door.at, width: room.door.width }] : [], h, thickness));
}

/** Gaps in the glass front: the entrance and, when there is one, the self-service vestibule door. */
export function frontGaps(layout: BranchLayout) {
  const gaps = [{ at: layout.entrance.x, width: layout.entrance.width }];
  if (layout.atmRoom) gaps.push({ at: layout.points.atmDoor[0], width: 1.4 });
  return gaps;
}

/**
 * Every wall as a box, for collision (and anything else that needs the full plan).
 * Glass counts as a wall; door gaps are open.
 */
export function allWalls(layout: BranchLayout): WallBox[] {
  const { width: W, depth: D, height: H } = layout;
  const left = -W / 2;
  const right = W / 2;
  const back = -D / 2;
  const front = D / 2;
  const out: WallBox[] = [
    { kind: "exterior", p: [0, H / 2, back - WALL_T / 2], s: [W + WALL_T * 2, H, WALL_T] },
    { kind: "exterior", p: [left - WALL_T / 2, H / 2, 0], s: [WALL_T, H, D] },
    { kind: "exterior", p: [right + WALL_T / 2, H / 2, 0], s: [WALL_T, H, D] },
  ];
  for (const r of wallRun("x", front, left, right, frontGaps(layout), CEILING_H, 0.12)) out.push({ kind: "glassFront", ...r });
  const atm = layout.atmRoom;
  if (atm) {
    out.push({ kind: "vestibule", p: [(atm[0] + atm[2]) / 2, CEILING_H / 2, atm[1]], s: [atm[2] - atm[0], CEILING_H, 0.2] });
    out.push({ kind: "vestibule", p: [atm[0], CEILING_H / 2, (atm[1] + atm[3]) / 2], s: [0.1, CEILING_H, atm[3] - atm[1]] });
  }
  for (const room of layout.rooms) {
    const kind: WallKind = room.style === "vault" ? "vault" : room.style === "glass" ? "glassRoom" : "partition";
    for (const r of roomWalls(room, layout)) out.push({ kind, room: room.id, ...r });
  }
  for (const part of layout.partitions) for (const r of wallRun(part.axis, part.fixed, part.from, part.to, part.gaps, 3.0, 0.15)) out.push({ kind: "partition", ...r });
  return out;
}

/** Footprint rectangle [x0, z0, x1, z1] of a wall box. */
export const footprint = (w: { p: V3; s: V3 }): [number, number, number, number] => [w.p[0] - w.s[0] / 2, w.p[2] - w.s[2] / 2, w.p[0] + w.s[0] / 2, w.p[2] + w.s[2] / 2];

export type Rect = [number, number, number, number];
export const rectCenter = (r: Rect): V2 => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
