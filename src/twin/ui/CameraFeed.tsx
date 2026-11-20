import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import { useSettings } from "../../store/settingsStore";
import type { Asset } from "../layout/types";
import { fmtClock, type SimState } from "../sim/engine";
import { FEED_H, FEED_W, feedLabel, feedOutput } from "../scene/cameraFeed";
import { clipsFor } from "./cameraClips";
import { clockOf, TAMPER_LABEL, type EdgeCamera } from "../../digitalEye/api";

/** Sim minutes → "HH:MM:SS", with seconds from the fractional minute. */
function clockWithSeconds(t: number) {
  const secs = Math.floor((t % 1) * 60);
  return `${fmtClock(t)}:${String(secs).padStart(2, "0")}`;
}

function Overlay({ label, where, sim, status, large }: { label: string; where: string; sim: SimState; status: string; large: boolean }) {
  const date = new Date();
  const stamp = `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  return (
    <div className={`pointer-events-none absolute inset-0 font-mono leading-none ${large ? "text-[15px]" : "text-[11px]"} text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]`}>
      <span className="absolute top-2 left-2.5">
        {label} · {where.toUpperCase()}
      </span>
      <span className="absolute top-2 right-2.5 tabular-nums">
        {stamp} {clockWithSeconds(sim.t)}
      </span>
      <span className="absolute bottom-2 left-2.5 flex items-center gap-1">
        <span className="size-2 animate-pulse rounded-full bg-[#ff3b3b]" />
        REC
      </span>
      <span className="absolute right-2.5 bottom-2">{status.toUpperCase()}</span>
    </div>
  );
}

/** Scan lines and a dark vignette, so stock footage reads as a security camera. */
const CCTV_GRADE =
  "pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgb(0_0_0/0.13)_0px,rgb(0_0_0/0.13)_1px,transparent_1px,transparent_3px)] shadow-[inset_0_0_70px_rgb(0_0_0/0.65)]";

type Source = { key: string; label: string; file?: string; credit?: string };

/**
 * Security-camera panel for an ATM or a CCTV camera. It plays recorded footage chosen for what the
 * camera watches (see cameraClips.ts); a custom clip from Settings → 3D Twin comes first when set. The
 * "Twin view" tab instead renders the camera's view live from the 3D scene (CameraFeedRenderer paints
 * into the canvas), showing the simulated customers.
 */
export function CameraFeed({ asset, sim, edge }: { asset: Asset; sim: SimState; edge?: EdgeCamera }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const custom = useSettings((s) => s.config.twin.cameraVideo ?? "").trim();
  const [large, setLarge] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const where = asset.kind === "atm" ? `${asset.name} fascia` : asset.name.split("·").pop()?.trim() || asset.name;

  const sources: Source[] = useMemo(
    () => [
      ...(custom ? [{ key: "custom", label: "Custom clip", file: custom, credit: "custom clip from Settings" }] : []),
      ...clipsFor(asset).map((c) => ({ key: c.id, label: c.title, file: c.file, credit: `${c.title}, ${c.source}` })),
      { key: "live", label: "Twin view" },
    ],
    [asset, custom],
  );
  const usable = sources.filter((s) => !failed.includes(s.key));
  const current = usable.find((s) => s.key === picked) ?? usable[0];
  const live = current.key === "live";

  // A new camera or a new custom clip starts over at the best clip.
  useEffect(() => {
    setPicked(null);
    setFailed([]);
  }, [asset.id, custom]);

  useEffect(() => {
    if (!live || !canvas.current) return;
    const el = canvas.current;
    const ctx = el.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0b0f14";
      ctx.fillRect(0, 0, el.width, el.height);
    }
    feedOutput.canvas = el;
    feedOutput.assetId = asset.id;
    return () => {
      if (feedOutput.canvas === el) {
        feedOutput.canvas = null;
        feedOutput.assetId = null;
      }
    };
  }, [asset.id, live, large]);

  useEffect(() => {
    if (!large) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setLarge(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [large]);

  const picture = (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#0b0f14]">
      {live ? (
        <canvas ref={canvas} width={FEED_W} height={FEED_H} className="size-full" aria-label={`Live 3D view from ${asset.name}`} role="img" />
      ) : (
        <>
          <video
            key={current.file}
            src={current.file}
            autoPlay
            muted
            loop
            playsInline
            aria-label={`${asset.name} camera footage`}
            onError={() => setFailed((f) => [...f, current.key])}
            className="size-full object-cover [filter:saturate(0.45)_contrast(1.08)_brightness(0.95)]"
          />
          <div className={CCTV_GRADE} />
        </>
      )}
      <Overlay label={feedLabel(asset)} where={where} sim={sim} status={live ? "Live · twin view" : "Live"} large={large} />
      {edge && (
        <span className={`pointer-events-none absolute top-7 left-2.5 rounded bg-black/55 px-1.5 py-0.5 font-mono text-white ${large ? "text-[13px]" : "text-[10.5px]"}`}>
          Digital Eye · {edge.camera_ref}
        </span>
      )}
      {edge?.tamper?.active && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 bg-[#c62828]/85 py-1.5 text-center font-semibold text-white">
          <span className={large ? "text-[18px]" : "text-[13px]"}>
            {(TAMPER_LABEL[edge.tamper.kind] ?? edge.tamper.kind).toUpperCase()} · since {clockOf(edge.tamper.occurred_at)}
          </span>
          <span className={`block font-normal opacity-90 ${large ? "text-[13px]" : "text-[11px]"}`}>Reported by Digital Eye. The picture is illustrative.</span>
        </div>
      )}
      <button
        type="button"
        onClick={() => setLarge((v) => !v)}
        aria-label={large ? "Shrink camera view" : "Enlarge camera view"}
        className="absolute top-7 right-2 grid size-7 place-items-center rounded-md bg-black/45 text-white opacity-80 hover:opacity-100"
      >
        {large ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </button>
    </div>
  );

  return (
    <section className="mt-3">
      <h3 className="mb-1 text-[12.5px] font-semibold tracking-wide text-mute uppercase">Camera</h3>
      {usable.length > 1 && (
        <div className="mb-1.5 flex flex-wrap gap-1" role="tablist" aria-label="Camera source">
          {usable.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={s.key === current.key}
              onClick={() => setPicked(s.key)}
              className={`rounded-full border px-2 py-0.5 text-[12px] transition-colors ${
                s.key === current.key ? "border-brand bg-brand text-white" : "border-line text-soft hover:border-brand hover:text-brand"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      {large ? (
        <>
          <div className="grid aspect-video w-full place-items-center rounded-lg border border-dashed border-line text-[13px] text-mute">Shown enlarged</div>
          {createPortal(
            <div
              role="dialog"
              aria-label={`${asset.name} camera`}
              className="fixed inset-0 z-[1200] grid place-items-center bg-black/75 p-4"
              onClick={() => setLarge(false)}
            >
              <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
                {picture}
              </div>
            </div>,
            document.body,
          )}
        </>
      ) : (
        picture
      )}
      <p className="mt-1 text-[11.5px] leading-snug text-mute">
        {live ? "Rendered live from the twin, showing the simulated customers." : `Illustrative footage: ${current.credit}.`}
      </p>
    </section>
  );
}
