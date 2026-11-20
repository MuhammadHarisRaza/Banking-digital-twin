import { useMemo } from "react";
import { isBundledBank } from "../config/brandMatch";
import ameen1 from "../assets/images/ubl-ameen-01.jpg";
import ameen2 from "../assets/images/ubl-ameen-02.jpg";
import branch1 from "../assets/images/ubl-branch-01.jpg";
import branch2 from "../assets/images/ubl-branch-02.jpg";
import branch3 from "../assets/images/ubl-branch-03.jpg";
import branch4 from "../assets/images/ubl-branch-04.jpg";
import branch5 from "../assets/images/ubl-branch-05.jpg";
import { seeded } from "../lib/seeded";
import { useBranchData } from "../store/branchDataStore";
import { useSettings } from "../store/settingsStore";
import type { AgentStatus, AppId, Branch, BranchType, DeploymentStatus } from "../types";
import { fromRecords, type PublishedBranch } from "./branchSource";
import crescentBranches from "./presets/crescent.json";
import demoBranches from "./presets/demo.json";
import indusBranches from "./presets/indus.json";
import northstarBranches from "./presets/northstar.json";
import ublBranches from "./ubl-branches.json";

/**
 * Branch identity, type, location labels, address, ATM and lockers come from the loaded branch list
 * (by default UBL's published list, built by scripts/build-ubl-data.py). Map positions are approximate.
 * Staff, transactions, customers, applications and agents are illustrative demo data.
 */

/** Photos of UBL branches. Each is representative, not necessarily the branch it appears on. */
const IMAGES: Record<BranchType, string[]> = {
  Retail: [branch1, branch2, branch3, branch4, branch5],
  Islamic: [ameen1, ameen2],
  Corporate: [branch1],
};

const APPS_BY_TYPE: Record<BranchType, AppId[]> = {
  Retail: ["customer360", "knowledgeRag", "loansOrigination", "branchOperations"],
  Corporate: ["customer360", "loansOrigination", "branchOperations", "tradeFinance", "amlMonitor", "cashManagement"],
  Islamic: ["customer360", "knowledgeRag", "branchOperations", "shariahDesk", "complaintDesk"],
};

const AGENTS_BY_TYPE: Record<BranchType, string[]> = {
  Retail: ["tellerAssist", "policyCopilot", "creditPreScreen", "queueOptimizer", "nextBestOffer", "collectionsNudge"],
  Corporate: ["tradeDocsChecker", "amlSentinel", "cashForecaster", "creditPreScreen"],
  Islamic: ["shariahAdvisor", "policyCopilot", "tellerAssist", "complaintRouter"],
};

const STAFF_BASE: Record<BranchType, number> = { Retail: 12, Islamic: 11, Corporate: 26 };

const DEPLOY_DATES = ["14 Sep 2026", "02 Oct 2026", "21 Aug 2026", "09 Jul 2026", "18 Oct 2026"];

/** For the default list, the first listed branch in each of these cities draws as a large marker. */
const PRIMARY_CITIES = new Set([
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Hyderabad",
  "Sukkur", "Gujranwala", "Sialkot", "Bahawalpur", "Abbottabad", "Sargodha", "Gwadar", "Turbat", "Khuzdar",
  "Zhob", "Gilgit", "Skardu", "Muzaffarabad", "Chitral",
]);

function buildBranch(source: PublishedBranch, tier: Branch["tier"], photos: boolean): Branch {
  const type: BranchType = source.category === "Islamic" || source.category === "Corporate" ? source.category : "Retail";
  const rand = seeded(source.code);
  const urban = source.area === "Urban";
  const staff = STAFF_BASE[type] + Math.floor(rand() * (urban ? 16 : 7));

  const applications = APPS_BY_TYPE[type].map((appId, i) => {
    const roll = rand();
    const status: DeploymentStatus = roll > 0.9 ? "Upgrading" : roll > 0.8 ? "Pilot" : "In Use";
    return { appId, status, deployedOn: DEPLOY_DATES[(i + Math.floor(rand() * 5)) % 5] };
  });

  const agents = AGENTS_BY_TYPE[type].slice(0, 1 + Math.floor(rand() * 3)).map((agentId) => {
    const roll = rand();
    const status: AgentStatus = roll > 0.85 ? "Paused" : roll > 0.55 ? "Supervised" : "Active";
    return { agentId, status };
  });

  const codeNumber = Number.parseInt(source.code.replace(/\D/g, ""), 10) || 0;

  return {
    id: `BR-${source.code}`,
    name: /branch/i.test(source.name) ? source.name : `${source.name} Branch`,
    city: source.city,
    district: source.district,
    province: source.province,
    region: source.region,
    cluster: source.cluster,
    area: source.area,
    address: source.address,
    lat: source.lat,
    lng: source.lng,
    tier,
    type,
    status: "Operational",
    atm: source.atm,
    lockers: source.lockers,
    saturdayBanking: source.saturday,
    staff,
    dailyTransactions: Math.round(staff * (110 + rand() * 90)),
    transactionsTrend: Math.round(1 + rand() * 7),
    activeCustomers: Math.round(staff * (420 + rand() * 300)),
    customersTrend: Math.round(1 + rand() * 5),
    applications,
    agents,
    image: photos ? IMAGES[type][codeNumber % IMAGES[type].length] : "",
  };
}

/** The cities that get a large marker: the default list's fixed set, or the busiest cities of an imported list. */
function primaryCities(sources: PublishedBranch[], isDefault: boolean) {
  if (isDefault) return PRIMARY_CITIES;
  const counts = new Map<string, number>();
  for (const s of sources) counts.set(s.city, (counts.get(s.city) ?? 0) + 1);
  return new Set([...counts].sort((a, b) => b[1] - a[1]).slice(0, 23).map(([city]) => city));
}

export interface BranchIndex {
  all: Branch[];
  primary: Branch[];
  secondary: Branch[];
  getBranch: (id: string | null | undefined) => Branch | undefined;
  getCityBranch: (city: string) => Branch | undefined;
  /** True when UBL's bundled published list is in use. */
  isDefault: boolean;
  /** Where the list comes from: UBL's published list, the active preset bank's sample list, or an imported file. */
  source: "published" | "preset" | "imported";
}

function buildIndex(sources: PublishedBranch[], source: BranchIndex["source"], photos: boolean): BranchIndex {
  const isDefault = source === "published";
  const cities = primaryCities(sources, isDefault);
  const seen = new Set<string>();
  const all = sources.map((source) => {
    const primary = cities.has(source.city) && !seen.has(source.city);
    if (primary) seen.add(source.city);
    return buildBranch(source, primary ? "primary" : "secondary", photos);
  });
  const byId = new Map(all.map((branch) => [branch.id, branch]));
  return {
    all,
    primary: all.filter((b) => b.tier === "primary"),
    secondary: all.filter((b) => b.tier === "secondary"),
    getBranch: (id) => (id ? byId.get(id) : undefined),
    getCityBranch: (city) => all.find((b) => b.city === city && b.tier === "primary"),
    isDefault,
    source,
  };
}

/** Sample branch lists for the fictional preset banks (scripts/build-preset-branches.mjs), in the import format. */
const PRESET_LISTS: Record<string, unknown[]> = { demo: demoBranches, crescent: crescentBranches, indus: indusBranches, northstar: northstarBranches };
const presetCache = new Map<string, PublishedBranch[]>();

/** The bundled branch list for a preset: its own sample list, or UBL's published list for UBL (and unknown ids). */
export function presetBranches(presetId: string): { branches: PublishedBranch[]; source: "published" | "preset" } {
  const records = PRESET_LISTS[presetId];
  if (!records) return { branches: ublBranches as PublishedBranch[], source: "published" };
  let list = presetCache.get(presetId);
  if (!list) presetCache.set(presetId, (list = fromRecords(records).branches));
  return { branches: list, source: "preset" };
}

let cache: { key: unknown; photos: boolean; index: BranchIndex } | null = null;

/** Imported list first, then the active preset's own list, then UBL's published list. */
function indexFor(dataset: PublishedBranch[] | null, presetId: string, photos: boolean) {
  const bundled = presetBranches(presetId);
  const key = dataset ?? bundled.branches;
  if (!cache || cache.key !== key || cache.photos !== photos) {
    cache = { key, photos, index: buildIndex(dataset ?? bundled.branches, dataset ? "imported" : bundled.source, photos) };
  }
  return cache.index;
}

/** The current branch list. Rebuilt only when the dataset, preset or photo setting changes. */
export function useBranches(): BranchIndex {
  const dataset = useBranchData((s) => s.dataset?.branches ?? null);
  const presetId = useSettings((s) => s.config.presetId);
  // UBL's branch photographs only while the platform is still UBL.
  const photos = useSettings((s) => s.config.organisation.useBranchPhotos && isBundledBank(s.config.brand));
  return useMemo(() => indexFor(dataset, presetId, photos), [dataset, presetId, photos]);
}

/** Non-reactive read for code outside React. */
export function getBranchIndex() {
  const { config } = useSettings.getState();
  return indexFor(useBranchData.getState().dataset?.branches ?? null, config.presetId, config.organisation.useBranchPhotos && isBundledBank(config.brand));
}
