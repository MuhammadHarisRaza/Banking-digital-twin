import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Building2,
  Check,
  Download,
  FileUp,
  LayoutGrid,
  Link2,
  Palette,
  Plus,
  RotateCcw,
  Sparkles,
  Store,
  Trash2,
  Upload,
  UserRound,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useSearchParams } from "react-router";
import { BANK_CODE, bankCode, DEFAULT_TWIN_API_URL, MODULE_DEFAULTS, MODULE_GROUPS, type BankConfig, type SimSpeed, type ThemeTokens, type TwinQuality } from "../config/bankConfig";
import { APP_LINKS } from "../config/appLinks";
import { contrast, derivePalette } from "../config/color";
import { isBundledBank, neutralOrganisation, staleOrganisation } from "../config/brandMatch";
import { resolveImage } from "../config/images";
import { getPreset, PRESETS } from "../config/presets";
import { useBrand } from "../config/useBrand";
import { listLabel, parseBranchFile, TEMPLATE_CSV, TEMPLATE_JSON, type ImportResult } from "../data/branchSource";
import { computeNetwork } from "../data/bankData";
import { presetBranches, useBranches } from "../data/branches";
import { useBranchLink } from "../c360/branchLink";
import { c360Fetch } from "../c360/client";
import { ageOf, branchOfDevice, EMPTY_MAPPING, metricValue, saveMapping, useTwinState, type Mapping } from "../digitalEye/api";
import ImportBundle from "../components/c360/ImportBundle";
import { twinFetch, useAdminKey, type C360ImportConfig } from "../twinApi/client";
import { invalidate } from "../c360/query";
import { buildBranchLayout } from "../twin/layout/buildBranchLayout";
import { formatNumber } from "../lib/seeded";
import { useBranchData } from "../store/branchDataStore";
import { useDirty, useDraft, useSettingsDraft } from "../store/settingsDraft";
import { useSettings } from "../store/settingsStore";
import type { AppLinkKey } from "../types";
import { Advanced, Card, ColorField, GRID, ImageField, INPUT, NumberField, SelectField, TextField, Toggle } from "./settings/fields";

type TabId = "brand" | "theme" | "organisation" | "profile" | "branches" | "modules" | "twin" | "integrations" | "backup";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "brand", label: "Brand", icon: Sparkles },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "organisation", label: "Organisation", icon: Building2 },
  { id: "profile", label: "User profile", icon: UserRound },
  { id: "branches", label: "Branches", icon: Store },
  { id: "modules", label: "Dashboard & menu", icon: LayoutGrid },
  { id: "twin", label: "3D Twin", icon: Box },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "backup", label: "Presets & backup", icon: Download },
];

const BUTTON = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel px-3 text-[13.5px] transition-colors hover:bg-brand/10";
const PRIMARY = "inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-bright";

function useSection<S extends keyof BankConfig>(section: S) {
  const value = useDraft((s) => s.config[section]);
  const update = useDraft((s) => s.update);
  const resetSection = useDraft((s) => s.resetSection);
  return {
    value,
    set: (patch: Partial<BankConfig[S]>) => update(section as Exclude<S, "version" | "presetId">, patch as never),
    reset: () => resetSection(section as Exclude<S, "version" | "presetId">),
  };
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={BUTTON} onClick={onClick}>
      <RotateCcw className="size-4" aria-hidden="true" /> Reset section
    </button>
  );
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

const STALE_LABEL: Record<string, string> = {
  hqName: "head office name",
  hqLocation: "head office address",
  registeredOffice: "registered office",
  islamicLabel: "Islamic banking brand",
  networkSource: "figure sources",
  branchFootnote: "branch footnote",
  hqFootnote: "headquarters footnote",
  deposits: "deposits",
  milestones: "milestones",
  photos: "head office photos",
  branchPhotos: "branch photos setting",
  tagline: "tagline (“where you come first”)",
};

/**
 * After the bank is renamed, organisation details and the branch list may still be UBL's. Says what
 * is left over and offers to replace it with neutral placeholders in one step.
 */
function RebrandNotice({ onBranches }: { onBranches: () => void }) {
  const config = useDraft((s) => s.config);
  const update = useDraft((s) => s.update);
  const { all, isDefault } = useBranches();
  if (isBundledBank(config.brand)) return null;
  const stale = staleOrganisation(config);
  if (!stale.length && !isDefault) return null;
  const name = config.brand.shortName || config.brand.bankName;
  return (
    <div role="status" className="mb-5 rounded-xl border border-warn/40 bg-warn/8 p-4">
      <h2 className="text-[16px] font-semibold">Some content still belongs to UBL</h2>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[14px] text-soft">
        {stale.length > 0 && (
          <li>
            Organisation details: {stale.map((k) => STALE_LABEL[k] ?? k).join(", ")}. UBL’s photographs are already hidden for {name}.
          </li>
        )}
        {isDefault && <li>The branch list is UBL’s published network ({formatNumber(all.length)} branches). Import {name}’s own list to replace it.</li>}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {stale.length > 0 && (
          <button
            type="button"
            onClick={() => {
              update("organisation", neutralOrganisation(config, all.length, all.filter((b) => b.type === "Islamic").length));
              if (stale.includes("tagline")) update("brand", { tagline: "" });
            }}
            className="rounded-lg bg-brand px-3 py-2 text-[14px] font-semibold text-white hover:bg-brand-bright"
          >
            Replace UBL details with placeholders for {name}
          </button>
        )}
        {isDefault && (
          <button type="button" onClick={onBranches} className="rounded-lg border border-line bg-panel px-3 py-2 text-[14px] font-medium hover:bg-brand/10">
            Import a branch list
          </button>
        )}
      </div>
    </div>
  );
}

function BrandTab() {
  const { value: brand, set, reset } = useSection("brand");
  const presetId = useDraft((s) => s.config.presetId);
  const theme = useDraft((s) => s.config.theme);
  const update = useDraft((s) => s.update);
  const base = getPreset(presetId)?.config.brand;
  const ctx = { shortName: brand.shortName, tagline: brand.tagline, brand: theme.brand, bundled: isBundledBank(brand) };
  return (
    <Card title="Brand" description="The bank's name, logo and colour. They re-brand the header, pages, browser tab, charts, map and the branch twins' signage." action={<ResetButton onClick={reset} />}>
      <div className={GRID}>
        <TextField label="Bank name" value={brand.bankName} onChange={(bankName) => set({ bankName })} hint="Full legal name, shown on branch signage." />
        <TextField label="Short name" value={brand.shortName} onChange={(shortName) => set({ shortName })} hint={`Used in sentences, e.g. “${brand.shortName || "the bank"}’s branches”.`} />
        <ImageField
          label="Logo"
          value={brand.logo}
          preview={resolveImage(brand.logo, ctx, "logo")}
          defaultValue={base?.logo ?? "wordmark"}
          onChange={(logo) => set({ logo })}
          allowWordmark
          hint="PNG with a transparent background or SVG works best. Large images are reduced to 512 px."
        />
        <ColorField
          label="Brand colour"
          value={theme.brand}
          onChange={(c) => update("theme", { ...derivePalette(c, theme.accent), islamic: theme.islamic })}
          hint="The rest of the palette follows it. Fine-tune every colour in the Theme tab."
        />
      </div>
      <Advanced>
        <div className={GRID}>
          <TextField label="Tagline" value={brand.tagline} onChange={(tagline) => set({ tagline })} />
          <TextField label="Product name" value={brand.productName} onChange={(productName) => set({ productName })} hint="Shown beside the logo in the header." />
          <TextField label="Dashboard title" value={brand.dashboardTitle} onChange={(dashboardTitle) => set({ dashboardTitle })} />
          <ImageField
            label="Browser icon"
            value={brand.favicon}
            preview={resolveImage(brand.favicon, ctx, "icon")}
            defaultValue={base?.favicon ?? "wordmark"}
            onChange={(favicon) => set({ favicon })}
            allowWordmark
            maxSize={128}
            hint="“Generate from name” draws a monogram in the brand colour."
          />
        </div>
      </Advanced>
    </Card>
  );
}

const TOKEN_LABELS: [keyof ThemeTokens, string][] = [
  ["brand", "Primary (brand)"],
  ["brandBright", "Primary, darker"],
  ["accent", "Secondary accent"],
  ["ink", "Text"],
  ["soft", "Secondary text"],
  ["mute", "Muted text"],
  ["page", "Page background"],
  ["card", "Card background"],
  ["line", "Borders"],
  ["lineSoft", "Light borders"],
  ["mapDot", "Map branch dots"],
  ["islamic", "Islamic branch accent"],
  ["ok", "Success"],
  ["warn", "Warning"],
];

function ThemeTab() {
  const { value: theme, set, reset } = useSection("theme");
  const [advanced, setAdvanced] = useState(false);
  const ratio = contrast(theme.brand, "#ffffff");
  const textRatio = contrast(theme.ink, theme.page);
  return (
    <Card title="Theme" description="Pick the bank's primary colour and the rest of the palette follows: borders, backgrounds, charts, map and twin." action={<ResetButton onClick={reset} />}>
      <div className={GRID}>
        <ColorField
          label="Primary colour"
          value={theme.brand}
          onChange={(brand) => set({ ...derivePalette(brand, theme.accent), islamic: theme.islamic })}
          hint="Changing it regenerates the matching palette."
        />
        <ColorField label="Secondary accent" value={theme.accent} onChange={(accent) => set({ accent })} hint="Second action button and highlights." />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Palette preview">
        {(["brand", "brandBright", "accent", "ink", "soft", "page", "card", "line", "mapDot"] as const).map((k) => (
          <span key={k} title={k} className="size-9 rounded-lg border border-line" style={{ background: theme[k] }} />
        ))}
      </div>
      {(ratio < 4.5 || textRatio < 4.5) && (
        <p className="mt-3 rounded-lg bg-warn/12 px-3 py-2 text-[13.5px] text-warn">
          {ratio < 4.5 && `White text on the primary colour has a contrast of ${ratio.toFixed(1)}:1; 4.5:1 is needed to stay readable. `}
          {textRatio < 4.5 && `Text on the page background has a contrast of ${textRatio.toFixed(1)}:1.`}
        </p>
      )}
      <div className="mt-4 space-y-1">
        <Toggle label="Tint the map in the brand colour" checked={theme.tintMap} onChange={(tintMap) => set({ tintMap })} hint="Rotates the terrain image's hue to match the primary colour." />
      </div>
      <button type="button" className={`${BUTTON} mt-4`} onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>
        {advanced ? "Hide" : "Show"} every colour
      </button>
      {advanced && (
        <div className={`${GRID} mt-4`}>
          {TOKEN_LABELS.map(([key, label]) => (
            <ColorField key={key} label={label} value={theme[key]} onChange={(v) => set({ [key]: v } as Partial<BankConfig["theme"]>)} />
          ))}
        </div>
      )}
    </Card>
  );
}

function OrganisationTab() {
  const { value: org, set, reset } = useSection("organisation");
  const brand = useDraft((s) => s.config.brand);
  const color = useDraft((s) => s.config.theme.brand);
  const presetId = useDraft((s) => s.config.presetId);
  const base = getPreset(presetId)?.config.organisation;
  const { all, source } = useBranches();
  const net = useMemo(() => computeNetwork(all), [all]);
  const ctx = { shortName: brand.shortName, tagline: brand.tagline, brand: color, bundled: isBundledBank(brand) };
  const setMilestone = (i: number, patch: Partial<BankConfig["organisation"]["milestones"][number]>) =>
    set({ milestones: org.milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const figures: [string, number][] = [
    ["Branches", net.branches],
    ["Islamic branches", net.islamicBranches],
    ["Staff", net.staff],
    ["Cities", net.cities],
  ];

  return (
    <div className="space-y-5">
      <Card title="Headquarters" description="Shown on the dashboard card, the map's HQ marker and the Headquarters page." action={<ResetButton onClick={reset} />}>
        <div className={GRID}>
          <TextField label="Name" value={org.hqName} onChange={(hqName) => set({ hqName })} />
          <TextField label="Location" value={org.hqLocation} onChange={(hqLocation) => set({ hqLocation })} />
          <ImageField label="Headquarters photo (dashboard card)" value={org.hqImage} preview={resolveImage(org.hqImage, ctx)} defaultValue={base?.hqImage ?? ""} onChange={(hqImage) => set({ hqImage })} maxSize={1200} />
          <ImageField label="Headquarters photo (page banner)" value={org.hqAerialImage} preview={resolveImage(org.hqAerialImage, ctx)} defaultValue={base?.hqAerialImage ?? ""} onChange={(hqAerialImage) => set({ hqAerialImage })} maxSize={1600} />
        </div>
      </Card>

      <Card
        title="Network figures"
        description={`Calculated from ${listLabel(source, brand.shortName)}, so they always match the map and the Branches page. Import a different list in the Branches tab.`}
      >
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {figures.map(([l, v]) => (
            <div key={l} className="rounded-lg border border-line-soft bg-card/60 px-3 py-2">
              <dd className="text-[20px] leading-tight font-semibold tabular-nums">{formatNumber(v)}</dd>
              <dt className="text-[13px] text-soft">{l}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[12.5px] text-mute">Applications and AI agents are counted from the platform’s own catalogue; head-office staff is estimated at 14% of branch staff.</p>
        <div className={`${GRID} mt-4`}>
          <TextField label="Deposits (optional)" value={org.deposits} onChange={(deposits) => set({ deposits })} placeholder="e.g. PKR 5.2 Tn" hint="Not in any branch list. Left empty, it is not shown." />
          <TextField label="Digital customers (optional)" value={org.digitalCustomers} onChange={(digitalCustomers) => set({ digitalCustomers })} placeholder="e.g. 5M+" hint="Left empty, it is not shown." />
        </div>
      </Card>

      <Card title="Region">
        <div className={GRID}>
          <TextField label="Country" value={org.country} onChange={(country) => set({ country })} hint="Used in labels; the map itself covers Pakistan." />
          <TextField label="Currency code" value={org.currency} onChange={(currency) => set({ currency })} />
          <TextField label="Islamic banking brand" value={org.islamicLabel} onChange={(islamicLabel) => set({ islamicLabel })} hint="Shown on Islamic branch signage in the 3D twin." />
        </div>

        <Advanced summary="Advanced: milestones, footnotes, sources, map position, number format">
          <div className={GRID}>
            <TextField label="Registered office" value={org.registeredOffice} onChange={(registeredOffice) => set({ registeredOffice })} wide />
            <NumberField label="Head office latitude" value={org.hqLat} onChange={(hqLat) => set({ hqLat })} step={0.0001} />
            <NumberField label="Head office longitude" value={org.hqLng} onChange={(hqLng) => set({ hqLng })} step={0.0001} />
            <SelectField
              label="Number format"
              value={org.locale}
              onChange={(locale) => set({ locale })}
              options={[
                { value: "en-US", label: "1,234,567 (international)" },
                { value: "en-PK", label: "12,34,567 (South Asian)" },
                { value: "en-GB", label: "1,234,567 (UK)" },
                { value: "ar-SA", label: "Arabic digits" },
              ]}
            />
            <TextField label="Source of deposits and digital customers" value={org.networkSource} onChange={(networkSource) => set({ networkSource })} />
            <TextField label="Branch panel footnote" value={org.branchFootnote} onChange={(branchFootnote) => set({ branchFootnote })} wide />
            <TextField label="Headquarters footnote" value={org.hqFootnote} onChange={(hqFootnote) => set({ hqFootnote })} wide />
          </div>
          <div className="mt-3">
            <Toggle
              label="Show branch photographs"
              checked={org.useBranchPhotos}
              onChange={(useBranchPhotos) => set({ useBranchPhotos })}
              hint="The bundled photos show UBL branches, so they only appear while the bank is UBL; other banks get a branded placeholder."
            />
          </div>
          <div className="mt-5 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">Milestones</h3>
              <p className="text-[13px] text-soft">Listed on the Headquarters page; the first three also appear as notifications.</p>
            </div>
            <button type="button" className={BUTTON} onClick={() => set({ milestones: [...org.milestones, { title: "New milestone", detail: "", time: "" }] })}>
              <Plus className="size-4" aria-hidden="true" /> Add
            </button>
          </div>
          <ul className="mt-3 space-y-3">
            {org.milestones.map((m, i) => (
              <li key={i} className="grid gap-2 rounded-lg border border-line-soft bg-card/50 p-3 sm:grid-cols-[1.4fr_1.4fr_0.6fr_auto]">
                <input aria-label="Title" value={m.title} onChange={(e) => setMilestone(i, { title: e.target.value })} className={INPUT} placeholder="Title" />
                <input aria-label="Detail" value={m.detail} onChange={(e) => setMilestone(i, { detail: e.target.value })} className={INPUT} placeholder="Detail" />
                <input aria-label="Date" value={m.time} onChange={(e) => setMilestone(i, { time: e.target.value })} className={INPUT} placeholder="Dec 2025" />
                <button
                  type="button"
                  aria-label={`Remove ${m.title}`}
                  onClick={() => set({ milestones: org.milestones.filter((_, j) => j !== i) })}
                  className="grid size-10 place-items-center rounded-lg border border-line hover:bg-brand/10"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </Advanced>
      </Card>
    </div>
  );
}

function ProfileTab() {
  const { value: user, set, reset } = useSection("user");
  return (
    <Card title="User profile" description="The demo user shown in the header's profile menu." action={<ResetButton onClick={reset} />}>
      <div className={GRID}>
        <TextField label="Name" value={user.name} onChange={(name) => set({ name })} />
        <TextField label="Initials" value={user.initials} onChange={(initials) => set({ initials: initials.slice(0, 3).toUpperCase() })} />
        <TextField label="Role" value={user.role} onChange={(role) => set({ role })} wide />
      </div>
    </Card>
  );
}

function BranchesTab() {
  const dataset = useBranchData((s) => s.dataset);
  const setDataset = useBranchData((s) => s.setDataset);
  const clearDataset = useBranchData((s) => s.clearDataset);
  const { all, source } = useBranches();
  const savedPreset = useSettings((s) => s.config.presetId);
  const presetName = getPreset(savedPreset)?.name ?? "the preset";
  const presetSource = presetBranches(savedPreset).source;
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<(ImportResult & { name: string }) | null>(null);
  const [error, setError] = useState("");

  const counts = useMemo(() => {
    const by = { Retail: 0, Islamic: 0, Corporate: 0 };
    all.forEach((b) => by[b.type]++);
    return by;
  }, [all]);

  return (
    <Card title="Branch list" description="Branches drawn on the map, listed on the Branches page and available as 3D twins.">
      <p className="text-[15px]">
        <span className="font-semibold">{formatNumber(all.length)} branches</span> from{" "}
        {source === "imported"
          ? `“${dataset?.name}”, imported ${new Date(dataset!.importedAt).toLocaleString()}`
          : source === "preset"
            ? `${presetName}’s sample list (it comes with the preset)`
            : "the bundled published list"}
        .
        <span className="text-soft">
          {" "}
          {counts.Retail} retail · {counts.Islamic} Islamic · {counts.Corporate} corporate.
        </span>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={PRIMARY} onClick={() => input.current?.click()}>
          <FileUp className="size-4" aria-hidden="true" /> Import CSV or JSON
        </button>
        <button type="button" className={BUTTON} onClick={() => download("branch-template.csv", TEMPLATE_CSV, "text/csv")}>
          <Download className="size-4" aria-hidden="true" /> CSV template
        </button>
        <button type="button" className={BUTTON} onClick={() => download("branch-template.json", TEMPLATE_JSON, "application/json")}>
          <Download className="size-4" aria-hidden="true" /> JSON template
        </button>
        {source === "imported" && (
          <button
            type="button"
            className={BUTTON}
            onClick={() => {
              clearDataset();
              setResult(null);
            }}
          >
            <RotateCcw className="size-4" aria-hidden="true" /> {presetSource === "preset" ? "Use the preset’s branch list" : "Restore the published list"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept=".csv,.json,text/csv,application/json"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setError("");
          setResult(null);
          try {
            const parsed = parseBranchFile(await file.text(), file.name);
            if (!parsed.branches.length) throw new Error("No usable branches were found in that file.");
            setDataset(file.name, parsed.branches);
            setResult({ ...parsed, name: file.name });
          } catch (err) {
            setError(err instanceof Error ? err.message : "The file could not be imported.");
          }
        }}
      />
      {error && <p className="mt-3 rounded-lg bg-[#e05252]/10 px-3 py-2 text-[14px] text-[#b42f2f]">{error}</p>}
      {result && (
        <div className="mt-3 rounded-lg bg-ok/10 px-3 py-2 text-[14px]">
          <p className="flex items-center gap-1.5 font-medium text-ok">
            <Check className="size-4" aria-hidden="true" /> Imported {formatNumber(result.branches.length)} branches from {result.name}.
          </p>
          {result.skipped.length > 0 && (
            <details className="mt-1 text-soft">
              <summary className="cursor-pointer">{result.skipped.length} rows skipped</summary>
              <ul className="thin-scroll mt-1 max-h-40 overflow-auto text-[13px]">
                {result.skipped.slice(0, 200).map((s) => (
                  <li key={s.row}>
                    Row {s.row}: {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <p className="mt-4 text-[13px] leading-relaxed text-mute">
        Required columns: <code>name</code>, <code>city</code>, <code>lat</code>, <code>lng</code>. Optional: <code>code</code>, <code>type</code> (Retail,
        Islamic or Corporate), <code>province</code>, <code>address</code>, <code>atm</code>, <code>lockers</code>, <code>saturday</code>, <code>area</code>.
        Locations must fall on the map of Pakistan. The list is kept in this browser only.
      </p>
    </Card>
  );
}

function ModulesTab() {
  const modules = useDraft((s) => s.config.modules);
  const setModule = useDraft((s) => s.setModule);
  const update = useDraft((s) => s.update);
  return (
    <Card
      title="Dashboard & menu"
      description="Show, hide or rename each part of the dashboard and each menu item."
      action={
        <button type="button" className={BUTTON} onClick={() => update("modules", MODULE_DEFAULTS)}>
          <RotateCcw className="size-4" aria-hidden="true" /> Reset section
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {MODULE_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-[13px] font-semibold tracking-wide text-mute uppercase">{group.title}</h3>
            <ul className="mt-2 divide-y divide-line-soft rounded-lg border border-line-soft">
              {group.ids.map((id) => (
                <li key={id} className="flex items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Show ${modules[id].label}`}
                    checked={modules[id].visible}
                    onChange={(e) => setModule(id, { visible: e.target.checked })}
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  <input
                    aria-label={`Label for ${MODULE_DEFAULTS[id].label}`}
                    value={modules[id].label}
                    onChange={(e) => setModule(id, { label: e.target.value })}
                    className={`${INPUT} h-9 ${modules[id].visible ? "" : "text-mute line-through"}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TwinTab() {
  const { value: twin, set, reset } = useSection("twin");
  return (
    <Card title="3D branch twin" description="Defaults for every branch twin." action={<ResetButton onClick={reset} />}>
      <div className={GRID}>
        <SelectField<TwinQuality>
          label="Rendering quality"
          value={twin.quality}
          onChange={(quality) => set({ quality })}
          options={[
            { value: "auto", label: "Automatic (lowers itself on slow devices)" },
            { value: "high", label: "High (shadows and ambient occlusion)" },
            { value: "low", label: "Low (for older laptops)" },
          ]}
        />
        <SelectField<SimSpeed>
          label="Default simulation speed"
          value={twin.simSpeed}
          onChange={(simSpeed) => set({ simSpeed })}
          options={[
            { value: 1, label: "1× real time" },
            { value: 10, label: "10× (recommended for demos)" },
            { value: 60, label: "60× (one hour per minute)" },
          ]}
        />
        <SelectField<"day" | "night">
          label="Opening lighting"
          value={twin.lighting ?? "day"}
          onChange={(lighting) => set({ lighting })}
          options={[
            { value: "day", label: "Day" },
            { value: "night", label: "Night (interior and signs lit)" },
          ]}
          hint="Switch any time in the twin with the moon button or the N key."
        />
        <SelectField<number>
          label="Walkthrough mouse sensitivity"
          value={twin.walkSensitivity ?? 1}
          onChange={(walkSensitivity) => set({ walkSensitivity })}
          options={[
            { value: 0.5, label: "Low" },
            { value: 0.75, label: "Below normal" },
            { value: 1, label: "Normal" },
            { value: 1.4, label: "High" },
            { value: 2, label: "Very high" },
          ]}
        />
      </div>
      <div className="mt-4 space-y-2">
        <Toggle label="Show people" checked={twin.showPeople} onChange={(showPeople) => set({ showPeople })} hint="Customers and staff moving through the branch." />
        <Toggle label="Show signage" checked={twin.showSignage} onChange={(showSignage) => set({ showSignage })} hint="Fascia, pylon and ATM signs drawn from the brand settings." />
        <Toggle label="Show roof by default" checked={twin.showRoof} onChange={(showRoof) => set({ showRoof })} />
      </div>
      <div className={`${GRID} mt-4`}>
        <TextField
          wide
          label="Camera clip (optional)"
          value={twin.cameraVideo}
          onChange={(cameraVideo) => set({ cameraVideo })}
          placeholder="https://… or /videos/atm-camera.mp4"
          hint="Selecting an ATM or a CCTV camera plays footage matched to what it watches (from public/videos). Give an MP4 or WebM address here to play your own clip first on every camera. The live 3D view stays available as the Twin view tab."
        />
      </div>
    </Card>
  );
}

/** Our own backend (banking-twin-api): its address, a connection test and the admin key (kept in this browser). */
function TwinApiCard() {
  const url = useDraft((s) => s.config.integrations.twinApi.url);
  const integrations = useDraft((s) => s.config.integrations);
  const update = useDraft((s) => s.update);
  const adminKey = useAdminKey((s) => s.key);
  const setAdminKey = useAdminKey((s) => s.set);
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);
  const setUrl = (next: string) => update("integrations", { ...integrations, twinApi: { url: next } });

  const runTest = async () => {
    setTest({ ok: true, text: "Testing…" });
    try {
      const cfg = await twinFetch<C360ImportConfig>(url, "/api/twin/v1/c360/config");
      setTest({
        ok: true,
        text: `Connected. C360 import ${cfg.import_enabled ? "is on" : "is off on the server (no C360_SERVICE_TOKEN)"}.`,
      });
      invalidate("twin-c360-config|");
    } catch (e) {
      setTest({ ok: false, text: (e as Error).message });
    }
  };

  return (
    <Card
      title="Digital Twin API"
      description="Our own backend (banking-twin-api). Digital Eye sends its data there, and imports to Customer 360 go through it. Shared by the Digital Eye and Customer 360 cards below."
    >
      <div className={GRID}>
        <TextField
          wide
          label="Address"
          value={url}
          onChange={setUrl}
          placeholder={DEFAULT_TWIN_API_URL}
          hint="Its root, e.g. https://banking-twin-api.waiindustries.org. Its CORS_ORIGINS setting must include this site's address. Saved with Save changes."
        />
        <label className="flex flex-col gap-1 text-[14px] font-medium sm:col-span-2">
          Admin key
          <input
            type="password"
            autoComplete="off"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="TWIN_ADMIN_KEY from the API server"
            className={`${INPUT} h-10`}
          />
          <span className="text-[12.5px] font-normal text-mute">
            Needed to save the Digital Eye mapping and to import into Customer 360. Kept in this browser only, never in exported settings.
          </span>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={BUTTON} onClick={runTest} disabled={!url.trim()}>
          Test connection
        </button>
        <button type="button" className={BUTTON} onClick={() => setUrl(DEFAULT_TWIN_API_URL)}>
          <RotateCcw className="size-4" aria-hidden="true" /> Default address
        </button>
        {test && <span className={`text-[13.5px] ${test.ok ? "text-ok" : "text-[#c03838]"}`}>{test.text}</span>}
      </div>
    </Card>
  );
}

/** Customer 360 (RM Buddy) API: on/off, address, connection test and the C360 → branch mapping. */
function C360Card() {
  const c360 = useDraft((s) => s.config.integrations.c360);
  const update = useDraft((s) => s.update);
  const integrations = useDraft((s) => s.config.integrations);
  const { all, getBranch } = useBranches();
  const { link, loading, error, truncated } = useBranchLink();
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);
  const setC360 = (patch: Partial<typeof c360>) => update("integrations", { ...integrations, c360: { ...c360, ...patch } });
  const shortName = useDraft((s) => s.config.brand.shortName);
  const derivedCode = bankCode("", shortName);
  const effectiveCode = bankCode(c360.sourceSystem, shortName);

  const runTest = async () => {
    setTest({ ok: true, text: "Testing…" });
    try {
      const { data } = await c360Fetch<{ customer_count: number; last_enriched_at: string }>("/dashboard/metrics", undefined, undefined, c360.baseUrl);
      setTest({ ok: true, text: `Connected: ${formatNumber(data.customer_count)} customers, last updated ${new Date(data.last_enriched_at).toLocaleString()}.` });
    } catch (e) {
      setTest({ ok: false, text: (e as Error).message });
    }
  };

  return (
    <Card
      title="Customer 360 (C360)"
      description="Real customer data from the RM Buddy read-only API: the Customers page, the dashboard customer strip, each branch's Customers tab and the names of customers in the 3D twins."
    >
      <Toggle label="Use Customer 360" checked={c360.enabled} onChange={(enabled) => setC360({ enabled })} />
      <div className="mt-2">
        <Toggle
          label="Show only customers imported from this platform"
          checked={c360.onlyImported}
          onChange={(onlyImported) => setC360({ onlyImported })}
          hint="Hides C360's demo customers everywhere in this app: only customers imported with this bank's code are shown."
        />
      </div>
      <div className={`${GRID} mt-3`}>
        <TextField
          label="Bank code in C360"
          value={c360.sourceSystem}
          onChange={(v) => setC360({ sourceSystem: v.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40) })}
          placeholder={derivedCode}
          hint={`Imported customers become ${effectiveCode}_<customer_id>, and only those are shown. Empty = from the bank's short name (${derivedCode}). Keep it once you've imported: a new code means new customers, not updates.${
            BANK_CODE.test(effectiveCode) ? "" : " It must be 2–40 lowercase letters or digits."
          }`}
        />
      </div>
      <div className={`${GRID} mt-3`}>
        <TextField
          wide
          label="API address"
          value={c360.baseUrl}
          onChange={(baseUrl) => setC360({ baseUrl })}
          placeholder="/c360-api/api/v1"
          hint="The default goes through this app's own /c360-api proxy (dev server and Vercel) to https://c360-demo-api.waiindustries.org. A full URL works if that API allows this site."
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={BUTTON} onClick={runTest} disabled={!c360.enabled}>
          Test connection
        </button>
        <button type="button" className={BUTTON} onClick={() => setC360({ baseUrl: "/c360-api/api/v1" })}>
          <RotateCcw className="size-4" aria-hidden="true" /> Default address
        </button>
        {test && <span className={`text-[13.5px] ${test.ok ? "text-ok" : "text-[#c03838]"}`}>{test.text}</span>}
      </div>

      <h3 className="mt-5 text-[15px] font-semibold">Branch mapping</h3>
      <p className="mt-0.5 text-[13.5px] text-soft">
        C360 branch codes don't match this platform's branch codes, so each C360 branch is linked to one of the branches here. Unmapped ones are matched
        automatically (same city, otherwise a main branch). Type a branch name or code to change one.
      </p>
      {error && <p className="mt-2 text-[13.5px] text-[#c03838]">{error.message}</p>}
      {truncated && <p className="mt-2 text-[13.5px] text-warn">Only the first 300 customers are mapped; ask the C360 team to add branch_id to the customer list.</p>}
      {loading && !link && <p className="mt-2 text-[13.5px] text-soft">Reading customers from Customer 360…</p>}
      {link && link.sources.length === 0 && (
        <p className="mt-2 text-[13.5px] text-soft">
          {c360.onlyImported ? "No imported customers yet. Import them below; those whose branch_id is one of our branch codes need no mapping." : "No customers with a branch in Customer 360."}
        </p>
      )}
      {link && link.sources.length > 0 && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-line">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">C360 branch</th>
                <th scope="col">Customers</th>
                <th scope="col">Mostly in</th>
                <th scope="col">Linked branch</th>
              </tr>
            </thead>
            <tbody>
              {link.sources.map((src) => {
                const b = getBranch(src.mapped);
                return (
                  <tr key={src.c360}>
                    <td className="!text-ink">{src.c360}</td>
                    <td className="tabular-nums">{src.count}</td>
                    <td>{src.city}</td>
                    <td>
                      <input
                        list="c360-branch-options"
                        aria-label={`Branch for ${src.c360}`}
                        defaultValue={b ? `${b.name} (${b.id})` : ""}
                        key={`${src.c360}-${src.mapped}`}
                        onBlur={(e) => {
                          const m = e.target.value.match(/\(([^)]+)\)\s*$/) ?? [null, e.target.value.trim()];
                          const id = m[1] && getBranch(m[1]) ? m[1] : null;
                          if (id) setC360({ branchMap: { ...c360.branchMap, [src.c360]: id } });
                        }}
                        className={`${INPUT} h-9 min-w-[260px]`}
                      />
                      <span className="mt-0.5 block text-[11.5px] text-mute">
                        {src.explicit ? "Chosen in Settings" : getBranch(src.c360) ? "Same code as our branch" : "Matched automatically"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <datalist id="c360-branch-options">
            {all.map((b) => (
              <option key={b.id} value={`${b.name} (${b.id})`} />
            ))}
          </datalist>
        </div>
      )}
      {Object.keys(c360.branchMap).length > 0 && (
        <button type="button" className={`${BUTTON} mt-2`} onClick={() => setC360({ branchMap: {} })}>
          <RotateCcw className="size-4" aria-hidden="true" /> Match all automatically
        </button>
      )}
      {c360.enabled && <ImportBundle />}
    </Card>
  );
}

/** Picks a branch by typing its name or code (datalist); saves on blur when the text names a known branch. */
function BranchPicker({ value, onPick, label, listId, empty }: { value: string | null; onPick: (id: string | null) => void; label: string; listId: string; empty?: string }) {
  const { getBranch } = useBranches();
  const b = value ? getBranch(value) : undefined;
  return (
    <input
      list={listId}
      aria-label={label}
      placeholder={empty ?? "Type a branch name or code"}
      defaultValue={b ? `${b.name} (${b.id})` : ""}
      key={value ?? "none"}
      onBlur={(e) => {
        const text = e.target.value.trim();
        if (!text) return onPick(null);
        const m = text.match(/\(([^)]+)\)\s*$/);
        const id = m ? m[1] : text;
        if (getBranch(id)) onPick(id);
      }}
      className={`${INPUT} h-9 min-w-[240px]`}
    />
  );
}

const without = (map: Record<string, string>, key: string) => Object.fromEntries(Object.entries(map).filter(([k]) => k !== key));

/** Digital Eye: on/off, the banking-twin-api address, connection status and the site / box / camera mapping. */
function DigitalEyeCard() {
  const de = useDraft((s) => s.config.integrations.digitalEye);
  const integrations = useDraft((s) => s.config.integrations);
  const update = useDraft((s) => s.update);
  const { all, getBranch } = useBranches();
  const twinUrl = useDraft((s) => s.config.integrations.twinApi.url);
  const { data, error, loading, refetch } = useTwinState({ enabled: de.enabled, apiUrl: twinUrl });
  const setDe = (patch: Partial<typeof de>) => update("integrations", { ...integrations, digitalEye: { ...de, ...patch } });

  // The mapping is shared: edits stay here until "Save mapping for everyone" sends them to the API.
  const serverMap = data?.mapping ?? EMPTY_MAPPING;
  const [edits, setEdits] = useState<Mapping | null>(null);
  const map = edits ?? serverMap;
  const mapDirty = edits !== null && JSON.stringify(edits) !== JSON.stringify(serverMap);
  const setMap = (patch: Partial<Mapping>) => setEdits({ ...map, ...patch });
  const adminKey = useAdminKey((s) => s.key);
  const [saving, setSaving] = useState<{ ok: boolean; text: string } | null>(null);
  const saveShared = async () => {
    setSaving({ ok: true, text: "Saving…" });
    try {
      await saveMapping(twinUrl, adminKey, map);
      setSaving({ ok: true, text: "Saved. Everyone using this API now sees this mapping." });
      setEdits(null);
      refetch();
    } catch (e) {
      setSaving({ ok: false, text: (e as Error).message });
    }
  };

  const conn = data?.connection;
  const check = conn?.latest_check;
  const cameraOptions = (branchId: string | null) => {
    const b = branchId ? getBranch(branchId) : undefined;
    if (!b) return [];
    return buildBranchLayout(b).assets.filter((a) => a.kind === "cctv" || a.kind === "atm");
  };

  return (
    <Card
      title="Digital Eye"
      description="Edge box health and camera tamper alerts from Digital Eye. Digital Eye sends them to our Digital Twin API (banking-twin-api); this app reads them from there every 30 seconds and shows them in the mapped branch's twin. Camera pictures stay illustrative."
    >
      <Toggle label="Use Digital Eye" checked={de.enabled} onChange={(enabled) => setDe({ enabled })} />
      <p className="mt-1 text-[12.5px] text-mute">Reads from the Digital Twin API address set above.</p>

      {!de.enabled ? (
        <p className="mt-4 text-[13.5px] text-soft">Turn on Digital Eye to see the connection status and map its sites, boxes and cameras.</p>
      ) : error && !data ? (
        <p className="mt-4 text-[13.5px] text-[#c03838]">{error.message}</p>
      ) : loading && !data ? (
        <p className="mt-4 text-[13.5px] text-soft">Reading from the Digital Twin API…</p>
      ) : data && conn ? (
        <>
          <h3 className="mt-5 text-[15px] font-semibold">Connection</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Last call from Digital Eye", ageOf(conn.last_call_at), !!conn.last_call_at && Date.now() - new Date(conn.last_call_at).getTime() < 5 * 60_000],
              ["Last health check", ageOf(conn.last_health_at), !!conn.last_health_at],
              [
                "Latest connection check",
                check ? (check.status === "open" ? `${check.request_id} waiting for an answer` : `${check.request_id}: ${check.answer_status}${check.result?.connected === true ? " (connected)" : ""}`) : "None yet (npm run de:check)",
                check?.answer_status === "ok",
              ],
              [
                "Last refused call",
                conn.last_refused ? `${ageOf(conn.last_refused.at)} · ${conn.last_refused.status} ${conn.last_refused.reason ?? ""}` : "None",
                !conn.last_refused,
              ],
            ].map(([label, value, good]) => (
              <div key={label as string} className="rounded-lg border border-line px-3 py-2">
                <p className="text-[12px] text-mute">{label as string}</p>
                <p className={`text-[14px] font-medium ${good ? "text-ok" : "text-ink"}`}>{value as string}</p>
              </div>
            ))}
          </div>

          <datalist id="de-branch-options">
            {all.map((b) => (
              <option key={b.id} value={`${b.name} (${b.id})`} />
            ))}
          </datalist>

          {(conn.events_with_issues_24h ?? 0) > 0 && conn.latest_issue && (
            <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-[13.5px]">
              {conn.events_with_issues_24h} event{conn.events_with_issues_24h === 1 ? "" : "s"} in the last 24 hours differed from the integration guide. They were
              stored anyway; tell the Digital Eye team. Latest ({ageOf(conn.latest_issue.received_at)}): {conn.latest_issue.issues.join("; ")}.
            </p>
          )}

          <h3 className="mt-5 text-[15px] font-semibold">Mapping</h3>
          <p className="mt-0.5 text-[13.5px] text-soft">
            Shared by everyone who uses this API, and saved with the button below (not with Save changes).
            {data.mapping_updated_at ? ` Last saved ${ageOf(data.mapping_updated_at)}.` : " Not saved yet."}
          </p>

          <h3 className="mt-4 text-[14px] font-semibold">Sites</h3>
          <p className="mt-0.5 text-[13.5px] text-soft">Digital Eye groups boxes and cameras by site. Link each site to the branch it is in; its boxes and cameras follow.</p>
          {data.sites.length ? (
            <div className="mt-2 overflow-x-auto rounded-lg border border-line">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Digital Eye site</th>
                    <th scope="col">Events</th>
                    <th scope="col">Last event</th>
                    <th scope="col">Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sites.map((site) => (
                    <tr key={site.site_ref}>
                      <td className="font-mono !text-ink">{site.site_ref}</td>
                      <td className="tabular-nums">{formatNumber(site.events)}</td>
                      <td>{ageOf(site.last_at)}</td>
                      <td>
                        <BranchPicker
                          label={`Branch for site ${site.site_ref}`}
                          listId="de-branch-options"
                          value={map.siteMap[site.site_ref] ?? null}
                          onPick={(id) => setMap({ siteMap: id ? { ...map.siteMap, [site.site_ref]: id } : without(map.siteMap, site.site_ref) })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-[13.5px] text-mute">No telemetry has arrived yet.</p>
          )}

          {data.devices.length > 0 && (
            <>
              <h3 className="mt-4 text-[14px] font-semibold">Edge boxes</h3>
              <p className="mt-0.5 text-[13.5px] text-soft">Each box shows in its branch's network room. Choose a branch only when a box is not in its site's branch.</p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-line">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Box</th>
                      <th scope="col">Last report</th>
                      <th scope="col">CPU</th>
                      <th scope="col">Branch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.devices.map((d) => {
                      const h = d.latest["device.health"];
                      const siteBranchId = d.site_ref ? map.siteMap[d.site_ref] : undefined;
                      const siteBranch = siteBranchId ? getBranch(siteBranchId) : undefined;
                      return (
                        <tr key={d.device_ref}>
                          <td className="font-mono !text-ink">{d.device_ref}</td>
                          <td>{ageOf(h?.occurred_at)}</td>
                          <td className="tabular-nums">{metricValue(h?.payload.cpu) !== null ? `${Math.round(metricValue(h?.payload.cpu)!)}%` : "—"}</td>
                          <td>
                            <BranchPicker
                              label={`Branch for box ${d.device_ref}`}
                              listId="de-branch-options"
                              value={map.deviceMap[d.device_ref] ?? null}
                              empty={siteBranch ? `Same as site: ${siteBranch.name}` : "Map the site first, or pick a branch"}
                              onPick={(id) => setMap({ deviceMap: id ? { ...map.deviceMap, [d.device_ref]: id } : without(map.deviceMap, d.device_ref) })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {data.cameras.length > 0 && (
            <>
              <h3 className="mt-4 text-[14px] font-semibold">Cameras</h3>
              <p className="mt-0.5 text-[13.5px] text-soft">Link each Digital Eye camera to a camera in its branch's twin. Tamper alerts then show on that camera.</p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-line">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Digital Eye camera</th>
                      <th scope="col">Branch</th>
                      <th scope="col">Last tamper</th>
                      <th scope="col">Twin camera</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cameras.map((c) => {
                      const branchId = branchOfDevice(c.device_ref, c.site_ref, map);
                      const b = branchId ? getBranch(branchId) : undefined;
                      const options = cameraOptions(branchId);
                      return (
                        <tr key={c.camera_ref}>
                          <td className="font-mono !text-ink">{c.camera_ref}</td>
                          <td>{b ? b.name : <span className="text-mute">Map its site first</span>}</td>
                          <td>
                            {c.tamper ? (
                              <span className={c.tamper.active ? "font-medium text-[#c03838]" : ""}>
                                {c.tamper.kind} · {ageOf(c.tamper.occurred_at)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <select
                              aria-label={`Twin camera for ${c.camera_ref}`}
                              disabled={!options.length}
                              value={map.cameraMap[c.camera_ref] ?? ""}
                              onChange={(e) =>
                                setMap({ cameraMap: e.target.value ? { ...map.cameraMap, [c.camera_ref]: e.target.value } : without(map.cameraMap, c.camera_ref) })
                              }
                              className={`${INPUT} h-9 min-w-[220px]`}
                            >
                              <option value="">{options.length ? "Not linked" : "Link the site to a branch first"}</option>
                              {options.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {data.sites.length > 0 && (
            <div className="mt-4 rounded-lg border border-line bg-card/60 p-3">
              {data.mapping_editable === false ? (
                <p className="text-[13.5px] text-soft">
                  Saving the mapping is turned off on this API server. Set TWIN_ADMIN_KEY in its .env and restart it.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {!adminKey.trim() && <span className="text-[13px] text-soft">Enter the admin key in the Digital Twin API card to save.</span>}
                  <button type="button" className={`${BUTTON} !bg-brand !text-white`} onClick={saveShared} disabled={!mapDirty || !adminKey.trim()}>
                    Save mapping for everyone
                  </button>
                  <button type="button" className={BUTTON} onClick={() => setEdits(null)} disabled={!mapDirty}>
                    <RotateCcw className="size-4" aria-hidden="true" /> Discard
                  </button>
                </div>
              )}
              <p className={`mt-2 text-[12.5px] ${saving && !saving.ok ? "text-[#c03838]" : mapDirty ? "text-warn" : "text-mute"}`}>
                {saving?.text ?? (mapDirty ? "Unsaved mapping changes. Only you see them until you save." : "The mapping matches what everyone sees.")}
              </p>
            </div>
          )}
        </>
      ) : null}
    </Card>
  );
}

function IntegrationsTab() {
  const { value: links, set } = useSection("appLinks");
  const update = useDraft((s) => s.update);
  const keys = Object.keys(APP_LINKS) as AppLinkKey[];
  return (
    <div className="space-y-5">
    <TwinApiCard />
    <C360Card />
    <DigitalEyeCard />
    <Card
      title="Application links"
      description="Where each application opens. Leave a field empty to use the build's default."
      action={
        <button type="button" className={BUTTON} onClick={() => update("appLinks", Object.fromEntries(keys.map((k) => [k, undefined])))}>
          <RotateCcw className="size-4" aria-hidden="true" /> Clear all
        </button>
      }
    >
      <div className={GRID}>
        {keys.map((key) => (
          <TextField
            key={key}
            label={APP_LINKS[key].name}
            value={links[key] ?? ""}
            placeholder={APP_LINKS[key].url || `Placeholder page (${APP_LINKS[key].fallbackRoute})`}
            onChange={(v) => set({ [key]: v } as Partial<BankConfig["appLinks"]>)}
          />
        ))}
      </div>
    </Card>
    </div>
  );
}

function BackupTab() {
  const presetId = useDraft((s) => s.config.presetId);
  const applyPreset = useDraft((s) => s.applyPreset);
  const exportConfig = useDraft((s) => s.exportConfig);
  const importConfig = useDraft((s) => s.importConfig);
  const resetAll = useDraft((s) => s.resetAll);
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="space-y-5">
      <Card title="Bank presets" description="Switch the whole platform to another bank in one step, then press Save changes. Each fictional bank brings its own sample branch list (an imported list stays in use until you remove it). Your profile, twin preferences, app links and integrations are kept.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PRESETS.map((p) => {
            const ctx = { shortName: p.config.brand.shortName, tagline: p.config.brand.tagline, brand: p.config.theme.brand };
            const active = p.id === presetId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                aria-pressed={active}
                className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${active ? "border-brand bg-brand/5" : "border-line hover:border-brand"}`}
              >
                <div className="flex h-12 items-center justify-between gap-2">
                  <img src={resolveImage(p.config.brand.logo, ctx, "logo")} alt="" className="max-h-11 max-w-[70%] object-contain" />
                  <span className="flex gap-1">
                    {[p.config.theme.brand, p.config.theme.accent, p.config.theme.page].map((c) => (
                      <span key={c} className="size-4 rounded-full border border-line" style={{ background: c }} />
                    ))}
                  </span>
                </div>
                <span className="text-[15px] font-semibold">
                  {p.name} {active && <Check className="inline size-4 text-brand" aria-label="(active)" />}
                </span>
                <span className="text-[13px] text-soft">{p.description}</span>
              </button>
            );
          })}
        </div>
      </Card>
      <Card title="Backup" description="Settings live in this browser. Export them to move a configuration to another machine or share it with a colleague.">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={PRIMARY} onClick={() => download("alara-bank-settings.json", exportConfig(), "application/json")}>
            <Download className="size-4" aria-hidden="true" /> Export settings
          </button>
          <button type="button" className={BUTTON} onClick={() => input.current?.click()}>
            <Upload className="size-4" aria-hidden="true" /> Import settings
          </button>
          {confirmReset ? (
            <span className="flex items-center gap-2 text-[13.5px]">
              Reset everything to the UBL default?
              <button
                type="button"
                className="h-9 rounded-lg bg-[#c03838] px-3 font-semibold text-white"
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                  setMessage({ ok: true, text: "All settings reset to the default. Press Save changes to apply." });
                }}
              >
                Reset
              </button>
              <button type="button" className={BUTTON} onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className={BUTTON} onClick={() => setConfirmReset(true)}>
              <Wand2 className="size-4" aria-hidden="true" /> Reset all settings
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              importConfig(await file.text());
              setMessage({ ok: true, text: `Settings loaded from ${file.name}. Press Save changes to apply.` });
            } catch (err) {
              setMessage({ ok: false, text: err instanceof Error ? err.message : "Import failed." });
            }
          }}
        />
        {message && <p className={`mt-3 text-[14px] ${message.ok ? "text-ok" : "text-[#b42f2f]"}`}>{message.text}</p>}
      </Card>
    </div>
  );
}

/**
 * Save / discard for the Settings page. Edits are held as a draft and only change the platform when
 * saved. Closing the tab with unsaved changes asks first.
 */
function SaveBar() {
  const dirty = useDirty();
  const save = useSettingsDraft((s) => s.save);
  const discard = useSettingsDraft((s) => s.discard);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);
  if (!dirty && !saved) return null;
  return (
    <div className="pointer-events-none sticky bottom-4 z-[900] mt-6 flex justify-end">
      <div role="status" className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 shadow-xl shadow-ink/15">
        {dirty ? (
          <>
            <span className="text-[14.5px] font-medium">You have unsaved changes</span>
            <button type="button" className={BUTTON} onClick={discard}>
              Discard
            </button>
            <button
              type="button"
              onClick={() => {
                save();
                setSaved(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-bright"
            >
              <Check className="size-4" aria-hidden="true" /> Save changes
            </button>
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-[14.5px] font-medium text-ok">
            <Check className="size-4" aria-hidden="true" /> Changes saved
          </span>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "brand") as TabId;
  const { logoUrl, bankName } = useBrand();

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 desk:px-11">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[34px] leading-tight font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-[17px] text-soft">Changes take effect across the platform when you press Save changes, and are kept in this browser.</p>
        </div>
        {logoUrl && (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-2">
            <img src={logoUrl} alt={bankName} className="h-10 max-w-[160px] object-contain" />
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto lg:sticky lg:top-[94px] lg:flex-col lg:self-start">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setParams({ tab: id }, { replace: true })}
              className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14.5px] whitespace-nowrap transition-colors ${
                tab === id ? "bg-brand font-medium text-white" : "text-soft hover:bg-brand/10 hover:text-ink"
              }`}
            >
              <Icon className="size-4.5" strokeWidth={1.7} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          <RebrandNotice onBranches={() => setParams({ tab: "branches" }, { replace: true })} />
          {tab === "brand" && <BrandTab />}
          {tab === "theme" && <ThemeTab />}
          {tab === "organisation" && <OrganisationTab />}
          {tab === "profile" && <ProfileTab />}
          {tab === "branches" && <BranchesTab />}
          {tab === "modules" && <ModulesTab />}
          {tab === "twin" && <TwinTab />}
          {tab === "integrations" && <IntegrationsTab />}
          {tab === "backup" && <BackupTab />}
          <SaveBar />
        </div>
      </div>
    </main>
  );
}
