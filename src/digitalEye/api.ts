import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "../c360/query";
import { useSettings } from "../store/settingsStore";

/**
 * Digital Eye edge data, read from our banking-twin-api (GET /api/twin/v1/state). Digital Eye pushes box
 * health and camera tamper events to that API; the app only reads what has arrived, every 30 seconds.
 */

export interface Metric {
  value: number | null;
  unavailable_reason: string | null;
}

export interface Reading<P> {
  occurred_at: string;
  received_at: string;
  payload: P;
}

export interface HealthPayload {
  cpu?: Metric;
  memory?: Metric;
  storage?: Metric;
  network?: Metric;
  network_up?: Metric;
}

export interface GpuPayload {
  pct?: number | null;
  temp_c?: number | null;
  mem_used_mb?: number | null;
  mem_total_mb?: number | null;
  driver_version?: string | null;
}

/** Where Digital Eye's sites, boxes and cameras are in the bank: shared by everyone, stored in banking-twin-api. */
export interface Mapping {
  /** site_ref → branch id: every box and camera of the site belongs to that branch. */
  siteMap: Record<string, string>;
  /** device_ref → branch id, for a box in a different branch from the rest of its site. */
  deviceMap: Record<string, string>;
  /** camera_ref → twin camera asset id in its branch (cctv-N or atm-N). */
  cameraMap: Record<string, string>;
}

export const EMPTY_MAPPING: Mapping = { siteMap: {}, deviceMap: {}, cameraMap: {} };

export interface EdgeDevice {
  device_ref: string;
  site_ref: string | null;
  latest: { "device.health"?: Reading<HealthPayload>; "device.gpu"?: Reading<GpuPayload> } & Record<string, Reading<unknown> | undefined>;
}

export interface EdgeCamera {
  camera_ref: string;
  site_ref: string | null;
  device_ref: string | null;
  tamper: { kind: string; occurred_at: string; active: boolean } | null;
}

export interface TwinState {
  server_time: string;
  tamper_active_minutes: number;
  connection: {
    last_call_at: string | null;
    last_health_at: string | null;
    last_refused: { at: string; status: number; reason: string | null; path: string } | null;
    open_requests: number;
    latest_check: {
      request_id: string;
      created_at: string;
      status: string;
      answer_status: string | null;
      answered_at: string | null;
      result: Record<string, unknown> | null;
      issues?: string[];
    } | null;
    /** Events stored in the last 24 h although they differed from the guide. */
    events_with_issues_24h?: number;
    latest_issue?: { event_id: string; received_at: string; issues: string[] } | null;
  };
  mapping?: Mapping;
  mapping_updated_at?: string | null;
  /** False when the server has no TWIN_ADMIN_KEY, so the mapping can't be saved from here. */
  mapping_editable?: boolean;
  sites: { site_ref: string; events: number; last_at: string }[];
  devices: EdgeDevice[];
  cameras: EdgeCamera[];
}

const POLL_MS = 30_000;

export async function fetchTwinState(apiUrl: string, signal?: AbortSignal): Promise<TwinState> {
  const base = apiUrl.trim().replace(/\/+$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/api/twin/v1/state`, { signal: signal ?? AbortSignal.timeout(10_000) });
  } catch {
    throw new Error(`Can't reach the Digital Twin API at ${base}. Is it running, and does it allow this site (CORS_ORIGINS)?`);
  }
  if (!res.ok) throw new Error(`The Digital Twin API answered ${res.status}.`);
  return (await res.json()) as TwinState;
}

/** Saves the shared mapping (needs the server's TWIN_ADMIN_KEY). */
export async function saveMapping(apiUrl: string, adminKey: string, mapping: Mapping): Promise<void> {
  const base = apiUrl.trim().replace(/\/+$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/api/twin/v1/mapping`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminKey.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify(mapping),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error(`Can't reach the Digital Twin API at ${base}.`);
  }
  if (res.ok) return;
  let message = `The Digital Twin API answered ${res.status}.`;
  try {
    message = ((await res.json()) as { error?: { message?: string } }).error?.message ?? message;
  } catch {
    /* not JSON */
  }
  throw new Error(res.status === 401 ? "Wrong admin key." : message);
}

/** One refresh timer per address, however many components show the data. */
const pollers = new Map<string, { users: number; timer: ReturnType<typeof setInterval>; refetch: () => void }>();

/** The latest edge state, refreshed every 30 s while something shows it; null key when Digital Eye is off. */
export function useTwinState(override?: { enabled: boolean; apiUrl: string }) {
  const savedOn = useSettings((s) => s.config.integrations.digitalEye.enabled);
  const savedUrl = useSettings((s) => s.config.integrations.twinApi.url);
  const { enabled, apiUrl } = override ?? { enabled: savedOn, apiUrl: savedUrl };
  const key = enabled && apiUrl.trim() ? `de:${apiUrl.trim()}` : null;
  const q = useQuery(key, () => fetchTwinState(apiUrl), POLL_MS - 1000);
  const refetch = useRef(q.refetch);
  refetch.current = q.refetch;
  useEffect(() => {
    if (!key) return;
    let p = pollers.get(key);
    if (!p) {
      const entry = { users: 0, refetch: () => refetch.current(), timer: setInterval(() => entry.refetch(), POLL_MS) };
      pollers.set(key, (p = entry));
    }
    p.users++;
    return () => {
      if (--p!.users === 0) {
        clearInterval(p!.timer);
        pollers.delete(key);
      }
    };
  }, [key]);
  return q;
}

export interface BranchEdge {
  devices: EdgeDevice[];
  /** Twin camera asset id → the Digital Eye camera mapped onto it. */
  cameras: Map<string, EdgeCamera>;
}

/** Which branch a box belongs to: its own mapping first, then its site's. */
export function branchOfDevice(deviceRef: string | null, siteRef: string | null, map: Pick<Mapping, "siteMap" | "deviceMap">) {
  return (deviceRef && map.deviceMap[deviceRef]) || (siteRef && map.siteMap[siteRef]) || null;
}

/** The boxes and cameras mapped onto one branch. Empty when Digital Eye is off or nothing is mapped. */
export function useBranchEdge(branchId: string): BranchEdge & { state: TwinState | undefined; error: Error | undefined } {
  const enabled = useSettings((s) => s.config.integrations.digitalEye.enabled);
  const { data, error } = useTwinState();
  return useMemo(() => {
    const devices: EdgeDevice[] = [];
    const cameras = new Map<string, EdgeCamera>();
    const map = data?.mapping ?? EMPTY_MAPPING;
    if (data && enabled) {
      for (const d of data.devices) if (branchOfDevice(d.device_ref, d.site_ref, map) === branchId) devices.push(d);
      for (const c of data.cameras) {
        const asset = map.cameraMap[c.camera_ref];
        if (asset && branchOfDevice(c.device_ref, c.site_ref, map) === branchId) cameras.set(asset, c);
      }
    }
    return { devices, cameras, state: data, error };
  }, [data, enabled, branchId, error]);
}

/**
 * A reading as a finite number, or null. Events that differ from the guide are stored anyway, so a value may
 * arrive as text ("37.5"), as a bare number instead of a metric object, or as something else entirely.
 */
export function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** The value of a metric: {value, unavailable_reason} per the guide, or a bare number. */
export function metricValue(m: unknown): number | null {
  return typeof m === "object" && m !== null ? num((m as { value?: unknown }).value) : num(m);
}

export const TAMPER_LABEL: Record<string, string> = { obstruction: "Obstruction", blinding: "Blinding", scene_change: "Moved" };

/** "14:02" from a guide time (the clock time as Digital Eye wrote it, in PKT). */
export function clockOf(iso: string | null | undefined) {
  return iso?.slice(11, 16) ?? "—";
}

/** "3 min ago" style age of a guide time. */
export function ageOf(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "never";
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

export const minutesSince = (iso: string | null | undefined, now = Date.now()) => (iso ? (now - new Date(iso).getTime()) / 60_000 : Infinity);
