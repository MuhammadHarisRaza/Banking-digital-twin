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
  | "shariahDesk"
  | ChannelKey;

export type AppLinkKey = AppId | "digitalEye";

export type ChannelKey = "callCenter" | "mobileApp";

export type BranchType = "Retail" | "Corporate" | "Islamic";
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
  district: string;
  province: string;
  region: string;
  cluster: string;
  /** Urban or Rural, as published. */
  area: string;
  address: string;
  /** Approximate, placed at city level. */
  lat: number;
  lng: number;
  /** Primary branches draw larger on the country view; secondary ones draw on the canvas layer. */
  tier: "primary" | "secondary";
  type: BranchType;
  status: BranchStatus;
  atm: boolean;
  lockers: boolean;
  saturdayBanking: boolean;
  staff: number;
  dailyTransactions: number;
  transactionsTrend: number;
  activeCustomers: number;
  customersTrend: number;
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
  headcount: number;
  focus: string;
}

export interface TrendPoint {
  month: string;
  transactions: number;
  incidents: number;
  digitalShare: number;
}


export interface Notification {
  id: string;
  title: string;
  detail: string;
  time: string;
  branchId?: string;
  href?: string;
}

export interface ChannelMetric {
  value: string;
  label: string;
  trend: string;
  direction: "up" | "down";
}

export interface ChannelRange {
  id: string;
  label: string;
  ticks: number[];
  points: { label: string; value: number }[];
}

export interface ChannelOverview {
  appKey: ChannelKey;
  title: string;
  subtitle: string;
  chartTitle: string;
  chartType: "area" | "bar";
  metrics: ChannelMetric[];
  ranges: ChannelRange[];
  formatTick: (value: number) => string;
  formatValue: (value: number) => string;
}
