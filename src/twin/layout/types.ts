/** Floor-plan coordinates are metres: x across the frontage, z from the back wall (−) to the street (+), y up. */
export type V2 = [number, number];
export type V3 = [number, number, number];

export type AssetKind =
  | "teller"
  | "atm"
  | "desk"
  | "kiosk"
  | "tokenBoard"
  | "manager"
  | "vault"
  | "lockers"
  | "server"
  | "backOffice"
  | "cctv"
  | "guard"
  | "prayer"
  | "meeting"
  | "lounge"
  | "entrance"
  | "reception"
  | "cdm"
  | "chequeKiosk"
  | "staffRoom"
  | "washroom"
  | "records";

export type ZoneId =
  | "exterior"
  | "lobby"
  | "atm"
  | "waiting"
  | "tellers"
  | "service"
  | "manager"
  | "vault"
  | "backOffice"
  | "server"
  | "prayer"
  | "meeting"
  | "staff";

export interface Zone {
  id: ZoneId;
  name: string;
  short: string;
  color: string;
  /** Floor rectangle [x0, z0, x1, z1]. */
  rect: [number, number, number, number];
  label: V2;
}

export interface Asset {
  id: string;
  kind: AssetKind;
  name: string;
  zone: ZoneId;
  /** Centre on the floor. */
  x: number;
  z: number;
  /** Rotation about y, radians. 0 faces the street (+z). */
  rot: number;
  /** Where a customer stands or sits to use it. */
  spot?: V2;
  /** Walking route from the hall hub to the spot (excluding the hub and the spot). */
  route?: V2[];
  /** Index within its kind (counter number, ATM number …). */
  index: number;
  /** CCTV only: the point the camera watches. */
  aim?: V3;
}

export interface Seat {
  x: number;
  z: number;
  rot: number;
}

export interface Room {
  id: string;
  rect: [number, number, number, number];
  /** Wall style: solid partition, glass office, or reinforced vault. */
  style: "solid" | "glass" | "vault";
  /** Door gap: wall side and offset along it. */
  door: { side: "n" | "s" | "e" | "w"; at: number; width: number };
}

export type BranchSize = "small" | "standard" | "flagship";
export type Archetype = "retail" | "islamic" | "corporate";

export interface BranchLayout {
  branchId: string;
  size: BranchSize;
  archetype: Archetype;
  width: number;
  depth: number;
  height: number;
  zones: Zone[];
  assets: Asset[];
  seats: Seat[];
  /** Standing positions used when every seat is taken. */
  standing: V2[];
  rooms: Room[];
  /** Counter run (teller line) along x at z = counterZ. */
  counter: { x0: number; x1: number; z: number };
  /** Key walking points. */
  points: {
    hub: V2;
    doorOutside: V2;
    doorInside: V2;
    spawnLeft: V2;
    spawnRight: V2;
    atmDoor: V2;
    atmQueue: V2[];
  };
  entrance: { x: number; width: number };
  atmRoom: [number, number, number, number] | null;
  /** Staff positions (seated or standing), with the asset they work at. */
  staff: { x: number; z: number; rot: number; seated: boolean; assetId?: string; role: string }[];
  /** Free-standing wall runs that aren't a room's sides (the corridor wall behind the back office). */
  partitions: { axis: "x" | "z"; fixed: number; from: number; to: number; gaps: { at: number; width: number }[] }[];
  /** Staff-room seats used by staff on a break. */
  breakSeats: { x: number; z: number; rot: number }[];
  /** The rear service band: back wall z, its front edge z, and the corridor's z range. */
  serviceBand: { rear: number; back: number; corridor: [number, number] };
}
