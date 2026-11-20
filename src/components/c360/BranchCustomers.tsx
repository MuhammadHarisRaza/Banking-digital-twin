import { Loader2, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router";
import { useCustomerDrawer } from "../../c360/api";
import { useBranchCustomers } from "../../c360/branchLink";
import type { ChurnTier } from "../../c360/types";
import { useConfig } from "../../store/settingsStore";
import type { Branch } from "../../types";
import { ChurnBadge, ErrorNote, HealthBadge, SAMPLE_NOTE, useMoney } from "./ui";

/** Customer 360 customers linked to this branch (Customers tab of the branch panel). */
export default function BranchCustomers({ branch, compact = false }: { branch: Branch; compact?: boolean }) {
  const { integrations } = useConfig();
  const { customers, loading, error } = useBranchCustomers(branch);
  const open = useCustomerDrawer((s) => s.open);
  const money = useMoney();

  if (!integrations.c360.enabled)
    return (
      <p className="text-[14px] text-soft">
        The Customer 360 integration is off.{" "}
        <Link to="/settings?tab=integrations" className="text-brand">
          Settings
        </Link>
      </p>
    );
  if (error) return <ErrorNote error={error} />;
  if (loading && !customers.length)
    return (
      <p className="flex items-center gap-2 text-[14px] text-soft">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading Customer 360…
      </p>
    );
  if (!customers.length)
    return (
      <div className="text-[14px] text-soft">
        <p>No Customer 360 customers are linked to this branch.</p>
        <Link to="/settings?tab=integrations" className="mt-1.5 inline-flex items-center gap-1 text-brand">
          <SettingsIcon className="size-3.5" aria-hidden="true" /> Map C360 branches to branches
        </Link>
      </div>
    );

  const tiers = (["critical", "high", "medium", "low"] as ChurnTier[]).map((t) => [t, customers.filter((c) => c.churn_risk_tier === t).length] as const).filter(([, n]) => n);
  const sorted = [...customers].sort((a, b) => b.churn_risk_score - a.churn_risk_score);
  return (
    <div>
      {!compact && (
        <p className="text-[14px] text-soft">
          <span className="font-semibold text-ink">{customers.length}</span> customers ·{" "}
          {tiers.map(([t, n]) => `${n} ${t}`).join(" · ")} churn
        </p>
      )}
      <ul className={`divide-y divide-line-soft ${compact ? "" : "mt-2"} rounded-lg border border-line-soft`}>
        {sorted.map((c) => (
          <li key={c.unified_customer_id}>
            <button type="button" onClick={() => open(c.unified_customer_id)} className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-brand/5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{c.full_name}</span>
                <span className="flex items-center gap-2">
                  <HealthBadge health={c.relationship_health} />
                  {!compact && <span className="text-[12px] text-mute">{c.persona_label}</span>}
                </span>
              </span>
              {!compact && <span className="text-[13px] tabular-nums text-soft">{money(c.total_relationship_value)}</span>}
              <ChurnBadge tier={c.churn_risk_tier} />
            </button>
          </li>
        ))}
      </ul>
      {!compact && <p className="mt-2 text-[11.5px] text-mute">{SAMPLE_NOTE}</p>}
    </div>
  );
}
