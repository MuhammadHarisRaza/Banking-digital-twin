import { useMemo } from "react";
import type { BankConfig } from "../config/bankConfig";
import { useSettings } from "../store/settingsStore";
import type { ActivityEvent, ActivityKind, Branch, Notification } from "../types";
import { AGENTS } from "./agents";
import { APPLICATIONS } from "./applications";
import { useBranches } from "./branches";

/** Network figures calculated from the loaded branch list, so they always match the map and the branch pages. */
export function computeNetwork(branches: Branch[]) {
  const staff = branches.reduce((n, b) => n + b.staff, 0);
  return {
    branches: branches.length,
    islamicBranches: branches.filter((b) => b.type === "Islamic").length,
    staff,
    cities: new Set(branches.map((b) => b.city)).size,
    // Head office headcount is not in any branch list; assume about 14% of branch staff.
    hqStaff: Math.round(staff * 0.14),
  };
}

export type NetworkFigures = ReturnType<typeof computeNetwork>;

/**
 * Bank-level figures, headquarters and milestones. Counts come from the branch list (and the app's
 * own application and agent catalogues); deposits and digital customers are optional settings.
 */
export function deriveBankData(org: BankConfig["organisation"], net: NetworkFigures) {
  const kinds: ActivityKind[] = ["transaction", "system", "transaction", "compliance", "people"];
  const activity: ActivityEvent[] = org.milestones.map((m, i) => ({
    id: `hq-${i + 1}`,
    kind: kinds[i % kinds.length],
    title: m.title,
    detail: m.detail,
    time: m.time,
  }));
  const notifications: Notification[] = org.milestones.slice(0, 3).map((m, i) => ({
    id: `n${i + 1}`,
    title: m.title,
    detail: m.detail,
    time: m.time,
    href: "/headquarters",
  }));

  return {
    totals: {
      branches: net.branches,
      branchesTrend: undefined as number | undefined,
      staff: net.staff,
      applications: Object.keys(APPLICATIONS).length,
      agents: Object.keys(AGENTS).length,
    },
    headquarters: {
      name: org.hqName,
      location: org.hqLocation,
      registeredOffice: org.registeredOffice,
      staff: net.hqStaff,
      lat: org.hqLat,
      lng: org.hqLng,
    },
    snapshot: {
      branches: net.branches,
      islamicBranches: net.islamicBranches,
      cities: net.cities,
      deposits: org.deposits.trim(),
      digitalCustomers: org.digitalCustomers.trim(),
    },
    activity,
    notifications,
  };
}

export type BankData = ReturnType<typeof deriveBankData>;

export function useBankData(): BankData {
  const org = useSettings((s) => s.config.organisation);
  const { all } = useBranches();
  const net = useMemo(() => computeNetwork(all), [all]);
  return useMemo(() => deriveBankData(org, net), [org, net]);
}
