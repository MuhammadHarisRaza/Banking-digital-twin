import type { ActivityEvent, Department, Notification, TrendPoint } from "../types";

/**
 * Branch counts come from UBL's December 2025 investor presentation, compared with 1,474 at December 2024.
 * Staff, applications and agents are illustrative demo data.
 */
export const BANK_TOTALS = {
  branches: 2017,
  branchesTrend: 37,
  staff: 24682,
  applications: 86,
  agents: 14,
};

export const HEADQUARTERS = {
  name: "UBL Head Office",
  location: "I.I. Chundrigar Road, Karachi",
  registeredOffice: "13th Floor, UBL Building, Jinnah Avenue, Blue Area, Islamabad",
  /** Headquarters headcount and departments are illustrative demo data. */
  staff: 3856,
  /** Approximate. */
  lat: 24.8497,
  lng: 67.0053,
};

export const DEPARTMENTS: Department[] = [
  { name: "Technology & Digital", headcount: 742, focus: "Platforms, data and digital channels" },
  { name: "Operations", headcount: 618, focus: "Clearing, settlements and central processing" },
  { name: "Retail Banking", headcount: 524, focus: "Branch network and consumer products" },
  { name: "Risk & Credit", headcount: 396, focus: "Credit approval and portfolio risk" },
  { name: "Corporate Banking", headcount: 312, focus: "Large accounts and trade finance" },
  { name: "Compliance", headcount: 268, focus: "Regulatory reporting and AML" },
  { name: "Finance & Treasury", headcount: 241, focus: "Liquidity, reporting and control" },
  { name: "Islamic Banking", headcount: 214, focus: "Shariah products and advisory" },
  { name: "Human Resources", headcount: 186, focus: "Talent, training and staff services" },
  { name: "Cards & Payments", headcount: 156, focus: "Cards, wallets and merchant payments" },
  { name: "Internal Audit", headcount: 119, focus: "Independent assurance" },
  { name: "Legal & Secretariat", headcount: 80, focus: "Contracts and board governance" },
];

export const OPERATIONAL_TRENDS: TrendPoint[] = [
  { month: "Nov", transactions: 41.2, incidents: 38, digitalShare: 61 },
  { month: "Dec", transactions: 46.8, incidents: 44, digitalShare: 62 },
  { month: "Jan", transactions: 42.1, incidents: 35, digitalShare: 63 },
  { month: "Feb", transactions: 40.6, incidents: 31, digitalShare: 64 },
  { month: "Mar", transactions: 44.9, incidents: 33, digitalShare: 65 },
  { month: "Apr", transactions: 47.3, incidents: 29, digitalShare: 66 },
  { month: "May", transactions: 45.7, incidents: 27, digitalShare: 67 },
  { month: "Jun", transactions: 48.2, incidents: 30, digitalShare: 68 },
  { month: "Jul", transactions: 49.1, incidents: 24, digitalShare: 70 },
  { month: "Aug", transactions: 50.4, incidents: 22, digitalShare: 71 },
  { month: "Sep", transactions: 51.8, incidents: 23, digitalShare: 72 },
  { month: "Oct", transactions: 53.6, incidents: 19, digitalShare: 74 },
];

export const HQ_ACTIVITY: ActivityEvent[] = [
  { id: "hq-1", kind: "transaction", title: "Deposits reached PKR 5.2 Tn", detail: "Up 96% from December 2024", time: "Dec 2025" },
  { id: "hq-2", kind: "system", title: "Network reached 2,017 branches", detail: "Including 752 Islamic branches and 596 Islamic windows", time: "Dec 2025" },
  { id: "hq-3", kind: "transaction", title: "24-hour branch opened at New Sabzi Mandi, Karachi", detail: "Round-the-clock banking, Monday to Saturday", time: "Aug 2025" },
  { id: "hq-4", kind: "compliance", title: "Silkbank merger took effect", detail: "Silkbank's operations were integrated into UBL", time: "Mar 2025" },
  { id: "hq-5", kind: "people", title: "UBL Head Office inaugurated", detail: "I.I. Chundrigar Road, Karachi", time: "Dec 2016" },
];

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "Network reached 2,017 branches", detail: "Including 752 Islamic branches", time: "Dec 2025", href: "/headquarters" },
  { id: "n2", title: "Deposits reached PKR 5.2 Tn", detail: "Up 96% from December 2024", time: "Dec 2025", href: "/headquarters" },
  { id: "n3", title: "24-hour branch in Karachi", detail: "New Sabzi Mandi branch opened", time: "Aug 2025", href: "/headquarters" },
];

/** From UBL's December 2025 investor presentation. */
export const NETWORK_SNAPSHOT = {
  branches: 2017,
  islamicBranches: 752,
  islamicWindows: 596,
  deposits: "PKR 5.2 Tn",
  digitalCustomers: "5M+",
};
