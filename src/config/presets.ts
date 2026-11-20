import { MODULE_DEFAULTS, UBL_CONFIG, type BankConfig } from "./bankConfig";
import { derivePalette } from "./color";

export interface Preset {
  id: string;
  name: string;
  description: string;
  config: BankConfig;
}

interface FictionalBank {
  id: string;
  bankName: string;
  shortName: string;
  tagline: string;
  brand: string;
  accent?: string;
  hqName: string;
  hqLocation: string;
  hqLat: number;
  hqLng: number;
  islamicLabel: string;
  branches: number;
  staff: number;
  deposits: string;
  description: string;
}

/** Fictional banks for demos. Logos are generated wordmarks, so no real trademarks are used. */
function fictional(bank: FictionalBank): Preset {
  const theme = derivePalette(bank.brand, bank.accent);
  return {
    id: bank.id,
    name: bank.bankName,
    description: bank.description,
    config: {
      ...UBL_CONFIG,
      presetId: bank.id,
      brand: {
        bankName: bank.bankName,
        shortName: bank.shortName,
        tagline: bank.tagline,
        productName: "Alara",
        logo: "wordmark",
        favicon: "wordmark",
        dashboardTitle: "Bank Operations",
      },
      theme: { ...theme, tintMap: true },
      organisation: {
        ...UBL_CONFIG.organisation,
        hqName: bank.hqName,
        hqLocation: bank.hqLocation,
        registeredOffice: bank.hqLocation,
        hqLat: bank.hqLat,
        hqLng: bank.hqLng,
        hqStaff: Math.round(bank.staff * 0.15),
        hqImage: "",
        hqAerialImage: "",
        branches: bank.branches,
        branchesTrend: 12,
        staff: bank.staff,
        applications: 64,
        agents: 11,
        islamicBranches: Math.round(bank.branches * 0.3),
        islamicWindows: Math.round(bank.branches * 0.2),
        deposits: bank.deposits,
        digitalCustomers: "2M+",
        islamicLabel: bank.islamicLabel,
        useBranchPhotos: false,
        milestones: [
          { title: `${bank.shortName} network reached ${bank.branches.toLocaleString("en-US")} branches`, detail: "Expansion across all provinces", time: "Dec 2025" },
          { title: `Deposits reached ${bank.deposits}`, detail: "Year-on-year growth in current accounts", time: "Dec 2025" },
          { title: "Digital onboarding launched", detail: "Accounts opened in under ten minutes", time: "Sep 2025" },
          { title: `${bank.hqName} opened`, detail: bank.hqLocation, time: "Mar 2024" },
        ],
        networkSource: "Illustrative figures for demonstration",
        branchFootnote: "Branch locations come from the loaded branch list. Staff, activity and performance are illustrative.",
        hqFootnote: "All figures on this page are illustrative demo data.",
      },
      modules: MODULE_DEFAULTS,
    },
  };
}

export const PRESETS: Preset[] = [
  {
    id: "ubl",
    name: "United Bank Limited (UBL)",
    description: "The original demo: UBL branding, photographs and published figures.",
    config: UBL_CONFIG,
  },
  fictional({
    id: "demo",
    bankName: "Demo Bank",
    shortName: "Demo Bank",
    tagline: "banking, connected",
    brand: "#1d4ed8",
    hqName: "Demo Bank Head Office",
    hqLocation: "Shahrah-e-Faisal, Karachi",
    hqLat: 24.8615,
    hqLng: 67.0729,
    islamicLabel: "Demo Bank Islamic",
    branches: 850,
    staff: 11200,
    deposits: "PKR 1.9 Tn",
    description: "A neutral, unbranded bank for general demos.",
  }),
  fictional({
    id: "crescent",
    bankName: "Crescent Islamic Bank",
    shortName: "Crescent",
    tagline: "Shariah-compliant banking",
    brand: "#0f766e",
    accent: "#b45309",
    hqName: "Crescent Tower",
    hqLocation: "Gulberg III, Lahore",
    hqLat: 31.5204,
    hqLng: 74.3587,
    islamicLabel: "Crescent Islamic",
    branches: 640,
    staff: 8400,
    deposits: "PKR 1.2 Tn",
    description: "A teal Islamic bank headquartered in Lahore.",
  }),
  fictional({
    id: "indus",
    bankName: "Indus Commercial Bank",
    shortName: "Indus Bank",
    tagline: "growing with you",
    brand: "#9f1239",
    hqName: "Indus House",
    hqLocation: "Blue Area, Islamabad",
    hqLat: 33.7104,
    hqLng: 73.0613,
    islamicLabel: "Indus Islamic",
    branches: 1240,
    staff: 15800,
    deposits: "PKR 3.1 Tn",
    description: "A maroon commercial bank headquartered in Islamabad.",
  }),
  fictional({
    id: "northstar",
    bankName: "Northstar Bank",
    shortName: "Northstar",
    tagline: "your guide to better banking",
    brand: "#1e3a5f",
    accent: "#a16207",
    hqName: "Northstar Plaza",
    hqLocation: "Clifton, Karachi",
    hqLat: 24.8138,
    hqLng: 67.0300,
    islamicLabel: "Northstar Islamic",
    branches: 420,
    staff: 5600,
    deposits: "PKR 780 Bn",
    description: "A navy and gold private bank.",
  }),
];

export const getPreset = (id: string) => PRESETS.find((p) => p.id === id);
