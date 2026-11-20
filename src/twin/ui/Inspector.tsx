import type { ReactNode } from "react";
import {
  AlertTriangle,
  Banknote,
  Camera,
  CircleCheck,
  Cpu,
  ExternalLink,
  Info,
  KeyRound,
  MapPin,
  Store,
  Users,
  Vault,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import { useCustomerDrawer } from "../../c360/api";
import BranchCustomers from "../../components/c360/BranchCustomers";
import { ChurnBadge } from "../../components/c360/ui";
import { useBrand } from "../../config/useBrand";
import { ageOf, clockOf, metricValue, minutesSince, num, TAMPER_LABEL, useBranchEdge, type BranchEdge, type EdgeDevice, type Metric } from "../../digitalEye/api";
import { useAppLauncher } from "../../hooks/useAppLauncher";
import { formatNumber } from "../../lib/seeded";
import type { Branch } from "../../types";
import type { Asset, BranchLayout } from "../layout/types";
import { fmtClock, kpis, stationStateLabel, stationTone, type Alert, type SimState, type Station } from "../sim/engine";
import { hasFeed } from "../scene/cameraFeed";
import { focusAsset } from "../scene/focus";
import { CameraFeed } from "./CameraFeed";
import { TONE_HEX } from "../scene/Selectable";
import { useSimVersion, useTwinView } from "../store";

const SIZE_LABEL = { small: "Compact", standard: "Standard", flagship: "Flagship" } as const;

function Row({ label, value, tone }: { label: string; value: ReactNode; tone?: keyof typeof TONE_HEX }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1.5 text-[14px] last:border-0">
      <span className="text-soft">{label}</span>
      <span className="flex items-center gap-1.5 text-right font-medium">
        {tone && <span className="size-2 rounded-full" style={{ background: TONE_HEX[tone] }} />}
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-3">
      <h3 className="mb-1 text-[12.5px] font-semibold tracking-wide text-mute uppercase">{title}</h3>
      <div className="rounded-lg border border-line-soft bg-card/60 px-3 py-0.5">{children}</div>
    </section>
  );
}

function Bar({ value, tone }: { value: number; tone: keyof typeof TONE_HEX }) {
  return (
    <div className="mt-1 mb-2 h-2 overflow-hidden rounded-full bg-line-soft">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: TONE_HEX[tone] }} />
    </div>
  );
}

const fmtMetric = (m: Metric | undefined, unit: string, digits = 0) => {
  const v = metricValue(m);
  return v === null ? (
    <span className="font-normal text-mute" title={(typeof m?.unavailable_reason === "string" && m.unavailable_reason) || "not in the report"}>
      Not reported
    </span>
  ) : (
    `${v.toFixed(digits)}${unit}`
  );
};

/** One Digital Eye edge box, from its latest device.health and device.gpu reports. */
function EdgeBox({ d }: { d: EdgeDevice }) {
  const health = d.latest["device.health"];
  const gpu = d.latest["device.gpu"];
  const last = [health?.occurred_at, gpu?.occurred_at].filter(Boolean).sort().pop();
  const stale = minutesSince(last) > 30;
  const cpu = metricValue(health?.payload.cpu);
  const gpuPct = metricValue(gpu?.payload.pct);
  const gpuTemp = metricValue(gpu?.payload.temp_c);
  const gpuUsed = num(gpu?.payload.mem_used_mb);
  const gpuTotal = num(gpu?.payload.mem_total_mb);
  const cpuTone = cpu == null ? undefined : cpu > 85 ? "red" : cpu > 70 ? "amber" : "green";
  return (
    <Section title={`Digital Eye edge box · ${d.device_ref.slice(0, 8)}`}>
      <Row label="Last report" value={ageOf(last)} tone={stale ? "amber" : "green"} />
      <Row label="CPU" value={fmtMetric(health?.payload.cpu, "%")} tone={cpuTone} />
      {cpu != null && <Bar value={cpu} tone={cpuTone ?? "green"} />}
      <Row label="Network down" value={fmtMetric(health?.payload.network, " Mbps", 1)} />
      <Row label="Network up" value={fmtMetric(health?.payload.network_up, " Mbps", 1)} />
      <Row label="Memory" value={fmtMetric(health?.payload.memory, "%")} />
      <Row label="Storage" value={fmtMetric(health?.payload.storage, "%")} />
      {gpu ? (
        <>
          <Row label="GPU" value={gpuPct === null ? "Not reported" : `${Math.round(gpuPct)}%`} />
          <Row label="GPU temperature" value={gpuTemp === null ? "Not reported" : `${Math.round(gpuTemp)} °C`} tone={(gpuTemp ?? 0) > 80 ? "amber" : undefined} />
          {gpuUsed !== null && gpuTotal ? <Row label="GPU memory" value={`${(gpuUsed / 1024).toFixed(1)} of ${(gpuTotal / 1024).toFixed(0)} GB`} /> : null}
        </>
      ) : (
        <Row label="GPU" value={<span className="font-normal text-mute">No GPU reports</span>} />
      )}
      {stale && <p className="pb-1.5 text-[12px] text-warn">No report for over 30 minutes. The box may be off or offline.</p>}
    </Section>
  );
}

/** Digital Eye alerts for this branch's mapped cameras and boxes, in the twin's alert format. */
function edgeAlerts(edge: BranchEdge, layout: BranchLayout): Alert[] {
  const minuteOfDay = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
  const out: Alert[] = [];
  let id = -1;
  for (const [assetId, cam] of edge.cameras) {
    if (!cam.tamper) continue;
    const name = layout.assets.find((a) => a.id === assetId)?.name ?? assetId;
    out.push({
      id: id--,
      code: `de-tamper-${assetId}`,
      time: minuteOfDay(cam.tamper.occurred_at),
      severity: "critical",
      title: `Camera ${(TAMPER_LABEL[cam.tamper.kind] ?? cam.tamper.kind).toLowerCase()} (Digital Eye)`,
      detail: `${name} · ${cam.camera_ref}`,
      assetId,
      active: cam.tamper.active,
    });
  }
  const server = layout.assets.find((a) => a.kind === "server")?.id;
  for (const d of edge.devices) {
    const last = d.latest["device.health"]?.occurred_at;
    if (last && minutesSince(last) > 30)
      out.push({
        id: id--,
        code: `de-stale-${d.device_ref}`,
        time: minuteOfDay(last),
        severity: "warning",
        title: "Edge box not reporting (Digital Eye)",
        detail: `${d.device_ref.slice(0, 8)} · last report ${ageOf(last)}`,
        assetId: server,
        active: true,
      });
  }
  return out;
}

/** A visitor's name when they stand in for a Customer 360 customer (opens the 360 drawer), else a label. */
function Visitor({ c, fallback }: { c: SimState["customers"][number]; fallback: string }) {
  const open = useCustomerDrawer((s) => s.open);
  if (!c.profile) return <>{fallback}</>;
  return (
    <button type="button" onClick={() => open(c.profile!.id)} className="inline-flex items-center gap-1.5 text-brand hover:text-brand-bright" title="Open Customer 360">
      {c.profile.name}
      <ChurnBadge tier={c.profile.tier} />
    </button>
  );
}

function StationDetail({ st, sim }: { st: Station; sim: SimState }) {
  const tone = stationTone(st);
  const customer = st.customer !== null ? sim.customers.find((c) => c.id === st.customer) : undefined;
  if (st.atm) {
    const cashTone = st.atm.cash < 3 ? "red" : st.atm.cash < 20 ? "amber" : "green";
    return (
      <>
        <Section title="Live status">
          <Row label="State" value={stationStateLabel(st)} tone={tone} />
          <Row label="In use" value={customer ? <Visitor c={customer} fallback="Customer at machine" /> : "Idle"} />
          <Row label="Queue" value={`${sim.atmQueue.filter((v) => v !== null).length} waiting`} />
        </Section>
        <Section title="Cash cassette">
          <Row label="Cash level" value={`${Math.round(st.atm.cash)}%`} tone={cashTone} />
          <Bar value={st.atm.cash} tone={cashTone} />
        </Section>
        <Section title="Today">
          <Row label="Transactions" value={formatNumber(st.servedToday)} />
          <Row label="Withdrawals" value={formatNumber(st.atm.withdrawals)} />
          <Row label="Downtime" value={`${st.atm.downMinutes} min`} />
        </Section>
      </>
    );
  }
  return (
    <>
      <Section title="Live status">
        <Row label="State" value={stationStateLabel(st)} tone={tone} />
        {st.kind !== "locker" && <Row label="Staff" value={st.staffName} />}
        <Row label="Customer" value={customer ? <Visitor c={customer} fallback={customer.token || "Walk-in"} /> : "—"} />
        {customer && st.state === "serving" && <Row label="Service time" value={`${Math.max(0, Math.round(sim.t - customer.calledAt))} min`} />}
        {st.state === "break" && <Row label="Back at" value={fmtClock(st.breakUntil)} />}
      </Section>
      <Section title="Today">
        <Row label="Customers served" value={formatNumber(st.servedToday)} />
        <Row label="Avg. handling time" value={st.handleMinutes ? `${st.handleMinutes.toFixed(1)} min` : "—"} />
        <Row
          label="Waiting for this service"
          value={sim.customers.filter((c) => c.service === st.kind && (c.phase === "waiting" || c.phase === "toSeat")).length}
        />
      </Section>
    </>
  );
}

function AssetDetail({ asset, sim, layout, branch, edge }: { asset: Asset; sim: SimState; layout: BranchLayout; branch: Branch; edge: BranchEdge }) {
  const launch = useAppLauncher();
  const st = sim.stations.find((s) => s.id === asset.id);
  const edgeCam = edge.cameras.get(asset.id);
  if (st)
    return (
      <>
        {hasFeed(asset) && <CameraFeed asset={asset} sim={sim} edge={edgeCam} />}
        <StationDetail st={st} sim={sim} />
      </>
    );

  switch (asset.kind) {
    case "vault":
      return (
        <Section title="Strong room">
          <Row label="Door" value={sim.vault.doorOpen ? "Open (dual control)" : "Locked"} tone={sim.vault.doorOpen ? "amber" : "green"} />
          <Row label="Last access" value={fmtClock(sim.vault.lastAccess)} />
          <Row label="Accesses today" value={sim.vault.accessesToday} />
          <Row label="Next scheduled" value={sim.open ? fmtClock(sim.vault.nextAccess) : "Tomorrow 09:05"} />
          <Row label="Time lock" value="09:00 – 17:30" />
        </Section>
      );
    case "server":
      return (
        <>
        <Section title="Server & UPS">
          <Row label="Core banking link" value="Connected" tone="green" />
          <Row label="Network latency" value={`${Math.round(sim.server.latency)} ms`} tone={sim.server.latency > 40 ? "amber" : "green"} />
          <Row label="Room temperature" value={`${sim.server.temp.toFixed(1)} °C`} tone={sim.server.temp > 27 ? "amber" : "green"} />
          <Row label="UPS load" value={`${Math.round(sim.server.load)}%`} />
          <Bar value={sim.server.load} tone={sim.server.load > 80 ? "amber" : "green"} />
        </Section>
        {edge.devices.map((d) => (
          <EdgeBox key={d.device_ref} d={d} />
        ))}
        </>
      );
    case "kiosk": {
      const k = kpis(sim);
      return (
        <Section title="Token kiosk">
          <Row label="Tokens issued today" value={formatNumber(sim.tokensToday)} />
          <Row label="Waiting now" value={k.waiting} />
          <Row label="Last called" value={sim.calls[0] ? `${sim.calls[0].token} → ${sim.calls[0].station}` : "—"} />
        </Section>
      );
    }
    case "tokenBoard":
      return (
        <Section title="Now serving">
          {sim.calls.length ? sim.calls.slice(0, 5).map((c) => <Row key={c.token + c.time} label={c.token} value={`${c.station} · ${fmtClock(c.time)}`} />) : <Row label="No calls yet" value="" />}
        </Section>
      );
    case "cctv":
      return (
        <>
          <CameraFeed asset={asset} sim={sim} edge={edgeCam} />
          <Section title="Device">
            <Row
              label="Status"
              value={edgeCam?.tamper?.active ? `${TAMPER_LABEL[edgeCam.tamper.kind] ?? edgeCam.tamper.kind} since ${clockOf(edgeCam.tamper.occurred_at)}` : "Recording"}
              tone={edgeCam?.tamper?.active ? "red" : "green"}
            />
            {edgeCam && <Row label="Digital Eye camera" value={edgeCam.camera_ref} />}
            {edgeCam?.tamper && !edgeCam.tamper.active && (
              <Row label="Last tamper" value={`${TAMPER_LABEL[edgeCam.tamper.kind] ?? edgeCam.tamper.kind} at ${clockOf(edgeCam.tamper.occurred_at)}`} />
            )}
            <Row label="Resolution" value="1080p · 25 fps" />
            <Row label="Retention" value="90 days" />
          </Section>
          <button
            type="button"
            onClick={() => launch("digitalEye", branch.id)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2 text-[14.5px] font-semibold text-white hover:bg-brand-bright"
          >
            <Camera className="size-4.5" aria-hidden="true" />
            Open in Digital Eye
          </button>
        </>
      );
    case "reception":
      return (
        <Section title="Reception & enquiries">
          <Row label="Staffed" value="Receptionist on duty" tone="green" />
          <Row label="Services" value="Enquiries, forms, token help" />
          <Row label="Customers inside" value={kpis(sim).inBranch} />
          <Row label="Waiting for a counter" value={kpis(sim).waiting} />
        </Section>
      );
    case "cdm":
      return (
        <Section title="Cash deposit machine">
          <Row label="Status" value="In service" tone="green" />
          <Row label="Accepts" value="Notes, instant credit to account" />
          <Row label="Bin fill" value={`${Math.min(95, 18 + Math.round((sim.t - 540) / 9))}%`} />
          <Row label="Available" value="24 hours" />
        </Section>
      );
    case "chequeKiosk":
      return (
        <Section title="Cheque deposit kiosk">
          <Row label="Status" value="In service" tone="green" />
          <Row label="Scanning" value="Image capture with receipt" />
          <Row label="Cheques today" value={Math.max(0, Math.round((sim.t - 540) / 14))} />
          <Row label="Clearing cut-off" value="15:00" />
        </Section>
      );
    case "staffRoom": {
      const onBreak = sim.stations.filter((s) => s.state === "break").length;
      return (
        <Section title="Staff room & kitchenette">
          <Row label="Staff on a break" value={onBreak} tone={onBreak > 1 ? "amber" : "green"} />
          <Row label="Seats" value={layout.breakSeats.length} />
          <Row label="Facilities" value="Kitchenette, fridge, water" />
        </Section>
      );
    }
    case "washroom":
      return (
        <Section title="Washrooms">
          <Row label="Gents" value="Available" tone="green" />
          <Row label="Ladies" value="Available" tone="green" />
          <Row label="Last cleaned" value={fmtClock(Math.max(480, sim.t - ((sim.t * 7) % 55)))} />
        </Section>
      );
    case "records":
      return (
        <Section title="Records & document storage">
          <Row label="Access" value="Staff only" />
          <Row label="Retention" value="Account files, vouchers, KYC" />
          <Row label="Fire suppression" value="Armed" tone="green" />
        </Section>
      );
    case "backOffice":
      return (
        <Section title="Cash processing">
          <Row label="Staff" value={layout.staff.filter((s) => s.assetId === "back-office").length} />
          <Row label="Teller cash top-ups" value={Math.max(0, sim.vault.accessesToday - 1)} />
          <Row label="Note counters" value="2 online" tone="green" />
        </Section>
      );
    case "guard":
      return (
        <Section title="Security">
          <Row label="Guard on post" value="Yes" tone="green" />
          <Row label="Customers inside" value={kpis(sim).inBranch} />
          <Row label="Alarm system" value="Armed (perimeter)" tone="green" />
        </Section>
      );
    default:
      return (
        <Section title="Details">
          <Row label="Zone" value={layout.zones.find((z) => z.id === asset.zone)?.name ?? asset.zone} />
        </Section>
      );
  }
}

function AlertList({ alerts, layout }: { alerts: Alert[]; layout: BranchLayout }) {
  const icon = (a: Alert): LucideIcon => (a.severity === "info" ? Info : a.active ? AlertTriangle : CircleCheck);
  const color = (a: Alert) => (a.severity === "critical" && a.active ? "text-[#e05252]" : a.severity === "warning" && a.active ? "text-warn" : "text-mute");
  if (!alerts.length) return <p className="py-2 text-[13.5px] text-mute">No alerts yet.</p>;
  return (
    <ul className="divide-y divide-line-soft">
      {alerts.slice(0, 12).map((a) => {
        const Icon = icon(a);
        return (
          <li key={a.id}>
            <button
              type="button"
              disabled={!a.assetId}
              onClick={() => {
                if (!a.assetId) return;
                useTwinView.setState({ selected: a.assetId });
                focusAsset(a.assetId, layout);
              }}
              className="flex w-full gap-2 py-1.5 text-left enabled:hover:bg-brand/5"
            >
              <Icon className={`mt-0.5 size-4 shrink-0 ${color(a)}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className={`block text-[13.5px] leading-snug ${a.active ? "font-semibold" : ""}`}>{a.title}</span>
                <span className="block text-[12.5px] leading-snug text-soft">{a.detail}</span>
              </span>
              <span className="text-[12px] text-mute tabular-nums">{fmtClock(a.time)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function Inspector({ branch, layout, onClose }: { branch: Branch; layout: BranchLayout; onClose?: () => void }) {
  const sim = useSimVersion();
  const selected = useTwinView((s) => s.selected);
  const zone = useTwinView((s) => s.zone);
  const launch = useAppLauncher();
  const { shortName } = useBrand();
  const edge = useBranchEdge(branch.id);
  if (!sim) return null;
  const asset = selected ? layout.assets.find((a) => a.id === selected) : undefined;
  const k = kpis(sim);
  const deAlerts = edgeAlerts(edge, layout);
  const alerts = deAlerts.length ? [...deAlerts.filter((a) => a.active), ...sim.alerts, ...deAlerts.filter((a) => !a.active)] : sim.alerts;
  const activeAlerts = k.activeAlerts + deAlerts.filter((a) => a.active).length;
  const zoneInfo = zone ? layout.zones.find((z) => z.id === zone) : undefined;
  const zoneAssets = zoneInfo ? layout.assets.filter((a) => a.zone === zoneInfo.id && a.kind !== "entrance") : [];
  const KIND_ICON: Partial<Record<Asset["kind"], LucideIcon>> = { atm: Banknote, cdm: Banknote, chequeKiosk: Banknote, vault: Vault, lockers: KeyRound, server: Cpu, cctv: Camera };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-2 border-b border-line px-4 pt-3 pb-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold tracking-wide text-brand uppercase">
            {asset ? (layout.zones.find((z) => z.id === asset.zone)?.name ?? "Asset") : zoneInfo ? "Zone" : "Branch twin"}
          </p>
          <h2 className="truncate text-[19px] leading-tight font-bold">{asset ? asset.name : zoneInfo ? zoneInfo.name : branch.name}</h2>
        </div>
        {(asset || zoneInfo) && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => useTwinView.setState({ selected: null, zone: null })}
            className="grid size-8 place-items-center rounded-full hover:bg-brand/10"
          >
            <X className="size-4.5" />
          </button>
        )}
        {onClose && !asset && !zoneInfo && (
          <button type="button" aria-label="Close panel" onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-brand/10">
            <X className="size-4.5" />
          </button>
        )}
      </header>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {asset ? (
          <AssetDetail asset={asset} sim={sim} layout={layout} branch={branch} edge={edge} />
        ) : zoneInfo ? (
          <Section title={`${zoneAssets.length} assets`}>
            {zoneAssets.length ? (
              zoneAssets.map((a) => {
                const st = sim.stations.find((s) => s.id === a.id);
                const Icon = KIND_ICON[a.kind] ?? Store;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      useTwinView.setState({ selected: a.id });
                      focusAsset(a.id, layout);
                    }}
                    className="flex w-full items-center gap-2 border-b border-line-soft py-1.5 text-left text-[14px] last:border-0 hover:text-brand"
                  >
                    <Icon className="size-4 text-brand" aria-hidden="true" />
                    <span className="flex-1 truncate">{a.name}</span>
                    {st && (
                      <span className="flex items-center gap-1 text-[12.5px] text-soft">
                        <span className="size-2 rounded-full" style={{ background: TONE_HEX[stationTone(st)] }} />
                        {stationStateLabel(st)}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <Row label="No selectable assets" value="" />
            )}
          </Section>
        ) : (
          <>
            {branch.image ? (
              <img src={branch.image} alt={`${shortName} branch`} className="mt-3 h-28 w-full rounded-lg object-cover object-top" />
            ) : (
              <div className="mt-3 flex h-20 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand to-brand-bright text-white">
                <Store className="size-7" strokeWidth={1.4} aria-hidden="true" />
                <span className="text-[16px] font-semibold">{shortName}</span>
              </div>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-[13.5px] text-soft">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
              {branch.address}, {branch.city}
            </p>
            <Section title="Branch">
              <Row label="Code" value={branch.id} />
              <Row label="Type" value={`${branch.type} · ${SIZE_LABEL[layout.size]}`} />
              <Row label="Staff" value={branch.staff} />
              <Row label="ATMs" value={layout.assets.filter((a) => a.kind === "atm").length || "None"} />
              <Row label="Lockers" value={branch.lockers ? "Yes" : "No"} />
              <Row label="Saturday banking" value={branch.saturdayBanking ? "Yes" : "No"} />
            </Section>
            <Section title="Customer 360">
              <div className="py-1.5">
                <BranchCustomers branch={branch} compact />
              </div>
            </Section>
            <Section title="Right now">
              <Row label="Customers inside" value={k.inBranch} />
              <Row label="Waiting" value={k.waiting} tone={k.waiting > layout.seats.length * 0.7 ? "amber" : "green"} />
              <Row label="Counters open" value={`${k.countersOpen} of ${k.counters}`} tone={k.countersOpen < k.counters ? "amber" : "green"} />
              <Row label="ATMs in service" value={k.atms ? `${k.atmUp} of ${k.atms}` : "—"} tone={k.atms && k.atmUp < k.atms ? "red" : undefined} />
            </Section>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => launch("digitalEye", branch.id)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-[13.5px] font-semibold text-white hover:bg-brand-bright"
              >
                <Camera className="size-4" aria-hidden="true" /> Digital Eye
              </button>
              <button
                type="button"
                onClick={() => launch("customer360", branch.id)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-[13.5px] font-semibold text-white hover:brightness-110"
              >
                <Users className="size-4" aria-hidden="true" /> Customer 360
              </button>
            </div>
            <Link to={`/?branch=${branch.id}`} className="mt-2 flex items-center justify-center gap-1.5 text-[13.5px] text-brand hover:text-brand-bright">
              <ExternalLink className="size-3.5" aria-hidden="true" /> Show on the map
            </Link>
          </>
        )}

        <section className="mt-4">
          <h3 className="mb-1 flex items-center justify-between text-[12.5px] font-semibold tracking-wide text-mute uppercase">
            Alerts
            {activeAlerts > 0 && <span className="rounded-full bg-[#e05252] px-1.5 text-[11px] text-white">{activeAlerts} active</span>}
          </h3>
          <AlertList alerts={alerts} layout={layout} />
        </section>
      </div>
    </div>
  );
}
