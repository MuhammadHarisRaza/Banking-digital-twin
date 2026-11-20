import { create } from "zustand";
import type { Box3 } from "three";
import type { Branch } from "../types";
import type { BranchLayout, V3, ZoneId } from "./layout/types";
import { createSim, type CustomerProfile, type Scenarios, type SimState } from "./sim/engine";

/** Bounds of every selectable asset, registered by <Selectable> for camera framing. */
export const assetBounds = new Map<string, Box3>();

/** The camera's live position, written each frame (read by focus maths without React state). */
export const liveCamera = { x: 0, y: 30, z: 40, tx: 0, ty: 0, tz: 0 };

export type ViewId = "exterior" | "hall" | "tellers" | "vault" | "top";
export const VIEW_LABELS: Record<ViewId, string> = {
  exterior: "Exterior",
  hall: "Banking hall",
  tellers: "Tellers",
  vault: "Vault",
  top: "Top down",
};

/** Exterior: the building from outside. Interior: a cutaway of the whole floor. Walk: first person at eye height. */
export type ViewMode = "exterior" | "interior" | "walk";
export type Lighting = "day" | "night";

export interface Layers {
  people: boolean;
  labels: boolean;
  roof: boolean;
  walls: boolean;
}

interface ViewState {
  selected: string | null;
  hovered: string | null;
  zone: ZoneId | null;
  camera: { pos: V3; target: V3; nonce: number };
  layers: Layers;
  /** Width (px) of the inspector panel over the right of the view; the 3D view re-centres beside it. */
  insetRight: number;
  mode: ViewMode;
  lighting: Lighting;
  /** Click-to-go target for the walkthrough (a zone), with a nonce so the same zone can be requested again. */
  walkTo: { zone: ZoneId | null; nonce: number };
  /** The walkthrough's guided tour is running. */
  touring: boolean;
  /** All overlay panels (controls, zones, KPIs, inspector, labels) are hidden to show the twin clearly. */
  panelsHidden: boolean;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  flyTo: (pos: V3, target: V3) => void;
  selectZone: (id: ZoneId | null) => void;
  setLayer: (key: keyof Layers, on: boolean) => void;
  setInsetRight: (px: number) => void;
  setMode: (mode: ViewMode) => void;
  setLighting: (lighting: Lighting) => void;
  walkToZone: (zone: ZoneId | null) => void;
  setTouring: (on: boolean) => void;
  togglePanels: () => void;
  reset: (layers?: Partial<Layers>) => void;
}

export const useTwinView = create<ViewState>()((set) => ({
  selected: null,
  hovered: null,
  zone: null,
  camera: { pos: [30, 24, 44], target: [0, 1, 0], nonce: 0 },
  layers: { people: true, labels: true, roof: false, walls: true },
  insetRight: 0,
  mode: "exterior",
  lighting: "day",
  walkTo: { zone: null, nonce: 0 },
  touring: false,
  panelsHidden: false,
  select: (selected) => set({ selected }),
  hover: (hovered) => set({ hovered }),
  flyTo: (pos, target) => set((s) => ({ camera: { pos, target, nonce: s.camera.nonce + 1 } })),
  selectZone: (zone) => set({ zone, selected: null }),
  setLayer: (key, on) => set((s) => ({ layers: { ...s.layers, [key]: on } })),
  setInsetRight: (insetRight) => set({ insetRight }),
  setMode: (mode) => set({ mode, touring: false, hovered: null }),
  setLighting: (lighting) => set({ lighting }),
  walkToZone: (zone) => set((s) => ({ walkTo: { zone, nonce: s.walkTo.nonce + 1 } })),
  setTouring: (touring) => set({ touring }),
  togglePanels: () => set((s) => ({ panelsHidden: !s.panelsHidden })),
  reset: (layers) =>
    set((s) => ({
      selected: null,
      hovered: null,
      zone: null,
      mode: "exterior",
      touring: false,
      layers: { ...s.layers, ...layers },
    })),
}));

export const SPEEDS = [1, 10, 60] as const;
export type Speed = (typeof SPEEDS)[number];

interface SimStore {
  sim: SimState | null;
  layout: BranchLayout | null;
  speed: Speed;
  paused: boolean;
  scenarios: Scenarios;
  /** Increments when the panels should re-read the simulation. */
  version: number;
  init: (branch: Branch, layout: BranchLayout, staffNames: string[], speed: Speed) => void;
  setSpeed: (speed: Speed) => void;
  togglePause: () => void;
  toggleScenario: (key: keyof Scenarios) => void;
  bump: () => void;
  /** Customer 360 customers of this branch (applies to visitors arriving from now on). */
  setRoster: (roster: CustomerProfile[]) => void;
}

export const useBranchSim = create<SimStore>()((set) => ({
  sim: null,
  layout: null,
  speed: 10,
  paused: false,
  scenarios: { rush: false, atmFault: false, tellerAbsent: false },
  version: 0,
  init: (branch, layout, staffNames, speed) =>
    set((s) => ({
      sim: createSim(branch, layout, staffNames),
      layout,
      speed,
      paused: false,
      scenarios: { rush: false, atmFault: false, tellerAbsent: false },
      version: s.version + 1,
    })),
  setSpeed: (speed) => set({ speed, paused: false }),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  toggleScenario: (key) =>
    set((s) => {
      if (s.sim) s.sim.dirty = true;
      return { scenarios: { ...s.scenarios, [key]: !s.scenarios[key] } };
    }),
  bump: () => set((s) => ({ version: s.version + 1 })),
  setRoster: (roster) => {
    const sim = useBranchSim.getState().sim;
    if (!sim) return;
    sim.roster = roster;
    sim.rosterNext = 0;
    // People already inside take identities too (most of them), so the branch looks right straight away.
    let i = 0;
    for (const c of sim.customers) {
      if (!roster.length) c.profile = undefined;
      else if (!c.profile && i < roster.length && c.id % 10 < 7) c.profile = roster[i++];
    }
    sim.rosterNext = roster.length ? i % roster.length : 0;
    sim.dirty = true;
  },
}));

/** Re-renders the caller whenever the simulation publishes a change, and returns the live state. */
export function useSimVersion() {
  useBranchSim((s) => s.version);
  return useBranchSim.getState().sim;
}
