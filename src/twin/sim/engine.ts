import { seeded } from "../../lib/seeded";
import type { Branch } from "../../types";
import type { Asset, BranchLayout, V2 } from "../layout/types";

/**
 * A small deterministic branch simulation. Discrete events (arrivals, service times, breaks, ATM cash,
 * vault access) run on simulated time; walking runs on screen time, a little faster at higher speeds,
 * so people always move naturally. Nothing here touches three.js — the scene reads positions each frame.
 */

export type ServiceKind = "teller" | "desk" | "manager" | "locker" | "atm";
export type StationState = "available" | "serving" | "calling" | "break" | "offline" | "closed";
export type AtmState = "ok" | "lowCash" | "outOfCash" | "fault";
export type Severity = "critical" | "warning" | "info";

export type CustomerPhase =
  | "walkIn"
  | "token"
  | "toSeat"
  | "waiting"
  | "toStation"
  | "service"
  | "exit"
  | "toAtmQueue"
  | "atmQueue"
  | "toAtm"
  | "atm"
  | "gone";

export interface Customer {
  id: number;
  service: ServiceKind;
  phase: CustomerPhase;
  x: number;
  z: number;
  heading: number;
  path: V2[];
  /** Simulated minute when the current timed phase ends. */
  until: number;
  arrivedAt: number;
  calledAt: number;
  token: string;
  seat: number;
  standing: number;
  station: string | null;
  color: number;
  seated: boolean;
  /** Walk speed factor, so a crowd doesn't move in lockstep. */
  pace: number;
  queueSlot: number;
  /** A real customer from Customer 360 this visitor stands in for (when the branch has linked customers). */
  profile?: CustomerProfile;
}

export interface CustomerProfile {
  id: string;
  name: string;
  tier: string;
}

export interface Station {
  id: string;
  kind: ServiceKind;
  asset: Asset;
  state: StationState;
  customer: number | null;
  servedToday: number;
  handleMinutes: number;
  breakUntil: number;
  staffName: string;
  /** For ATMs. */
  atm?: { state: AtmState; cash: number; withdrawals: number; downMinutes: number };
}

export interface Alert {
  id: number;
  code: string;
  time: number;
  severity: Severity;
  title: string;
  detail: string;
  assetId?: string;
  active: boolean;
}

export interface TokenCall {
  token: string;
  station: string;
  time: number;
}

export interface Scenarios {
  rush: boolean;
  atmFault: boolean;
  tellerAbsent: boolean;
}

export interface SimState {
  branchId: string;
  /** Simulated minutes since midnight of day 1. */
  t: number;
  day: number;
  open: boolean;
  customers: Customer[];
  stations: Station[];
  seatsTaken: (number | null)[];
  standingTaken: (number | null)[];
  atmQueue: (number | null)[];
  calls: TokenCall[];
  alerts: Alert[];
  activeCodes: Map<string, number>;
  vault: { doorOpen: boolean; openUntil: number; lastAccess: number; accessesToday: number; nextAccess: number };
  server: { load: number; temp: number; latency: number };
  servedToday: number;
  atmToday: number;
  tokensToday: number;
  waits: number[];
  nextId: number;
  /** Customer 360 customers of this branch; new visitors take their identities in turn. */
  roster: CustomerProfile[];
  rosterNext: number;
  nextArrival: number;
  nextAtmArrival: number;
  visitorsPerDay: number;
  tokenCounters: Record<string, number>;
  rand: () => number;
  /** Bumped whenever something visible to the panels changes. */
  dirty: boolean;
}

const OPEN = 9 * 60;
const CLOSE = 17 * 60;
const WRAP = 17 * 60 + 45;
export const START_TIME = 10 * 60 + 30;

/** Relative walk-in demand by hour, peaking over lunch. */
const PROFILE: Record<number, number> = { 9: 0.6, 10: 0.95, 11: 1.3, 12: 1.55, 13: 1.35, 14: 1.0, 15: 0.9, 16: 0.65 };
const MEAN_PROFILE = Object.values(PROFILE).reduce((a, b) => a + b, 0) / 8;

const SERVICE_TIME: Record<ServiceKind, [number, number]> = {
  teller: [2.5, 5],
  desk: [7, 11],
  manager: [9, 12],
  locker: [6, 7],
  atm: [1.4, 1.8],
};

const TOKEN_PREFIX: Record<ServiceKind, string> = { teller: "A", desk: "B", manager: "C", locker: "D", atm: "" };

export const CLOTHES = ["#334155", "#7c2d12", "#1e3a8a", "#065f46", "#6b21a8", "#9f1239", "#a16207", "#475569", "#0f766e", "#e2e8f0", "#57534e", "#b45309"];

export const fmtClock = (t: number) => {
  const m = Math.floor(t) % 1440;
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

const dist = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function exp(rand: () => number, mean: number) {
  return -Math.log(1 - rand() * 0.999) * mean;
}

function arrivalRate(sim: SimState, scenarios: Scenarios, layout: BranchLayout) {
  const hour = Math.floor((sim.t % 1440) / 60);
  const profile = PROFILE[hour] ?? 0;
  if (!profile) return 0;
  // Corporate branches see fewer, longer visits.
  const base = (sim.visitorsPerDay / 480) * (profile / MEAN_PROFILE) * (layout.archetype === "corporate" ? 0.45 : 1);
  return base * (scenarios.rush ? 2.3 : 1);
}

export function createSim(branch: Branch, layout: BranchLayout, staffNames: string[]): SimState {
  const rand = seeded(`${branch.id}-sim`);
  const stations: Station[] = [];
  let nameIndex = 0;
  const nextName = () => staffNames[nameIndex++ % Math.max(1, staffNames.length)] ?? "Staff";
  for (const asset of layout.assets) {
    const kind: ServiceKind | null =
      asset.kind === "teller" ? "teller" : asset.kind === "desk" ? "desk" : asset.kind === "manager" ? "manager" : asset.kind === "lockers" ? "locker" : asset.kind === "atm" ? "atm" : null;
    if (!kind) continue;
    stations.push({
      id: asset.id,
      kind,
      asset,
      state: "available",
      customer: null,
      servedToday: 0,
      handleMinutes: 0,
      breakUntil: 0,
      staffName: kind === "atm" ? "" : kind === "locker" ? "Locker custodian" : nextName(),
      atm: kind === "atm" ? { state: "ok", cash: 55 + rand() * 40, withdrawals: 0, downMinutes: 0 } : undefined,
    });
  }

  const visitorsPerDay = Math.round(Math.min(650, Math.max(140, branch.dailyTransactions * 0.12)));
  const sim: SimState = {
    branchId: branch.id,
    t: START_TIME,
    day: 1,
    open: true,
    customers: [],
    stations,
    seatsTaken: layout.seats.map(() => null),
    standingTaken: layout.standing.map(() => null),
    atmQueue: layout.points.atmQueue.map(() => null),
    calls: [],
    alerts: [],
    activeCodes: new Map(),
    vault: { doorOpen: false, openUntil: 0, lastAccess: OPEN + 5, accessesToday: 1, nextAccess: START_TIME + 12 + rand() * 20 },
    server: { load: 38, temp: 22.5, latency: 18 },
    servedToday: 0,
    atmToday: 0,
    tokensToday: 0,
    waits: [],
    nextId: 1,
    roster: [],
    rosterNext: 0,
    nextArrival: START_TIME,
    nextAtmArrival: START_TIME,
    visitorsPerDay,
    tokenCounters: { A: 100, B: 300, C: 500, D: 700 },
    rand,
    dirty: true,
  };

  // Business so far today, so the counters don't start at zero mid-morning.
  const elapsed = (START_TIME - OPEN) / 480;
  sim.servedToday = Math.round(visitorsPerDay * elapsed * 0.82);
  sim.tokensToday = sim.servedToday + 6;
  sim.atmToday = Math.round(visitorsPerDay * 0.4 * elapsed);
  for (const key of Object.keys(sim.tokenCounters)) sim.tokenCounters[key] += Math.round(sim.servedToday / 4);
  for (const st of stations) {
    if (st.kind !== "atm") st.servedToday = Math.round(sim.servedToday / Math.max(1, stations.length - 1) * (0.7 + rand() * 0.6));
  }
  for (let i = 0; i < 18; i++) sim.waits.push(4 + rand() * 9);
  warmUp(sim, layout);
  return sim;
}

/** Puts customers at counters and in seats so the first frame already looks like a working branch. */
function warmUp(sim: SimState, layout: BranchLayout) {
  for (const st of sim.stations) {
    if (st.kind === "atm" || st.kind === "locker") continue;
    if (sim.rand() < (st.kind === "teller" ? 0.85 : 0.55)) {
      const c = spawnCustomer(sim, st.kind, st.asset.spot ?? [st.asset.x, st.asset.z]);
      c.phase = "service";
      c.station = st.id;
      c.calledAt = sim.t - 3;
      c.arrivedAt = sim.t - 12;
      c.until = sim.t + serviceTime(sim, st.kind) * sim.rand();
      c.seated = st.kind !== "teller";
      c.heading = facing(st.asset);
      st.state = "serving";
      st.customer = c.id;
    }
  }
  const waiting = Math.round(arrivalRate(sim, { rush: false, atmFault: false, tellerAbsent: false }, layout) * 7);
  for (let i = 0; i < waiting; i++) {
    const kind = pickService(sim, layout);
    const seat = freeSeat(sim);
    if (seat < 0) break;
    const s = layout.seats[seat];
    const c = spawnCustomer(sim, kind, [s.x, s.z]);
    c.phase = "waiting";
    c.seat = seat;
    c.seated = true;
    c.heading = s.rot;
    c.arrivedAt = sim.t - sim.rand() * 10;
    c.token = issueToken(sim, kind);
    sim.seatsTaken[seat] = c.id;
  }
}

/** Direction a customer faces when at an asset's service spot. */
function facing(asset: Asset) {
  const [sx, sz] = asset.spot ?? [asset.x, asset.z];
  return Math.atan2(asset.x - sx, asset.z - sz);
}

function serviceTime(sim: SimState, kind: ServiceKind) {
  const [min, spread] = SERVICE_TIME[kind];
  return min + exp(sim.rand, spread / 1.6);
}

function pickService(sim: SimState, layout: BranchLayout): ServiceKind {
  const r = sim.rand();
  const hasLockers = sim.stations.some((s) => s.kind === "locker");
  if (layout.archetype === "corporate") return r < 0.45 ? "teller" : r < 0.9 ? "desk" : "manager";
  if (r < 0.64) return "teller";
  if (r < 0.88) return "desk";
  if (r < 0.95 || !hasLockers) return r < 0.97 ? "manager" : "desk";
  return "locker";
}

function spawnCustomer(sim: SimState, service: ServiceKind, at: V2): Customer {
  const c: Customer = {
    id: sim.nextId++,
    service,
    phase: "walkIn",
    x: at[0],
    z: at[1],
    heading: 0,
    path: [],
    until: 0,
    arrivedAt: sim.t,
    calledAt: 0,
    token: "",
    seat: -1,
    standing: -1,
    station: null,
    color: Math.floor(sim.rand() * CLOTHES.length),
    seated: false,
    pace: 0.85 + sim.rand() * 0.35,
    queueSlot: -1,
  };
  // Most visitors are one of the branch's real customers when Customer 360 has some; the rest are walk-ins.
  if (sim.roster.length && sim.rand() < 0.7) {
    const inside = new Set(sim.customers.map((x) => x.profile?.id).filter(Boolean));
    for (let i = 0; i < sim.roster.length; i++) {
      const p = sim.roster[(sim.rosterNext + i) % sim.roster.length];
      if (!inside.has(p.id)) {
        c.profile = p;
        sim.rosterNext = (sim.rosterNext + i + 1) % sim.roster.length;
        break;
      }
    }
  }
  sim.customers.push(c);
  return c;
}

function issueToken(sim: SimState, kind: ServiceKind) {
  const prefix = TOKEN_PREFIX[kind];
  sim.tokenCounters[prefix] = (sim.tokenCounters[prefix] % 999) + 1;
  sim.tokensToday++;
  return `${prefix}-${String(sim.tokenCounters[prefix]).padStart(3, "0")}`;
}

function freeSeat(sim: SimState) {
  // Fill from the front rows near the aisle, the way people actually sit.
  const free: number[] = [];
  sim.seatsTaken.forEach((v, i) => v === null && free.push(i));
  if (!free.length) return -1;
  return free[Math.floor(sim.rand() * Math.min(free.length, 6))];
}

function stationById(sim: SimState, id: string | null) {
  return id ? sim.stations.find((s) => s.id === id) : undefined;
}

function raise(sim: SimState, code: string, severity: Severity, title: string, detail: string, assetId?: string) {
  if (sim.activeCodes.has(code)) return;
  const alert: Alert = { id: sim.alerts.length ? sim.alerts[0].id + 1 : 1, code, time: sim.t, severity, title, detail, assetId, active: severity !== "info" };
  sim.alerts.unshift(alert);
  if (sim.alerts.length > 40) sim.alerts.length = 40;
  if (alert.active) sim.activeCodes.set(code, alert.id);
  sim.dirty = true;
}

function clear(sim: SimState, code: string, title?: string) {
  const id = sim.activeCodes.get(code);
  if (id === undefined) return;
  sim.activeCodes.delete(code);
  const alert = sim.alerts.find((a) => a.id === id);
  if (alert) alert.active = false;
  if (title) raise(sim, `${code}-ok-${Math.floor(sim.t)}`, "info", title, "Resolved automatically", alert?.assetId);
  sim.dirty = true;
}

// ── Discrete events ─────────────────────────────────────────────────────────────

function arrive(sim: SimState, layout: BranchLayout) {
  const kind = pickService(sim, layout);
  const fromLeft = sim.rand() < 0.5;
  const start = fromLeft ? layout.points.spawnLeft : layout.points.spawnRight;
  const c = spawnCustomer(sim, kind, [start[0], start[1] + (sim.rand() - 0.5) * 1.2]);
  const kiosk = layout.assets.find((a) => a.kind === "kiosk")!;
  c.path = [[layout.points.doorOutside[0], start[1]], layout.points.doorOutside, layout.points.doorInside, kiosk.spot!];
  c.phase = "walkIn";
}

/**
 * A customer arriving by car (dropped at the kerb or walking from the car park): they start at the car
 * door, walk the given route to the entrance and then carry on like any walk-in. Ignored outside
 * banking hours. Returns the customer id, or null.
 */
export function arriveFrom(sim: SimState, layout: BranchLayout, at: V2, via: V2[]): number | null {
  if (!sim.open) return null;
  const kiosk = layout.assets.find((a) => a.kind === "kiosk");
  if (!kiosk?.spot) return null;
  const c = spawnCustomer(sim, pickService(sim, layout), at);
  c.path = [...via, layout.points.doorOutside, layout.points.doorInside, kiosk.spot];
  c.phase = "walkIn";
  sim.dirty = true;
  return c.id;
}

function arriveAtm(sim: SimState, layout: BranchLayout) {
  const atms = sim.stations.filter((s) => s.kind === "atm");
  if (!atms.length) return;
  const slot = sim.atmQueue.findIndex((v) => v === null);
  if (slot < 0) return; // a full queue turns people away
  const start = sim.rand() < 0.5 ? layout.points.spawnLeft : layout.points.spawnRight;
  const c = spawnCustomer(sim, "atm", [start[0], start[1] + 0.4]);
  sim.atmQueue[slot] = c.id;
  c.queueSlot = slot;
  const target = layout.points.atmQueue[slot];
  c.path = [[layout.points.atmDoor[0], start[1] + 0.4], ...(slot <= 1 ? [layout.points.atmDoor] : []), target];
  c.phase = "toAtmQueue";
}

function onArrive(sim: SimState, c: Customer, layout: BranchLayout) {
  switch (c.phase) {
    case "walkIn": {
      c.phase = "token";
      c.until = sim.t + 0.35;
      c.heading = Math.PI / 2; // facing the kiosk screen
      break;
    }
    case "toSeat":
      c.phase = "waiting";
      if (c.seat >= 0) {
        c.seated = true;
        c.heading = layout.seats[c.seat].rot;
      } else c.heading = Math.PI;
      break;
    case "toStation": {
      const st = stationById(sim, c.station);
      if (!st) {
        leave(sim, c, layout);
        break;
      }
      c.phase = "service";
      c.until = sim.t + serviceTime(sim, st.kind);
      c.seated = st.kind === "desk" || st.kind === "manager";
      c.heading = facing(st.asset);
      st.state = "serving";
      sim.waits.push(Math.max(0, c.calledAt - c.arrivedAt));
      if (sim.waits.length > 25) sim.waits.shift();
      sim.dirty = true;
      break;
    }
    case "toAtmQueue":
      c.phase = "atmQueue";
      c.heading = Math.PI;
      break;
    case "toAtm": {
      const st = stationById(sim, c.station);
      c.phase = "atm";
      c.until = sim.t + serviceTime(sim, "atm");
      c.heading = st ? facing(st.asset) : Math.PI;
      break;
    }
    case "exit":
      c.phase = "gone";
      break;
  }
}

function leave(sim: SimState, c: Customer, layout: BranchLayout) {
  c.seated = false;
  const away = sim.rand() < 0.5 ? layout.points.spawnLeft : layout.points.spawnRight;
  if (c.service === "atm") {
    c.path = [layout.points.atmDoor, [layout.points.atmDoor[0], away[1] + 0.8], [away[0], away[1] + 0.8]];
  } else {
    const st = stationById(sim, c.station);
    const back = st?.asset.route ? [...st.asset.route].reverse() : [];
    c.path = [...back, layout.points.hub, layout.points.doorInside, layout.points.doorOutside, [layout.points.doorOutside[0], away[1] - 0.6], [away[0], away[1] - 0.6]];
  }
  c.phase = "exit";
}

function finishService(sim: SimState, c: Customer, layout: BranchLayout) {
  const st = stationById(sim, c.station);
  if (st) {
    st.customer = null;
    st.servedToday++;
    st.handleMinutes = st.handleMinutes ? st.handleMinutes * 0.8 + (sim.t - c.calledAt) * 0.2 : sim.t - c.calledAt;
    if (st.state === "serving") st.state = "available";
    if (st.kind === "atm" && st.atm) {
      st.atm.withdrawals++;
      if (sim.rand() < 0.75) st.atm.cash = Math.max(0, st.atm.cash - (0.4 + sim.rand() * 0.9));
      sim.atmToday++;
    } else sim.servedToday++;
  }
  sim.dirty = true;
  leave(sim, c, layout);
}

/** Calls the longest-waiting customer to each free counter or desk. */
function dispatch(sim: SimState, layout: BranchLayout) {
  for (const st of sim.stations) {
    if (st.state !== "available" || st.kind === "atm") continue;
    let best: Customer | null = null;
    for (const c of sim.customers) {
      if (c.phase !== "waiting" || c.service !== st.kind) continue;
      if (!best || c.arrivedAt < best.arrivedAt) best = c;
    }
    if (!best) continue;
    st.state = "calling";
    st.customer = best.id;
    best.station = st.id;
    best.calledAt = sim.t;
    best.seated = false;
    if (best.seat >= 0) sim.seatsTaken[best.seat] = null;
    if (best.standing >= 0) sim.standingTaken[best.standing] = null;
    best.seat = -1;
    best.standing = -1;
    best.phase = "toStation";
    best.path = [layout.points.hub, ...(st.asset.route ?? []), st.asset.spot!];
    sim.calls.unshift({ token: best.token, station: st.asset.name, time: sim.t });
    if (sim.calls.length > 6) sim.calls.length = 6;
    sim.dirty = true;
  }

  // ATMs take the head of the queue.
  for (const st of sim.stations) {
    if (st.kind !== "atm" || st.customer !== null) continue;
    const usable = st.atm && (st.atm.state === "ok" || st.atm.state === "lowCash");
    if (!usable) continue;
    const headId = sim.atmQueue[0];
    const head = headId !== null ? sim.customers.find((c) => c.id === headId) : undefined;
    if (!head || head.phase !== "atmQueue") continue;
    sim.atmQueue[0] = null;
    head.queueSlot = -1;
    head.station = st.id;
    st.customer = head.id;
    head.phase = "toAtm";
    head.path = [st.asset.spot!];
    shiftAtmQueue(sim, layout);
  }
}

function shiftAtmQueue(sim: SimState, layout: BranchLayout) {
  for (let i = 0; i < sim.atmQueue.length - 1; i++) {
    if (sim.atmQueue[i] !== null || sim.atmQueue[i + 1] === null) continue;
    const id = sim.atmQueue[i + 1]!;
    const c = sim.customers.find((x) => x.id === id);
    sim.atmQueue[i] = id;
    sim.atmQueue[i + 1] = null;
    if (c) {
      c.queueSlot = i;
      if (c.phase === "atmQueue" || c.phase === "toAtmQueue") {
        c.phase = "toAtmQueue";
        c.path = [layout.points.atmQueue[i]];
      }
    }
  }
}

/** Once per simulated minute: breaks, ATM cash, vault, server, alerts. */
function minuteTick(sim: SimState, layout: BranchLayout, scenarios: Scenarios) {
  const minuteOfDay = sim.t % 1440;
  const tellers = sim.stations.filter((s) => s.kind === "teller");

  for (const st of sim.stations) {
    if (st.kind === "atm") continue;
    const forcedOff = scenarios.tellerAbsent && st.kind === "teller" && st === tellers[tellers.length - 1];
    if (forcedOff) {
      if (st.state !== "offline" && st.customer === null) st.state = "offline";
      continue;
    }
    if (st.state === "offline") st.state = "available";
    // After hours a counter closes once nobody is left waiting for it.
    const stillWaiting = sim.customers.some((c) => c.service === st.kind && (c.phase === "waiting" || c.phase === "toSeat" || c.phase === "token"));
    if (!sim.open && st.state === "available" && !stillWaiting) st.state = "closed";
    if (sim.open && st.state === "closed") st.state = "available";
    if (st.state === "break" && sim.t >= st.breakUntil) st.state = "available";
    // Short breaks, never more than one counter at a time.
    if (
      sim.open &&
      st.kind === "teller" &&
      st.state === "available" &&
      tellers.length > 2 &&
      !tellers.some((t) => t.state === "break") &&
      sim.rand() < 0.006
    ) {
      st.state = "break";
      st.breakUntil = sim.t + 10 + sim.rand() * 8;
      sim.dirty = true;
    }
  }

  // ATM health.
  sim.stations.forEach((st, i) => {
    if (!st.atm) return;
    const atm = st.atm;
    const prev = atm.state;
    if (scenarios.atmFault && i === sim.stations.findIndex((s) => s.kind === "atm")) atm.state = "fault";
    else if (atm.cash < 3) atm.state = "outOfCash";
    else if (atm.cash < 20) atm.state = "lowCash";
    else atm.state = "ok";
    if (atm.state === "fault" || atm.state === "outOfCash") atm.downMinutes++;
    if (atm.state !== prev) sim.dirty = true;
    // Cash-in-transit refills low machines in the afternoon.
    if (minuteOfDay === 15 * 60 && atm.cash < 45) {
      atm.cash = 100;
      raise(sim, `cit-${st.id}-${sim.day}`, "info", `${st.asset.name} replenished`, "Cash-in-transit refill to 100%", st.id);
    }
  });

  // Vault: opened at start and end of day and for teller cash top-ups, always under dual control.
  if (sim.vault.doorOpen && sim.t >= sim.vault.openUntil) {
    sim.vault.doorOpen = false;
    sim.dirty = true;
  }
  if (sim.open && sim.t >= sim.vault.nextAccess) {
    sim.vault.doorOpen = true;
    sim.vault.openUntil = sim.t + 3;
    sim.vault.lastAccess = sim.t;
    sim.vault.accessesToday++;
    sim.vault.nextAccess = sim.t + 45 + sim.rand() * 50;
    raise(sim, `vault-${Math.floor(sim.t)}`, "info", "Vault opened", "Teller cash top-up · dual control (Manager + Cash Officer)", "vault");
  }

  // Server room drifts gently.
  const busy = sim.customers.length;
  sim.server.load = Math.min(95, 30 + busy * 0.8 + Math.sin(sim.t / 17) * 4);
  sim.server.temp = 21.8 + Math.sin(sim.t / 41) * 0.9 + busy * 0.02;
  sim.server.latency = 14 + Math.abs(Math.sin(sim.t / 7)) * 9 + busy * 0.15;

  // Alerts.
  const waiting = sim.customers.filter((c) => c.phase === "waiting" || c.phase === "toSeat").length;
  const longest = sim.customers.reduce((m, c) => (c.phase === "waiting" ? Math.max(m, sim.t - c.arrivedAt) : m), 0);
  const threshold = Math.max(8, Math.round(layout.seats.length * 0.7));
  if (waiting >= threshold) raise(sim, "queue", "warning", "Long queue in the waiting hall", `${waiting} customers waiting; consider opening another counter`);
  else if (waiting < threshold - 3) clear(sim, "queue", "Queue back to normal");
  if (longest > 20) raise(sim, "wait", "critical", "Waiting time above 20 minutes", `Longest wait ${Math.round(longest)} min against a 15 min service standard`);
  else if (longest < 14) clear(sim, "wait");

  for (const st of sim.stations) {
    if (st.kind === "teller") {
      if (st.state === "offline") raise(sim, `off-${st.id}`, "warning", `${st.asset.name} unstaffed`, `${st.staffName} absent; counter closed`, st.id);
      else clear(sim, `off-${st.id}`, `${st.asset.name} reopened`);
    }
    if (st.atm) {
      const s = st.atm.state;
      if (s === "fault") raise(sim, `atm-${st.id}`, "critical", `${st.asset.name} out of service`, "Dispenser fault reported; customers redirected inside", st.id);
      else if (s === "outOfCash") raise(sim, `atm-${st.id}`, "critical", `${st.asset.name} out of cash`, "Cash-in-transit requested", st.id);
      else clear(sim, `atm-${st.id}`, `${st.asset.name} back in service`);
      if (s === "lowCash") raise(sim, `cash-${st.id}`, "warning", `${st.asset.name} low on cash`, `${Math.round(st.atm.cash)}% remaining`, st.id);
      else clear(sim, `cash-${st.id}`);
    }
  }
}

/** Moves a customer along their path. Returns true on arrival at the last point. */
function walk(c: Customer, dt: number, scale: number) {
  if (!c.path.length) return true;
  let budget = 1.25 * c.pace * scale * dt;
  while (budget > 0 && c.path.length) {
    const [tx, tz] = c.path[0];
    const dx = tx - c.x;
    const dz = tz - c.z;
    const d = Math.hypot(dx, dz);
    if (d <= budget) {
      c.x = tx;
      c.z = tz;
      budget -= d;
      c.path.shift();
    } else {
      c.x += (dx / d) * budget;
      c.z += (dz / d) * budget;
      const want = Math.atan2(dx, dz);
      let delta = want - c.heading;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      c.heading += delta * Math.min(1, dt * 9);
      budget = 0;
    }
  }
  return c.path.length === 0;
}

const WALKING: ReadonlySet<CustomerPhase> = new Set(["walkIn", "toSeat", "toStation", "exit", "toAtmQueue", "toAtm"]);

export function isWalking(c: Customer) {
  return WALKING.has(c.phase) && c.path.length > 0;
}

/**
 * Advances the simulation. `dtReal` is screen seconds (for walking), `speed` how many simulated
 * seconds pass per real second.
 */
export function step(sim: SimState, layout: BranchLayout, dtReal: number, speed: number, scenarios: Scenarios) {
  // Capped so a stalled tab doesn't jump ahead, but loose enough that slow devices keep real pace.
  const dt = Math.min(dtReal, 0.25);
  const dtSim = (dt * speed) / 60;
  const walkScale = speed <= 1 ? 1 : speed <= 10 ? 1.7 : 2.8;
  const before = Math.floor(sim.t);
  sim.t += dtSim;

  // Day boundary: open, close, and roll over to the next morning.
  const minuteOfDay = sim.t % 1440;
  const wasOpen = sim.open;
  sim.open = minuteOfDay >= OPEN && minuteOfDay < CLOSE;
  if (wasOpen !== sim.open) sim.dirty = true;
  if (minuteOfDay >= WRAP && !sim.customers.some((c) => c.service !== "atm")) {
    sim.t = sim.day * 1440 + OPEN;
    sim.day++;
    sim.servedToday = 0;
    sim.atmToday = 0;
    sim.tokensToday = 0;
    sim.vault.accessesToday = 1;
    sim.vault.lastAccess = sim.t;
    sim.vault.nextAccess = sim.t + 20;
    sim.nextArrival = sim.t;
    sim.nextAtmArrival = sim.t;
    sim.stations.forEach((s) => (s.servedToday = 0));
    raise(sim, `open-${sim.day}`, "info", "Branch opened", `Day ${sim.day} · counters open at 09:00`);
  }

  // Arrivals (Poisson).
  const rate = sim.open ? arrivalRate(sim, scenarios, layout) : 0;
  if (rate > 0) {
    while (sim.nextArrival <= sim.t) {
      arrive(sim, layout);
      sim.nextArrival += exp(sim.rand, 1 / rate);
    }
  } else sim.nextArrival = sim.t + 1;
  const atmRate = (sim.visitorsPerDay * 0.45) / 480 * (sim.open ? 1 : 0.25) * (scenarios.rush ? 1.6 : 1);
  if (layout.atmRoom && atmRate > 0) {
    while (sim.nextAtmArrival <= sim.t) {
      arriveAtm(sim, layout);
      sim.nextAtmArrival += exp(sim.rand, 1 / atmRate);
    }
  }

  // Per-customer behaviour.
  for (const c of sim.customers) {
    if (WALKING.has(c.phase)) {
      if (walk(c, dt, walkScale)) onArrive(sim, c, layout);
      continue;
    }
    if (c.phase === "token" && sim.t >= c.until) {
      c.token = issueToken(sim, c.service);
      const seat = freeSeat(sim);
      if (seat >= 0) {
        c.seat = seat;
        sim.seatsTaken[seat] = c.id;
        const s = layout.seats[seat];
        c.path = [layout.points.hub, [s.x, s.z]];
      } else {
        const spot = sim.standingTaken.findIndex((v) => v === null);
        if (spot < 0) {
          // Nowhere to wait: the customer gives up.
          leave(sim, c, layout);
          continue;
        }
        c.standing = spot;
        sim.standingTaken[spot] = c.id;
        c.path = [layout.standing[spot]];
      }
      c.phase = "toSeat";
      sim.dirty = true;
    } else if ((c.phase === "service" || c.phase === "atm") && sim.t >= c.until) {
      finishService(sim, c, layout);
    }
  }

  // Customers whose ATM went down give up and leave.
  for (const c of sim.customers) {
    if (c.phase !== "atm" && c.phase !== "toAtm") continue;
    const st = stationById(sim, c.station);
    if (st?.atm && (st.atm.state === "fault" || st.atm.state === "outOfCash")) {
      st.customer = null;
      leave(sim, c, layout);
    }
  }

  const goneBefore = sim.customers.length;
  sim.customers = sim.customers.filter((c) => c.phase !== "gone");
  if (sim.customers.length !== goneBefore) {
    for (const st of sim.stations) {
      if (st.customer !== null && !sim.customers.some((c) => c.id === st.customer)) {
        st.customer = null;
        if (st.state === "serving" || st.state === "calling") st.state = "available";
      }
    }
    sim.dirty = true;
  }

  dispatch(sim, layout);
  // A minute tick for each whole simulated minute that passed (at most a few per frame).
  const after = Math.floor(sim.t);
  for (let m = before; m < after && m < before + 5; m++) minuteTick(sim, layout, scenarios);
  if (after !== before) sim.dirty = true;
}

/** Figures for the panels. */
export function kpis(sim: SimState) {
  const waiting = sim.customers.filter((c) => c.phase === "waiting" || c.phase === "toSeat" || c.phase === "token").length;
  const counters = sim.stations.filter((s) => s.kind === "teller");
  const open = counters.filter((s) => s.state === "available" || s.state === "serving" || s.state === "calling").length;
  const atms = sim.stations.filter((s) => s.kind === "atm");
  const atmUp = atms.filter((s) => s.atm && (s.atm.state === "ok" || s.atm.state === "lowCash")).length;
  const avgWait = sim.waits.length ? sim.waits.reduce((a, b) => a + b, 0) / sim.waits.length : 0;
  const inBranch = sim.customers.filter((c) => c.service !== "atm" && c.phase !== "exit").length;
  return {
    waiting,
    avgWait,
    served: sim.servedToday,
    countersOpen: open,
    counters: counters.length,
    atmUp,
    atms: atms.length,
    atmToday: sim.atmToday,
    inBranch,
    tokens: sim.tokensToday,
    activeAlerts: sim.activeCodes.size,
  };
}

export function stationStateLabel(st: Station) {
  if (st.atm) return { ok: "In service", lowCash: "Low cash", outOfCash: "Out of cash", fault: "Fault" }[st.atm.state];
  return { available: "Available", serving: "Serving", calling: "Calling customer", break: "On break", offline: "Unstaffed", closed: "Closed" }[st.state];
}

export function stationTone(st: Station): "green" | "amber" | "red" | "grey" {
  if (st.atm) return st.atm.state === "ok" ? "green" : st.atm.state === "lowCash" ? "amber" : "red";
  if (st.state === "offline") return "red";
  if (st.state === "break") return "amber";
  if (st.state === "closed") return "grey";
  return "green";
}

export const distance = dist;
