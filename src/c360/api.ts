import { create } from "zustand";
import { useSettings } from "../store/settingsStore";
import { bankCode } from "../config/bankConfig";
import { c360Fetch, c360FetchAll } from "./client";
import { useQuery } from "./query";
import type { AgentOutputs, Account, Alert, ChurnSnapshot, Customer360, CustomerListItem, DashboardMetrics, KycOverview, Meta, TimelineEvent } from "./types";

/** Endpoint hooks. Each is cached per arguments and disabled when C360 is switched off in Settings. */

function useEnabled() {
  return useSettings((s) => s.config.integrations.c360.enabled);
}
function useBase() {
  return useSettings((s) => s.config.integrations.c360.baseUrl);
}

const k = (base: string, ...parts: (string | number | undefined)[]) => `c360|${base}|${parts.join("|")}`;

export interface ImportFilter {
  /** `${code}_` while only this bank's imported customers are shown; null when every C360 customer is shown. */
  prefix: string | null;
  /** This bank's code in C360 (always known, from Settings or the bank's short name). */
  sourceSystem: string;
  ready: boolean;
  unavailable: boolean;
}

/** This bank's code in C360 (Settings → Integrations → Customer 360, else from the bank's short name). */
export function useBankCode() {
  const set = useSettings((s) => s.config.integrations.c360.sourceSystem);
  const shortName = useSettings((s) => s.config.brand.shortName);
  return bankCode(set, shortName);
}

/**
 * Which C360 customers to show. Customers imported for this bank have ids `${code}_${customer_id}`; C360's search (q)
 * matches inside that id, so q=<prefix> lists only them. Each bank (preset) has its own code.
 */
export function useImportFilter(): ImportFilter {
  const only = useSettings((s) => s.config.integrations.c360.onlyImported);
  const code = useBankCode();
  return { prefix: only ? `${code}_` : null, sourceSystem: code, ready: true, unavailable: false };
}

const imported = (prefix: string | null) => (c: { unified_customer_id: string }) => !prefix || c.unified_customer_id.startsWith(prefix);

export function useMetrics() {
  const on = useEnabled();
  const base = useBase();
  return useQuery(on ? k(base, "metrics") : null, async () => (await c360Fetch<DashboardMetrics>("/dashboard/metrics")).data);
}

export function useChurnSnapshot() {
  const on = useEnabled();
  const base = useBase();
  return useQuery(on ? k(base, "churn") : null, async () => (await c360Fetch<ChurnSnapshot>("/dashboard/churn-snapshot")).data);
}

export function useKycOverview() {
  const on = useEnabled();
  const base = useBase();
  return useQuery(on ? k(base, "kyc") : null, async () => (await c360Fetch<KycOverview>("/dashboard/kyc-validity-overview")).data);
}

export function useFilterOptions() {
  const on = useEnabled();
  const base = useBase();
  return useQuery(on ? k(base, "filters") : null, async () => (await c360Fetch<{ cities: string[] }>("/customers/filter-options")).data, 600_000);
}

export interface CustomerFilters {
  q?: string;
  churn_tier?: string;
  kyc_status?: string;
  city?: string;
  needs_attention?: boolean;
  growth_opportunity?: boolean;
  sort?: string;
  page: number;
  page_size: number;
}

export function useCustomerList(f: CustomerFilters) {
  const on = useEnabled();
  const base = useBase();
  const { prefix, ready } = useImportFilter();
  const key = on && ready ? k(base, "customers", prefix ?? "*", JSON.stringify(f)) : null;
  return useQuery<{ data: CustomerListItem[]; meta?: Meta; approximate?: boolean }>(key, async () => {
    const userQ = f.q?.trim();
    const res = await c360Fetch<CustomerListItem[]>("/customers", {
      ...f,
      // Only imported customers: search for the id prefix, or for what the viewer typed and keep the imported ones.
      q: userQ || prefix || undefined,
      needs_attention: f.needs_attention ? true : undefined,
      growth_opportunity: f.growth_opportunity ? true : undefined,
    });
    if (!prefix) return res;
    const data = res.data.filter(imported(prefix));
    return { data, meta: res.meta, approximate: !!userQ && data.length !== res.data.length };
  });
}

/** Customer-book figures for imported customers only: each is the total of a filtered list (one row per call). */
export function useImportedBook() {
  const on = useEnabled();
  const base = useBase();
  const { prefix } = useImportFilter();
  return useQuery(on && prefix ? k(base, "imported-book", prefix) : null, async () => {
    const total = async (extra: Record<string, string | boolean>) =>
      (await c360Fetch<CustomerListItem[]>("/customers", { q: prefix!, page: 1, page_size: 1, ...extra })).meta?.total ?? 0;
    const [customers, attention, growth, expiring, expired, low, medium, high, critical] = await Promise.all([
      total({}),
      total({ needs_attention: true }),
      total({ growth_opportunity: true }),
      total({ kyc_status: "expiring" }),
      total({ kyc_status: "expired" }),
      total({ churn_tier: "low" }),
      total({ churn_tier: "medium" }),
      total({ churn_tier: "high" }),
      total({ churn_tier: "critical" }),
    ]);
    return { customers, attention, growth, expiring, expired, byTier: { low, medium, high, critical } };
  });
}

export function useCustomer(id: string | null) {
  const on = useEnabled();
  const base = useBase();
  return useQuery(on && id ? k(base, "customer", id) : null, async () => (await c360Fetch<Customer360>(`/customers/${encodeURIComponent(id!)}`)).data);
}

export function useAccounts(id: string | null) {
  const on = useEnabled();
  const base = useBase();
  return useQuery(on && id ? k(base, "accounts", id) : null, async () => (await c360Fetch<{ accounts: Account[] }>(`/customers/${encodeURIComponent(id!)}/accounts`)).data.accounts);
}

export function useTimeline(id: string | null) {
  const on = useEnabled();
  const base = useBase();
  return useQuery(on && id ? k(base, "timeline", id) : null, async () => (await c360Fetch<{ events: TimelineEvent[] }>(`/customers/${encodeURIComponent(id!)}/timeline`, { limit: 10 })).data.events);
}

export function useAgentOutputs(id: string | null) {
  const on = useEnabled();
  const base = useBase();
  return useQuery(on && id ? k(base, "agents", id) : null, async () => (await c360Fetch<AgentOutputs>(`/customers/${encodeURIComponent(id!)}/agent-outputs`)).data);
}

export function useCustomerAlerts(id: string | null) {
  const on = useEnabled();
  const base = useBase();
  return useQuery(on && id ? k(base, "alerts", id) : null, async () => (await c360Fetch<{ alerts: Alert[] }>("/alerts", { unified_customer_id: id!, limit: 10 })).data.alerts);
}

// ── Customer index: every customer with the branch and RM from their 360 record ────────────────

export interface IndexedCustomer extends CustomerListItem {
  branch_id: string;
  rm_id: string;
}

/** Above this many customers the per-customer detail calls are skipped (the list has no branch_id). */
export const INDEX_LIMIT = 300;

/**
 * The customer list carries no branch, so each customer's 360 record is read (six at a time) for
 * branch_id and rm_id. Cached for 30 minutes. Ask the C360 team to add branch_id to GET /customers
 * (or a branch_id filter) to make this a single call.
 */
export function useCustomerIndex() {
  const on = useEnabled();
  const base = useBase();
  const { prefix, ready } = useImportFilter();
  return useQuery<{ customers: IndexedCustomer[]; truncated: boolean }>(
    on && ready ? k(base, "index", prefix ?? "*") : null,
    async () => {
      const list = (await c360FetchAll<CustomerListItem>("/customers", prefix ? { q: prefix } : undefined)).filter(imported(prefix));
      const truncated = list.length > INDEX_LIMIT;
      const subset = list.slice(0, INDEX_LIMIT);
      const out: IndexedCustomer[] = new Array(subset.length);
      let next = 0;
      const worker = async () => {
        while (next < subset.length) {
          const i = next++;
          const c = subset[i];
          try {
            const { data } = await c360Fetch<Customer360>(`/customers/${encodeURIComponent(c.unified_customer_id)}`);
            out[i] = { ...c, branch_id: data.identity.branch_id, rm_id: data.identity.rm_id };
          } catch {
            out[i] = { ...c, branch_id: "", rm_id: "" };
          }
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      return { customers: out, truncated };
    },
    30 * 60_000,
  );
}

// ── Customer 360 drawer ────────────────────────────────────────────────────────────────────────

interface DrawerState {
  id: string | null;
  open: (id: string) => void;
  close: () => void;
}

export const useCustomerDrawer = create<DrawerState>()((set) => ({
  id: null,
  open: (id) => set({ id }),
  close: () => set({ id: null }),
}));
