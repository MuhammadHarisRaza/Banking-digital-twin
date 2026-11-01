export type AppId =
  | "customer360"
  | "knowledgeRag"
  | "loansOrigination"
  | "branchOperations"
  | "tradeFinance"
  | "amlMonitor"
  | "cardsManagement"
  | "cashManagement"
  | "complaintDesk"
  | "shariahDesk";

export type AppLinkKey = AppId | "digitalEye";

export type BranchType = "Retail" | "Corporate" | "Islamic" | "Regional Hub";
export type BranchStatus = "Operational" | "Limited Service" | "Under Maintenance";
export type DeploymentStatus = "In Use" | "Pilot" | "Upgrading";
export type AgentStatus = "Active" | "Supervised" | "Paused";
export type AccessStatus = "Granted" | "Restricted" | "Pending";
export type EmployeeStatus = "On Duty" | "On Leave" | "Training";
export type ActivityKind = "transaction" | "people" | "system" | "agent" | "compliance";

export type Tone = "ok" | "warn" | "muted" | "info";

export interface BranchApplication {
  appId: AppId;
  status: DeploymentStatus;
  deployedOn: string;
}

export interface BranchAgent {
  agentId: string;
  status: AgentStatus;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  /** Primary branches draw larger on the country view; secondary ones sit beside them. */
  tier: "primary" | "secondary";
  type: BranchType;
  established: number;
  status: BranchStatus;
  staff: number;
  dailyTransactions: number;
  transactionsTrend: number;
  activeCustomers: number;
  customersTrend: number;
  sla: number;
  region: string;
  /** PKR millions */
  deposits: number;
  /** PKR millions */
  advances: number;
  accounts: number;
  atms: number;
  digitalAdoption: number;
  saturdayBanking: boolean;
  lockers: boolean;
  applications: BranchApplication[];
  agents: BranchAgent[];
  image: string;
}

export interface Employee {
  id: string;
  name: string;
  designation: string;
  department: string;
  status: EmployeeStatus;
}

export interface Application {
  id: AppId;
  name: string;
  version: string;
  category: string;
}

export interface Agent {
  id: string;
  name: string;
  purpose: string;
  appId: AppId;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  category: string;
  agentId: string;
}

export interface BranchKnowledge extends KnowledgeBase {
  access: AccessStatus;
}

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  time: string;
}

export interface Department {
  name: string;
  head: string;
  headcount: number;
  focus: string;
}

export interface TrendPoint {
  month: string;
  transactions: number;
  sla: number;
  incidents: number;
  /** PKR billions */
  deposits: number;
  digitalShare: number;
}

export interface ProvinceShare {
  name: string;
  branches: number;
  islamic: number;
}

export interface Notification {
  id: string;
  title: string;
  detail: string;
  time: string;
  branchId?: string;
  href?: string;
}
