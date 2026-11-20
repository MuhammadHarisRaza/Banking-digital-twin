import { ArrowRight, UsersRound } from "lucide-react";
import { Link } from "react-router";
import { useChurnSnapshot, useImportedBook, useImportFilter, useKycOverview, useMetrics } from "../../c360/api";
import type { ChurnTier } from "../../c360/types";
import { formatNumber } from "../../lib/seeded";
import { useConfig } from "../../store/settingsStore";

const TIERS: { tier: ChurnTier; color: string }[] = [
  { tier: "low", color: "var(--color-ok)" },
  { tier: "medium", color: "var(--color-warn)" },
  { tier: "high", color: "#e05252" },
  { tier: "critical", color: "#9b1c1c" },
];

/**
 * Real customer-book figures from Customer 360 (GET /dashboard/metrics, /churn-snapshot,
 * /kyc-validity-overview) as a slim strip on the dashboard. Each figure opens the Customers page
 * with the matching filter.
 */
export default function BookHealthCard() {
  const { modules, integrations } = useConfig();
  const scope = useImportFilter();
  const metrics = useMetrics();
  const churnAll = useChurnSnapshot();
  const kyc = useKycOverview();
  // Only imported customers: C360's dashboard endpoints count everything, so the figures come from filtered list totals.
  const book = useImportedBook();
  if (!integrations.c360.enabled || !modules.c360Card.visible) return null;

  const b = scope.prefix ? book.data : undefined;
  const all = scope.prefix ? undefined : metrics.data;
  const m = b
    ? { customer_count: b.customers, needs_attention_count: b.attention, growth_opportunity_count: b.growth }
    : all && { customer_count: all.customer_count, needs_attention_count: all.needs_attention_count, growth_opportunity_count: all.growth_opportunity_count };
  const kycCount = (s: string) => (b ? (s === "expiring" ? b.expiring : s === "expired" ? b.expired : 0) : (kyc.data?.statuses.find((x) => x.status === s)?.count ?? 0));
  const churn = b
    ? { data: { by_tier: b.byTier as Record<string, number>, total: Object.values(b.byTier).reduce((x, y) => x + y, 0) } }
    : { data: churnAll.data as { by_tier: Record<string, number>; total: number } | undefined };
  const total = churn.data?.total || 0;
  const failed = scope.prefix ? book.error : metrics.error;

  const Fig = ({ to, value, text, tone }: { to: string; value: string; text: string; tone?: string }) => (
    <Link to={to} className="group min-w-[92px] rounded-lg px-2 py-1 transition-colors hover:bg-brand/8">
      <div className={`text-[20px] leading-tight font-semibold tabular-nums ${tone ?? ""}`}>{value}</div>
      <div className="text-[12.5px] text-soft group-hover:text-ink">{text}</div>
    </Link>
  );

  return (
    <section aria-label={modules.c360Card.label} className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-panel px-3 py-2">
      <div className="flex items-center gap-2 pr-1">
        <span className="grid size-9 place-items-center rounded-lg bg-brand/10 text-brand">
          <UsersRound className="size-5" aria-hidden="true" />
        </span>
        <div>
          <div className="text-[14px] font-semibold">{modules.c360Card.label}</div>
          <div className="text-[11.5px] text-mute">
            {failed ? "Unavailable" : m ? (scope.prefix ? `Imported (${scope.sourceSystem}) · live from Customer 360` : "Live from Customer 360") : "Loading…"}
          </div>
        </div>
      </div>
      {m && (
        <>
          <Fig to="/customers" value={formatNumber(m.customer_count)} text="Customers" />
          <Fig to="/customers?needs_attention=true" value={formatNumber(m.needs_attention_count)} text="Need attention" tone="text-warn" />
          <Fig to="/customers?growth_opportunity=true" value={formatNumber(m.growth_opportunity_count)} text="Growth opportunities" tone="text-ok" />
          <Fig to="/customers?kyc_status=expiring" value={formatNumber(kycCount("expiring"))} text="KYC expiring" />
          <Fig to="/customers?kyc_status=expired" value={formatNumber(kycCount("expired"))} text="KYC expired" tone={kycCount("expired") ? "text-[#c03838]" : ""} />
          {total > 0 && (
            <Link to="/customers?sort=-churn_risk_score" className="min-w-[150px] flex-1 rounded-lg px-2 py-1 hover:bg-brand/8" title="Churn tiers">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-line-soft">
                {TIERS.map(({ tier, color }) => (
                  <span key={tier} style={{ width: `${((churn.data!.by_tier[tier] ?? 0) / total) * 100}%`, background: color }} />
                ))}
              </div>
              <div className="mt-1 text-[12.5px] text-soft">
                Churn: {TIERS.filter(({ tier }) => churn.data!.by_tier[tier]).map(({ tier }) => `${churn.data!.by_tier[tier]} ${tier}`).join(" · ")}
              </div>
            </Link>
          )}
        </>
      )}
      <Link to="/customers" aria-label="Open customers" className="ml-auto grid size-8 place-items-center rounded-full border border-line hover:bg-brand/10">
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
