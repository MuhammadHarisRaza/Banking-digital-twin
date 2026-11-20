import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, MapPin, Search, Settings as SettingsIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useCustomerDrawer, useCustomerList, useFilterOptions, useImportFilter, type CustomerFilters } from "../c360/api";
import { ImportScopeNote } from "../components/c360/ui";
import { useBranchLink } from "../c360/branchLink";
import { ChurnBadge, ErrorNote, HealthBadge, label, SAMPLE_NOTE, useMoney } from "../components/c360/ui";
import { useBranches } from "../data/branches";
import { formatNumber } from "../lib/seeded";
import { useSettings } from "../store/settingsStore";

const PAGE_SIZE = 20;
const SELECT = "h-10 rounded-lg border border-line bg-panel px-3 text-[15px] text-ink outline-none focus:border-brand";
const SORTS = [
  { value: "-last_enriched_at", label: "Recently updated" },
  { value: "-churn_risk_score", label: "Churn risk (high first)" },
  { value: "full_name", label: "Name (A–Z)" },
  { value: "-digital_engagement_score", label: "Digital engagement" },
  { value: "ppc", label: "Fewest products" },
];

/**
 * Customer list from Customer 360 (GET /customers): search, filters and paging run on the server.
 * Filters live in the URL, so the dashboard card can link straight to "high churn" or "KYC expiring".
 * Clicking a row opens the Customer 360 drawer.
 */
export default function Customers() {
  const enabled = useSettings((s) => s.config.integrations.c360.enabled);
  const [params, setParams] = useSearchParams();
  const money = useMoney();
  const open = useCustomerDrawer((s) => s.open);
  const { link } = useBranchLink();
  const { getBranch } = useBranches();
  const cities = useFilterOptions();
  const [q, setQ] = useState(params.get("q") ?? "");

  const filters: CustomerFilters = {
    q: params.get("q") ?? undefined,
    churn_tier: params.get("churn_tier") ?? undefined,
    kyc_status: params.get("kyc_status") ?? undefined,
    city: params.get("city") ?? undefined,
    needs_attention: params.get("needs_attention") === "true" || undefined,
    growth_opportunity: params.get("growth_opportunity") === "true" || undefined,
    sort: params.get("sort") ?? "-last_enriched_at",
    page: Number(params.get("page") ?? 1) || 1,
    page_size: PAGE_SIZE,
  };
  const list = useCustomerList(filters);
  const scope = useImportFilter();

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  // Search as you type, after a short pause.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q.trim()) setParam("q", q.trim() || undefined);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  if (!enabled)
    return (
      <main className="flex-1 px-4 py-6 sm:px-6 desk:px-11">
        <h1 className="text-[34px] leading-tight font-bold tracking-tight">Customers</h1>
        <p className="mt-3 max-w-xl text-[16px] text-soft">The Customer 360 integration is switched off.</p>
        <Link to="/settings?tab=integrations" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[14px] font-semibold text-white">
          <SettingsIcon className="size-4" aria-hidden="true" /> Open Settings
        </Link>
      </main>
    );

  const rows = list.data?.data ?? [];
  const meta = list.data?.meta;
  const page = meta?.page ?? filters.page;
  const pages = meta?.total_pages ?? 1;

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 desk:px-11">
      <h1 className="text-[34px] leading-tight font-bold tracking-tight">Customers</h1>
      <p className="mt-1 text-[17px] text-soft">
        {meta && !list.data?.approximate ? `${formatNumber(meta.total)} customers` : "Customers"} from Customer 360, with churn risk, relationship health and KYC
        status. Select a customer for their full 360 view.
      </p>
      <ImportScopeNote scope={scope} approximate={list.data?.approximate} className="mt-2" />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <span className="sr-only">Search customers</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-mute" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, CNIC, customer ID or account number" className={`${SELECT} w-full pl-9`} />
        </label>
        <select aria-label="Churn tier" value={filters.churn_tier ?? ""} onChange={(e) => setParam("churn_tier", e.target.value || undefined)} className={SELECT}>
          <option value="">All churn tiers</option>
          {["low", "medium", "high", "critical"].map((t) => (
            <option key={t} value={t}>
              {label(t)} churn
            </option>
          ))}
        </select>
        <select aria-label="KYC status" value={filters.kyc_status ?? ""} onChange={(e) => setParam("kyc_status", e.target.value || undefined)} className={SELECT}>
          <option value="">Any KYC status</option>
          <option value="valid">KYC valid</option>
          <option value="expiring">KYC expiring</option>
          <option value="expired">KYC expired</option>
        </select>
        <select aria-label="City" value={filters.city ?? ""} onChange={(e) => setParam("city", e.target.value || undefined)} className={SELECT}>
          <option value="">All cities</option>
          {(cities.data?.cities ?? []).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Sort" value={filters.sort} onChange={(e) => setParam("sort", e.target.value)} className={SELECT}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-[14.5px] text-soft">
          <input type="checkbox" className="accent-[var(--color-brand)]" checked={!!filters.needs_attention} onChange={(e) => setParam("needs_attention", e.target.checked ? "true" : undefined)} />
          Needs attention
        </label>
        <label className="flex items-center gap-2 text-[14.5px] text-soft">
          <input type="checkbox" className="accent-[var(--color-brand)]" checked={!!filters.growth_opportunity} onChange={(e) => setParam("growth_opportunity", e.target.checked ? "true" : undefined)} />
          Growth opportunity
        </label>
      </div>

      {list.error && (
        <div className="mt-4">
          <ErrorNote error={list.error} onRetry={list.refetch}>
            <Link to="/settings?tab=integrations" className="text-[13px] text-brand">
              Check the Customer 360 settings
            </Link>
          </ErrorNote>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Customer</th>
              <th scope="col">City</th>
              <th scope="col">Segment</th>
              <th scope="col">Churn</th>
              <th scope="col">Relationship</th>
              <th scope="col">Relationship value</th>
              <th scope="col">KYC</th>
              <th scope="col">Last RM contact</th>
              <th scope="col">Branch</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const branch = getBranch(link?.byCustomer.get(c.unified_customer_id));
              return (
                <tr key={c.unified_customer_id} onClick={() => open(c.unified_customer_id)} className="cursor-pointer hover:bg-brand/5">
                  <td className="!text-ink">
                    <button type="button" onClick={() => open(c.unified_customer_id)} className="text-left font-medium hover:text-brand">
                      {c.full_name}
                    </button>
                    <span className="block text-[12px] text-mute">{c.unified_customer_id}</span>
                  </td>
                  <td>{c.city}</td>
                  <td>{c.persona_label}</td>
                  <td>
                    <ChurnBadge tier={c.churn_risk_tier} />
                  </td>
                  <td>
                    <HealthBadge health={c.relationship_health} />
                  </td>
                  <td className="tabular-nums">{money(c.total_relationship_value)}</td>
                  <td className={c.kyc_status === "expired" ? "text-[#c03838]" : c.kyc_status === "expiring" ? "text-warn" : ""}>
                    {c.kyc_status ? `${label(c.kyc_status)}${c.kyc_expiry_days_remaining !== null ? ` · ${c.kyc_expiry_days_remaining} d` : ""}` : "—"}
                  </td>
                  <td className="tabular-nums">{c.last_rm_interaction_days !== null ? `${c.last_rm_interaction_days} days ago` : "—"}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {branch ? (
                      <Link to={`/?branch=${branch.id}`} className="inline-flex items-center gap-1 text-[13.5px] text-brand hover:text-brand-bright">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {branch.name}
                      </Link>
                    ) : (
                      <span className="text-mute">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {list.loading && !rows.length && (
              <tr>
                <td colSpan={9} className="py-8 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-brand" aria-label="Loading" />
                </td>
              </tr>
            )}
            {!list.loading && !list.error && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center">
                  {scope.prefix && !params.toString() ? (
                    <>
                      No customers imported yet.{" "}
                      <Link to="/settings?tab=integrations" className="text-brand hover:text-brand-bright">
                        Import them in Settings → Integrations
                      </Link>
                      .
                    </>
                  ) : (
                    "No customers match these filters."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[14.5px] text-soft">
        <span>{SAMPLE_NOTE}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setParam("page", String(page - 1))}
            aria-label="Previous page"
            className="grid size-9 place-items-center rounded-lg border border-line bg-panel enabled:hover:bg-brand/10 disabled:opacity-40"
          >
            <ChevronLeft className="size-4.5" />
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setParam("page", String(page + 1))}
            aria-label="Next page"
            className="grid size-9 place-items-center rounded-lg border border-line bg-panel enabled:hover:bg-brand/10 disabled:opacity-40"
          >
            <ChevronRight className="size-4.5" />
          </button>
        </div>
      </div>
    </main>
  );
}
