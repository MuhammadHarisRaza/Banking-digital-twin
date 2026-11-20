import { twinFetch } from "../twinApi/client";

/**
 * Uploading a bank data bundle to C360 (RM Buddy) through the Digital Twin API, which adds C360's service token.
 * Format: poc/IMPORT_GUIDE.md and c360-server/templates/. C360 endpoint: POST /api/v1/imports/bank-bundle.
 */

/** C360's multipart field per file, in loading order. */
export const BUNDLE_FILES = [
  {
    field: "relationship_managers",
    label: "Relationship managers",
    header: "rm_id,full_name,email,branch_id,is_active",
    sample: (branch: string) => `RM101,Ayesha Raza,ayesha.raza@example.com,${branch},true`,
  },
  {
    field: "customers",
    label: "Customers",
    header:
      "customer_id,full_name,cnic,email,phone,city,branch_id,rm_id,date_of_birth,country_of_residence,customer_classification,persona_type,marital_status,business_or_job,monthly_income_amount,net_worth",
    sample: (branch: string, city: string) =>
      `100234,Bilal Ahmed,42101-1234567-1,bilal.ahmed@example.com,0312-1234567,${city},${branch},RM101,1985-03-14,Pakistan,ETB,,married,Salaried - Bank Operations Manager,185000,4200000`,
  },
  {
    field: "accounts",
    label: "Accounts",
    header: "account_id,customer_id,product_code,currency_code,baseline_value,planned_value,current_value,inflow_ltd,outflow_ltd,is_adopted,opened_date,status",
    sample: () => "ACC-100234-01,100234,current_account_usd,USD,8500,1000000,962000,1250000,1138000,true,2021-07-02,active",
  },
  {
    field: "transactions",
    label: "Transactions",
    header: "transaction_id,customer_id,account_id,amount,channel,transaction_type,merchant,description,occurred_at",
    sample: () => "T-000001,100234,ACC-100234-01,-45323,atm,debit,Utility Bill,Routine spend,2026-06-02T13:00:00+05:00",
  },
  {
    field: "interactions",
    label: "Interactions",
    header: "interaction_id,customer_id,rm_id,channel,status,planned_at,occurred_at,notes,outcome,sentiment_raw",
    sample: () =>
      'INT-100234-01,100234,RM101,telephone_whatsapp,completed,2026-05-10T09:00:00+05:00,2026-05-10T09:12:00+05:00,"Discussed term deposit renewal; wants a rate comparison.",follow_up_required,0.4',
  },
  {
    field: "propensity_scores",
    label: "Propensity scores (optional)",
    header: "customer_id,product_code,score",
    sample: () => "100234,mortgage,0.72",
  },
] as const;

export type BundleField = (typeof BUNDLE_FILES)[number]["field"] | "archive";

/** Which C360 field a chosen file goes to, from its name (customers.csv, Customers (1).csv, accounts_2026.csv…). */
export function fieldFor(fileName: string): BundleField | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".zip") || lower.endsWith(".xlsx")) return "archive";
  if (!lower.endsWith(".csv")) return null;
  const base = lower.replace(/\.csv$/, "").replace(/[\s()\d-]+$/g, "").replace(/[\s-]+/g, "_");
  // Longest names first, so "relationship_managers" wins over "managers"-like partial matches.
  const match = [...BUNDLE_FILES].sort((a, b) => b.field.length - a.field.length).find((f) => base === f.field || base.startsWith(`${f.field}_`) || base.startsWith(f.field));
  return match?.field ?? null;
}

export interface BundleFileResult {
  file_name: string;
  total_rows: number;
  inserted: number;
  updated: number;
  rejected: number;
}

export interface RowOutcome {
  file_name: string;
  row_number: number;
  key: string | null;
  outcome: string;
  messages: unknown[];
}

export interface BundleResult {
  batch_id: string | null;
  status: string;
  dry_run: boolean;
  source_system: string;
  files: BundleFileResult[];
  customers_created: number;
  customers_updated: number;
  customers_newly_linked?: number;
  row_outcomes: RowOutcome[];
  messages: unknown[];
  job_id: string | null;
}

export interface JobStatus {
  job_id: string;
  batch_id: string;
  status: string;
  customers_total: number;
  rms_total: number;
  customers_ready: number;
  stage_results: { stage: string; processed: number; errors: number; error_messages: unknown[] }[];
  error_message: string | null;
  completed_at: string | null;
}

export interface BatchSummary {
  batch_id: string;
  file_name: string;
  sheet_name: string | null;
  uploaded_by: string | null;
  status: string;
  total_rows: number;
  success_rows: number;
  error_rows: number;
  created_at: string;
}

export const JOB_STAGES = [
  { status: "pending", label: "Queued" },
  { status: "enrichment", label: "Calculating scores" },
  { status: "intelligence", label: "Running business rules" },
  { status: "agents", label: "Writing AI briefs" },
  { status: "kpi", label: "RM performance" },
  { status: "completed", label: "Done" },
] as const;

/** A message from C360 as text (they are strings, or small objects in some versions). */
export const messageText = (m: unknown) => (typeof m === "string" ? m : m && typeof m === "object" && "message" in m ? String((m as { message: unknown }).message) : JSON.stringify(m));

export function uploadBundle(apiUrl: string, adminKey: string, bankCode: string, files: { file: File; field: BundleField }[], dryRun: boolean) {
  const form = new FormData();
  for (const { file, field } of files) form.append(field, file, file.name);
  const qs = new URLSearchParams({ dry_run: String(dryRun), source_system: bankCode });
  return twinFetch<BundleResult>(apiUrl, `/api/twin/v1/c360/imports?${qs}`, { method: "POST", body: form, adminKey, timeoutMs: 150_000 });
}

export const jobStatus = (apiUrl: string, adminKey: string, jobId: string) =>
  twinFetch<JobStatus>(apiUrl, `/api/twin/v1/c360/imports/jobs/${encodeURIComponent(jobId)}`, { adminKey });

export async function importHistory(apiUrl: string, adminKey: string): Promise<BatchSummary[]> {
  const body = await twinFetch<BatchSummary[] | { items?: BatchSummary[]; data?: BatchSummary[] }>(apiUrl, "/api/twin/v1/c360/imports", { adminKey });
  return Array.isArray(body) ? body : (body.items ?? body.data ?? []);
}
