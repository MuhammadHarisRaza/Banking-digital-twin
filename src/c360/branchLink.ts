import { useMemo } from "react";
import { useBranches, type BranchIndex } from "../data/branches";
import { useSettings } from "../store/settingsStore";
import type { Branch } from "../types";
import { useCustomerIndex, type IndexedCustomer } from "./api";

/**
 * Links C360 customers to the platform's branches. C360 branch ids (BR001…) are not the branch
 * codes used here (BR-0007…), so each C360 branch is mapped to one of our branches:
 *   1. an explicit choice in Settings → Integrations, else
 *   2. the main branch in the same city as most of that C360 branch's customers, else
 *   3. the n-th main (primary) branch for C360 branch number n.
 * When C360 holds real data with matching codes, a code that exists here is used as is.
 */

export interface BranchLink {
  /** C360 branch id → our branch id. */
  map: Map<string, string>;
  /** Our branch id → customers. */
  byBranch: Map<string, IndexedCustomer[]>;
  /** C360 customer id → our branch id. */
  byCustomer: Map<string, string>;
  /** C360 branch id → customer count and the city most of them are in. */
  sources: { c360: string; count: number; city: string; mapped: string | undefined; explicit: boolean }[];
}

/** Major cities, largest first: C360 branch n lands on the main branch of the n-th one that exists here. */
const MAJOR_CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Hyderabad", "Sialkot", "Gujranwala", "Bahawalpur", "Sargodha", "Sukkur", "Abbottabad"];

export function autoMap(c360Id: string, city: string, index: BranchIndex): string | undefined {
  if (index.getBranch(c360Id)) return c360Id;
  const byCity = index.getCityBranch(city);
  if (byCity) return byCity.id;
  const n = Number.parseInt(c360Id.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  const majors = MAJOR_CITIES.map((c) => index.getCityBranch(c)).filter((b): b is NonNullable<typeof b> => !!b);
  const pool = majors.length ? majors : index.primary;
  return pool[(n - 1) % Math.max(1, pool.length)]?.id;
}

export function buildLink(customers: IndexedCustomer[], explicitMap: Record<string, string>, index: BranchIndex): BranchLink {
  const groups = new Map<string, IndexedCustomer[]>();
  for (const c of customers) if (c.branch_id) groups.set(c.branch_id, [...(groups.get(c.branch_id) ?? []), c]);
  const map = new Map<string, string>();
  const sources: BranchLink["sources"] = [];
  for (const [id, list] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
    const counts = new Map<string, number>();
    for (const c of list) counts.set(c.city, (counts.get(c.city) ?? 0) + 1);
    const city = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    const explicit = explicitMap[id] && index.getBranch(explicitMap[id]) ? explicitMap[id] : undefined;
    const mapped = explicit ?? autoMap(id, city, index);
    if (mapped) map.set(id, mapped);
    sources.push({ c360: id, count: list.length, city, mapped, explicit: !!explicit });
  }
  const byBranch = new Map<string, IndexedCustomer[]>();
  const byCustomer = new Map<string, string>();
  for (const c of customers) {
    const b = map.get(c.branch_id);
    if (!b) continue;
    byBranch.set(b, [...(byBranch.get(b) ?? []), c]);
    byCustomer.set(c.unified_customer_id, b);
  }
  return { map, byBranch, byCustomer, sources };
}

export function useBranchLink() {
  const index = useBranches();
  const explicit = useSettings((s) => s.config.integrations.c360.branchMap);
  const q = useCustomerIndex();
  const link = useMemo(() => (q.data ? buildLink(q.data.customers, explicit, index) : null), [q.data, explicit, index]);
  return { link, loading: q.loading, error: q.error, truncated: q.data?.truncated ?? false };
}

/** C360 customers linked to one of our branches. */
export function useBranchCustomers(branch: Branch | undefined | null) {
  const { link, loading, error } = useBranchLink();
  return { customers: branch && link ? (link.byBranch.get(branch.id) ?? []) : [], loading, error };
}
