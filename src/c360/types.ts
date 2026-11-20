/**
 * Customer 360 (RM Buddy) read-only API types: the fields this app uses, from
 * "RM Buddy — Read-Only API Reference" (poc folder). All paths are under /api/v1.
 */

export type ChurnTier = "low" | "medium" | "high" | "critical";
export type KycStatus = "valid" | "expiring" | "expired";

export interface Meta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface DashboardMetrics {
  customer_count: number;
  needs_attention_count: number;
  growth_opportunity_count: number;
  portfolio_churn_label: "low" | "medium" | "high";
  last_enriched_at: string;
}

export interface ChurnSnapshot {
  by_tier: Record<ChurnTier, number>;
  total: number;
}

export interface KycOverview {
  total_customers: number;
  statuses: { status: KycStatus; label: string; count: number }[];
  unknown_count: number;
}

export interface CustomerListItem {
  unified_customer_id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  persona_type: string;
  persona_label: string;
  churn_risk_score: number;
  churn_risk_tier: ChurnTier;
  digital_engagement_score: number;
  top_propensity_product: string;
  relationship_health: string;
  needs_attention: boolean;
  growth_opportunity: boolean;
  last_enriched_at: string;
  deposit_balance: number;
  loan_financing_balance: number;
  total_relationship_value: number;
  products_held: string[];
  nps_estimated: number;
  kyc_status: KycStatus | null;
  kyc_expiry_days_remaining: number | null;
  last_rm_interaction_days: number | null;
  primary_channel: string;
}

export interface Insight {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  suggested_action: string;
}

export interface Customer360 {
  identity: {
    unified_customer_id: string;
    full_name: string;
    cnic: string;
    email: string;
    phone: string;
    city: string;
    branch_id: string;
    rm_id: string;
    persona_type: string;
    persona_label: string;
    created_at: string;
    last_updated_at: string;
  };
  scores: {
    churn: { score: number; tier: ChurnTier; drivers: string[] | Record<string, unknown> | null };
    sentiment: { score: number; trend: string; last_updated: string };
    financial: { avg_monthly_balance: number; balance_trend: string; balance_volatility: number; credit_utilization: number; external_transfer_flag: boolean };
    digital: { engagement_score: number; login_trend: string; days_since_last_login: number; avg_session_duration: number };
    complaints: { open: number; count_30d: number; escalation_flag: boolean; avg_resolution_days: number; open_items: unknown };
    propensity: { mortgage: number; investment: number; credit_card: number; auto_loan: number; fixed_deposit: number; top_product: string };
    relationship: { health: string; last_rm_interaction_days: number; nps_estimated: number; lifecycle_stage: string };
    compliance: { kyc_expiry_days_remaining: number | null; aml_flag: boolean; pep_flag: boolean };
  };
  insights: Insight[];
}

export interface Account {
  account_id: string;
  account_type: string;
  balance: number;
  status: string;
  last_updated: string;
  monthly_transaction_count?: number | null;
  monthly_transaction_value_pkr?: number | null;
}

export interface TimelineEvent {
  event_id: string;
  event_type: string;
  source_system: string;
  summary: string;
  source_timestamp: string;
}

export interface RmBrief {
  headline?: string;
  urgency?: string;
  risk_flag?: string;
  key_signals?: string[];
  talking_points?: string[];
  customer_summary?: string;
  recommended_action?: string;
}

export interface AgentOutputs {
  rm_copilot: { generated_at: string; content: RmBrief } | null;
}

export interface Alert {
  unified_customer_id: string;
  full_name: string;
  event_label: string;
  generated_at: string;
  content: { alert_title?: string; severity?: string; summary?: string; immediate_actions?: string[] | string; owner?: string };
}
