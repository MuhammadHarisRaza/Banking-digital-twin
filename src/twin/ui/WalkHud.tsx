import { useEffect, useState } from "react";
import { LogOut, MousePointer2, Route, Square } from "lucide-react";
import type { BranchLayout } from "../layout/types";
import { enterMode } from "../scene/focus";
import { walkState } from "../scene/WalkControls";
import { useTwinView } from "../store";

const PANEL = "rounded-xl border border-line bg-panel/92 shadow-xl shadow-ink/10 backdrop-blur";

/** Floor plan with the viewer's position and heading, refreshed ten times a second. */
function MiniMap({ layout }: { layout: BranchLayout }) {
  const [p, setP] = useState({ x: 0, z: 0, yaw: 0 });
  useEffect(() => {
    const id = setInterval(() => setP({ x: walkState.x, z: walkState.z, yaw: walkState.yaw }), 100);
    return () => clearInterval(id);
  }, []);
  const { width: W, depth: D } = layout;
  const pad = 1.5;
  const x0 = -W / 2 - pad;
  const z0 = -D / 2 - pad;
  const w = W + pad * 2;
  const d = D + pad * 2 + 6;
  const scale = 190 / w;
  const deg = (-p.yaw * 180) / Math.PI;
  return (
    <svg width={190} height={d * scale} viewBox={`${x0} ${z0} ${w} ${d}`} role="img" aria-label="Floor plan with your position" className="block">
      <rect x={-W / 2} y={-D / 2} width={W} height={D} fill="#f4f2ee" stroke="#9aa3ad" strokeWidth={0.15} />
      {layout.zones
        .filter((z) => z.id !== "exterior")
        .map((z) => (
          <rect key={z.id} x={z.rect[0]} y={z.rect[1]} width={z.rect[2] - z.rect[0]} height={z.rect[3] - z.rect[1]} fill={z.color} opacity={0.18} />
        ))}
      {layout.rooms.map((r) => (
        <rect key={r.id} x={r.rect[0]} y={r.rect[1]} width={r.rect[2] - r.rect[0]} height={r.rect[3] - r.rect[1]} fill="none" stroke="#6b7480" strokeWidth={0.1} />
      ))}
      <rect x={layout.entrance.x - layout.entrance.width / 2} y={D / 2 - 0.15} width={layout.entrance.width} height={0.3} fill="var(--color-brand)" />
      <g transform={`translate(${p.x} ${p.z}) rotate(${deg})`}>
        <path d="M0 -1.6 L-1.1 0 L1.1 0 Z" fill="var(--color-brand)" opacity={0.35} />
        <circle r={0.5} fill="var(--color-brand)" stroke="#fff" strokeWidth={0.15} />
      </g>
    </svg>
  );
}

/** Walkthrough overlay: crosshair, controls hint, tour and exit buttons, mini-map. */
export function WalkHud({ layout, showRoof }: { layout: BranchLayout; showRoof: boolean }) {
  const touring = useTwinView((s) => s.touring);
  const [locked, setLocked] = useState(false);
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  useEffect(() => {
    const on = () => setLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", on);
    return () => document.removeEventListener("pointerlockchange", on);
  }, []);
  // Touch screens can't use the keyboard and mouse look: start the guided tour.
  useEffect(() => {
    if (coarse) useTwinView.getState().setTouring(true);
  }, [coarse]);

  return (
    <>
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
        <div className="relative size-5">
          <span className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 rounded bg-white/90 shadow" />
          <span className="absolute top-0 left-1/2 h-full w-0.5 -translate-x-1/2 rounded bg-white/90 shadow" />
        </div>
      </div>
      <div className="pointer-events-auto absolute bottom-24 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
        <div className={`${PANEL} flex items-center gap-2 px-3 py-1.5 text-[13px] text-soft`}>
          <MousePointer2 className="size-4 text-brand" aria-hidden="true" />
          {coarse
            ? "Drag to look around"
            : locked
              ? "WASD to walk · Shift to run · click to select · Esc to free the mouse"
              : "Click the view to look around · drag to look · WASD to walk"}
        </div>
        <button
          type="button"
          onClick={() => useTwinView.getState().setTouring(!touring)}
          className={`${PANEL} flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium ${touring ? "text-warn" : "text-ink"}`}
        >
          {touring ? <Square className="size-4" aria-hidden="true" /> : <Route className="size-4 text-brand" aria-hidden="true" />}
          {touring ? "Stop tour" : "Guided tour"}
        </button>
        <button type="button" onClick={() => enterMode("interior", layout, showRoof)} className={`${PANEL} flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium`}>
          <LogOut className="size-4 text-brand" aria-hidden="true" /> Exit walkthrough
        </button>
      </div>
      <div className={`${PANEL} pointer-events-auto absolute bottom-24 left-3 p-2`}>
        <MiniMap layout={layout} />
      </div>
    </>
  );
}
