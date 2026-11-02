import { Navigate, useParams, useSearchParams } from "react-router";
import AppLandingShell from "../components/common/AppLandingShell";
import { APP_ICONS } from "../components/common/appIcons";
import { APPLICATIONS } from "../data/applications";
import type { AppId } from "../types";

const ENV_VARS: Record<AppId, string> = {
  customer360: "VITE_CUSTOMER_360_URL",
  knowledgeRag: "VITE_KNOWLEDGE_RAG_URL",
  loansOrigination: "VITE_LOANS_ORIGINATION_URL",
  branchOperations: "VITE_BRANCH_OPERATIONS_URL",
  tradeFinance: "VITE_TRADE_FINANCE_URL",
  amlMonitor: "VITE_AML_MONITOR_URL",
  cardsManagement: "VITE_CARDS_MANAGEMENT_URL",
  cashManagement: "VITE_CASH_MANAGEMENT_URL",
  complaintDesk: "VITE_COMPLAINT_DESK_URL",
  shariahDesk: "VITE_SHARIAH_DESK_URL",
  callCenter: "VITE_CALL_CENTER_URL",
  mobileApp: "VITE_MOBILE_APP_URL",
};

const CAPABILITIES: Record<AppId, string[]> = {
  customer360: ["Unified customer profile"],
  knowledgeRag: ["Search across approved policy documents", "Cited answers for branch staff"],
  loansOrigination: ["Application intake", "Credit review workflow", "Disbursement tracking"],
  branchOperations: ["Daily branch checklist", "Cash and vault position", "Staff roster"],
  tradeFinance: ["Letters of credit", "Trade document review"],
  amlMonitor: ["Transaction alerts", "Case review queue"],
  cardsManagement: ["Card issuance", "Dispute tracking", "Limit changes"],
  cashManagement: ["Vault forecasting", "Corporate collections", "Cash-in-transit requests"],
  complaintDesk: ["Complaint intake", "Resolution tracking", "Turnaround reporting"],
  shariahDesk: ["Product compliance checks", "Shariah review queue"],
  callCenter: ["Omni-channel case handling", "Agent performance", "Customer satisfaction reporting"],
  mobileApp: ["Customer adoption", "Transaction monitoring", "App availability"],
};

export default function ApplicationLaunch() {
  const { appId } = useParams();
  const [params] = useSearchParams();
  const app = APPLICATIONS[appId as AppId];

  if (!app) return <Navigate to={`/?${params}`} replace />;

  return (
    <AppLandingShell
      appKey={app.id}
      envVar={ENV_VARS[app.id]}
      title={app.name}
      tagline={`${app.category} application`}
      icon={APP_ICONS[app.id]}
      accent="brand"
      capabilities={CAPABILITIES[app.id]}
    />
  );
}
