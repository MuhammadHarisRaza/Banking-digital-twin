import type { Department, TrendPoint } from "../types";

/** Headquarters departments and trends are illustrative demo data shared by every bank preset. */

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
