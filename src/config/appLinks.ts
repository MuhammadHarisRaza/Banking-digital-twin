import type { AppLinkKey } from "../types";

export interface AppLink {
  name: string;
  /** Deployed URL. An empty value falls back to the local placeholder route. */
  url: string;
  fallbackRoute: string;
}

const env = import.meta.env;

export const APP_LINKS: Record<AppLinkKey, AppLink> = {
  digitalEye: {
    name: "Digital Eye",
    url: env.VITE_DIGITAL_EYE_URL || "https://issm-frontend-digital-eye-self.vercel.app/",
    fallbackRoute: "/digital-eye",
  },
  customer360: {
    name: "Customer 360",
    url: env.VITE_CUSTOMER_360_URL || "https://c360-frontend-rm-buddy.vercel.app/overview",
    fallbackRoute: "/customer-360",
  },
  knowledgeRag: {
    name: "Knowledge RAG",
    url: env.VITE_KNOWLEDGE_RAG_URL ?? "",
    fallbackRoute: "/apps/knowledgeRag",
  },
  loansOrigination: {
    name: "Loans Origination",
    url: env.VITE_LOANS_ORIGINATION_URL ?? "",
    fallbackRoute: "/apps/loansOrigination",
  },
  branchOperations: {
    name: "Branch Operations",
    url: env.VITE_BRANCH_OPERATIONS_URL ?? "",
    fallbackRoute: "/apps/branchOperations",
  },
  tradeFinance: {
    name: "Trade Finance",
    url: env.VITE_TRADE_FINANCE_URL ?? "",
    fallbackRoute: "/apps/tradeFinance",
  },
  amlMonitor: {
    name: "AML Monitor",
    url: env.VITE_AML_MONITOR_URL ?? "",
    fallbackRoute: "/apps/amlMonitor",
  },
  cardsManagement: {
    name: "Cards Management",
    url: env.VITE_CARDS_MANAGEMENT_URL ?? "",
    fallbackRoute: "/apps/cardsManagement",
  },
  cashManagement: {
    name: "Cash Management",
    url: env.VITE_CASH_MANAGEMENT_URL ?? "",
    fallbackRoute: "/apps/cashManagement",
  },
  complaintDesk: {
    name: "Complaint Desk",
    url: env.VITE_COMPLAINT_DESK_URL ?? "",
    fallbackRoute: "/apps/complaintDesk",
  },
  shariahDesk: {
    name: "Shariah Desk",
    url: env.VITE_SHARIAH_DESK_URL ?? "",
    fallbackRoute: "/apps/shariahDesk",
  },
  callCenter: {
    name: "Customer Experience",
    url: env.VITE_CALL_CENTER_URL ?? "",
    fallbackRoute: "/apps/callCenter",
  },
  mobileApp: {
    name: "Mobile App",
    url: env.VITE_MOBILE_APP_URL ?? "",
    fallbackRoute: "/apps/mobileApp",
  },
};
