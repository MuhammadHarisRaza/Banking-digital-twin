import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { Bot, ExternalLink, Loader2, MapPin, ShieldAlert, X } from "lucide-react";
import { useAccounts, useAgentOutputs, useCustomer, useCustomerAlerts, useCustomerDrawer, useTimeline } from "../../c360/api";
import { useBranchLink } from "../../c360/branchLink";
import type { Alert } from "../../c360/types";
import { useBranches } from "../../data/branches";
import { useAppLauncher } from "../../hooks/useAppLauncher";
import { ago, ChurnBadge, ErrorNote, HealthBadge, label, maskId, pct, SAMPLE_NOTE, useMoney } from "./ui";

function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-1.5 flex items-center justify-between text-[12.5px] font-semibold tracking-wide text-mute uppercase">
        {title}
        {right}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label: l, value, tone }: { label: string; value: ReactNode; tone?: "ok" | "warn" | "bad" }) {
  const color = tone === "bad" ? "text-[#c03838]" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "";
  return (
    <div className="rounded-lg border border-line-soft bg-card/60 px-2.5 py-1.5">
      <div className="text-[11.5px] text-soft">{l}</div>
      <div className={`text-[15px] font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

/** The API can return several alerts for the same event; show each kind once, newest first, with a count. */
function uniqueAlerts(list: Alert[]) {
  const map = new Map<string, { alert: Alert; count: number }>();
  for (const a of [...list].sort((x, y) => y.generated_at.localeCompare(x.generated_at))) {
    const key = a.event_label || a.content?.alert_title || "";
    const hit = map.get(key);
    if (hit) hit.count++;
    else map.set(key, { alert: a, count: 1 });
  }
  return [...map.values()];
}

const Muted = ({ children }: { children: ReactNode }) => <p className="text-[13px] text-mute">{children}</p>;

function Body({ id }: { id: string }) {
  const money = useMoney();
  const launch = useAppLauncher();
  const customer = useCustomer(id);
  const accounts = useAccounts(id);
  const timeline = useTimeline(id);
  const agents = useAgentOutputs(id);
  const alerts = useCustomerAlerts(id);
  const { link } = useBranchLink();
  const { getBranch } = useBranches();

  if (customer.error) return <ErrorNote error={customer.error} onRetry={customer.refetch} />;
  const c = customer.data;
  if (!c)
    return (
      <p className="flex items-center gap-2 py-6 text-[14px] text-soft">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading customer…
      </p>
    );
  const s = c.scores;
  const branch = getBranch(link?.map.get(c.identity.branch_id));
  const brief = agents.data?.rm_copilot?.content;
  const kycDays = s.compliance.kyc_expiry_days_remaining;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <ChurnBadge tier={s.churn.tier} />
        <HealthBadge health={s.relationship.health} />
        <span className="text-[12.5px] text-soft">{c.identity.persona_label}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-soft">Customer ID</dt>
        <dd className="text-right font-medium">{c.identity.unified_customer_id}</dd>
        <dt className="text-soft">CNIC</dt>
        <dd className="text-right font-medium">{maskId(c.identity.cnic)}</dd>
        <dt className="text-soft">Phone</dt>
        <dd className="text-right font-medium">{c.identity.phone}</dd>
        <dt className="text-soft">City</dt>
        <dd className="text-right font-medium">{c.identity.city}</dd>
        <dt className="text-soft">Relationship manager</dt>
        <dd className="text-right font-medium">{c.identity.rm_id || "—"}</dd>
        <dt className="text-soft">Branch</dt>
        <dd className="text-right font-medium">
          {branch ? (
            <Link to={`/?branch=${branch.id}`} className="inline-flex items-center gap-1 text-brand hover:text-brand-bright">
              <MapPin className="size-3.5" aria-hidden="true" />
              {branch.name}
            </Link>
          ) : (
            c.identity.branch_id || "—"
          )}
          {branch && <span className="block text-[11.5px] font-normal text-mute">C360 {c.identity.branch_id}</span>}
        </dd>
      </dl>

      <Section title="Scores">
        <div className="grid grid-cols-3 gap-1.5">
          <Stat label="Churn risk" value={pct(s.churn.score)} tone={s.churn.score > 0.5 ? "bad" : s.churn.score > 0.25 ? "warn" : "ok"} />
          <Stat label="Sentiment" value={s.sentiment.score?.toFixed(2) ?? "—"} tone={s.sentiment.score < 0 ? "bad" : undefined} />
          <Stat label="Digital" value={pct(s.digital.engagement_score)} />
          <Stat label="Open complaints" value={s.complaints.open} tone={s.complaints.open > 3 ? "bad" : s.complaints.open ? "warn" : "ok"} />
          <Stat label="NPS (est.)" value={s.relationship.nps_estimated?.toFixed(2) ?? "—"} />
          <Stat label="Avg balance" value={money(s.financial.avg_monthly_balance)} />
          <Stat label="Top product" value={label(s.propensity.top_product)} />
          <Stat label="KYC" value={kycDays === null ? "Unknown" : kycDays < 0 ? "Expired" : `${kycDays} days`} tone={kycDays !== null && kycDays < 30 ? "warn" : undefined} />
          <Stat label="AML / PEP" value={`${s.compliance.aml_flag ? "AML" : "—"} / ${s.compliance.pep_flag ? "PEP" : "—"}`} tone={s.compliance.aml_flag || s.compliance.pep_flag ? "bad" : "ok"} />
        </div>
      </Section>

      {c.insights?.length > 0 && (
        <Section title="Insights">
          <ul className="space-y-1.5">
            {c.insights.slice(0, 5).map((i) => (
              <li key={i.id} className="rounded-lg border border-line-soft px-2.5 py-1.5 text-[13px]">
                <span className="font-semibold">{i.title}</span> <span className="text-soft">· {i.description}</span>
                {i.suggested_action && <span className="mt-0.5 block text-[12.5px] text-brand">→ {i.suggested_action}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="RM brief" right={<Bot className="size-4 text-brand" aria-hidden="true" />}>
        {agents.loading && !brief ? (
          <Muted>Loading…</Muted>
        ) : brief ? (
          <div className="rounded-lg border border-brand/25 bg-brand/5 px-3 py-2 text-[13px]">
            {brief.headline && <p className="font-semibold">{brief.headline}</p>}
            {brief.key_signals && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-soft">
                {brief.key_signals.slice(0, 4).map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            )}
            {brief.recommended_action && <p className="mt-1.5 text-brand">→ {brief.recommended_action}</p>}
          </div>
        ) : (
          <Muted>No AI brief for this customer.</Muted>
        )}
      </Section>

      <Section title="Accounts">
        {accounts.data?.length ? (
          <ul className="divide-y divide-line-soft rounded-lg border border-line-soft">
            {accounts.data.map((a) => (
              <li key={a.account_id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[13px]">
                <span>
                  <span className="font-medium">{label(a.account_type)}</span> <span className="text-mute">· {a.account_id}</span>
                </span>
                <span className="text-right font-semibold tabular-nums">{money(a.balance, false)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Muted>{accounts.loading ? "Loading…" : "No accounts."}</Muted>
        )}
      </Section>

      {alerts.data && alerts.data.length > 0 && (
        <Section title="Alerts" right={<ShieldAlert className="size-4 text-[#c03838]" aria-hidden="true" />}>
          <ul className="space-y-1.5">
            {uniqueAlerts(alerts.data).slice(0, 4).map(({ alert: a, count }, i) => (
              <li key={i} className="rounded-lg border border-[#e05252]/25 bg-[#e05252]/5 px-2.5 py-1.5 text-[13px]">
                <span className="font-semibold">{a.event_label || a.content?.alert_title}</span>
                {count > 1 && <span className="ml-1.5 rounded-full bg-[#e05252]/15 px-1.5 text-[11.5px] font-semibold text-[#c03838]">×{count}</span>}
                {a.content?.summary && <span className="block text-soft">{a.content.summary}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Recent activity">
        {timeline.data?.length ? (
          <ul className="space-y-1">
            {timeline.data.map((e) => (
              <li key={e.event_id} className="flex gap-2 text-[13px]">
                <span className="w-20 shrink-0 text-[12px] text-mute tabular-nums">{ago(e.source_timestamp)}</span>
                <span className="min-w-0">{e.summary}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Muted>{timeline.loading ? "Loading…" : "No recent activity."}</Muted>
        )}
      </Section>

      <button
        type="button"
        onClick={() => launch("customer360", branch?.id)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2 text-[14px] font-semibold text-white hover:brightness-110"
      >
        <ExternalLink className="size-4" aria-hidden="true" /> Open in Customer 360
      </button>
      <p className="mt-2 text-center text-[11.5px] text-mute">{SAMPLE_NOTE}</p>
    </>
  );
}

/** Customer 360 sheet over the right of the screen, opened from anywhere with useCustomerDrawer.open(id). */
export default function CustomerDrawer() {
  const id = useCustomerDrawer((s) => s.id);
  const close = useCustomerDrawer((s) => s.close);
  const customer = useCustomer(id);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [id, close]);

  if (!id) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 top-[70px] z-[1250] bg-ink/25" aria-hidden="true" onClick={close} />
      <aside role="dialog" aria-label="Customer 360" className="panel-enter fixed top-[70px] right-0 bottom-0 z-[1260] flex w-[420px] max-w-full flex-col border-l border-line bg-panel shadow-2xl">
        <header className="flex items-start gap-2 border-b border-line px-4 pt-3 pb-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold tracking-wide text-brand uppercase">Customer 360</p>
            <h2 className="truncate text-[19px] leading-tight font-bold">{customer.data?.identity.full_name ?? id}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={close} className="grid size-8 place-items-center rounded-full hover:bg-brand/10">
            <X className="size-4.5" />
          </button>
        </header>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-5">
          <Body id={id} />
        </div>
      </aside>
    </>,
    document.body,
  );
}
