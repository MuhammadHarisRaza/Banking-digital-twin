import { create } from "zustand";
import { useQuery } from "../c360/query";
import { useSettings } from "../store/settingsStore";

/**
 * Our own backend, banking-twin-api: Digital Eye telemetry and mapping, and the C360 import proxy.
 * Its address is set once in Settings → Integrations → Digital Twin API.
 */

export const twinBase = (url: string) => url.trim().replace(/\/+$/, "");

/** The saved address. */
export function useTwinApiUrl() {
  return useSettings((s) => s.config.integrations.twinApi.url);
}

/** Calls the API and returns its JSON; throws an Error with the API's own message when it refuses. */
export async function twinFetch<T>(url: string, path: string, init: RequestInit & { adminKey?: string; timeoutMs?: number } = {}): Promise<T> {
  const base = twinBase(url);
  const { adminKey, timeoutMs = 15_000, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...rest,
      headers: { Accept: "application/json", ...(adminKey ? { Authorization: `Bearer ${adminKey.trim()}` } : {}), ...(rest.headers as Record<string, string>) },
      signal: rest.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error(`Can't reach the Digital Twin API at ${base}. Is it running, and does it allow this site (CORS_ORIGINS)?`);
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    const b = body as { error?: { message?: string }; detail?: unknown } | null;
    const detail = typeof b?.detail === "string" ? b.detail : b?.detail ? JSON.stringify(b.detail) : undefined;
    throw new Error(res.status === 401 && !detail ? "Wrong admin key." : (b?.error?.message ?? detail ?? `The Digital Twin API answered ${res.status}.`));
  }
  return body as T;
}

// ── Admin key: kept in this browser only, never in exported settings ────────────────────────────

const ADMIN_KEY_STORE = "alara-de-admin-key";
function readStored() {
  try {
    return localStorage.getItem(ADMIN_KEY_STORE) ?? "";
  } catch {
    return "";
  }
}

/** The TWIN_ADMIN_KEY for saving the Digital Eye mapping and importing into C360. */
export const useAdminKey = create<{ key: string; set: (key: string) => void }>()((set) => ({
  key: readStored(),
  set: (key) => {
    try {
      if (key) localStorage.setItem(ADMIN_KEY_STORE, key);
      else localStorage.removeItem(ADMIN_KEY_STORE);
    } catch {
      /* storage unavailable */
    }
    set({ key });
  },
}));

// ── C360 import configuration (which bank code imported customers carry) ────────────────────────

export interface C360ImportConfig {
  import_enabled: boolean;
  /** Imported customers' ids start with `${source_system}_`. */
  source_system: string | null;
}

export function useC360ImportConfig(urlOverride?: string) {
  const saved = useTwinApiUrl();
  const url = (urlOverride ?? saved).trim();
  return useQuery<C360ImportConfig>(url ? `twin-c360-config|${url}` : null, () => twinFetch<C360ImportConfig>(url, "/api/twin/v1/c360/config"), 30_000);
}
