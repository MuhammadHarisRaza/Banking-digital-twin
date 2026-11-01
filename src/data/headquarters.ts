import type { ActivityEvent, Department, Notification, ProvinceShare, TrendPoint } from "../types";

/** Bank-wide and headquarters figures are illustrative demo data. */
export const BANK_TOTALS = {
  branches: 1247,
  branchesTrend: 3,
  staff: 24682,
  staffTrend: 4,
  applications: 86,
  agents: 14,
  sla: 98.7,
};

export const HEADQUARTERS = {
  name: "Bank HQ",
  location: "Karachi, Pakistan",
  staff: 3856,
  /** Karachi financial district, approximate. */
  lat: 24.8505,
  lng: 67.0096,
};

export const DEPARTMENTS: Department[] = [
  { name: "Technology & Digital", head: "Rabia Mirza", headcount: 742, focus: "Platforms, data and digital channels" },
  { name: "Operations", head: "Kamran Sheikh", headcount: 618, focus: "Clearing, settlements and central processing" },
  { name: "Retail Banking", head: "Ayesha Qureshi", headcount: 524, focus: "Branch network and consumer products" },
  { name: "Risk & Credit", head: "Bilal Hashmi", headcount: 396, focus: "Credit approval and portfolio risk" },
  { name: "Corporate Banking", head: "Zainab Malik", headcount: 312, focus: "Large accounts and trade finance" },
  { name: "Compliance", head: "Usman Raza", headcount: 268, focus: "Regulatory reporting and AML" },
  { name: "Finance & Treasury", head: "Sadia Siddiqui", headcount: 241, focus: "Liquidity, reporting and control" },
  { name: "Islamic Banking", head: "Fatima Rizvi", headcount: 214, focus: "Shariah products and advisory" },
  { name: "Human Resources", head: "Omar Abbasi", headcount: 186, focus: "Talent, training and staff services" },
  { name: "Cards & Payments", head: "Junaid Awan", headcount: 156, focus: "Cards, wallets and merchant payments" },
  { name: "Internal Audit", head: "Nida Javed", headcount: 119, focus: "Independent assurance" },
  { name: "Legal & Secretariat", head: "Asad Chaudhry", headcount: 80, focus: "Contracts and board governance" },
];

export const OPERATIONAL_TRENDS: TrendPoint[] = [
  { month: "Nov", transactions: 41.2, sla: 97.9, incidents: 38, deposits: 2108, digitalShare: 61 },
  { month: "Dec", transactions: 46.8, sla: 97.6, incidents: 44, deposits: 2164, digitalShare: 62 },
  { month: "Jan", transactions: 42.1, sla: 98.0, incidents: 35, deposits: 2131, digitalShare: 63 },
  { month: "Feb", transactions: 40.6, sla: 98.2, incidents: 31, deposits: 2157, digitalShare: 64 },
  { month: "Mar", transactions: 44.9, sla: 98.1, incidents: 33, deposits: 2198, digitalShare: 65 },
  { month: "Apr", transactions: 47.3, sla: 98.3, incidents: 29, deposits: 2226, digitalShare: 66 },
  { month: "May", transactions: 45.7, sla: 98.4, incidents: 27, deposits: 2241, digitalShare: 67 },
  { month: "Jun", transactions: 48.2, sla: 98.2, incidents: 30, deposits: 2287, digitalShare: 68 },
  { month: "Jul", transactions: 49.1, sla: 98.5, incidents: 24, deposits: 2301, digitalShare: 70 },
  { month: "Aug", transactions: 50.4, sla: 98.6, incidents: 22, deposits: 2338, digitalShare: 71 },
  { month: "Sep", transactions: 51.8, sla: 98.6, incidents: 23, deposits: 2376, digitalShare: 72 },
  { month: "Oct", transactions: 53.6, sla: 98.7, incidents: 19, deposits: 2412, digitalShare: 74 },
];

export const HQ_ACTIVITY: ActivityEvent[] = [
  { id: "hq-1", kind: "compliance", title: "Quarterly regulatory return submitted", detail: "Compliance, reviewed by Internal Audit", time: "Today, 15:20" },
  { id: "hq-2", kind: "system", title: "Customer 360 v3.4 released to 212 branches", detail: "Technology & Digital", time: "Today, 11:05" },
  { id: "hq-3", kind: "agent", title: "AML Sentinel moved to supervised rollout", detail: "Risk & Credit approved phase two", time: "Today, 09:40" },
  { id: "hq-4", kind: "people", title: "Regional managers forum concluded", detail: "38 branch leaders attended", time: "Yesterday, 17:30" },
  { id: "hq-5", kind: "transaction", title: "Month-end settlement cycle closed", detail: "Operations completed ahead of cut-off", time: "Yesterday, 13:15" },
  { id: "hq-6", kind: "compliance", title: "Shariah Board reviewed new home finance terms", detail: "Islamic Banking, two clauses updated", time: "Yesterday, 11:00" },
  { id: "hq-7", kind: "system", title: "Disaster recovery drill completed", detail: "Core services switched to the secondary site", time: "31 Oct, 22:30" },
  { id: "hq-8", kind: "people", title: "Graduate trainee batch inducted", detail: "64 trainees joined Human Resources programs", time: "30 Oct, 10:00" },
];

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "Skardu Branch on limited service", detail: "Connectivity is degraded at the branch", time: "12 min ago", branchId: "BR-0512" },
  { id: "n2", title: "Larkana Branch under maintenance", detail: "Planned work runs until 18:00", time: "1 hr ago", branchId: "BR-0733" },
  { id: "n3", title: "Customer 360 v3.4 rollout", detail: "212 branches updated by Technology", time: "4 hrs ago", href: "/headquarters" },
  { id: "n5", title: "Network deposits passed PKR 2.4 Tn", detail: "Up 14% over twelve months", time: "2 hrs ago", href: "/headquarters" },
  { id: "n4", title: "Karachi – Clifton hit its SLA target", detail: "98.7% service SLA for the month", time: "Yesterday", branchId: "BR-0387" },
];

/**
 * Network scale follows Bank Alfalah's public disclosures, scaled to 1,247 branches:
 * about 38% Islamic, 1.14 ATMs per branch, 7,500 customers per branch and PKR 2.3 Tn deposits.
 * The provincial split is an estimate.
 */
export const NETWORK_SNAPSHOT = {
  cities: 262,
  islamicBranches: 469,
  conventionalBranches: 778,
  atms: 1416,
  customers: "9.4M",
  deposits: "PKR 2.4 Tn",
};

export const PROVINCE_NETWORK: ProvinceShare[] = [
  { name: "Punjab", branches: 640, islamic: 221 },
  { name: "Sindh", branches: 322, islamic: 138 },
  { name: "Khyber Pakhtunkhwa", branches: 122, islamic: 57 },
  { name: "Islamabad", branches: 62, islamic: 21 },
  { name: "Balochistan", branches: 58, islamic: 21 },
  { name: "Azad Kashmir", branches: 28, islamic: 8 },
  { name: "Gilgit-Baltistan", branches: 15, islamic: 3 },
];
