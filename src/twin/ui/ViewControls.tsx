import { useEffect, useState, type RefObject } from "react";
import { Building, DoorOpen, Footprints, Maximize, Minimize, Moon, RotateCcw, Sun, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";
import type { BranchLayout } from "../layout/types";
import { enterMode } from "../scene/focus";
import { liveCamera, useTwinView, type ViewMode } from "../store";

const PANEL = "rounded-xl border border-line bg-panel/92 shadow-xl shadow-ink/10 backdrop-blur";

const MODES: { id: ViewMode; label: string; icon: LucideIcon; key: string }[] = [
  { id: "exterior", label: "Exterior", icon: Building, key: "E" },
  { id: "interior", label: "Interior", icon: DoorOpen, key: "I" },
  { id: "walk", label: "Walkthrough", icon: Footprints, key: "W" },
];

/** Exterior / Interior / Walkthrough switch, with the day/night toggle. */
export function ModeSwitch({ layout, showRoof }: { layout: BranchLayout; showRoof: boolean }) {
  const mode = useTwinView((s) => s.mode);
  const lighting = useTwinView((s) => s.lighting);
  return (
    <div className={`${PANEL} flex items-center gap-0.5 p-1`}>
      <div role="radiogroup" aria-label="Camera mode" className="flex gap-0.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            title={`${m.label} (${m.key})`}
            onClick={() => enterMode(m.id, layout, showRoof)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors ${
              mode === m.id ? "bg-brand text-white" : "text-soft hover:bg-brand/10 hover:text-ink"
            }`}
          >
            <m.icon className="size-4" aria-hidden="true" />
            {m.label}
          </button>
        ))}
      </div>
      <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
      <button
        type="button"
        onClick={() => useTwinView.getState().setLighting(lighting === "day" ? "night" : "day")}
        aria-label={lighting === "day" ? "Switch to night" : "Switch to day"}
        title={lighting === "day" ? "Night lighting (N)" : "Day lighting (N)"}
        className="grid size-8 place-items-center rounded-md text-soft hover:bg-brand/10 hover:text-ink"
      >
        {lighting === "day" ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </button>
    </div>
  );
}

/** Zoom, reset and fullscreen, bottom-right of the view. */
export function ViewControls({ layout, showRoof, container }: { layout: BranchLayout; showRoof: boolean; container: RefObject<HTMLElement | null> }) {
  const mode = useTwinView((s) => s.mode);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === container.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, [container]);
  const zoom = (factor: number) => {
    const { x, y, z, tx, ty, tz } = liveCamera;
    const dist = Math.hypot(x - tx, y - ty, z - tz);
    const f = Math.max(4, Math.min(140, dist * factor)) / dist;
    useTwinView.getState().flyTo([tx + (x - tx) * f, ty + (y - ty) * f, tz + (z - tz) * f], [tx, ty, tz]);
  };
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void container.current?.requestFullscreen?.();
  };
  const BTN = "grid size-9 place-items-center rounded-md text-soft transition-colors hover:bg-brand/10 hover:text-ink disabled:opacity-40";
  return (
    <div className={`${PANEL} flex flex-col p-1`}>
      <button type="button" className={BTN} aria-label="Zoom in" title="Zoom in" disabled={mode === "walk"} onClick={() => zoom(0.72)}>
        <ZoomIn className="size-4.5" />
      </button>
      <button type="button" className={BTN} aria-label="Zoom out" title="Zoom out" disabled={mode === "walk"} onClick={() => zoom(1.38)}>
        <ZoomOut className="size-4.5" />
      </button>
      <button type="button" className={BTN} aria-label="Reset view" title="Reset view" onClick={() => enterMode(mode, layout, showRoof)}>
        <RotateCcw className="size-4.5" />
      </button>
      <button type="button" className={BTN} aria-label={full ? "Exit fullscreen" : "Fullscreen"} title={full ? "Exit fullscreen (F)" : "Fullscreen (F)"} onClick={toggleFull}>
        {full ? <Minimize className="size-4.5" /> : <Maximize className="size-4.5" />}
      </button>
    </div>
  );
}
