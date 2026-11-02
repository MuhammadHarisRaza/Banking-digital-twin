import type { Application, AppId } from "../types";

export const APPLICATIONS: Record<AppId, Application> = {
  customer360: { id: "customer360", name: "Customer 360", version: "v3.4", category: "Customer" },
  knowledgeRag: { id: "knowledgeRag", name: "Knowledge RAG", version: "v2.1", category: "Knowledge" },
  loansOrigination: { id: "loansOrigination", name: "Loans Origination", version: "v5.0", category: "Lending" },
  branchOperations: { id: "branchOperations", name: "Branch Operations", version: "v2.8", category: "Operations" },
  tradeFinance: { id: "tradeFinance", name: "Trade Finance", version: "v1.6", category: "Corporate" },
  amlMonitor: { id: "amlMonitor", name: "AML Monitor", version: "v4.2", category: "Compliance" },
  cardsManagement: { id: "cardsManagement", name: "Cards Management", version: "v3.1", category: "Payments" },
  cashManagement: { id: "cashManagement", name: "Cash Management", version: "v2.3", category: "Corporate" },
  complaintDesk: { id: "complaintDesk", name: "Complaint Desk", version: "v1.9", category: "Customer" },
  shariahDesk: { id: "shariahDesk", name: "Shariah Desk", version: "v1.2", category: "Islamic Banking" },
  callCenter: { id: "callCenter", name: "Customer Experience", version: "v4.0", category: "Call Center" },
  mobileApp: { id: "mobileApp", name: "Mobile App", version: "v6.2", category: "Digital Banking" },
};
