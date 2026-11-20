import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useSettings } from "../../store/settingsStore";
import type { ChurnTier } from "../../c360/types";

/** Shared bits for the Customer 360 views: badges, number formats, states. */

const TIER: Record<ChurnTier, string> = {
  low: "bg-ok/12 text-ok",
  medium: "bg-warn/15 text-warn",
  high: "bg-[#e05252]/12 text-[#c03838]",
  critical: "bg-[#e05252] text-white",
};

export function ChurnBadge({ tier }: { tier: ChurnTier | string | undefined }) {
  if (!tier) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold capitalize ${TIER[tier as ChurnTier] ?? "bg-card text-soft"}`}>
      {tier} churn
    </span>
  );
}

const HEALTH: Record<string, string> = {
  healthy: "text-ok",
  good: "text-ok",
  needs_attention: "text-warn",
  at_risk: "text-[#c03838]",
  critical: "text-[#c03838]",
};

export function HealthBadge({ health }: { health: string | undefined }) {
  if (!health) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[12.5px] font-medium ${HEALTH[health] ?? "text-soft"}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {health.replace(/_/g, " ")}
    </span>
  );
}

export const label = (s: string | undefined) => (s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—");

/** Money in the bank's currency (C360 amounts are plain numbers in the data's own currency). */
export function useMoney() {
  const currency = useSettings((s) => s.config.organisation.currency);
  const locale = useSettings((s) => s.config.organisation.locale);
  return (n: number | null | undefined, compact = true) => {
    if (n === null || n === undefined || Number.isNaN(n)) return "—";
    const num = new Intl.NumberFormat(locale || "en-US", { notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 1 : 0 }).format(n);
    return `${currency} ${num}`;
  };
}

export const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${Math.round(n * 100)}%`);

export const ago = (iso: string | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

/** CNIC shown with only the last four digits. */
export const maskId = (s: string | undefined) => (s ? `•••• ${s.slice(-4)}` : "—");

export function ErrorNote({ error, onRetry, children }: { error: Error; onRetry?: () => void; children?: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-[#e05252]/30 bg-[#e05252]/6 px-3 py-2 text-[13.5px]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#c03838]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Customer 360 data unavailable</p>
        <p className="text-soft">{error.message}</p>
        {children}
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium hover:bg-brand/10">
          <RefreshCw className="size-3.5" aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}

export const SAMPLE_NOTE = "Sample data from the Customer 360 demo API.";

/** Which C360 customers are shown: only this platform's import, or everything (with the reason). */
export function ImportScopeNote({
  scope,
  approximate,
  className = "",
}: {
  scope: { sourceSystem: string; unavailable: boolean; prefix: string | null };
  approximate?: boolean;
  className?: string;
}) {
  if (scope.prefix)
    return (
      <p className={`flex flex-wrap items-center gap-2 text-[13px] text-soft ${className}`}>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 font-medium text-brand">Imported: {scope.sourceSystem}</span>
        Only this bank&apos;s imported customers. C360&apos;s demo customers are hidden (Settings → Integrations).
        {approximate && <span className="text-warn">Search results on this page are filtered, so page counts are approximate.</span>}
      </p>
    );
  if (scope.unavailable)
    return (
      <p className={`text-[13px] text-warn ${className}`}>
        Showing every C360 customer: the Digital Twin API did not say which import is ours (check its address and C360_SOURCE_SYSTEM).
      </p>
    );
  return null;
}
