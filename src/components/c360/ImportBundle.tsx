import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, FileUp, Loader2, Trash2, Upload, XCircle } from "lucide-react";
import { Link } from "react-router";
import {
  BUNDLE_FILES,
  fieldFor,
  importHistory,
  JOB_STAGES,
  jobStatus,
  messageText,
  uploadBundle,
  type BatchSummary,
  type BundleField,
  type BundleResult,
  type JobStatus,
} from "../../c360/importBundle";
import { useBankCode } from "../../c360/api";
import { invalidate } from "../../c360/query";
import { BANK_CODE } from "../../config/bankConfig";
import { useBranches } from "../../data/branches";
import { formatNumber } from "../../lib/seeded";
import { useAdminKey, useC360ImportConfig, useTwinApiUrl } from "../../twinApi/client";

const BUTTON = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel px-3 text-[13.5px] transition-colors hover:bg-brand/10 disabled:opacity-50 disabled:hover:bg-panel";
const PRIMARY = "inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13.5px] font-semibold text-white hover:bg-brand-bright disabled:opacity-50";

type Chosen = { file: File; field: BundleField | null };
type Phase = { kind: "idle" } | { kind: "busy"; text: string } | { kind: "error"; text: string };

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const FIELD_LABEL: Record<string, string> = { ...Object.fromEntries(BUNDLE_FILES.map((f) => [f.field, f.label])), archive: "Whole bundle (.zip / .xlsx)" };

/**
 * Settings → Integrations → Customer 360 → Import bank data. Files go to the Digital Twin API, which forwards them
 * to C360 with its service token: first a check (dry run), then the import, then C360's scoring job until it's done.
 */
export default function ImportBundle() {
  const apiUrl = useTwinApiUrl();
  const adminKey = useAdminKey((s) => s.key);
  const cfg = useC360ImportConfig();
  const code = useBankCode();
  const codeOk = BANK_CODE.test(code);
  const { primary, all } = useBranches();
  const [chosen, setChosen] = useState<Chosen[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [checked, setChecked] = useState<BundleResult | null>(null);
  const [loaded, setLoaded] = useState<BundleResult | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [history, setHistory] = useState<BatchSummary[] | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const sample = primary[0] ?? all[0];
  const canCall = !!cfg.data?.import_enabled && !!adminKey.trim() && codeOk;
  const busy = phase.kind === "busy";
  const ready = chosen.filter((c): c is { file: File; field: BundleField } => !!c.field);
  const archives = ready.filter((c) => c.field === "archive").length;
  const duplicateFields = new Set(ready.map((c) => c.field)).size !== ready.length;

  const loadHistory = useCallback(() => {
    if (!canCall) return;
    importHistory(apiUrl, adminKey)
      .then((h) => setHistory(h.slice(0, 10)))
      .catch(() => setHistory(null));
  }, [apiUrl, adminKey, canCall]);
  useEffect(loadHistory, [loadHistory]);

  // Follow C360's scoring job after a real import.
  useEffect(() => {
    if (!loaded?.job_id || !canCall) return;
    let stop = false;
    const tick = async () => {
      try {
        const j = await jobStatus(apiUrl, adminKey, loaded.job_id!);
        if (stop) return;
        setJob(j);
        if (j.status === "completed" || j.status === "failed") {
          invalidate("c360|");
          loadHistory();
          return;
        }
      } catch {
        /* keep polling; a blip shouldn't end it */
      }
      if (!stop) timer = setTimeout(tick, 3000);
    };
    let timer = setTimeout(tick, 1000);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [loaded?.job_id, apiUrl, adminKey, canCall, loadHistory]);

  const pick = (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...chosen];
    for (const file of Array.from(files)) {
      const field = fieldFor(file.name);
      const i = next.findIndex((c) => c.field && c.field === field);
      if (i >= 0) next[i] = { file, field };
      else next.push({ file, field });
    }
    setChosen(next);
    setChecked(null);
    setLoaded(null);
    setJob(null);
    setPhase({ kind: "idle" });
  };

  const run = async (dryRun: boolean) => {
    setPhase({ kind: "busy", text: dryRun ? "Checking the files with Customer 360…" : "Importing into Customer 360…" });
    try {
      const res = await uploadBundle(apiUrl, adminKey, code, ready, dryRun);
      if (dryRun) setChecked(res);
      else {
        setLoaded(res);
        setJob(null);
        if (!res.job_id) invalidate("c360|");
        loadHistory();
      }
      setPhase({ kind: "idle" });
    } catch (e) {
      setPhase({ kind: "error", text: (e as Error).message });
    }
  };

  const result = loaded ?? checked;
  const rejected = result?.row_outcomes.filter((r) => r.outcome !== "ok" && r.outcome !== "inserted" && r.outcome !== "updated") ?? [];
  const stageIndex = job ? JOB_STAGES.findIndex((s) => s.status === job.status) : -1;

  return (
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="text-[15px] font-semibold">Import bank data</h3>
      <p className="mt-0.5 text-[13.5px] text-soft">
        Send the bank&apos;s own customers, accounts and RM activity to Customer 360. They appear here (and in C360) as{" "}
        <code className="rounded bg-line-soft px-1">{code}_&lt;customer_id&gt;</code>. Use our branch codes in <code className="rounded bg-line-soft px-1">branch_id</code> and customers land on those branches with no mapping.
      </p>

      {cfg.error ? (
        <p className="mt-3 text-[13.5px] text-[#c03838]">{cfg.error.message}</p>
      ) : cfg.data && !cfg.data.import_enabled ? (
        <p className="mt-3 text-[13.5px] text-soft">Import is off on the Digital Twin API. Set C360_SERVICE_TOKEN in its .env and restart it.</p>
      ) : !codeOk ? (
        <p className="mt-3 text-[13.5px] text-[#c03838]">The bank code must be 2–40 lowercase letters or digits (above).</p>
      ) : !adminKey.trim() ? (
        <p className="mt-3 text-[13.5px] text-soft">Enter the admin key in the Digital Twin API card above to import.</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {BUNDLE_FILES.map((f) => (
          <button
            key={f.field}
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12.5px] text-soft hover:border-brand hover:text-brand"
            onClick={() => download(`${f.field}.csv`, `${f.header}\n${"sample" in f ? f.sample(sample?.id ?? "BR-0001", sample?.city ?? "Karachi") : ""}\n`)}
          >
            <Download className="size-3.5" aria-hidden="true" /> {f.field}.csv
          </button>
        ))}
      </div>
      <p className="mt-1 text-[12px] text-mute">
        Templates with one sample row. Load order: RMs, customers, accounts, transactions, interactions; any subset works, and re-importing an id updates it.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input ref={input} type="file" multiple accept=".csv,.zip,.xlsx" className="hidden" onChange={(e) => (pick(e.target.files), (e.target.value = ""))} />
        <button type="button" className={BUTTON} onClick={() => input.current?.click()} disabled={busy}>
          <FileUp className="size-4" aria-hidden="true" /> Choose files
        </button>
        <button type="button" className={BUTTON} onClick={() => run(true)} disabled={!canCall || busy || !ready.length || duplicateFields || archives > 1}>
          Check files
        </button>
        <button
          type="button"
          className={PRIMARY}
          onClick={() => run(false)}
          disabled={!canCall || busy || !checked || checked.status === "failed" || !ready.length || !!loaded}
          title={!checked ? "Check the files first" : undefined}
        >
          <Upload className="size-4" aria-hidden="true" /> Import
        </button>
        {busy && (
          <span className="inline-flex items-center gap-1.5 text-[13.5px] text-soft">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {phase.text}
          </span>
        )}
        {phase.kind === "error" && <span className="text-[13.5px] text-[#c03838]">{phase.text}</span>}
      </div>

      {chosen.length > 0 && (
        <ul className="mt-2 divide-y divide-line-soft rounded-lg border border-line text-[13.5px]">
          {chosen.map((c, i) => (
            <li key={c.file.name + i} className="flex items-center gap-2 px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate font-medium">{c.file.name}</span>
              <span className={c.field ? "text-soft" : "text-[#c03838]"}>
                {c.field ? FIELD_LABEL[c.field] : "Not recognised: name it like customers.csv"}
              </span>
              <span className="w-16 text-right text-[12px] text-mute tabular-nums">{Math.max(1, Math.round(c.file.size / 1024))} KB</span>
              <button type="button" aria-label={`Remove ${c.file.name}`} className="grid size-7 place-items-center rounded hover:bg-brand/10" onClick={() => (setChosen(chosen.filter((_, j) => j !== i)), setChecked(null))}>
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {duplicateFields && <p className="mt-1 text-[12.5px] text-[#c03838]">Two files map to the same kind; keep one of each.</p>}
      {archives > 1 && <p className="mt-1 text-[12.5px] text-[#c03838]">Send one .zip or .xlsx at a time.</p>}

      {result && (
        <div className="mt-3 rounded-lg border border-line p-3">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold">
            {result.status === "failed" ? (
              <XCircle className="size-4.5 text-[#c03838]" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-4.5 text-ok" aria-hidden="true" />
            )}
            {result.status === "failed"
              ? "Customer 360 could not use these files"
              : result.dry_run
                ? "Check passed: nothing imported yet"
                : `Imported: ${formatNumber(result.customers_created)} new and ${formatNumber(result.customers_updated)} updated customers`}
          </p>
          {result.files.length > 0 && (
            <div className="mt-2 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">File</th>
                    <th scope="col">Rows</th>
                    <th scope="col">{result.dry_run ? "Would add" : "Added"}</th>
                    <th scope="col">{result.dry_run ? "Would update" : "Updated"}</th>
                    <th scope="col">Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {result.files.map((f) => (
                    <tr key={f.file_name}>
                      <td className="!text-ink">{f.file_name}</td>
                      <td className="tabular-nums">{formatNumber(f.total_rows)}</td>
                      <td className="tabular-nums">{formatNumber(f.inserted)}</td>
                      <td className="tabular-nums">{formatNumber(f.updated)}</td>
                      <td className={`tabular-nums ${f.rejected ? "font-semibold text-[#c03838]" : ""}`}>{formatNumber(f.rejected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.messages.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-[13px] text-soft">
              {result.messages.map((m, i) => (
                <li key={i}>{messageText(m)}</li>
              ))}
            </ul>
          )}
          {rejected.length > 0 && (
            <details className="mt-2" open={rejected.length <= 10}>
              <summary className="cursor-pointer text-[13.5px] font-medium text-[#c03838]">
                {formatNumber(rejected.length)} rejected row{rejected.length === 1 ? "" : "s"}
                {rejected.length >= 500 ? " (first 500)" : ""}: fix them and import again; the other rows are unaffected
              </summary>
              <div className="mt-1 max-h-64 overflow-auto rounded border border-line-soft">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">File</th>
                      <th scope="col">Row</th>
                      <th scope="col">Key</th>
                      <th scope="col">Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejected.map((r, i) => (
                      <tr key={i}>
                        <td>{r.file_name}</td>
                        <td className="tabular-nums">{r.row_number}</td>
                        <td>{r.key ?? "—"}</td>
                        <td className="!text-ink">{r.messages.map(messageText).join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {loaded?.job_id && (
            <div className="mt-3">
              <p className="text-[13.5px] font-medium">
                {job?.status === "completed"
                  ? `Customer 360 has finished: ${formatNumber(job.customers_ready)} customers ready.`
                  : job?.status === "failed"
                    ? `Scoring stopped: ${job.error_message ?? "see C360"}. The customers are imported; their scores may be missing.`
                    : "Customer 360 is scoring the imported customers (churn, propensity, AI briefs). This can take a few minutes."}
              </p>
              <ol className="mt-2 flex flex-wrap gap-1.5" aria-label="Scoring progress">
                {JOB_STAGES.map((s, i) => {
                  const done = job?.status === "completed" || (stageIndex >= 0 && i < stageIndex);
                  const now = i === stageIndex && job?.status !== "completed";
                  return (
                    <li
                      key={s.status}
                      className={`rounded-full px-2.5 py-0.5 text-[12px] ${
                        done ? "bg-ok/15 text-ok" : now ? "bg-brand text-white" : job?.status === "failed" ? "bg-line-soft text-mute" : "bg-line-soft text-soft"
                      }`}
                    >
                      {now && <Loader2 className="mr-1 inline size-3 animate-spin" aria-hidden="true" />}
                      {s.label}
                    </li>
                  );
                })}
              </ol>
              {job?.status === "completed" && (
                <Link to="/customers" className="mt-2 inline-flex text-[13.5px] font-medium text-brand hover:text-brand-bright">
                  Open Customers →
                </Link>
              )}
            </div>
          )}
          {loaded && !loaded.job_id && loaded.status !== "failed" && (
            <Link to="/customers" className="mt-2 inline-flex text-[13.5px] font-medium text-brand hover:text-brand-bright">
              Open Customers →
            </Link>
          )}
        </div>
      )}

      {history && history.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[13.5px] font-medium">Recent imports</summary>
          <div className="mt-1 overflow-x-auto rounded-lg border border-line">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">File</th>
                  <th scope="col">Rows</th>
                  <th scope="col">OK</th>
                  <th scope="col">Rejected</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.batch_id}>
                    <td className="whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</td>
                    <td className="!text-ink min-w-[220px] !whitespace-normal">{h.file_name.split(",").map((f) => f.trim()).join(", ")}</td>
                    <td className="tabular-nums">{formatNumber(h.total_rows)}</td>
                    <td className="tabular-nums">{formatNumber(h.success_rows)}</td>
                    <td className="tabular-nums">{formatNumber(h.error_rows)}</td>
                    <td>{h.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
