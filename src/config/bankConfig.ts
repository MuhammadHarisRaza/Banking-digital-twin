import type { AppLinkKey } from "../types";

/**
 * Everything that makes the platform look like one particular bank. The default is the UBL preset,
 * which reproduces the original dashboard exactly; Settings edits a copy that is kept in localStorage.
 *
 * Image fields hold one of:
 *   "asset:<name>"  a bundled image (see resolveImage in ./images.ts)
 *   "wordmark"      a logo drawn from the bank's short name and brand colour
 *   "data:..."      an uploaded image
 *   ""              no image (a branded placeholder is shown)
 */
export interface ThemeTokens {
  page: string;
  panel: string;
  card: string;
  cardHover: string;
  line: string;
  lineSoft: string;
  ink: string;
  soft: string;
  mute: string;
  brand: string;
  brandBright: string;
  ok: string;
  warn: string;
  steel: string;
  /** Second launch button (Customer 360) and other secondary accents. */
  accent: string;
  /** Fill of the small branch dots on the map. */
  mapDot: string;
  /** Accent used for Islamic branches in the 3D twin. */
  islamic: string;
}

export interface Milestone {
  title: string;
  detail: string;
  time: string;
}

export type ModuleId =
  | "kpiBranches"
  | "kpiStaff"
  | "kpiApplications"
  | "kpiAgents"
  | "hqCard"
  | "callCenter"
  | "mobileApp"
  | "mapLegend"
  | "navDashboard"
  | "navBranches"
  | "navTwin"
  | "navHeadquarters"
  | "navApplications"
  | "navDigitalEye"
  | "navCustomer360"
  | "navCustomers"
  | "c360Card";

export interface ModuleSetting {
  visible: boolean;
  label: string;
}

export type TwinQuality = "auto" | "high" | "low";
export type SimSpeed = 1 | 10 | 60;

export interface BankConfig {
  version: 1;
  presetId: string;
  brand: {
    bankName: string;
    shortName: string;
    tagline: string;
    productName: string;
    logo: string;
    favicon: string;
    /** Title on the dashboard page. */
    dashboardTitle: string;
  };
  theme: ThemeTokens & {
    /** Hue-shift the map's terrain image so it follows the brand colour. */
    tintMap: boolean;
  };
  organisation: {
    hqName: string;
    hqLocation: string;
    registeredOffice: string;
    hqLat: number;
    hqLng: number;
    hqStaff: number;
    hqImage: string;
    hqAerialImage: string;
    branches: number;
    branchesTrend: number;
    staff: number;
    applications: number;
    agents: number;
    islamicBranches: number;
    islamicWindows: number;
    deposits: string;
    digitalCustomers: string;
    /** Brand name used for Islamic banking, e.g. "UBL Ameen". */
    islamicLabel: string;
    country: string;
    currency: string;
    locale: string;
    /** Show the bundled branch photographs. Off for banks other than the one in the photos. */
    useBranchPhotos: boolean;
    milestones: Milestone[];
    /** Source notes printed under panels. */
    networkSource: string;
    branchFootnote: string;
    hqFootnote: string;
  };
  user: {
    name: string;
    initials: string;
    role: string;
  };
  modules: Record<ModuleId, ModuleSetting>;
  twin: {
    quality: TwinQuality;
    simSpeed: SimSpeed;
    showPeople: boolean;
    showSignage: boolean;
    showRoof: boolean;
    /** Clip played in the camera panel for ATMs and CCTV cameras; empty shows the live view rendered from the twin. */
    cameraVideo: string;
    /** Lighting a twin opens with. */
    lighting: "day" | "night";
    /** Mouse-look sensitivity in the walkthrough (0.5–2). */
    walkSensitivity: number;
  };
  appLinks: Partial<Record<AppLinkKey, string>>;
  integrations: {
    /** Customer 360 (RM Buddy) read-only API. */
    c360: {
      enabled: boolean;
      /** API root; the default goes through the app's own /c360-api proxy (dev server and Vercel). */
      baseUrl: string;
      /** C360 branch id → UBL branch id. Branches not listed are matched automatically (see src/c360/branchLink.ts). */
      branchMap: Record<string, string>;
      /** Show only customers imported from this platform (ids starting with the API's C360_SOURCE_SYSTEM), not C360's demo data. */
      onlyImported: boolean;
      /**
       * This bank's code in C360 (its source_system): imported customers become `${code}_${customer_id}`.
       * Empty = derived from the brand's short name (see bankCode). Cleared when switching to another bank preset.
       */
      sourceSystem: string;
    };
    /** Our own backend (banking-twin-api): Digital Eye data and the C360 import. */
    twinApi: {
      /** Its root, e.g. https://banking-twin-api.waiindustries.org. */
      url: string;
    };
    /** Digital Eye edge telemetry, read from the Digital Twin API, which Digital Eye pushes to. */
    digitalEye: {
      enabled: boolean;
      // The site / box / camera → branch mapping is shared by everyone, so it lives in banking-twin-api, not here.
    };
  };
}

/** Default Digital Twin API address: VITE_DE_API_URL at build time, else the deployed API (use http://localhost:8080 for a local one). */
export const DEFAULT_TWIN_API_URL: string = (import.meta.env?.VITE_DE_API_URL as string | undefined) || "https://banking-twin-api.waiindustries.org";

export const MODULE_DEFAULTS: Record<ModuleId, ModuleSetting> = {
  kpiBranches: { visible: true, label: "Branches" },
  kpiStaff: { visible: true, label: "Staff" },
  kpiApplications: { visible: true, label: "Applications" },
  kpiAgents: { visible: true, label: "AI Agents" },
  hqCard: { visible: true, label: "Headquarters" },
  callCenter: { visible: true, label: "Customer Experience (Call Center)" },
  mobileApp: { visible: true, label: "Mobile App" },
  mapLegend: { visible: true, label: "Map legend" },
  navDashboard: { visible: true, label: "Dashboard" },
  navBranches: { visible: true, label: "Branches" },
  navTwin: { visible: true, label: "Branch Twin" },
  navHeadquarters: { visible: true, label: "Headquarters" },
  navApplications: { visible: true, label: "Applications" },
  navDigitalEye: { visible: true, label: "Digital Eye" },
  navCustomer360: { visible: true, label: "Customer 360" },
  navCustomers: { visible: true, label: "Customers" },
  c360Card: { visible: true, label: "Customer book (C360)" },
};

export const MODULE_GROUPS: { title: string; ids: ModuleId[] }[] = [
  { title: "Dashboard", ids: ["kpiBranches", "kpiStaff", "kpiApplications", "kpiAgents", "hqCard", "c360Card", "callCenter", "mobileApp", "mapLegend"] },
  {
    title: "Menu",
    ids: ["navDashboard", "navBranches", "navTwin", "navCustomers", "navHeadquarters", "navApplications", "navDigitalEye", "navCustomer360"],
  },
];

export const UBL_THEME: ThemeTokens = {
  page: "#eef4fa",
  panel: "#ffffff",
  card: "#f4f8fc",
  cardHover: "#e8f2fa",
  line: "#cfdfec",
  lineSoft: "#e1ebf3",
  ink: "#0b2a45",
  soft: "#3f5b73",
  mute: "#587389",
  brand: "#0074bf",
  brandBright: "#005a96",
  ok: "#0f8a56",
  warn: "#b7791f",
  steel: "#2f6fa8",
  accent: "#0f7a55",
  mapDot: "#bfe3ff",
  islamic: "#0f7a55",
};

/** Hue of the default brand colour; the terrain image is drawn in it. */
export const DEFAULT_MAP_HUE = 203;

export const UBL_CONFIG: BankConfig = {
  version: 1,
  presetId: "ubl",
  brand: {
    bankName: "United Bank Limited",
    shortName: "UBL",
    tagline: "where you come first",
    productName: "Alara",
    logo: "asset:ubl-logo",
    favicon: "asset:ubl-icon",
    dashboardTitle: "Bank Operations",
  },
  theme: { ...UBL_THEME, tintMap: true },
  organisation: {
    hqName: "UBL Head Office",
    hqLocation: "I.I. Chundrigar Road, Karachi",
    registeredOffice: "13th Floor, UBL Building, Jinnah Avenue, Blue Area, Islamabad",
    hqLat: 24.8497,
    hqLng: 67.0053,
    hqStaff: 3856,
    hqImage: "asset:ubl-head-office",
    hqAerialImage: "asset:ubl-head-office-aerial",
    branches: 2017,
    branchesTrend: 37,
    staff: 24682,
    applications: 86,
    agents: 14,
    islamicBranches: 752,
    islamicWindows: 596,
    deposits: "PKR 5.2 Tn",
    digitalCustomers: "5M+",
    islamicLabel: "UBL Ameen",
    country: "Pakistan",
    currency: "PKR",
    locale: "en-US",
    useBranchPhotos: true,
    milestones: [
      { title: "Deposits reached PKR 5.2 Tn", detail: "Up 96% from December 2024", time: "Dec 2025" },
      { title: "Network reached 2,017 branches", detail: "Including 752 Islamic branches and 596 Islamic windows", time: "Dec 2025" },
      { title: "24-hour branch opened at New Sabzi Mandi, Karachi", detail: "Round-the-clock banking, Monday to Saturday", time: "Aug 2025" },
      { title: "Silkbank merger took effect", detail: "Silkbank's operations were integrated into UBL", time: "Mar 2025" },
      { title: "UBL Head Office inaugurated", detail: "I.I. Chundrigar Road, Karachi", time: "Dec 2016" },
    ],
    networkSource: "UBL investor presentation, December 2025",
    branchFootnote:
      "Branch profile is from UBL’s published lists. Photo is representative. Staff, activity and performance are illustrative.",
    hqFootnote:
      "Network figures and milestones are from UBL publications and news reports. Headquarters staff, departments, applications, agents and operational trends are illustrative demo data.",
  },
  user: { name: "Hira Rehman", initials: "HR", role: "Regional Operations Head" },
  modules: MODULE_DEFAULTS,
  twin: { quality: "auto", simSpeed: 10, showPeople: true, showSignage: true, showRoof: false, cameraVideo: "", lighting: "day", walkSensitivity: 1 },
  appLinks: {},
  integrations: {
    c360: { enabled: true, baseUrl: "/c360-api/api/v1", branchMap: {}, onlyImported: true, sourceSystem: "" },
    twinApi: { url: DEFAULT_TWIN_API_URL },
    digitalEye: { enabled: false },
  },
};

export const DEFAULT_CONFIG = UBL_CONFIG;

/** C360 bank codes: 2–40 lowercase letters or digits (C360 joins them to customer ids with "_"). */
export const BANK_CODE = /^[a-z0-9]{2,40}$/;

/** The bank's code in C360: the one set in Settings, else its short name in lowercase letters and digits ("Northstar" → "northstar"). */
export function bankCode(sourceSystem: string, shortName: string): string {
  const set = sourceSystem.trim();
  if (set) return set;
  const derived = shortName.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
  return derived.length >= 2 ? derived : "bank";
}
