import { seeded } from "../../lib/seeded";
import type { Branch } from "../../types";
import type { Archetype, Asset, BranchLayout, BranchSize, Room, Seat, V2, V3, Zone } from "./types";

/**
 * Builds an illustrative floor plan for a branch. There is no real floor plan for each branch, so the
 * layout follows a typical Pakistani branch: street entrance with a guard post, an ATM vestibule,
 * a token kiosk and waiting hall facing the teller line, customer-service desks along one wall,
 * a glass manager's cabin, and a back strip with the vault, lockers, cash room and server room.
 *
 * Size comes from staff count, the archetype from the branch type, and the ATM and locker rooms
 * from the branch's published flags. The same branch always produces the same building.
 */

/** Depth of the rear band behind the back offices: staff corridor, washrooms, staff room, records and electrical rooms. */
export const SERVICE_BAND = 3.6;
/** Depth of the staff corridor along the front of the service band. */
const CORRIDOR = 1.2;

const SIZES: Record<BranchSize, { width: number; depth: number; tellers: number; desks: number }> = {
  small: { width: 20, depth: 16 + SERVICE_BAND, tellers: 3, desks: 2 },
  standard: { width: 26, depth: 18 + SERVICE_BAND, tellers: 5, desks: 3 },
  flagship: { width: 32, depth: 22 + SERVICE_BAND, tellers: 7, desks: 4 },
};

const ZONE_COLORS: Record<string, string> = {
  lobby: "#64748b",
  atm: "#0ea5e9",
  waiting: "#8b5cf6",
  tellers: "#22c55e",
  service: "#f59e0b",
  manager: "#ec4899",
  vault: "#475569",
  backOffice: "#14b8a6",
  server: "#6366f1",
  staff: "#a16207",
  prayer: "#10b981",
  meeting: "#f97316",
  exterior: "#94a3b8",
};

export function sizeFor(branch: Branch): BranchSize {
  if (branch.type === "Corporate") return branch.staff >= 32 ? "flagship" : "standard";
  return branch.staff < 18 ? "small" : branch.staff < 25 ? "standard" : "flagship";
}

export function buildBranchLayout(branch: Branch, islamicLabel = "Islamic"): BranchLayout {
  const rand = seeded(`${branch.id}-layout`);
  const size = sizeFor(branch);
  const archetype: Archetype = branch.type === "Islamic" ? "islamic" : branch.type === "Corporate" ? "corporate" : "retail";
  const spec = SIZES[size];
  const W = spec.width;
  const D = spec.depth;
  const H = 4.2;
  const left = -W / 2;
  const right = W / 2;
  const rear = -D / 2; // the building's back wall
  const back = rear + SERVICE_BAND; // front edge of the service band; the vault and back offices start here
  const front = D / 2;

  const tellers = archetype === "corporate" ? 2 : spec.tellers - (rand() < 0.3 ? 1 : 0);
  const desks = archetype === "corporate" ? spec.desks + 1 : spec.desks;
  const atmCount = branch.atm ? (size === "small" ? 1 : rand() < 0.55 ? 2 : 1) : 0;

  const assets: Asset[] = [];
  const zones: Zone[] = [];
  const rooms: Room[] = [];
  const staff: BranchLayout["staff"] = [];
  const partitions: BranchLayout["partitions"] = [];
  const zone = (id: Zone["id"], name: string, short: string, rect: Zone["rect"], label?: V2) =>
    zones.push({ id, name, short, color: ZONE_COLORS[id], rect, label: label ?? [(rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2] });

  // ── Key lines ────────────────────────────────────────────────────────────────
  const backStrip = back + 4; // partition between the hall and the back rooms
  const counterZ = back + 6; // teller counter front edge
  const deskColumn = left + 5.6; // right edge of the customer-service column
  const rightColumn = right - 6; // left edge of the manager / meeting column
  const counterX0 = deskColumn + 1.2;
  const counterX1 = Math.min(rightColumn - 1, counterX0 + tellers * 2.4);
  const hub: V2 = [(deskColumn + rightColumn) / 2, (counterZ + front) / 2 + 0.6];

  // ── Entrance, ATM vestibule, guard ───────────────────────────────────────────
  const entranceX = archetype === "corporate" ? -1 : 0;
  const entrance = { x: entranceX, width: 3 };
  const atmRoom: BranchLayout["atmRoom"] = atmCount ? [right - 5, front - 4.4, right, front] : null;
  zone("lobby", "Entrance & Lobby", "Lobby", [left + 5.6, front - 4.4, atmRoom ? right - 5 : right, front], [entranceX - 2.8, front - 1.6]);
  if (atmRoom) zone("atm", "Self-Service Banking", "Self-service", atmRoom, [right - 2.5, front - 1]);
  zone("exterior", "Street & Parking", "Street", [left - 8, front, right + 14, front + 16], [right + 7, front + 6]);

  assets.push({ id: "entrance", kind: "entrance", name: "Main entrance", zone: "lobby", x: entranceX, z: front, rot: 0, index: 1 });
  assets.push({ id: "guard", kind: "guard", name: "Security post", zone: "lobby", x: entranceX - 1.9, z: front - 0.75, rot: 0, index: 1 });
  staff.push({ x: entranceX - 1.9, z: front - 0.35, rot: Math.PI / 6, seated: false, assetId: "guard", role: "Security Guard" });

  // Reception / enquiries beside the service column, facing the door.
  assets.push({ id: "reception", kind: "reception", name: "Reception & enquiries", zone: "lobby", x: deskColumn + 1.25, z: front - 2.7, rot: Math.PI / 2, index: 1 });
  staff.push({ x: deskColumn + 0.45, z: front - 2.7, rot: Math.PI / 2, seated: true, assetId: "reception", role: "Receptionist" });

  const kioskX = entranceX + 2.8;
  assets.push({
    id: "kiosk",
    kind: "kiosk",
    name: "Token kiosk",
    zone: "lobby",
    x: kioskX,
    z: front - 2.2,
    rot: -Math.PI / 2,
    spot: [kioskX - 0.9, front - 2.2],
    index: 1,
  });

  const atmDoor: V2 = [right - 2.5, front + 0.9];
  const atmQueue: V2[] = [];
  if (atmRoom) {
    // Four bays along the vestibule's back wall: the ATMs, then a cash deposit and a cheque deposit machine.
    const bays = [right - 4.2, right - 3.1, right - 2.0, right - 0.9];
    for (let i = 0; i < atmCount; i++) {
      const x = atmCount === 1 ? bays[1] : bays[i * 2];
      assets.push({
        id: `atm-${i + 1}`,
        kind: "atm",
        name: `ATM ${i + 1}`,
        zone: "atm",
        x,
        z: front - 4.0,
        rot: 0,
        spot: [x, front - 3.1],
        index: i + 1,
      });
    }
    const free = atmCount === 1 ? [bays[2], bays[3]] : [bays[1], bays[3]];
    assets.push({ id: "cdm", kind: "cdm", name: "Cash deposit machine", zone: "atm", x: free[0], z: front - 4.0, rot: 0, index: 1 });
    assets.push({ id: "cheque", kind: "chequeKiosk", name: "Cheque deposit kiosk", zone: "atm", x: free[1], z: front - 4.0, rot: 0, index: 1 });
    // Queue inside the vestibule, then out onto the pavement.
    atmQueue.push([right - 2.5, front - 1.6], [right - 2.5, front - 0.6], [right - 2.5, front + 1.2], [right - 1.4, front + 1.8], [right - 0.2, front + 2.2]);
  } else {
    // No vestibule: a self-service corner in the lobby against the right wall.
    assets.push({ id: "cdm", kind: "cdm", name: "Cash deposit machine", zone: "lobby", x: right - 0.45, z: front - 2.4, rot: -Math.PI / 2, index: 1 });
    assets.push({ id: "cheque", kind: "chequeKiosk", name: "Cheque deposit kiosk", zone: "lobby", x: right - 0.45, z: front - 3.5, rot: -Math.PI / 2, index: 1 });
  }

  // ── Teller line ──────────────────────────────────────────────────────────────
  zone("tellers", archetype === "corporate" ? "Cash Counters" : "Teller Counters", "Tellers", [counterX0, backStrip, counterX1, counterZ + 1.6], [
    (counterX0 + counterX1) / 2,
    counterZ + 1.3,
  ]);
  const step = (counterX1 - counterX0) / tellers;
  for (let i = 0; i < tellers; i++) {
    const x = counterX0 + step * (i + 0.5);
    assets.push({
      id: `teller-${i + 1}`,
      kind: "teller",
      name: `Counter ${i + 1}`,
      zone: "tellers",
      x,
      z: counterZ - 0.45,
      rot: 0,
      spot: [x, counterZ + 0.75],
      index: i + 1,
    });
    staff.push({ x, z: counterZ - 1.35, rot: 0, seated: true, assetId: `teller-${i + 1}`, role: "Teller" });
  }
  assets.push({
    id: "token-board",
    kind: "tokenBoard",
    name: "Token display",
    zone: "tellers",
    x: (counterX0 + counterX1) / 2,
    z: counterZ + 0.45,
    rot: 0,
    index: 1,
  });

  // ── Customer-service desks along the left wall ───────────────────────────────
  zone("service", archetype === "corporate" ? "Relationship Managers" : "Customer Service", "Service", [left, counterZ - 1, deskColumn, front - 4.6]);
  const deskSpan = front - 5 - (counterZ - 0.4);
  const deskStep = deskSpan / desks;
  for (let i = 0; i < desks; i++) {
    const z = counterZ - 0.4 + deskStep * (i + 0.5);
    const shariah = archetype === "islamic" && i === desks - 1;
    const name =
      archetype === "corporate"
        ? `Relationship Manager ${i + 1}`
        : shariah
          ? "Shariah Advisory Desk"
          : i === 0
            ? "Account Opening"
            : `Customer Service ${i + 1}`;
    assets.push({
      id: `desk-${i + 1}`,
      kind: "desk",
      name,
      zone: "service",
      x: left + 2.1,
      z,
      rot: Math.PI / 2,
      spot: [left + 3.25, z],
      route: [[deskColumn + 0.6, z]],
      index: i + 1,
    });
    staff.push({ x: left + 1.05, z, rot: Math.PI / 2, seated: true, assetId: `desk-${i + 1}`, role: shariah ? "Shariah Advisor" : archetype === "corporate" ? "Relationship Manager" : "Customer Service Officer" });
  }

  // ── Right column: manager's cabin, then a meeting room or prayer room ───────
  const cabin: [number, number, number, number] = [rightColumn, backStrip + 0.4, right, backStrip + 5];
  rooms.push({ id: "manager", rect: cabin, style: "glass", door: { side: "w", at: cabin[3] - 1.1, width: 1.2 } });
  zone("manager", "Branch Manager", "Manager", cabin);
  assets.push({
    id: "manager",
    kind: "manager",
    name: "Branch Manager's cabin",
    zone: "manager",
    x: right - 2.6,
    z: (cabin[1] + cabin[3]) / 2,
    rot: -Math.PI / 2,
    spot: [right - 4.1, (cabin[1] + cabin[3]) / 2],
    route: [[rightColumn - 0.8, cabin[3] - 1.1], [rightColumn + 0.8, cabin[3] - 1.1]],
    index: 1,
  });
  staff.push({ x: right - 1.5, z: (cabin[1] + cabin[3]) / 2, rot: -Math.PI / 2, seated: true, assetId: "manager", role: "Branch Manager" });

  const extraTop = cabin[3] + 0.4;
  const extraBottom = (atmRoom ? atmRoom[1] : front - 4.4) - 0.6;
  if (extraBottom - extraTop >= 2.8 && archetype !== "retail") {
    const rect: [number, number, number, number] = [rightColumn, extraTop, right, extraBottom];
    const kind = archetype === "islamic" ? "prayer" : "meeting";
    rooms.push({ id: kind, rect, style: kind === "meeting" ? "glass" : "solid", door: { side: "w", at: (extraTop + extraBottom) / 2, width: 1.1 } });
    zone(kind, kind === "prayer" ? "Prayer Room" : "Meeting Room", kind === "prayer" ? "Prayer" : "Meeting", rect);
    assets.push({
      id: kind,
      kind,
      name: kind === "prayer" ? "Prayer room" : "Corporate meeting room",
      zone: kind,
      x: (rect[0] + rect[2]) / 2,
      z: (rect[1] + rect[3]) / 2,
      rot: 0,
      index: 1,
    });
  }

  // ── Back strip: vault, lockers, back office, server room ─────────────────────
  const vaultRect: [number, number, number, number] = [left, back, left + 4.6, backStrip];
  rooms.push({ id: "vault", rect: vaultRect, style: "vault", door: { side: "n", at: left + 3.2, width: 1.3 } });
  let x = vaultRect[2];
  let lockersRect: [number, number, number, number] | null = null;
  if (branch.lockers) {
    lockersRect = [x, back, x + 4, backStrip];
    rooms.push({ id: "lockers", rect: lockersRect, style: "solid", door: { side: "n", at: x + 2, width: 1.1 } });
    x += 4;
  }
  const officeRect: [number, number, number, number] = [x, back, right, backStrip];
  // The back office opens onto the staff corridor behind it.
  const staffDoor = x + 1.4;
  partitions.push({ axis: "x", fixed: back, from: x, to: right, gaps: [{ at: staffDoor, width: 1.0 }] });

  // ── Service band: corridor, washrooms, staff room, records, electrical / network ──
  const roomBack = back - CORRIDOR;
  const gentsRect: [number, number, number, number] = [left, rear, left + 2.2, roomBack];
  const ladiesRect: [number, number, number, number] = [left + 2.2, rear, left + 4.4, roomBack];
  const serverRect: [number, number, number, number] = [right - 3.4, rear, right, roomBack];
  const staffRect: [number, number, number, number] = [left + 4.4, rear, Math.min(left + 9.6, serverRect[0]), roomBack];
  const recordsRect: [number, number, number, number] | null = serverRect[0] - staffRect[2] >= 2.4 ? [staffRect[2], rear, serverRect[0], roomBack] : null;
  rooms.push({ id: "gents", rect: gentsRect, style: "solid", door: { side: "n", at: left + 1.5, width: 0.85 } });
  rooms.push({ id: "ladies", rect: ladiesRect, style: "solid", door: { side: "n", at: left + 3.7, width: 0.85 } });
  rooms.push({ id: "staff", rect: staffRect, style: "solid", door: { side: "n", at: staffRect[0] + 1.2, width: 1.0 } });
  if (recordsRect) rooms.push({ id: "records", rect: recordsRect, style: "solid", door: { side: "n", at: recordsRect[0] + 1.0, width: 0.9 } });
  rooms.push({ id: "server", rect: serverRect, style: "solid", door: { side: "n", at: serverRect[0] + 1.0, width: 0.9 } });

  zone("vault", branch.lockers ? "Vault & Lockers" : "Strong Room", "Vault", [left, back, lockersRect ? lockersRect[2] : vaultRect[2], backStrip]);
  zone("backOffice", "Cash Processing & Back Office", "Back office", officeRect);
  zone("server", "Electrical & Network Room", "Electrical", serverRect);
  zone("staff", "Staff Room & Facilities", "Staff", [left, rear, serverRect[0], back], [(staffRect[0] + staffRect[2]) / 2, (rear + roomBack) / 2]);

  assets.push({
    id: "vault",
    kind: "vault",
    name: "Strong room vault",
    zone: "vault",
    x: (vaultRect[0] + vaultRect[2]) / 2,
    z: (vaultRect[1] + vaultRect[3]) / 2,
    rot: 0,
    index: 1,
  });
  if (lockersRect) {
    const lx = (lockersRect[0] + lockersRect[2]) / 2;
    assets.push({
      id: "lockers",
      kind: "lockers",
      name: "Safe deposit lockers",
      zone: "vault",
      x: lx,
      z: (lockersRect[1] + lockersRect[3]) / 2,
      rot: 0,
      spot: [lx, back + 1.4],
      // Down the aisle beside the counter, behind it, and in through the locker-room door.
      route: [[deskColumn + 0.6, counterZ + 1.4], [deskColumn + 0.6, backStrip + 0.9], [lx, backStrip + 0.9], [lx, backStrip - 0.6]],
      index: 1,
    });
  }
  const ox = (officeRect[0] + officeRect[2]) / 2;
  assets.push({ id: "back-office", kind: "backOffice", name: "Cash processing", zone: "backOffice", x: ox, z: back + 1.6, rot: 0, index: 1 });
  staff.push({ x: ox - 1.2, z: back + 0.9, rot: 0, seated: true, assetId: "back-office", role: "Cash Officer" });
  if (officeRect[2] - officeRect[0] > 6) staff.push({ x: ox + 1.6, z: back + 0.9, rot: 0, seated: true, assetId: "back-office", role: "Operations Officer" });
  assets.push({ id: "server", kind: "server", name: "Electrical & network room", zone: "server", x: (serverRect[0] + serverRect[2]) / 2, z: (rear + roomBack) / 2, rot: 0, index: 1 });
  assets.push({ id: "staff-room", kind: "staffRoom", name: "Staff room & kitchenette", zone: "staff", x: (staffRect[0] + staffRect[2]) / 2, z: (rear + roomBack) / 2, rot: 0, index: 1 });
  assets.push({ id: "washrooms", kind: "washroom", name: "Washrooms", zone: "staff", x: (gentsRect[0] + ladiesRect[2]) / 2, z: (rear + roomBack) / 2, rot: 0, index: 1 });
  if (recordsRect)
    assets.push({ id: "records", kind: "records", name: "Records & document storage", zone: "staff", x: (recordsRect[0] + recordsRect[2]) / 2, z: (rear + roomBack) / 2, rot: 0, index: 1 });
  // Where staff sit on a break: round the staff-room table.
  const tableX = staffRect[0] + (staffRect[2] - staffRect[0]) * 0.62;
  const tableZ = (rear + roomBack) / 2 + 0.1;
  const breakSeats = [
    { x: tableX - 0.75, z: tableZ, rot: Math.PI / 2 },
    { x: tableX + 0.75, z: tableZ, rot: -Math.PI / 2 },
    { x: tableX, z: tableZ - 0.7, rot: 0 },
    { x: tableX - 0.75, z: tableZ - 0.55, rot: Math.PI / 2 },
  ];

  // ── CCTV: hall corners, counter, vault door, ATM vestibule (each aimed at what it watches) ──
  const vaultAsset = assets.find((a) => a.kind === "vault");
  const cams: [number, number, V3, string][] = [
    [left + 0.4, front - 0.4, [entranceX, 0.6, front - 4.5], "Entrance"],
    [right - 0.4, counterZ + 0.4, [(counterX0 + counterX1) / 2, 0.9, counterZ + 0.6], "Teller line"],
    [left + 0.4, backStrip + 0.4, [vaultAsset ? vaultAsset.x : left + 3, 1.1, backStrip], "Vault door"],
  ];
  if (atmRoom) cams.push([right - 0.4, front - 0.4, [right - 2.6, 0.8, front - 3.6], "ATM vestibule"]);
  if (size !== "small") cams.push([(counterX0 + counterX1) / 2, front - 0.4, [hub[0], 0.6, counterZ + 1.5], "Waiting hall"]);
  cams.forEach(([cx, cz, aim, where], i) =>
    assets.push({
      id: `cctv-${i + 1}`,
      kind: "cctv",
      name: `Camera ${i + 1} · ${where}`,
      zone: "lobby",
      x: cx,
      z: cz,
      rot: Math.atan2(aim[0] - cx, aim[2] - cz),
      aim,
      index: i + 1,
    }),
  );

  // ── Waiting hall seats (rows face the counters) ──────────────────────────────
  const seats: Seat[] = [];
  const hallX0 = deskColumn + 1.6;
  const hallX1 = rightColumn - 1.2;
  const rowZ0 = counterZ + 3.1;
  const rowZ1 = front - 5.4;
  zone("waiting", archetype === "corporate" ? "Client Lounge" : "Waiting Hall", "Waiting", [deskColumn, counterZ + 1.8, rightColumn, front - 4.6]);
  if (archetype === "corporate") {
    assets.push({ id: "lounge", kind: "lounge", name: "Client lounge", zone: "waiting", x: (hallX0 + hallX1) / 2, z: (rowZ0 + rowZ1) / 2, rot: Math.PI, index: 1 });
  }
  const aisle = hub[0];
  for (let z = rowZ0; z <= rowZ1 + 0.01; z += 1.35) {
    for (let sx = hallX0; sx <= hallX1 + 0.01; sx += 0.62) {
      if (Math.abs(sx - aisle) < 0.75) continue; // centre aisle
      seats.push({ x: sx, z, rot: Math.PI });
    }
  }
  const standing: V2[] = [];
  for (let i = 0; i < 14; i++) standing.push([hallX0 + (i % 7) * 0.8, front - 4.9 + Math.floor(i / 7) * 0.7]);

  return {
    branchId: branch.id,
    size,
    archetype,
    width: W,
    depth: D,
    height: H,
    zones,
    assets: assets.map((a) => (a.kind === "prayer" ? { ...a, name: `${a.name} (${islamicLabel})` } : a)),
    seats,
    standing,
    rooms,
    counter: { x0: counterX0 - 0.3, x1: counterX1 + 0.3, z: counterZ },
    points: {
      hub,
      doorOutside: [entranceX, front + 1.2],
      doorInside: [entranceX, front - 1.0],
      spawnLeft: [left - 9, front + 2.4],
      spawnRight: [right + 9, front + 2.4],
      atmDoor,
      atmQueue,
    },
    entrance,
    atmRoom,
    staff,
    partitions,
    breakSeats,
    serviceBand: { rear, back, corridor: [back - CORRIDOR, back] },
  };
}
