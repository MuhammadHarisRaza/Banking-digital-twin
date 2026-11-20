import { useSettings } from "../store/settingsStore";
import type { Meta } from "./types";

/**
 * Minimal client for the Customer 360 read-only API. Successful responses are {data, meta?};
 * errors are {error: {code, message}}. The base URL comes from Settings → Integrations; the default
 * (/c360-api/api/v1) is proxied to the demo API by the Vite dev server and by vercel.json, which
 * avoids CORS (the demo API only allows localhost:5183).
 */

export class C360Error extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "error",
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

function url(path: string, params?: Params, baseOverride?: string) {
  const base = (baseOverride ?? useSettings.getState().config.integrations.c360.baseUrl).replace(/\/+$/, "");
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null && v !== "") query.set(k, String(v));
  const qs = query.toString();
  return `${base}${path}${qs ? `?${qs}` : ""}`;
}

/** `baseOverride` tests an address before it is saved (Settings → Test connection). */
export async function c360Fetch<T>(path: string, params?: Params, signal?: AbortSignal, baseOverride?: string): Promise<{ data: T; meta?: Meta }> {
  const timeout = AbortSignal.timeout(15000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let res: Response;
  try {
    res = await fetch(url(path, params, baseOverride), { signal: combined, headers: { Accept: "application/json" } });
  } catch (e) {
    if ((e as Error).name === "AbortError" || (e as Error).name === "TimeoutError") throw new C360Error("Customer 360 did not respond in time.", 0, "timeout");
    throw new C360Error("Customer 360 could not be reached.", 0, "network");
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new C360Error(`Customer 360 returned an unexpected response (${res.status}).`, res.status, "bad_response");
  }
  const b = body as { data?: T; meta?: Meta; error?: { code?: string; message?: string } };
  if (!res.ok || b.error) throw new C360Error(b.error?.message ?? `Customer 360 error ${res.status}`, res.status, b.error?.code);
  return { data: b.data as T, meta: b.meta };
}

/** Every page of a paginated list (page_size 100). */
export async function c360FetchAll<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page < 50; page++) {
    const { data, meta } = await c360Fetch<T[]>(path, { ...params, page, page_size: 100 }, signal);
    out.push(...data);
    if (!meta || page >= meta.total_pages) break;
  }
  return out;
}
