import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  EyeOff,
  Building2,
  Clock,
  Eye,
  Layers as LayersIcon,
  Loader2,
  PanelRightOpen,
  Pause,
  Play,
  Siren,
  Users,
} from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import StatusBadge from "../components/common/StatusBadge";
import { useBrand } from "../config/useBrand";
import { useBranches } from "../data/branches";
import { getEmployees } from "../data/employees";
import { useDismiss } from "../hooks/useDismiss";
import { useConfig } from "../store/settingsStore";
import { useUi } from "../store/uiStore";
import type { Branch } from "../types";
import { buildBranchLayout } from "../twin/layout/buildBranchLayout";
import type { BranchLayout } from "../twin/layout/types";
import { fmtClock, kpis } from "../twin/sim/engine";
import { enterMode, focusZone, goToView, viewPose } from "../twin/scene/focus";
import { preloadModels } from "../twin/scene/kit/models";
import { SPEEDS, useBranchSim, useSimVersion, useTwinView, VIEW_LABELS, type Layers, type ViewId } from "../twin/store";
import Inspector from "../twin/ui/Inspector";
import { useBranchCustomers } from "../c360/branchLink";
import { ModeSwitch, ViewControls } from "../twin/ui/ViewControls";
import { WalkHud } from "../twin/ui/WalkHud";

const BranchScene = lazy(() => import("../twin/scene/BranchScene"));

const PANEL = "rounded-xl border border-line bg-panel/92 shadow-xl shadow-ink/10 backdrop-blur";
const CHIP = "rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors";

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function SimControls() {
  const sim = useSimVersion();
  const speed = useBranchSim((s) => s.speed);
  const paused = useBranchSim((s) => s.paused);
  const scenarios = useBranchSim((s) => s.scenarios);
  const { setSpeed, togglePause, toggleScenario } = useBranchSim.getState();
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  if (!sim) return null;
  const SCENARIOS: { key: keyof typeof scenarios; label: string; detail: string }[] = [
    { key: "rush", label: "Lunch-hour rush", detail: "More than double the walk-ins" },
    { key: "atmFault", label: "ATM failure", detail: "ATM 1 reports a dispenser fault" },
    { key: "tellerAbsent", label: "Teller absent", detail: "Last counter left unstaffed" },
  ];
  const activeCount = Object.values(scenarios).filter(Boolean).length;

  return (
    <div className={`${PANEL} flex flex-wrap items-center gap-1.5 px-2 py-1.5`}>
      <span className="flex items-center gap-1.5 px-1.5 text-[14px] font-semibold tabular-nums">
        <Clock className="size-4 text-brand" aria-hidden="true" />
        {fmtClock(sim.t)}
        <span className={`rounded-full px-1.5 text-[11.5px] font-medium ${sim.open ? "bg-ok/15 text-ok" : "bg-mute/15 text-soft"}`}>
          {sim.open ? "Open" : "Closed"}
        </span>
      </span>
      <span className="h-6 w-px bg-line" aria-hidden="true" />
      <button type="button" onClick={togglePause} aria-label={paused ? "Resume simulation" : "Pause simulation"} className={`${CHIP} hover:bg-brand/10`}>
        {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
      </button>
      <div role="group" aria-label="Simulation speed" className="flex gap-0.5 rounded-lg bg-card p-0.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={!paused && speed === s}
            onClick={() => setSpeed(s)}
            className={`${CHIP} ${!paused && speed === s ? "bg-brand text-white" : "text-soft hover:text-ink"}`}
          >
            {s}×
          </button>
        ))}
      </div>
      <div ref={ref} className="relative">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={`${CHIP} flex items-center gap-1.5 ${activeCount ? "bg-warn/15 text-warn" : "text-soft hover:bg-brand/10"}`}
        >
          <Siren className="size-4" aria-hidden="true" />
          What-if{activeCount ? ` (${activeCount})` : ""}
        </button>
        {open && (
          <div className={`pop-enter absolute top-10 right-0 z-30 w-64 ${PANEL} bg-panel p-1.5`}>
            {SCENARIOS.map((sc) => (
              <label key={sc.key} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-brand/5">
                <input type="checkbox" className="mt-1 accent-[var(--color-brand)]" checked={scenarios[sc.key]} onChange={() => toggleScenario(sc.key)} />
                <span>
                  <span className="block text-[14px] font-medium">{sc.label}</span>
                  <span className="block text-[12.5px] text-soft">{sc.detail}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LayerToggles() {
  const layers = useTwinView((s) => s.layers);
  const setLayer = useTwinView((s) => s.setLayer);
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const items: { key: keyof Layers; label: string }[] = [
    { key: "people", label: "People" },
    { key: "labels", label: "Zone labels" },
    { key: "walls", label: "Full-height walls" },
    { key: "roof", label: "Roof" },
  ];
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={`${PANEL} flex h-10 items-center gap-1.5 px-3 text-[13.5px] font-medium`}>
        <LayersIcon className="size-4 text-brand" aria-hidden="true" />
        Layers
      </button>
      {open && (
        <div className={`pop-enter absolute top-12 right-0 z-30 w-52 ${PANEL} bg-panel p-1.5`}>
          {items.map((it) => (
            <label key={it.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[14px] hover:bg-brand/5">
              <input type="checkbox" className="accent-[var(--color-brand)]" checked={layers[it.key]} onChange={(e) => setLayer(it.key, e.target.checked)} />
              {it.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function ZoneList({ layout }: { layout: BranchLayout }) {
  const zone = useTwinView((s) => s.zone);
  const walking = useTwinView((s) => s.mode === "walk");
  return (
    <div className={`${PANEL} w-52 p-2`}>
      <h2 className="px-1.5 pb-1 text-[12px] font-semibold tracking-wide text-mute uppercase">{walking ? "Walk to" : "Zones"}</h2>
      <ul>
        {layout.zones
          .filter((z) => z.id !== "exterior")
          .map((z) => (
            <li key={z.id}>
              <button
                type="button"
                onClick={() => {
                  if (walking) {
                    useTwinView.getState().setTouring(false);
                    useTwinView.getState().walkToZone(z.id);
                    return;
                  }
                  useTwinView.getState().selectZone(z.id);
                  focusZone(z.id, layout);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13.5px] transition-colors ${
                  zone === z.id ? "bg-brand/12 font-semibold text-ink" : "text-soft hover:bg-brand/5 hover:text-ink"
                }`}
              >
                <span className="size-2.5 shrink-0 rounded-sm" style={{ background: z.color }} />
                <span className="truncate">{z.name}</span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}

function KpiStrip() {
  const sim = useSimVersion();
  if (!sim) return null;
  const k = kpis(sim);
  const items: { label: string; value: string; warn?: boolean }[] = [
    { label: "Waiting", value: String(k.waiting), warn: k.waiting >= 10 },
    { label: "Avg. wait", value: `${k.avgWait.toFixed(1)} min`, warn: k.avgWait > 12 },
    { label: "Served today", value: k.served.toLocaleString() },
    { label: "Counters open", value: `${k.countersOpen}/${k.counters}`, warn: k.countersOpen < k.counters },
    ...(k.atms ? [{ label: "ATMs up", value: `${k.atmUp}/${k.atms}`, warn: k.atmUp < k.atms }] : []),
    { label: "Tokens issued", value: k.tokens.toLocaleString() },
  ];
  return (
    <div className={`${PANEL} flex flex-wrap divide-x divide-line-soft`}>
      {items.map((it) => (
        <div key={it.label} className="min-w-[96px] flex-1 px-3 py-1.5">
          <div className={`text-[19px] leading-tight font-semibold tabular-nums ${it.warn ? "text-warn" : ""}`}>{it.value}</div>
          <div className="text-[12px] text-soft">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

function BranchSwitcher({ branch }: { branch: Branch }) {
  const { primary } = useBranches();
  const navigate = useNavigate();
  const options = primary.some((b) => b.id === branch.id) ? primary : [branch, ...primary];
  return (
    <label className="flex items-center gap-1.5 text-[12.5px] text-soft">
      <span className="sr-only">Switch branch</span>
      <select
        value={branch.id}
        onChange={(e) => navigate(`/branches/${e.target.value}/twin`)}
        className="h-8 max-w-[220px] rounded-md border border-line bg-panel px-2 text-[13px] text-ink outline-none focus:border-brand"
      >
        {options.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function TwinView({ branch }: { branch: Branch }) {
  const config = useConfig();
  const { islamicLabel } = useBrand();
  const layout = useMemo(() => buildBranchLayout(branch, islamicLabel), [branch, islamicLabel]);
  // Only render once the simulation belongs to this branch, never the previous one's.
  const sim = useBranchSim((s) => (s.sim?.branchId === branch.id ? s.sim : null));
  const selected = useTwinView((s) => s.selected);
  const [ready, setReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => window.matchMedia("(min-width: 64rem)").matches);
  const panelRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const mode = useTwinView((s) => s.mode);
  const panelsHidden = useTwinView((s) => s.panelsHidden);
  const setLastTwinBranch = useUi((s) => s.setLastTwinBranch);
  const [supported] = useState(webglAvailable);

  // A fresh simulation and view for each branch.
  useEffect(() => {
    const names = getEmployees(branch).map((e) => e.name);
    useBranchSim.getState().init(branch, layout, names, config.twin.simSpeed);
    useTwinView.getState().reset({ people: config.twin.showPeople, roof: config.twin.showRoof, walls: true });
    useTwinView.getState().setLighting(config.twin.lighting ?? "day");
    preloadModels();
    const start = viewPose("exterior", layout);
    useTwinView.getState().flyTo(start.pos, start.target);
    setLastTwinBranch(branch.id);
    setReady(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // Real Customer 360 customers linked to this branch walk in as the visitors.
  const { customers: c360Customers } = useBranchCustomers(branch);
  const rosterKey = c360Customers.map((c) => c.unified_customer_id).join(",");
  useEffect(() => {
    if (!sim) return;
    useBranchSim.getState().setRoster(c360Customers.map((c) => ({ id: c.unified_customer_id, name: c.full_name, tier: c.churn_risk_tier })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey, sim]);

  // Picking something in the scene opens the panel that describes it.
  useEffect(() => {
    if (!selected) return;
    setPanelOpen(true);
    if (useTwinView.getState().panelsHidden) useTwinView.getState().togglePanels();
  }, [selected]);

  // Keep the 3D view centred beside the inspector.
  useEffect(() => {
    const el = panelRef.current;
    const wide = window.matchMedia("(min-width: 64rem)");
    if (!el || !panelOpen || panelsHidden) {
      useTwinView.getState().setInsetRight(0);
      return;
    }
    const measure = () => useTwinView.getState().setInsetRight(wide.matches ? el.offsetWidth + 16 : 0);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => {
      observer.disconnect();
      useTwinView.getState().setInsetRight(0);
    };
  }, [panelOpen, sim, panelsHidden]);

  // Keyboard: 1–5 views, Esc clears, space pauses.
  useEffect(() => {
    const views = Object.keys(VIEW_LABELS) as ViewId[];
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, select, textarea")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const walking = useTwinView.getState().mode === "walk";
      const key = e.key.toLowerCase();
      const n = Number(e.key);
      if (n >= 1 && n <= views.length) goToView(views[n - 1], layout);
      else if (!walking && key === "e") enterMode("exterior", layout, config.twin.showRoof);
      else if (!walking && key === "i") enterMode("interior", layout, config.twin.showRoof);
      else if (!walking && key === "w") enterMode("walk", layout, config.twin.showRoof);
      else if (key === "h") useTwinView.getState().togglePanels();
      else if (key === "n") useTwinView.getState().setLighting(useTwinView.getState().lighting === "day" ? "night" : "day");
      else if (key === "f") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void mainRef.current?.requestFullscreen?.();
      } else if (e.key === "Escape" && !document.pointerLockElement) useTwinView.setState({ selected: null, zone: null });
      else if (e.key === " ") {
        e.preventDefault();
        useBranchSim.getState().togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const fallback = (
    <div className="grid h-full place-items-center p-6 text-center">
      <div className="max-w-md">
        <Building2 className="mx-auto size-12 text-brand" strokeWidth={1.3} aria-hidden="true" />
        <h2 className="mt-2 text-[22px] font-bold">3D view unavailable</h2>
        <p className="mt-1 text-[15px] text-soft">
          This browser or device can’t run WebGL, so the 3D twin can’t be shown. The live figures are still available in the panel.
        </p>
      </div>
    </div>
  );

  return (
    <main ref={mainRef} className="relative h-[calc(100vh-70px)] min-h-[520px] overflow-hidden bg-[#dfe6ec] [&:fullscreen]:h-screen">
      <div className="absolute inset-0">
        {supported && sim ? (
          <SceneBoundary fallback={fallback}>
            <Suspense fallback={null}>
              <BranchScene
                layout={layout}
                branchName={branch.name}
                quality={config.twin.quality}
                signage={config.twin.showSignage}
                sensitivity={config.twin.walkSensitivity ?? 1}
                onReady={() => setReady(true)}
              />
            </Suspense>
          </SceneBoundary>
        ) : (
          !supported && fallback
        )}
      </div>

      {!ready && supported && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className={`${PANEL} flex items-center gap-2.5 px-4 py-3 text-[15px]`}>
            <Loader2 className="size-5 animate-spin text-brand" aria-hidden="true" />
            Building {branch.name}…
          </div>
        </div>
      )}

      {panelsHidden && (
        <button
          type="button"
          onClick={() => useTwinView.getState().togglePanels()}
          title="Show panels (H)"
          className={`${PANEL} absolute top-3 left-3 flex items-center gap-1.5 px-3 py-2 text-[13.5px] font-medium`}
        >
          <Eye className="size-4 text-brand" aria-hidden="true" /> Show panels
        </button>
      )}

      {/* Top-left: branch identity, view presets */}
      <div className={`pointer-events-none absolute top-3 left-3 flex max-w-[calc(100%-24px)] flex-col gap-2 lg:right-[400px] ${panelsHidden ? "hidden" : ""}`}>
        <div className={`${PANEL} pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 self-start px-3 py-2`}>
          <Link
            to={`/?branch=${branch.id}`}
            className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[13px] transition-colors hover:bg-brand/10"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Map
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-[18px] leading-tight font-bold">{branch.name}</h1>
            <p className="text-[12.5px] text-soft">
              {branch.id} · {branch.type} · {branch.city}
            </p>
          </div>
          <StatusBadge status={branch.status} variant="pill" />
          <BranchSwitcher branch={branch} />
        </div>
        <div className="pointer-events-auto relative z-20 flex flex-wrap items-start gap-2 self-start">
          <SimControls />
          <ModeSwitch layout={layout} showRoof={config.twin.showRoof} />
          <div className={`${PANEL} flex items-center gap-0.5 p-1 ${mode === "walk" ? "hidden" : ""}`}>
            <Eye className="mx-1.5 size-4 text-brand" aria-hidden="true" />
            {(Object.keys(VIEW_LABELS) as ViewId[]).map((v, i) => (
              <button key={v} type="button" title={`${VIEW_LABELS[v]} (${i + 1})`} onClick={() => goToView(v, layout)} className={`${CHIP} text-soft hover:bg-brand/10 hover:text-ink`}>
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
          <LayerToggles />
          <button
            type="button"
            onClick={() => useTwinView.getState().togglePanels()}
            title="Hide panels to see the twin (H)"
            className={`${PANEL} flex h-10 items-center gap-1.5 px-3 text-[13.5px] font-medium`}
          >
            <EyeOff className="size-4 text-brand" aria-hidden="true" />
            Hide panels
          </button>
        </div>
        <div className="pointer-events-auto self-start max-xl:hidden">
          <ZoneList layout={layout} />
        </div>
      </div>

      {/* Bottom: live KPIs */}
      <div className={`pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-24px)] lg:right-[400px] [&>*]:pointer-events-auto ${panelsHidden ? "hidden" : ""}`}>
        <KpiStrip />
        <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-soft">
          <Users className="size-3.5" aria-hidden="true" />
          Illustrative model and simulated activity. Drag to orbit · scroll to zoom · E / I / W exterior, interior, walk · H hide panels · N night · F fullscreen · space to pause.
        </p>
      </div>

      {mode === "walk" && ready && !panelsHidden && <WalkHud layout={layout} showRoof={config.twin.showRoof} />}
      <div className={`absolute top-1/2 right-3 -translate-y-1/2 ${panelOpen && !panelsHidden ? "lg:right-[396px]" : ""}`}>
        <ViewControls layout={layout} showRoof={config.twin.showRoof} container={mainRef} />
      </div>

      {/* Right: inspector */}
      {panelOpen ? (
        <aside
          ref={panelRef}
          aria-label="Twin inspector"
          className={`${PANEL} panel-enter absolute top-3 right-3 bottom-3 w-[372px] max-w-[calc(100%-24px)] overflow-hidden bg-panel/96 max-lg:top-auto max-lg:h-[55%] ${panelsHidden ? "hidden" : ""}`}
        >
          <Inspector branch={branch} layout={layout} onClose={() => setPanelOpen(false)} />
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className={`${PANEL} absolute top-3 right-3 flex items-center gap-1.5 px-3 py-2 text-[13.5px] font-medium ${panelsHidden ? "hidden" : ""}`}
        >
          <PanelRightOpen className="size-4 text-brand" aria-hidden="true" /> Details
        </button>
      )}
    </main>
  );
}

export default function BranchTwin() {
  const { branchId } = useParams();
  const { getBranch, primary } = useBranches();
  const branch = getBranch(branchId);
  if (!branch) return <Navigate to={primary[0] ? `/branches/${primary[0].id}/twin` : "/branches"} replace />;
  return <TwinView key={branch.id} branch={branch} />;
}
